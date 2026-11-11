<!-- src/components/layout/AppSidebar.vue -->
<template>
  <aside
    v-show="!state.isZenMode"
    class="distraction-hide lg:w-72 bg-softwhite border-b lg:border-b-0 lg:border-r border-warmcream-300/80 flex flex-col justify-between shrink-0 lg:sticky lg:top-0 lg:h-screen z-30"
  >
    <div>
      <!-- Brand Header -->
      <div class="p-6 border-b border-warmcream-300/70 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl bg-mocha-800 text-softwhite flex items-center justify-center font-serif font-semibold text-lg shadow-sm">
            K
          </div>
          <div>
            <h1 class="font-serif font-semibold text-lg text-mocha-900 leading-none">KalaFokus</h1>
            <span class="text-[11px] text-mocha-500 block mt-1">Cognitive Sanctuary</span>
          </div>
        </div>
        <button
          type="button"
          class="px-2.5 py-1 rounded-lg bg-softwhite border border-warmcream-300 text-[11px] font-medium text-mocha-700 hover:bg-warmcream-200 transition"
          title="Pasang Aplikasi ke Perangkat"
          @click="state.showPwaBanner = true"
        >
          <BaseIcon name="smartphone" with-margin />PWA
        </button>
      </div>

      <!-- Kartu Status Kognitif Pengguna -->
      <div class="px-5 py-4 border-b border-warmcream-300/60 bg-softwhite/50">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs font-semibold text-mocha-900">{{ state.user.name }}</p>
            <p class="text-[11px] text-mocha-500">Profil: {{ profileLabel }}</p>
          </div>
          <button
            type="button"
            class="lg:hidden px-3 py-1.5 rounded-lg border border-terracotta-500/40 bg-terracotta-50 text-terracotta-700 text-[11px] font-semibold flex items-center"
            @click="state.isAuthenticated = false"
          >
            <BaseIcon name="log-out" with-margin />Keluar
          </button>
        </div>

        <!-- Reusable ProgressBar -->
        <div class="mt-3 space-y-2">
          <ProgressBar
            label="Fokus Hari Ini"
            :stat-text="`${focusMinutesToday} / ${state.user.focusTarget} mnt`"
            :percentage="(focusMinutesToday / state.user.focusTarget) * 100"
            color-class="bg-sage-600"
          />
          <ProgressBar
            label="Paparan Reels (BrainFall)"
            :stat-text="`${brainfallMinutesToday} / ${state.user.reelsLimit} mnt`"
            :percentage="brainfallPercentage"
            :color-class="isBrainfallOverlimit ? 'bg-terracotta-500' : 'bg-mocha-600'"
          />
        </div>
      </div>

      <!-- Menu Navigasi Desktop -->
      <nav class="relative p-4 space-y-1 hidden lg:block" aria-label="Navigasi Utama">
        <button
          v-for="item in navItems"
          :key="item.route"
          type="button"
          class="nav-btn w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition"
          :class="state.currentRoute === item.route ? 'bg-warmcream-100 text-mocha-900' : 'text-mocha-600 hover:bg-warmcream-50'"
          @click="navigate(item.route)"
        >
          <span class="flex items-center gap-3">
            <span class="text-base"><BaseIcon :name="item.icon" /></span>
            <span>{{ item.label }}</span>
          </span>
          <span v-if="item.badge !== undefined" :class="item.badgeClass">
            {{ item.badge }}
          </span>
        </button>
      </nav>
    </div>

    <!-- Bagian Bawah Sidebar -->
    <div class="p-4 border-t border-warmcream-300/70 space-y-2.5 hidden lg:block">
      <button
        type="button"
        class="w-full py-2.5 px-3.5 rounded-xl bg-softwhite hover:bg-warmcream-200/70 border border-warmcream-300 text-left transition flex items-center justify-between"
        @click="state.isIdeaDrawerOpen = true"
      >
        <div>
          <span class="text-xs font-semibold text-mocha-900 block">
            <BaseIcon name="message-circle" with-margin />Panel Parkir Ide
          </span>
          <span class="text-[11px] text-mocha-500">Tangkap pikiran impulsif (Alt+P)</span>
        </div>
        <span class="px-2 py-0.5 rounded-lg bg-warmcream-200 text-mocha-800 text-xs font-bold">
          {{ state.ideas.length }}
        </span>
      </button>

      <div class="flex items-center justify-between pt-1">
        <button
          type="button"
          class="text-[11px] text-mocha-600 hover:text-mocha-900 font-medium"
          @click="state.isZenMode = !state.isZenMode"
        >
          <BaseIcon name="wind" with-margin />Mode Bebas Distraksi
        </button>
        <button
          type="button"
          class="px-3 py-1.5 rounded-lg border border-terracotta-500/40 bg-terracotta-50 hover:bg-terracotta-100 text-terracotta-700 text-[11px] font-semibold flex items-center transition"
          @click="state.isAuthenticated = false"
        >
          <BaseIcon name="log-out" with-margin />Keluar
        </button>
      </div>
    </div>
  </aside>
</template>

<script setup>
import { computed } from 'vue';
import { useKalaFokus } from '../../composables/useKalaFokus';
import BaseIcon from '../ui/BaseIcon.vue';
import ProgressBar from '../ui/ProgressBar.vue';

const {
  state,
  focusMinutesToday,
  pendingTasks,
  brainfallMinutesToday,
  brainfallPercentage,
  isBrainfallOverlimit,
  profileLabel,
  navigate
} = useKalaFokus();

const navItems = computed(() => [
  { route: 'dashboard', label: 'Dashboard', icon: 'layout-dashboard' },
  {
    route: 'tasks',
    label: 'Manajemen Tugas',
    icon: 'clipboard-list',
    badge: pendingTasks.value.length,
    badgeClass: 'px-2 py-0.5 rounded-full text-[10px] bg-warmcream-200 text-mocha-800'
  },
  { route: 'focus', label: 'Ruang Sesi Fokus', icon: 'hourglass' },
  {
    route: 'brainfall',
    label: 'Monitor BrainFall',
    icon: 'smartphone',
    badge: isBrainfallOverlimit.value ? 'Overlimit' : 'Aman',
    badgeClass: isBrainfallOverlimit.value
      ? 'px-2 py-0.5 rounded-full text-[10px] bg-terracotta-100 text-terracotta-700'
      : 'px-2 py-0.5 rounded-full text-[10px] bg-sage-100 text-sage-700'
  },
  { route: 'ai-insight', label: 'Evaluasi AI Gemini', icon: 'sparkles' }
]);
</script>