<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useKalaFokus } from '../../composables/useKalaFokus';

const route = useRoute();
const { state, formattedTimer, toggleTimer, logout } = useKalaFokus();

const userName = computed(() => state.user?.name || 'Pengguna');
const userInitial = computed(() => userName.value.charAt(0).toUpperCase());
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
        :class="state.timer?.isRunning
          ? 'bg-mocha-800 text-softwhite border-mocha-800'
          : 'bg-warmcream-100 border-warmcream-300 text-mocha-800 hover:bg-warmcream-200'">
        <span class="w-2 h-2 rounded-full"
          :class="state.timer?.isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-mocha-400'"></span>
        <span>{{ formattedTimer }}</span>
      </button>

      <!-- Tombol Buka Idea Drawer -->
      <button type="button" @click="state.isIdeaDrawerOpen = !state.isIdeaDrawerOpen"
        class="px-3 py-1.5 rounded-full bg-warmcream-100 hover:bg-warmcream-200 border border-warmcream-300 text-xs font-medium text-mocha-800 transition cursor-pointer"
        title="Buka Parkir Ide">
        💡 Ide ({{ state.ideas?.length || 0 }})
      </button>

      <!-- Tombol Detox -->
      <button type="button" @click="state.isDetoxModalOpen = !state.isDetoxModalOpen"
        class="hidden sm:inline-flex px-3 py-1.5 rounded-full bg-terracotta-500/10 hover:bg-terracotta-500/20 text-xs font-medium text-mocha-800 border border-warmcream-300 transition cursor-pointer">
        🧘 Detox
      </button>

      <!-- Profil Singkat & Tombol Keluar -->
      <button type="button" @click="logout"
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