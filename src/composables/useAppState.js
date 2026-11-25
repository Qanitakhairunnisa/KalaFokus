// src/composables/useAppState.js
// State global aplikasi (tugas, ide, sesi, BrainFall, evaluasi AI, timer).
// - Disimpan di localStorage PER AKUN (kunci berisi uid), jadi data akun lain tidak ikut tampil.
// - Diekspos juga sebagai window.__kalafokus supaya komponen lama tetap bisa membacanya.
import { computed, reactive, watch } from 'vue'

const STORAGE_PREFIX = 'kalafokus:v2:'
const POMODORO_SECONDS = 25 * 60

// ---------- Helper tanggal ----------
const pad = (n) => String(n).padStart(2, '0')

/** 'YYYY-MM-DD' waktu lokal */
export const toDateKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const nowTime = (d = new Date()) => `${pad(d.getHours())}:${pad(d.getMinutes())}`
export const isToday = (item) => item?.date === toDateKey()

/** Nilai untuk <input type="datetime-local">: besok jam 09:00 */
export const defaultDeadline = () => {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return `${toDateKey(d)}T09:00`
}

/** "Hari ini 09:30" / "Kemarin 09:30" / "23 Nov 09:30" */
export const formatWhen = (item) => {
  if (!item?.date) return item?.time || '-'
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  let label
  if (item.date === toDateKey(today)) label = 'Hari ini'
  else if (item.date === toDateKey(yesterday)) label = 'Kemarin'
  else {
    const [y, m, d] = item.date.split('-').map(Number)
    label = new Date(y, m - 1, d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
  }
  return `${label} ${item.time || ''}`.trim()
}

export const formatDeadline = (deadline) => (deadline ? deadline.replace('T', ' ') : '-')

// ---------- State ----------
const freshTimer = () => ({
  isRunning: false,
  endsAt: null,
  mode: '25',
  duration: POMODORO_SECONDS,
  remaining: POMODORO_SECONDS,
  distractions: 0,
  selectedTaskId: null,
  mood: 'calm',
  note: '',
  intervalId: null
})

// Data awal untuk akun baru: kosong (tanpa data contoh)
const freshData = () => ({
  activeTaskId: null,
  settings: { focusTarget: 120, reelsLimit: 30 },
  tasks: [],
  ideas: [],
  sessions: [],
  brainfallLogs: [],
  aiEvaluations: []
})

const PERSISTED_KEYS = Object.keys(freshData())

export const appState = reactive({
  uid: null,
  isIdeaDrawerOpen: false,
  isDetoxModalOpen: false,
  isNextTaskModalOpen: false,
  lastSession: null,
  ...freshData(),
  timer: freshTimer()
})

window.__kalafokus = appState

const storageKey = (uid) => STORAGE_PREFIX + uid

function readSaved(uid) {
  try {
    return JSON.parse(localStorage.getItem(storageKey(uid)) || '{}')
  } catch {
    return {}
  }
}

/** Ganti seluruh data dengan milik user `uid` (atau kosongkan kalau null). */
export function loadForUser(uid) {
  clearInterval(appState.timer.intervalId)
  const saved = uid ? readSaved(uid) : {}
  const base = freshData()

  appState.uid = uid
  appState.isIdeaDrawerOpen = false
  appState.isDetoxModalOpen = false
  appState.isNextTaskModalOpen = false
  appState.lastSession = null
  for (const key of PERSISTED_KEYS) {
    appState[key] = saved[key] ?? base[key]
  }
  appState.settings = { ...base.settings, ...(saved.settings || {}) }
  // Timer disimpan juga supaya Pomodoro tidak hilang saat refresh
  appState.timer = { ...freshTimer(), ...(saved.timer || {}), intervalId: null }
}

function persist() {
  if (!appState.uid) return
  const t = appState.timer
  const data = Object.fromEntries(PERSISTED_KEYS.map((k) => [k, appState[k]]))
  data.timer = {
    isRunning: t.isRunning,
    endsAt: t.endsAt,
    distractions: t.distractions,
    selectedTaskId: t.selectedTaskId,
    mood: t.mood,
    note: t.note
  }
  try {
    localStorage.setItem(storageKey(appState.uid), JSON.stringify(data))
  } catch {
    // Abaikan jika storage penuh
  }
}

// `remaining` berubah tiap detik dan tidak perlu disimpan, jadi tidak ikut dipantau
watch(
  () => [
    ...PERSISTED_KEYS.map((k) => appState[k]),
    appState.timer.isRunning,
    appState.timer.endsAt,
    appState.timer.distractions,
    appState.timer.selectedTaskId,
    appState.timer.mood,
    appState.timer.note
  ],
  persist,
  { deep: true }
)

// ---------- Turunan (computed) ----------
const pendingTasks = computed(() => appState.tasks.filter((t) => !t.completed))
const focusMinutesToday = computed(() =>
  appState.sessions.filter(isToday).reduce((acc, s) => acc + Number(s.duration || 0), 0)
)
const brainfallMinutesToday = computed(() =>
  appState.brainfallLogs.filter(isToday).reduce((acc, l) => acc + Number(l.duration || 0), 0)
)
const ideasToday = computed(() => appState.ideas.filter(isToday))

/** Judul tugas terbaru berdasarkan id (fallback ke judul yang tersimpan di sesi) */
const taskTitle = (taskId, fallback = 'Sesi Fokus Mandiri') =>
  appState.tasks.find((t) => t.id === taskId)?.title || fallback

/** Status tugas dari sebuah sesi: 'done' | 'pending' | 'none' (tanpa tugas) | 'deleted' */
const sessionTaskStatus = (session) => {
  if (!session?.taskId) return 'none'
  const task = appState.tasks.find((t) => t.id === session.taskId)
  if (!task) return 'deleted'
  return task.completed ? 'done' : 'pending'
}

export const TASK_STATUS_LABEL = {
  done: 'Selesai',
  pending: 'Belum selesai',
  none: 'Tanpa tugas',
  deleted: 'Tugas dihapus'
}

export const formatMinutes = (m) => (Number(m) >= 1 ? `${m} mnt` : '<1 mnt')

export function useAppState() {
  return {
    state: appState,
    pendingTasks,
    focusMinutesToday,
    brainfallMinutesToday,
    ideasToday,
    taskTitle,
    sessionTaskStatus
  }
}
