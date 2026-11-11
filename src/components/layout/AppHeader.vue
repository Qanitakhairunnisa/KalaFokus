<!-- src/components/layout/AppHeader.vue -->
<template>
  <header class="sticky top-0 z-20 bg-softwhite/90 backdrop-blur-md border-b border-warmcream-200 px-5 sm:px-8 py-4 flex flex-wrap items-center justify-between gap-3">
    <div>
      <p class="text-[11px] uppercase tracking-widest text-mocha-500 font-semibold">Rabu, 4 November 2026</p>
      <h2 class="font-serif text-xl sm:text-2xl font-semibold text-mocha-900">{{ pageTitle }}</h2>
    </div>

    <div class="flex items-center gap-2.5">
      <button
        type="button"
        class="px-3 py-2 rounded-xl bg-warmcream-100 hover:bg-warmcream-200 text-mocha-800 border border-warmcream-300 text-xs font-medium transition flex items-center gap-1.5"
        @click="state.isZenMode = !state.isZenMode"
      >
        <BaseIcon name="wind" />
        <span class="hidden sm:inline">{{ state.isZenMode ? 'Keluar Mode Tenang' : 'Mode Tenang' }}</span>
      </button>

      <button
        type="button"
        class="px-3.5 py-2 rounded-xl bg-mocha-800 hover:bg-mocha-900 text-softwhite text-xs font-semibold transition flex items-center gap-2 shadow-sm"
        @click="state.isIdeaDrawerOpen = true"
      >
        <span><BaseIcon name="message-circle" with-margin />Parkir Ide</span>
        <span class="px-1.5 py-0.5 rounded bg-warmcream-100/20 text-warmcream-100 text-[10px]">
          {{ state.ideas.length }}
        </span>
      </button>
    </div>
  </header>
</template>

<script setup>
import { computed } from 'vue';
import { useKalaFokus } from '../../composables/useKalaFokus';
import BaseIcon from '../ui/BaseIcon.vue';

const { state } = useKalaFokus();

const pageTitle = computed(() => {
  const titles = {
    dashboard: 'Dashboard',
    tasks: 'Manajemen Tugas',
    focus: 'Ruang Sesi Fokus',
    brainfall: 'Monitor BrainFall',
    'ai-insight': 'Evaluasi AI Gemini'
  };
  return titles[state.currentRoute] || 'Dashboard';
});
</script>