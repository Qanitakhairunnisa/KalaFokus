<!-- src/views/AiInsightView.vue -->
<template>
  <section class="spa-view space-y-6">
    <div class="p-6 sm:p-8 rounded-3xl bg-warmcream-100 border border-warmcream-300">
      <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div class="max-w-2xl">
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-softwhite border border-warmcream-300 text-xs font-semibold text-mocha-800">
            <span><BaseIcon name="sparkles" with-margin />Gemini Cognitive Psychologist Engine</span>
          </div>
          <h3 class="font-serif text-2xl sm:text-3xl font-semibold text-mocha-900 mt-3">
            Evaluasi Psikologis &amp; Burnout
          </h3>
          <p class="text-xs sm:text-sm text-mocha-600 mt-2 leading-relaxed">
            Refleksi singkat dari pola fokus, ide yang diparkir, dan BrainFall hari ini.
          </p>
        </div>

        <button
          type="button"
          :disabled="loading"
          class="px-5 py-3.5 rounded-2xl bg-mocha-800 hover:bg-mocha-900 disabled:opacity-60 disabled:cursor-wait text-softwhite font-semibold text-xs shadow-md transition flex items-center justify-center gap-2 shrink-0 cursor-pointer"
          @click="generateEvaluation"
        >
          <BaseIcon name="sparkles" with-margin />{{ loading ? 'Menyusun...' : 'Susun Evaluasi Sekarang' }}
        </button>
      </div>

      <div class="mt-6 pt-5 border-t border-warmcream-300/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div class="text-xs text-mocha-700">
          <strong class="text-mocha-900">Gemini API Key (Opsional):</strong>
          <template v-if="savedKey"> tersimpan di browser ini ✓</template>
          <template v-else> kosongkan untuk pakai mesin bawaan.</template>
          <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener" class="underline ml-1">Dapatkan key</a>
        </div>
        <form class="flex items-center gap-2 shrink-0" @submit.prevent="saveKey">
          <input
            v-model="apiKeyInput"
            type="password"
            autocomplete="off"
            class="w-full sm:w-64 px-3.5 py-2 rounded-xl bg-softwhite border border-warmcream-300 text-xs text-mocha-900 font-mono"
            :placeholder="savedKey ? '••••••••' + savedKey.slice(-4) : 'AIzaSy... (Opsional)'"
          />
          <button type="submit" class="px-3.5 py-2 rounded-xl bg-softwhite hover:bg-warmcream-200 border border-warmcream-300 text-xs font-semibold text-mocha-800 cursor-pointer">
            Simpan
          </button>
          <button v-if="savedKey" type="button" class="px-3.5 py-2 rounded-xl text-xs font-semibold text-terracotta-600 hover:bg-terracotta-50 cursor-pointer" @click="clearKey">
            Hapus
          </button>
        </form>
      </div>

      <p v-if="notice" class="mt-3 text-xs" :class="noticeIsError ? 'text-terracotta-600' : 'text-sage-700'">{{ notice }}</p>
    </div>

    <!-- Hasil Evaluasi Terbaru -->
    <div v-if="latestEval" class="p-6 sm:p-8 rounded-3xl bg-warmcream-50 border border-warmcream-300 shadow-sm space-y-3">
      <div class="flex flex-wrap items-center gap-2">
        <span class="px-3 py-1 rounded-full bg-sage-100 text-sage-700 text-xs font-semibold">{{ latestEval.status }}</span>
        <span class="text-[11px] text-mocha-500">{{ sourceLabel(latestEval) }}</span>
      </div>
      <h4 class="font-serif text-xl font-semibold text-mocha-900">Evaluasi {{ formatWhen(latestEval) }}</h4>
      <p class="text-sm text-mocha-700 leading-relaxed">{{ latestEval.summary }}</p>
      <div class="p-4 rounded-2xl bg-softwhite border border-warmcream-200 text-xs text-mocha-800">
        <strong>Saran Kognitif:</strong> {{ latestEval.recommendation }}
      </div>
    </div>
    <div v-else class="p-6 rounded-3xl bg-warmcream-50 border border-warmcream-200 text-sm text-mocha-600 text-center">
      Belum ada evaluasi. Klik <strong>Susun Evaluasi Sekarang</strong> untuk membuat yang pertama.
    </div>

    <!-- Riwayat Evaluasi -->
    <div v-if="state.aiEvaluations.length > 1" class="p-6 rounded-3xl bg-warmcream-50 border border-warmcream-200">
      <h4 class="font-serif text-lg font-semibold text-mocha-900 mb-4">Riwayat Evaluasi</h4>
      <div class="space-y-3">
        <div
          v-for="ev in state.aiEvaluations.slice(1, 20)"
          :key="ev.id"
          class="p-4 rounded-2xl bg-softwhite border border-warmcream-200"
        >
          <div class="flex justify-between text-xs font-semibold text-mocha-900">
            <span>{{ ev.status }}</span>
            <span class="text-mocha-500">{{ formatWhen(ev) }}</span>
          </div>
          <p class="text-xs text-mocha-600 mt-1">{{ ev.summary }}</p>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, computed } from 'vue'
