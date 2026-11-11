<!-- src/App.vue -->
<template>
  <SvgSprite />

  <AuthView v-if="!state.isAuthenticated || route.name === 'auth'" />

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
import { useRoute } from 'vue-router';
import { useKalaFokus } from './composables/useKalaFokus';

import SvgSprite from './components/ui/SvgSprite.vue';
import AppSidebar from './components/layout/AppSidebar.vue';
import AppHeader from './components/layout/AppHeader.vue';
import MobileBottomNav from './components/layout/MobileBottomNav.vue';
import IdeaDrawer from './components/layout/IdeaDrawer.vue';
import DetoxModal from './components/modals/DetoxModal.vue';
import AuthView from './views/AuthView.vue';

const route = useRoute();
const { state } = useKalaFokus();
</script>