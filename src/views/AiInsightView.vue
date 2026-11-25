<!-- src/views/AiInsightView.vue -->
<template>
  <section class="spa-view space-y-6">
    <div class="p-6 sm:p-8 rounded-3xl bg-warmcream-100 border border-warmcream-300">
      <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h3 class="font-serif text-2xl sm:text-3xl font-semibold text-mocha-900">
            Refleksi Produktivitas
          </h3>
          <p class="text-xs sm:text-sm text-mocha-600 mt-2">
            Ringkasan sesi fokus, Parkir Ide, BrainFall, dan tugas aktif.
          </p>
        </div>
        <button
          type="button"
          :disabled="loading"
          class="px-5 py-3.5 rounded-2xl bg-mocha-800 hover:bg-mocha-900 disabled:opacity-60 disabled:cursor-wait text-softwhite font-semibold text-xs shadow-md shrink-0 cursor-pointer"
          @click="generateEvaluation"
        >
          <BaseIcon name="sparkles" with-margin />
          {{ loading ? 'Menyusun...' : 'Susun Evaluasi Sekarang' }}
        </button>
      </div>

      <div aria-live="polite">
        <p v-if="errorMessage" class="mt-3 text-xs text-terracotta-600">{{ errorMessage }}</p>
      </div>
    </div>

    <div v-if="latestEval" class="p-6 sm:p-8 rounded-3xl bg-warmcream-50 border border-warmcream-300 shadow-sm space-y-3">
      <div class="flex flex-wrap items-center gap-2">
        <span class="px-3 py-1 rounded-full bg-sage-100 text-sage-700 text-xs font-semibold">
          {{ latestEval.status }}
        </span>
        <span v-if="latestEval.source === 'gemini' || latestEval.source === 'bawaan'" class="text-[11px] text-mocha-500">
          {{ latestEval.source === 'gemini' ? 'oleh Gemini' : 'oleh mesin bawaan' }}
        </span>
      </div>
      <h4 class="font-serif text-xl font-semibold text-mocha-900">Evaluasi {{ formatWhen(latestEval) }}</h4>
      <p class="text-sm text-mocha-700 leading-relaxed">{{ latestEval.summary }}</p>
      <div v-if="latestEval.recommendation" class="p-4 rounded-2xl bg-softwhite border border-warmcream-200 text-xs text-mocha-800">
        <strong>Saran</strong>
        <p>{{ latestEval.recommendation }}</p>
      </div>
      <RouterLink
        :to="{ name: 'ai-chat', params: { id: latestEval.id } }"
        class="inline-flex items-center px-4 py-2.5 rounded-xl bg-sage-600 hover:bg-sage-700 text-softwhite text-xs font-semibold"
      >
        💬 Diskusikan dengan Gemini
      </RouterLink>
    </div>
    <div v-else class="p-6 rounded-3xl bg-warmcream-50 border border-warmcream-200 text-sm text-mocha-600 text-center">
      Belum ada evaluasi.
    </div>

    <div v-if="state.aiEvaluations.length" class="p-6 rounded-3xl bg-warmcream-50 border border-warmcream-200">
      <div class="flex items-center justify-between mb-4">
        <h4 class="font-serif text-lg font-semibold text-mocha-900">Riwayat Evaluasi</h4>
        <span class="text-[11px] text-mocha-500">Klik untuk lanjut ngobrol dengan Gemini</span>
      </div>
      <div class="space-y-3">
        <RouterLink
          v-for="ev in state.aiEvaluations.slice(0, 30)"
          :key="ev.id"
          :to="{ name: 'ai-chat', params: { id: ev.id } }"
          class="block p-4 rounded-2xl bg-softwhite border border-warmcream-200 hover:border-mocha-400 hover:shadow-sm transition cursor-pointer"
        >
          <div class="flex justify-between gap-3 text-xs font-semibold text-mocha-900">
            <span>{{ ev.status }}</span>
            <span class="text-mocha-500 shrink-0">{{ formatWhen(ev) }}</span>
          </div>
          <p class="text-xs text-mocha-600 mt-1 line-clamp-2">{{ ev.summary }}</p>
          <p class="text-[11px] text-mocha-500 mt-2">
            {{ ev.messages?.length ? `💬 ${ev.messages.length} pesan` : '💬 Mulai chat' }}
          </p>
        </RouterLink>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import BaseIcon from '../components/ui/BaseIcon.vue'