import BaseIcon from '../components/ui/BaseIcon.vue'
import { formatWhen, isToday, nowTime, toDateKey, useAppState } from '../composables/useAppState'

// Alias resmi yang selalu menunjuk ke model Gemini Flash terbaru
const GEMINI_MODEL = 'gemini-flash-latest'
const KEY_STORAGE = 'kalafokus:gemini-key'

const { state, pendingTasks, focusMinutesToday, brainfallMinutesToday, ideasToday } = useAppState()

const savedKey = ref(localStorage.getItem(KEY_STORAGE) || '')
const apiKeyInput = ref('')
const loading = ref(false)
const notice = ref('')
const noticeIsError = ref(false)

const latestEval = computed(() => state.aiEvaluations[0])

const sourceLabel = (ev) => (ev.source === 'gemini' ? 'oleh Gemini' : ev.source === 'bawaan' ? 'oleh mesin bawaan' : '')

const showNotice = (msg, isError = false) => {
  notice.value = msg
  noticeIsError.value = isError
}

function saveKey() {
  const key = apiKeyInput.value.trim()
  if (!key) return
  localStorage.setItem(KEY_STORAGE, key)
  savedKey.value = key
  apiKeyInput.value = ''
  showNotice('API key disimpan di browser ini.')
}

function clearKey() {
  localStorage.removeItem(KEY_STORAGE)
  savedKey.value = ''
  showNotice('API key dihapus. Evaluasi akan memakai mesin bawaan.')
}

// Ringkasan data hari ini yang dipakai untuk evaluasi
function collectStats() {
  const today = toDateKey()
  const sessions = state.sessions.filter(isToday)
  const logs = state.brainfallLogs.filter(isToday)
  const moods = sessions.map((s) => s.mood).filter(Boolean)
  const overdue = pendingTasks.value.filter((t) => t.deadline && t.deadline.slice(0, 10) < today)
  return {
    focusMinutes: focusMinutesToday.value,
    focusTarget: Number(state.settings.focusTarget) || 120,
    sessionCount: sessions.length,
    distractionsAvgScore: sessions.length
      ? Math.round(sessions.reduce((a, s) => a + Number(s.score || 0), 0) / sessions.length)
      : null,
    moods,
    reelsMinutes: brainfallMinutesToday.value,
    reelsLimit: Number(state.settings.reelsLimit) || 30,
    reelsTriggers: logs.map((l) => l.trigger),
    reelsAftereffects: logs.map((l) => l.aftereffect),
    ideasToday: ideasToday.value.length,
    pendingTasks: pendingTasks.value.length,
    overdueTasks: overdue.length,
    highLoadPending: pendingTasks.value.filter((t) => t.load === 'high').length
  }
}

