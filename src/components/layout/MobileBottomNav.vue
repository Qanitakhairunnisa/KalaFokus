<!-- src/components/layout/MobileBottomNav.vue -->
<template>
  <nav
    v-show="!state.isZenMode"
    class="distraction-hide lg:hidden fixed bottom-0 inset-x-0 z-30 bg-softwhite/95 backdrop-blur-md border-t border-warmcream-300 px-2 py-2 grid grid-cols-5 gap-1 text-center"
  >
    <button
      v-for="item in items"
      :key="item.route"
      type="button"
      class="nav-btn flex flex-col items-center py-1.5 rounded-xl text-[10px] font-semibold"
      :class="state.currentRoute === item.route ? 'bg-warmcream-100 text-mocha-900' : 'text-mocha-600'"
      @click="navigate(item.route)"
    >
      <span class="text-base"><BaseIcon :name="item.icon" /></span>
      <span>{{ item.label }}</span>
    </button>
  </nav>
</template>

<script setup>
import { useKalaFokus } from '../../composables/useKalaFokus';
import BaseIcon from '../ui/BaseIcon.vue';

const { state, navigate } = useKalaFokus();

const items = [
  { route: 'dashboard', label: 'Dashboard', icon: 'layout-dashboard' },
  { route: 'tasks', label: 'Tugas', icon: 'clipboard-list' },
  { route: 'focus', label: 'Fokus', icon: 'hourglass' },
  { route: 'brainfall', label: 'BrainFall', icon: 'smartphone' },
  { route: 'ai-insight', label: 'AI Evaluasi', icon: 'sparkles' }
];
</script>