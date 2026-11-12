<!-- src/App.vue -->
<template>
  <SvgSprite />

  <AuthView v-if="!isAuthenticated || route.name === 'auth'" />

  <div v-else class="app-shell">
    <AppSidebar />

    <div class="app-main">
      <AppHeader />
      <main class="app-content">
        <RouterView />
      </main>
    </div>

    <MobileBottomNav />
    <IdeaDrawer />
    <DetoxModal />
  </div>
</template>

<script setup>
import { reactive, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAuth } from './composables/useAuth'

import SvgSprite from './components/ui/SvgSprite.vue'
import AppSidebar from './components/layout/AppSidebar.vue'
import AppHeader from './components/layout/AppHeader.vue'
import MobileBottomNav from './components/layout/MobileBottomNav.vue'
import IdeaDrawer from './components/layout/IdeaDrawer.vue'
import DetoxModal from './components/modals/DetoxModal.vue'
import AuthView from './views/AuthView.vue'

const route = useRoute()
const { isAuthenticated } = useAuth()

// Inisialisasi state global aplikasi di window agar komponen tetap sinkron tanpa useKalaFokus.js
const STORAGE_KEY = 'kalafokus:v1'
let saved = {}
try {
  saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
} catch {
  saved = {}
}

if (!window.__kalafokus) {
  window.__kalafokus = reactive({
    isIdeaDrawerOpen: false,
    isDetoxModalOpen: false,
    activeTaskId: saved.activeTaskId ?? null,
    settings: {
      focusTarget: saved.settings?.focusTarget ?? 120,
      reelsLimit: saved.settings?.reelsLimit ?? 30
    },
    tasks: saved.tasks ?? [
      { id: 1, title: 'Menyusun Bab 3 Metodologi Riset Kognitif', deadline: '2026-11-13T14:00', load: 'high', pomodoros: 3, category: 'Riset & Penulisan', completed: false },
      { id: 2, title: 'Review jurnal perhatian visual & dopamin', deadline: '2026-11-14T10:00', load: 'medium', pomodoros: 2, category: 'Riset & Penulisan', completed: false },
      { id: 3, title: 'Rapikan catatan literatur Zettelkasten', deadline: '2026-11-15T17:00', load: 'low', pomodoros: 1, category: 'Dokumentasi', completed: true }
    ],
    ideas: saved.ideas ?? [
      { id: 1, text: 'Cek referensi buku Cal Newport untuk bab pembuka', tag: 'riset_nanti', createdAt: '10:15' },
      { id: 2, text: 'Balas email dosen pembimbing terkait jadwal seminar', tag: 'urusan_mendadak', createdAt: '10:42' },
      { id: 3, text: 'Ide visualisasi grafik kurva kelelahan atensi', tag: 'ide_kreatif', createdAt: '11:05' }
    ],
    sessions: saved.sessions ?? [
      { id: 1, time: '09:30', taskTitle: 'Menyusun Bab 3 Metodologi Riset Kognitif', duration: 50, score: 94, mood: 'calm' },
      { id: 2, time: '11:00', taskTitle: 'Review jurnal perhatian visual & dopamin', duration: 25, score: 88, mood: 'energized' }
    ],
    brainfallLogs: saved.brainfallLogs ?? [
      { id: 1, platform: 'Instagram Reels', duration: 10, trigger: 'istirahat_kebablasan', aftereffect: 'kabut_otak', time: '12:15' },
      { id: 2, platform: 'TikTok', duration: 10, trigger: 'kebosanan', aftereffect: 'biasa_saja', time: '13:40' }
    ],
    aiEvaluations: saved.aiEvaluations ?? [
      {
        id: 1,
        date: 'Evaluasi Kognitif Harian',
        status: 'Ritme Kognitif Stabil',
        summary: 'Anda berhasil mempertahankan 75 menit fokus mendalam dengan tingkat distraksi rendah. Paparan Reels masih berada di angka 20 menit (di bawah batas 30 menit).',
        recommendation: 'Gunakan teknik jeda non-layar (melihat objek jauh selama 60 detik) setelah sesi Pomodoro berikutnya.'
      }
    ],
    timer: {
      isRunning: false,
      mode: '25',
      duration: 25 * 60,
      remaining: 25 * 60,
      distractions: 0,
      selectedTaskTitle: 'Sesi Fokus Mandiri',
      mood: 'calm',
      note: '',
      intervalId: null
    }
  })
}

const appState = window.__kalafokus

watch(
  () => [
    appState.settings,
    appState.tasks,
    appState.ideas,
    appState.sessions,
    appState.brainfallLogs,
    appState.aiEvaluations,
    appState.activeTaskId
  ],
  () => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          settings: appState.settings,
          tasks: appState.tasks,
          ideas: appState.ideas,
          sessions: appState.sessions,
          brainfallLogs: appState.brainfallLogs,
          aiEvaluations: appState.aiEvaluations,
          activeTaskId: appState.activeTaskId
        })
      )
    } catch {
      // Abaikan jika storage penuh
    }
  },
  { deep: true }
)
</script>
