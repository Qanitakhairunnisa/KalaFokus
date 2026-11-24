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
    <NextTaskModal />
  </div>
</template>

<script setup>
import { watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAuth } from './composables/useAuth'
import { loadForUser } from './composables/useAppState'
import { useFocusTimer } from './composables/useFocusTimer'

import SvgSprite from './components/ui/SvgSprite.vue'
import AppSidebar from './components/layout/AppSidebar.vue'
import AppHeader from './components/layout/AppHeader.vue'
import MobileBottomNav from './components/layout/MobileBottomNav.vue'
import IdeaDrawer from './components/layout/IdeaDrawer.vue'
import DetoxModal from './components/modals/DetoxModal.vue'
import NextTaskModal from './components/modals/NextTaskModal.vue'
import AuthView from './views/AuthView.vue'

const route = useRoute()
const { state: authState, isAuthenticated } = useAuth()
const { resume } = useFocusTimer()

// Muat data milik akun yang sedang login (dan kosongkan saat logout)
watch(
  () => (isAuthenticated.value ? authState.user?.uid : null),
  (uid) => {
    loadForUser(uid)
    if (uid) resume()
  },
  { immediate: true }
)
</script>
