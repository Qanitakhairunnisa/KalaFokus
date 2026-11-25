// src/composables/useFocusTimer.js
// Logika timer Pomodoro dibuat global (bukan di FocusView) supaya timer tetap jalan
// dan pop-up "kegiatan selanjutnya" tetap muncul walaupun user sedang di halaman lain.
import { appState, nowTime, toDateKey } from './useAppState'

export const POMODORO_SECONDS = 25 * 60

function clearTick(t) {
  clearInterval(t.intervalId)
  t.intervalId = null
}

function resetTimer(t) {
  clearTick(t)
  t.isRunning = false
  t.endsAt = null
  t.mode = '25'
  t.duration = POMODORO_SECONDS
  t.remaining = POMODORO_SECONDS
  t.distractions = 0
  t.note = ''
}

function finish(completed) {
  const t = appState.timer
  if (!t.isRunning) return

  const elapsed = completed ? t.duration : t.duration - t.remaining
  const minutes = Math.round(elapsed / 60)
  const note = (t.note || '').trim()
  const task = appState.tasks.find((x) => x.id === t.selectedTaskId)
  const title = task?.title || 'Sesi Fokus Mandiri'

  // Sesi dicatat jika minimal 30 detik, atau kalau user menulis catatan sesi
  const recorded = elapsed >= 30 || note.length > 0
  if (recorded) {
    // Kalau selesai karena refresh setelah waktu habis, pakai waktu selesai yang sebenarnya
    const endedAt = completed && t.endsAt ? new Date(Math.min(t.endsAt, Date.now())) : new Date()
    appState.sessions.unshift({
      id: Date.now(),
      date: toDateKey(endedAt),
      time: nowTime(endedAt),
      taskId: task?.id ?? null,
      taskTitle: title,
      duration: minutes,
      score: Math.max(70, 100 - (t.distractions || 0) * 5),
      mood: t.mood,
      note
    })
  }

  appState.lastSession = { completed, minutes, recorded, note, taskId: task?.id ?? null, taskTitle: title }
  resetTimer(t)
  appState.isNextTaskModalOpen = true
}

function runTicker(t) {
  clearTick(t)
  const tick = () => {
    t.remaining = Math.max(0, Math.ceil((t.endsAt - Date.now()) / 1000))
    if (t.remaining === 0) finish(true)
  }
  tick()
  // Pakai waktu selesai (timestamp) supaya tidak melenceng walau tab di-background
  if (t.isRunning) t.intervalId = setInterval(tick, 250)
}

function start() {
  const t = appState.timer
  if (t.isRunning) return
  t.mode = '25'
  t.duration = POMODORO_SECONDS
  t.isRunning = true
  t.endsAt = Date.now() + t.duration * 1000
  runTicker(t)
}

/** Lanjutkan timer yang tersimpan (setelah refresh / login ulang). */
function resume() {
  const t = appState.timer
  t.duration = POMODORO_SECONDS
  if (!t.isRunning || !t.endsAt) {
    resetTimer(t)
    return
  }
  runTicker(t) // kalau waktunya sudah lewat, langsung dianggap selesai
}

// Dipencet user: langsung akhiri sesi (tidak ada jeda)
const stop = () => finish(false)

// Dipakai saat logout: hentikan tanpa mencatat & tanpa pop-up
const cancel = () => resetTimer(appState.timer)

export function useFocusTimer() {
  return { start, stop, cancel, resume }
}