import { TASK_STATUS_LABEL, formatWhen, nowTime, toDateKey, useAppState } from '../composables/useAppState'

const { state, taskTitle, sessionTaskStatus } = useAppState()
const latestEval = computed(() => state.aiEvaluations[0])
const errorMessage = ref('')
const activeRequest = shallowRef(null)
const loading = computed(() => activeRequest.value !== null)

function cancelRequest() {
  const request = activeRequest.value
  activeRequest.value = null
  request?.abort()
}

onBeforeUnmount(cancelRequest)
watch(() => state.uid, () => {
  cancelRequest()
  errorMessage.value = ''
}, { flush: 'sync' })

function sumMinutes(entries) {
  return entries.reduce((total, entry) => total + (Number(entry.duration) || 0), 0)
}

function collectStats(at) {
  const today = toDateKey(at)
  const sessions = state.sessions.filter((item) => item.date === today)
  const logs = state.brainfallLogs.filter((item) => item.date === today)
  const openTasks = state.tasks.filter((task) => !task.completed)
  const overdueTasks = openTasks.filter((task) => (
    task.deadline && new Date(task.deadline).getTime() < at.getTime()
  ))

  return {
    focusMinutes: sumMinutes(sessions),
    focusTarget: Number(state.settings.focusTarget) || 120,
    sessionCount: sessions.length,
    tiredSessions: sessions.filter((session) => (
      session.mood === 'tired' || session.mood === 'overwhelmed'
    )).length,
    reelsMinutes: sumMinutes(logs),
    reelsLimit: Number(state.settings.reelsLimit) || 30,
    brainfallCount: logs.length,
    ideasToday: state.ideas.filter((idea) => idea.date === today).length,
    pendingTasks: openTasks.length,
    overdueTasks: overdueTasks.length,
    // Riwayat sesi terbaru (termasuk hari sebelumnya) beserta status tugas & catatan terakhir
    recentSessions: state.sessions.slice(0, 10).map((s) => ({
      when: formatWhen(s),
      task: taskTitle(s.taskId, s.taskTitle),
      minutes: Number(s.duration) || 0,
      taskStatus: TASK_STATUS_LABEL[sessionTaskStatus(s)],
      mood: s.mood || '',
      note: String(s.note || '').slice(0, 300)
    }))
  }
}

function hasData(stats) {
  return stats.sessionCount > 0 || stats.brainfallCount > 0 ||
    stats.ideasToday > 0 || stats.pendingTasks > 0 || stats.recentSessions.length > 0
}

