<!-- src/views/FocusView.vue -->
<template>
  <section class="spa-view focus">
    <div class="focus-layout">
      <!-- Kiri: Parkir Ide Inline -->
      <div class="focus-col">
        <div class="focus-card">
          <div class="focus-card__head">
            <h4>Parkir Ide</h4>
            <span class="dash-chip">{{ state.ideas.length }}</span>
          </div>
          <form class="focus-idea-form" @submit.prevent="handleInlineIdea">
            <input v-model="inlineIdeaText" type="text" required class="task-input"
              placeholder="Tulis pikiran, lalu Enter" />
            <select v-model="inlineIdeaTag" class="task-input">
              <option value="ide_kreatif">Ide</option>
              <option value="urusan_mendadak">Urusan</option>
              <option value="riset_nanti">Cari</option>
              <option value="refleksi">Refleksi</option>
            </select>
            <button type="submit" class="dash-btn dash-btn--primary">Parkir</button>
          </form>
          <div class="focus-ideas space-y-2 mt-3">
            <div v-for="idea in state.ideas" :key="idea.id"
              class="text-xs p-2.5 rounded-xl bg-warmcream-50 border border-warmcream-200">
              {{ idea.text }}
            </div>
          </div>
        </div>
      </div>

      <!-- Kanan: Stopwatch + Track Record -->
      <div class="focus-col">
        <div class="focus-card focus-timer">

          <div class="focus-ring">
            <svg viewBox="0 0 220 220" aria-hidden="true">
              <circle cx="110" cy="110" r="96" fill="none" stroke="#E8F1FB" stroke-width="9" />
              <circle class="timer-progress-ring" cx="110" cy="110" r="96" fill="none" stroke="#4A90D9" stroke-width="9"
                stroke-linecap="round" stroke-dasharray="603.18" :stroke-dashoffset="dashOffset" />
            </svg>
            <div class="focus-ring__center">
              <span class="focus-ring__status">{{ state.timer.isRunning ? 'Fokus' : 'Siap' }}</span>
              <div class="focus-ring__time">{{ formattedTime }}</div>
              <span class="focus-ring__idea" title="Pikiran yang diparkir selama sesi">
                <BaseIcon name="message-circle" with-margin />
                <strong>{{ state.timer.distractions }}</strong>
              </span>
            </div>
          </div>

          <select v-model="state.timer.selectedTaskId" class="focus-pill" aria-label="Tugas yang difokuskan"
            :disabled="state.timer.isRunning">
            <option :value="null">Tanpa tugas</option>
            <option v-for="t in pendingTasks" :key="t.id" :value="t.id">{{ t.title }}</option>
          </select>

          <!-- Tidak ada tombol jeda: sekali mulai, hanya bisa dihentikan -->
          <div class="focus-controls">
            <button v-if="!state.timer.isRunning" type="button" class="dash-btn dash-btn--primary focus-main" @click="start">
              <BaseIcon name="play" with-margin />Mulai
            </button>
            <button v-else type="button" class="dash-btn focus-main focus-stop" @click="stop">
              <BaseIcon name="square" with-margin />Berhenti
            </button>
          </div>

          <div class="focus-meta">
            <select v-model="state.timer.mood" class="task-input" aria-label="Kondisi">
              <option value="calm">Tenang</option>
              <option value="energized">Berenergi</option>
              <option value="tired">Lelah</option>
              <option value="overwhelmed">Kewalahan</option>
            </select>
          </div>
          <label class="focus-note">
            <span>Catatan sesi — apa saja yang sudah kamu kerjakan?</span>
            <textarea v-model="state.timer.note" rows="3" maxlength="1000" class="task-input"
              placeholder="Contoh: Selesai bab 2, tinggal revisi daftar pustaka" ></textarea>
            <small v-if="state.timer.isRunning">Tulis catatan dulu sebelum menekan Berhenti untuk istirahat.</small>
          </label>
        </div>
      </div>
    </div>

    <!-- Riwayat Sesi -->
    <BasePanel title="Riwayat Sesi" panel-class="focus-card focus-history" head-class="focus-card__head">
      <template #action>
        <span class="dash-chip">{{ focusMinutesToday }} mnt hari ini</span>
      </template>
      <div class="dash-table-wrap">
        <table class="dash-table">
          <thead>
            <tr>
              <th>Waktu</th>
              <th>Tugas</th>
              <th>Durasi</th>
              <th>Skor</th>
              <th>Status Tugas</th>
              <th>Catatan Terakhir</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in state.sessions.slice(0, 20)" :key="s.id">
              <td>{{ formatWhen(s) }}</td>
              <td class="dash-cell-title">{{ taskTitle(s.taskId, s.taskTitle) }}</td>
              <td>{{ formatMinutes(s.duration) }}</td>
              <td>{{ s.score }}%</td>
              <td>
                <span class="session-status" :class="`session-status--${sessionTaskStatus(s)}`">
                  {{ TASK_STATUS_LABEL[sessionTaskStatus(s)] }}
                </span>
              </td>
              <td class="session-note" :title="s.note">{{ s.note || '—' }}</td>
            </tr>
            <tr v-if="state.sessions.length === 0">
              <td colspan="6" class="text-center py-4 text-xs opacity-60">Belum ada riwayat sesi.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </BasePanel>
  </section>
