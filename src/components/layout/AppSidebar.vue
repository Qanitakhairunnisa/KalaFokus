<script setup>
import { computed, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '../../composables/useAuth'

const route = useRoute()
const router = useRouter()
const { logout: authLogout } = useAuth()

const appState = window.__kalafokus || reactive({
  isIdeaDrawerOpen: false,
  isDetoxModalOpen: false,
  timer: { isRunning: false, remaining: 1500 }
})

const formattedTimer = computed(() => {
  const s = Math.max(0, Number(appState.timer?.remaining) || 0)
  const m = String(Math.floor(s / 60)).padStart(2, '0')
  const sec = String(s % 60).padStart(2, '0')
  return `${m}:${sec}`
})

const navItems = [
  { name: 'Dashboard', path: '/', viewKey: 'dashboard' },
  { name: 'Mode Fokus', path: '/focus', viewKey: 'focus' },
  { name: 'Tugas', path: '/tasks', viewKey: 'tasks' },
  { name: 'BrainFall', path: '/brainfall', viewKey: 'brainfall' },
  { name: 'AI Insight', path: '/ai-insight', viewKey: 'ai-insight' }
]

async function handleLogout() {
  if (appState.timer?.intervalId) {
    clearInterval(appState.timer.intervalId)
    appState.timer.isRunning = false
  }
  await authLogout()
  router.replace({ name: 'auth' })
}
</script>

<template>
  <aside class="hidden lg:flex w-64 bg-mocha-900 text-softwhite border-r border-mocha-800 flex-col justify-between p-4 shrink-0 sticky top-0 h-screen">
    <div>
      <!-- Brand Logo -->
      <div class="flex items-center gap-3 px-3 py-4 mb-6">
        <div
          class="w-9 h-9 rounded-xl bg-mocha-700 flex items-center justify-center font-serif font-bold text-lg text-softwhite shadow">
          K
        </div>
        <div>
          <h1 class="font-serif font-bold text-lg tracking-tight text-softwhite leading-none">KalaFokus</h1>
          <span class="text-xs text-warmcream-300/70">Cognitive Workspace</span>
        </div>
      </div>

      <!-- Menu Navigasi Router -->
      <nav class="space-y-1.5">
        <RouterLink v-for="item in navItems" :key="item.path" :to="item.path"
          class="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150"
          :class="route.path === item.path
            ? 'bg-mocha-700 text-softwhite shadow-sm'
            : 'text-warmcream-200/70 hover:bg-mocha-800 hover:text-softwhite'">
          <span>{{ item.name }}</span>
          <span v-if="item.path === '/focus' && appState.timer?.isRunning"
            class="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono">
            {{ formattedTimer }}
          </span>
        </RouterLink>
      </nav>
    </div>

    <!-- Tombol Aksi Cepat Bawah -->
    <div class="space-y-2 pt-4 border-t border-mocha-800">
      <button type="button" @click="appState.isIdeaDrawerOpen = true"
        class="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-medium bg-mocha-800 hover:bg-mocha-700 text-softwhite transition cursor-pointer">
        <span>💡 Parkir Ide Cepat</span>
      </button>
      <button type="button" @click="appState.isDetoxModalOpen = true"
        class="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-medium bg-mocha-800/60 hover:bg-mocha-800 text-warmcream-200 border border-mocha-700 transition cursor-pointer">
        <span>🧘 Mode Digital Detox</span>
      </button>
      <button type="button" @click="handleLogout"
        class="w-full flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs text-warmcream-300/60 hover:text-softwhite transition cursor-pointer">
        <span>Keluar Akun</span>
      </button>
    </div>
  </aside>
</template>