function localEvaluation(stats) {
  if (!hasData(stats)) {
    return {
      status: 'Belum ada aktivitas tercatat',
      summary: 'Belum ada sesi fokus, ide, atau BrainFall yang tercatat hari ini. Daftar tugas aktif juga kosong.',
      recommendation: 'Catat satu aktivitas untuk mulai membuat ringkasan.'
    }
  }

  const summary = [
    stats.sessionCount
      ? `Fokus ${stats.focusMinutes} dari target ${stats.focusTarget} menit dalam ${stats.sessionCount} sesi.`
      : 'Belum ada sesi fokus yang tercatat hari ini.',
    stats.recentSessions[0]
      ? `Sesi terakhir (${stats.recentSessions[0].when}) pada "${stats.recentSessions[0].task}" — status: ${stats.recentSessions[0].taskStatus}${stats.recentSessions[0].note ? `, catatan: "${stats.recentSessions[0].note}"` : ''}.`
      : '',
    stats.brainfallCount
      ? `BrainFall mencatat ${stats.reelsMinutes} menit (batas ${stats.reelsLimit} menit).`
      : 'Belum ada durasi BrainFall yang tercatat hari ini.',
    `Ada ${stats.ideasToday} ide dan ${stats.pendingTasks} tugas aktif. ${stats.overdueTasks} tugas sudah lewat tenggat.`
  ].filter(Boolean).join(' ')

  if (stats.brainfallCount && stats.reelsMinutes >= stats.reelsLimit) {
    return {
      status: 'Batas BrainFall tercapai',
      summary,
      recommendation: 'Ambil jeda tanpa layar sebelum sesi fokus berikutnya.'
    }
  }
  if (stats.tiredSessions >= 2) {
    return {
      status: 'Lelah pada beberapa sesi',
      summary,
      recommendation: 'Ambil jeda dan pilih tugas ringan saat siap kembali fokus.'
    }
  }
  if (stats.overdueTasks > 0) {
    return {
      status: 'Ada tugas lewat tenggat',
      summary,
      recommendation: 'Pilih satu tugas yang lewat tenggat dan mulai dari langkah terkecilnya.'
    }
  }
  if (stats.focusMinutes >= stats.focusTarget) {
    return {
      status: 'Target fokus tercapai',
      summary,
      recommendation: 'Tinjau ide atau tugas aktif untuk menyiapkan sesi berikutnya.'
    }
  }

  return {
    status: 'Aktivitas tercatat',
    summary,
    recommendation: 'Pilih satu tugas untuk sesi fokus berikutnya.'
  }
}

async function loadGeminiEvaluation(stats, signal) {
  const response = await fetch('/api/ai-insight', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(stats),
    signal
  })
  if (response.status === 404 || response.status === 405) return null
  if (!response.headers.get('content-type')?.includes('application/json')) return null

  const result = await response.json()
  if (result?.code === 'GEMINI_NOT_CONFIGURED') {
    errorMessage.value = 'GEMINI_API_KEY belum terbaca. Pastikan ada di .env.local lalu restart `npm run dev`.'
    return null
  }
  if (!response.ok || !['status', 'summary', 'recommendation'].every(
    (field) => typeof result?.[field] === 'string' && result[field].trim()
  )) {
    throw new Error('Gemini belum menghasilkan evaluasi yang lengkap.')
  }
  return {
    status: result.status,
    summary: result.summary,
    recommendation: result.recommendation
  }
}

async function generateEvaluation() {
  if (!state.uid || loading.value) return
  const uid = state.uid
  const at = new Date()
  const request = new AbortController()
  activeRequest.value = request
  errorMessage.value = ''

  try {
    const stats = collectStats(at)
    let evaluation = localEvaluation(stats)
    let source = 'bawaan'

    if (hasData(stats)) {
      const timeoutId = setTimeout(() => request.abort(), 50_000)
      try {
        const result = await loadGeminiEvaluation(stats, request.signal)
        request.signal.throwIfAborted()
        if (result) {
          evaluation = result
          source = 'gemini'
        }
      } catch {
        if (activeRequest.value !== request) return
        errorMessage.value = 'Gemini gagal merespons. Evaluasi ini memakai mesin bawaan.'
      } finally {
        clearTimeout(timeoutId)
      }
    }

    if (activeRequest.value !== request || state.uid !== uid) return
    state.aiEvaluations.unshift({
      id: at.getTime(),
      date: toDateKey(at),
      time: nowTime(at),
      source,
      ...evaluation,
      stats,
      messages: []
    })
  } catch {
    if (activeRequest.value === request) errorMessage.value = 'Evaluasi gagal disusun. Coba lagi.'
  } finally {
    if (activeRequest.value === request) activeRequest.value = null
  }
}
</script>