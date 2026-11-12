<script setup>
import { computed, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '../../composables/useAuth'

const route = useRoute()
const router = useRouter()
const { state: authState, logout: authLogout } = useAuth()

const appState = window.__kalafokus || reactive({
  isIdeaDrawerOpen: false,
  isDetoxModalOpen: false,
  ideas: [],
  timer: { isRunning: false, duration: 1500, remaining: 1500, intervalId: null }
})

const userName = computed(
  () => authState.user?.displayName || authState.user?.email?.split('@')[0] || 'Pengguna'
)
const userInitial = computed(() => userName.value.charAt(0).toUpperCase())

const formattedTimer = computed(() => {
  const s = Math.max(0, Number(appState.timer?.remaining) || 0)
  const m = String(Math.floor(s / 60)).padStart(2, '0')
  const sec = String(s % 60).padStart(2, '0')
  return `${m}:${sec}`
})

function toggleTimer() {
  if (!appState.timer) return
  if (appState.timer.isRunning) {
    clearInterval(appState.timer.intervalId)
    appState.timer.isRunning = false
  } else {
    appState.timer.isRunning = true
    clearInterval(appState.timer.intervalId)
    appState.timer.intervalId = setInterval(() => {
      if (appState.timer.remaining > 0) {
        appState.timer.remaining -= 1
      } else {
        clearInterval(appState.timer.intervalId)
        appState.timer.isRunning = false
        appState.timer.remaining = appState.timer.duration
      }
    }, 1000)
  }
}

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
  <header
    class="h-16 border-b border-warmcream-300/60 bg-softwhite/80 backdrop-blur px-4 md:px-8 flex items-center justify-between sticky top-0 z-30">
    <!-- Judul Halaman Otomatis dari Route Meta -->
    <div>
      <h2 class="text-base md:text-lg font-serif font-bold text-mocha-900">
        {{ route.meta.title || 'Dashboard' }}
      </h2>
    </div>

    <!-- Widget Kanan Header -->
    <div class="flex items-center gap-3">
      <!-- Mini Timer Pill (Klik untuk Play/Pause dari halaman mana saja) -->
      <button type="button" @click="toggleTimer"
        class="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono border transition cursor-pointer"
        :class="appState.timer?.isRunning
          ? 'bg-mocha-800 text-softwhite border-mocha-800'
          : 'bg-warmcream-100 border-warmcream-300 text-mocha-800 hover:bg-warmcream-200'">
        <span class="w-2 h-2 rounded-full"
          :class="appState.timer?.isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-mocha-400'"></span>
        <span>{{ formattedTimer }}</span>
      </button>

      <!-- Tombol Buka Idea Drawer -->
      <button type="button" @click="appState.isIdeaDrawerOpen = !appState.isIdeaDrawerOpen"
        class="px-3 py-1.5 rounded-full bg-warmcream-100 hover:bg-warmcream-200 border border-warmcream-300 text-xs font-medium text-mocha-800 transition cursor-pointer"
        title="Buka Parkir Ide">
        💡 Ide ({{ appState.ideas?.length || 0 }})
      </button>

      <!-- Tombol Detox -->
      <button type="button" @click="appState.isDetoxModalOpen = !appState.isDetoxModalOpen"
        class="hidden sm:inline-flex px-3 py-1.5 rounded-full bg-terracotta-500/10 hover:bg-terracotta-500/20 text-xs font-medium text-mocha-800 border border-warmcream-300 transition cursor-pointer">
        🧘 Detox
      </button>

      <!-- Profil Singkat & Tombol Keluar -->
      <button type="button" @click="handleLogout"
        class="flex items-center gap-2 pl-2 border-l border-warmcream-300 text-xs text-mocha-800 hover:text-mocha-900 cursor-pointer"
        title="Klik untuk keluar / ganti akun">
        <div class="w-7 h-7 rounded-full bg-mocha-800 flex items-center justify-center font-bold text-softwhite">
          {{ userInitial }}
        </div>
        <span class="hidden lg:inline font-medium">{{ userName }}</span>
      </button>
    </div>
  </header>
</template>