// Mesin bawaan (tanpa API): aturan sederhana berbasis data hari ini
function localEvaluation(s) {
  const focusRatio = s.focusMinutes / s.focusTarget
  const overReels = s.reelsMinutes >= s.reelsLimit
  const tiredMoods = s.moods.filter((m) => m === 'tired' || m === 'overwhelmed').length

  let status = 'Ritme Kognitif Stabil'
  if (overReels && focusRatio < 0.5) status = 'Waspada Kelelahan Dopamin'
  else if (tiredMoods >= 2 || (s.highLoadPending >= 3 && s.overdueTasks > 0)) status = 'Risiko Burnout Meningkat'
  else if (focusRatio >= 1) status = 'Target Fokus Tercapai'
  else if (s.focusMinutes === 0) status = 'Belum Mulai Fokus'

  const parts = [
    `Hari ini kamu fokus ${s.focusMinutes} dari target ${s.focusTarget} menit dalam ${s.sessionCount} sesi.`,
    `Konsumsi video pendek ${s.reelsMinutes} menit (batas ${s.reelsLimit} menit).`,
    `${s.ideasToday} ide berhasil diparkir, dan masih ada ${s.pendingTasks} tugas aktif` +
      (s.overdueTasks ? `, ${s.overdueTasks} di antaranya sudah lewat tenggat.` : '.')
  ]

  let recommendation
  if (overReels) recommendation = 'Jauhkan ponsel dari meja kerja dan lakukan jeda non-layar (lihat objek jauh 60 detik) sebelum sesi berikutnya.'
  else if (tiredMoods >= 2) recommendation = 'Tubuhmu memberi sinyal lelah. Ambil istirahat panjang 15–30 menit sebelum lanjut, dan pilih tugas berbeban ringan.'
  else if (s.overdueTasks) recommendation = 'Mulai satu Pomodoro untuk tugas yang paling lama lewat tenggat — cukup satu langkah kecil dulu.'
  else if (s.focusMinutes === 0) recommendation = 'Mulai dengan satu Pomodoro 25 menit pada tugas termudah untuk membangun momentum.'
  else if (focusRatio >= 1) recommendation = 'Target tercapai. Tutup hari dengan merapikan Parkir Ide menjadi tugas untuk besok.'
  else recommendation = `Butuh sekitar ${Math.ceil((s.focusTarget - s.focusMinutes) / 25)} Pomodoro lagi untuk mencapai target hari ini.`

  return { status, summary: parts.join(' '), recommendation }
}

async function geminiEvaluation(key, s) {
  const prompt = `Kamu adalah psikolog kognitif yang hangat dan suportif. Berdasarkan data produktivitas hari ini (JSON di bawah), buat evaluasi singkat dalam Bahasa Indonesia.
Kembalikan HANYA JSON dengan bentuk: {"status": "label singkat 2-4 kata", "summary": "2-3 kalimat ringkasan kondisi", "recommendation": "1-2 kalimat saran konkret"}.
Keterangan: mood = calm|energized|tired|overwhelmed; skor sesi makin tinggi = makin sedikit distraksi.
Data: ${JSON.stringify(s)}`

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.7 }
      })
    }
  )
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.error?.message || `HTTP ${res.status}`)

  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || ''
  const parsed = JSON.parse(text)
  if (!parsed.status || !parsed.summary) throw new Error('Format jawaban Gemini tidak sesuai.')
  return { status: parsed.status, summary: parsed.summary, recommendation: parsed.recommendation || '' }
}

async function generateEvaluation() {
  loading.value = true
  showNotice('')
  const stats = collectStats()
  let result
  let source = 'bawaan'
  try {
    if (savedKey.value) {
      result = await geminiEvaluation(savedKey.value, stats)
      source = 'gemini'
    }
  } catch (e) {
    showNotice(`Gemini gagal (${e.message}). Memakai mesin bawaan.`, true)
  }
  if (!result) result = localEvaluation(stats)

  state.aiEvaluations.unshift({
    id: Date.now(),
    date: toDateKey(),
    time: nowTime(),
    source,
    ...result
  })
  loading.value = false
}
</script>
