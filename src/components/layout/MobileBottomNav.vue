<script setup>
import { useRoute } from 'vue-router'

const route = useRoute()

const navItems = [
  { name: 'Home', path: '/' },
  { name: 'Fokus', path: '/focus' },
  { name: 'Tugas', path: '/tasks' },
  { name: 'Brainfall', path: '/brainfall' },
  { name: 'AI', path: '/ai-insight' }
]
</script>

<template>
  <nav
    class="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-mocha-900/95 backdrop-blur border-t border-mocha-800 flex justify-around items-center h-16 px-2">
    <RouterLink v-for="item in navItems" :key="item.path" :to="item.path"
      class="flex flex-col items-center justify-center py-1 px-3 rounded-xl text-xs font-medium transition"
      :class="route.path === item.path ? 'text-softwhite font-semibold' : 'text-warmcream-300/70 hover:text-softwhite'">
      <span>{{ item.name }}</span>
      <span v-if="route.path === item.path" class="w-1.5 h-1.5 rounded-full bg-sage-600 mt-1"></span>
    </RouterLink>
  </nav>
</template>