</template>

<style scoped>
.focus-stop {
  background: #d4505f;
  color: #fff;
  border-color: #d4505f;
}
.focus-stop:hover {
  background: #b23a49;
}
.focus-note {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  width: 100%;
  margin-top: 0.75rem;
  text-align: left;
  font-size: 0.75rem;
  font-weight: 600;
}
.focus-note textarea {
  resize: vertical;
  min-height: 4.5rem;
  font-weight: 400;
}
.focus-note small {
  font-weight: 400;
  opacity: 0.7;
}
.session-status {
  display: inline-block;
  padding: 0.15rem 0.55rem;
  border-radius: 999px;
  font-size: 0.7rem;
  font-weight: 600;
  white-space: nowrap;
  background: #f1ece4;
  color: #6b5a4a;
}
.session-status--done { background: #e3efe3; color: #3f6b46; }
.session-status--pending { background: #fbeee0; color: #a2622a; }
.session-note {
  max-width: 260px;
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 0.75rem;
}
.focus-pill:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
</style>

<script setup>
import { ref, computed } from 'vue'
import BasePanel from '../components/ui/BasePanel.vue'
import BaseIcon from '../components/ui/BaseIcon.vue'
import { POMODORO_SECONDS, useFocusTimer } from '../composables/useFocusTimer'
import { TASK_STATUS_LABEL, formatMinutes, formatWhen, nowTime, toDateKey, useAppState } from '../composables/useAppState'

const { start, stop } = useFocusTimer()
const { state, pendingTasks, focusMinutesToday, taskTitle, sessionTaskStatus } = useAppState()

const inlineIdeaText = ref('')
const inlineIdeaTag = ref('ide_kreatif')

const elapsedSeconds = computed(() => {
  if (typeof state.timer.elapsed === 'number') {
    return Math.max(0, state.timer.elapsed)
  }
  const total = Number(state.timer.duration) || POMODORO_SECONDS
  const rem = state.timer.remaining != null ? Number(state.timer.remaining) : total
  return Math.max(0, total - rem)
})

const formattedTime = computed(() => {
  const totalSec = elapsedSeconds.value
  const hours = Math.floor(totalSec / 3600)
  const minutes = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0')
  const seconds = String(totalSec % 60).padStart(2, '0')
  return hours > 0
    ? `${String(hours).padStart(2, '0')}:${minutes}:${seconds}`
    : `${minutes}:${seconds}`
})

// Lingkaran progres berputar penuh setiap 60 detik
const dashOffset = computed(() => {
  const circumference = 603.18
  const secInMinute = elapsedSeconds.value % 60
  return circumference * (1 - secInMinute / 60)
})

function handleInlineIdea() {
  const text = inlineIdeaText.value.trim()
  if (!text) return
  state.ideas.unshift({
    id: Date.now(),
    text,
    tag: inlineIdeaTag.value,
    date: toDateKey(),
    time: nowTime()
  })
  inlineIdeaText.value = ''
  if (state.timer.isRunning) {
    state.timer.distractions += 1
  }
}
</script>