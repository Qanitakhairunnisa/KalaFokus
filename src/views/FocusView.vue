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

          <select v-model="state.timer.selectedTaskTitle" class="focus-pill" aria-label="Tugas yang difokuskan">
            <option value="Sesi Fokus Mandiri">Tanpa tugas</option>
            <option v-for="t in pendingTasks" :key="t.id" :value="t.title">{{ t.title }}</option>
          </select>

          <div class="focus-controls">
            <button v-if="!state.timer.isRunning" type="button" class="dash-btn dash-btn--primary focus-main" @click="startTimer">
              <BaseIcon name="play" with-margin />Mulai
            </button>
            <button v-else type="button" class="dash-btn dash-btn--primary focus-main" @click="pauseTimer">
              <BaseIcon name="pause" with-margin />Jeda
            </button>
            <button type="button" class="focus-ctl" aria-label="Catat sesi" @click="completeSession">
              <BaseIcon name="check" />
            </button>
          </div>

          <div class="focus-meta">
            <select v-model="state.timer.mood" class="task-input" aria-label="Kondisi">
              <option value="calm">Tenang</option>
              <option value="energized">Berenergi</option>
              <option value="tired">Lelah</option>
              <option value="overwhelmed">Kewalahan</option>
            </select>
            <input v-model="state.timer.note" type="text" class="task-input" placeholder="Catatan sesi" />
          </div>
        </div>
      </div>
    </div>

    <!-- Riwayat Sesi -->
    <BasePanel title="Riwayat Sesi" panel-class="focus-card focus-history" head-class="focus-card__head">
      <template #action>
        <span class="dash-chip">{{ focusMinutesToday }} mnt</span>
      </template>
      <div class="dash-table-wrap">
        <table class="dash-table">
          <thead>
            <tr>
              <th>Waktu</th>
              <th>Tugas</th>
              <th>Durasi</th>
              <th>Skor</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in state.sessions" :key="s.id">
              <td>{{ s.time }}</td>
              <td class="dash-cell-title">{{ s.taskTitle }}</td>
              <td>{{ s.duration }} mnt</td>
              <td>{{ s.score }}%</td>
            </tr>
          </tbody>
        </table>
      </div>
    </BasePanel>
  </section>
</template>

<script setup>
import { ref, computed, reactive } from 'vue'
import BasePanel from '../components/ui/BasePanel.vue'
import BaseIcon from '../components/ui/BaseIcon.vue'

const state = window.__kalafokus || reactive({
  ideas: [],
  tasks: [],
  sessions: [],
  timer: {
    isRunning: false,
    elapsed: 0,
    remaining: 0,
    distractions: 0,
    selectedTaskTitle: 'Sesi Fokus Mandiri',
    mood: 'calm',
    note: '',
    intervalId: null
  }
})

// Inisialisasi stopwatch ke 0 jika state global sebelumnya masih memakai countdown default
if (typeof state.timer.elapsed !== 'number') {
  state.timer.elapsed = 0
  if (!state.timer.isRunning) {
    state.timer.remaining = 0
  }
}

const inlineIdeaText = ref('')
const inlineIdeaTag = ref('ide_kreatif')

const pendingTasks = computed(() => state.tasks.filter((t) => !t.completed))

const focusMinutesToday = computed(() =>
  state.sessions.reduce((acc, s) => acc + Number(s.duration || 0), 0)
)

const formattedTime = computed(() => {
  const totalSec = Math.max(0, Number(state.timer.elapsed) || 0)
  const h = Math.floor(totalSec / 3600)
  const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0')
  const s = String(totalSec % 60).padStart(2, '0')
  return h > 0 ? `${String(h).padStart(2, '0')}:${m}:${s}` : `${m}:${s}`
})

// Lingkaran progres berputar penuh setiap 60 detik
const dashOffset = computed(() => {
  const circumference = 603.18
  const secInMinute = (state.timer.elapsed || 0) % 60
  return circumference * (1 - secInMinute / 60)
})

function startTimer() {
  if (state.timer.isRunning) return
  state.timer.isRunning = true
  clearInterval(state.timer.intervalId)
  state.timer.intervalId = setInterval(() => {
    state.timer.elapsed += 1
    state.timer.remaining = state.timer.elapsed // Sinkronkan agar pill di header ikut naik
  }, 1000)
}

function pauseTimer() {
  state.timer.isRunning = false
  clearInterval(state.timer.intervalId)
}

function completeSession() {
  if (!state.timer.elapsed) return
  pauseTimer()
  const mins = Math.max(1, Math.round(state.timer.elapsed / 60))
  state.sessions.unshift({
    id: Date.now(),
    time: new Date().toTimeString().slice(0, 5),
    taskTitle: state.timer.selectedTaskTitle,
    duration: mins,
    score: Math.max(70, 100 - (state.timer.distractions || 0) * 5),
    mood: state.timer.mood
  })
  state.timer.distractions = 0
  state.timer.note = ''
  state.timer.elapsed = 0
  state.timer.remaining = 0
}

function handleInlineIdea() {
  const text = inlineIdeaText.value.trim()
  if (!text) return
  state.ideas.unshift({
    id: Date.now(),
    text,
    tag: inlineIdeaTag.value,
    createdAt: new Date().toTimeString().slice(0, 5)
  })
  inlineIdeaText.value = ''
  if (state.timer.isRunning) {
    state.timer.distractions += 1
  }
}
</script>