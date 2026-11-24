<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '../../composables/useAuth'
import { useFocusTimer } from '../../composables/useFocusTimer'

const route = useRoute()
const router = useRouter()
const { state: authState, logout: authLogout } = useAuth()
const { cancel: cancelTimer } = useFocusTimer()

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

// Pill timer di header hanya membuka halaman Mode Fokus (tidak bisa jeda dari sini)
function goToFocus() {
  router.push('/focus')
}

// Dropdown profil
const isMenuOpen = ref(false)
const menuRef = ref(null)

const onClickOutside = (e) => {
  if (menuRef.value && !menuRef.value.contains(e.target)) isMenuOpen.value = false
}
const onKeydown = (e) => {
  if (e.key === 'Escape') isMenuOpen.value = false
}
onMounted(() => {
  document.addEventListener('click', onClickOutside)
  document.addEventListener('keydown', onKeydown)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', onClickOutside)
  document.removeEventListener('keydown', onKeydown)
})
// Tutup dropdown setiap pindah halaman
watch(() => route.fullPath, () => (isMenuOpen.value = false))

function goToProfile() {
  isMenuOpen.value = false
  router.push({ name: 'profile' })
}

function openDetox() {
  isMenuOpen.value = false
  appState.isDetoxModalOpen = true
}

async function handleLogout() {
  isMenuOpen.value = false
  cancelTimer()
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
      <!-- Mini Timer Pill (Klik untuk membuka Mode Fokus) -->
      <button type="button" @click="goToFocus" title="Buka Mode Fokus"
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

      <!-- Profil + Dropdown -->
      <div ref="menuRef" class="relative pl-2 border-l border-warmcream-300">
        <button type="button" @click="isMenuOpen = !isMenuOpen" aria-haspopup="menu" :aria-expanded="isMenuOpen"
          class="flex items-center gap-2 text-xs text-mocha-800 hover:text-mocha-900 cursor-pointer">
          <img v-if="authState.user?.photoURL" :src="authState.user.photoURL" alt="" referrerpolicy="no-referrer"
            class="w-7 h-7 rounded-full object-cover" />
          <div v-else class="w-7 h-7 rounded-full bg-mocha-800 flex items-center justify-center font-bold text-softwhite">
            {{ userInitial }}
          </div>
          <span class="hidden lg:inline font-medium">{{ userName }}</span>
          <svg class="w-3 h-3 transition-transform" :class="isMenuOpen && 'rotate-180'" viewBox="0 0 20 20"
            fill="currentColor" aria-hidden="true">
            <path fill-rule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
              clip-rule="evenodd" />
          </svg>
        </button>

        <Transition enter-from-class="opacity-0 -translate-y-1" enter-active-class="transition duration-150"
          leave-to-class="opacity-0 -translate-y-1" leave-active-class="transition duration-100">
          <div v-if="isMenuOpen" role="menu"
            class="absolute right-0 mt-2 w-56 rounded-xl bg-softwhite border border-warmcream-300 shadow-lg py-1.5 z-40">
            <div class="px-4 py-2 border-b border-warmcream-300/60">
              <p class="text-sm font-semibold text-mocha-900 truncate">{{ userName }}</p>
              <p class="text-xs text-mocha-800/60 truncate">{{ authState.user?.email }}</p>
            </div>
            <button type="button" role="menuitem" @click="goToProfile"
              class="w-full text-left px-4 py-2 text-sm text-mocha-800 hover:bg-warmcream-100 cursor-pointer">
              👤 Lihat Profil
            </button>
            <!-- Di layar kecil sidebar tersembunyi, jadi akses Detox ditaruh di sini -->
            <button type="button" role="menuitem" @click="openDetox"
              class="lg:hidden w-full text-left px-4 py-2 text-sm text-mocha-800 hover:bg-warmcream-100 cursor-pointer">
              🧘 Mode Digital Detox
            </button>
            <button type="button" role="menuitem" @click="handleLogout"
              class="w-full text-left px-4 py-2 text-sm text-terracotta-600 hover:bg-terracotta-50 cursor-pointer">
              🚪 Keluar
            </button>
          </div>
        </Transition>
      </div>
    </div>
  </header>
</template>
