<!-- src/App.vue -->
<template>
  <div class="bg-softwhite text-mocha-900 min-h-screen selection:bg-warmcream-200 selection:text-mocha-900">
    <!-- Sprite SVG Global -->
    <SvgSprite />

    <!-- Gerbang Autentikasi jika belum Login -->
    <AuthView v-if="!state.isAuthenticated" />

    <!-- Aplikasi Utama SPA KalaFokus -->
    <div v-else class="min-h-screen flex flex-col lg:flex-row bg-softwhite">
      <AppSidebar />

      <main class="flex-1 min-w-0 pb-24 lg:pb-12">
        <AppHeader />
        <div class="max-w-6xl mx-auto px-5 sm:px-8 pt-6">
          <component :is="activeViewComponent" />
        </div>
      </main>

      <MobileBottomNav />
    </div>

    <!-- Drawer & Modal Global -->
    <IdeaDrawer />
    <DetoxModal />
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useKalaFokus } from './composables/useKalaFokus';

import SvgSprite from './components/ui/SvgSprite.vue';
import AppSidebar from './components/layout/AppSidebar.vue';
import AppHeader from './components/layout/AppHeader.vue';
import MobileBottomNav from './components/layout/MobileBottomNav.vue';
import IdeaDrawer from './components/layout/IdeaDrawer.vue';
import DetoxModal from './components/modals/DetoxModal.vue';

import AuthView from './views/AuthView.vue';
import DashboardView from './views/DashboardView.vue';
import TasksView from './views/TasksView.vue';
import FocusView from './views/FocusView.vue';
import BrainfallView from './views/BrainfallView.vue';
import AiInsightView from './views/AiInsightView.vue';

const { state } = useKalaFokus();

const viewMap = {
  dashboard: DashboardView,
  tasks: TasksView,
  focus: FocusView,
  brainfall: BrainfallView,
  'ai-insight': AiInsightView
};

const activeViewComponent = computed(() => viewMap[state.currentRoute] || DashboardView);
</script>