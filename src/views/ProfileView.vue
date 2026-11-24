<script setup>
// src/views/ProfileView.vue
import { computed } from 'vue'
import { useAuth } from '../composables/useAuth'

const { state } = useAuth()

const user = computed(() => state.user)
const userName = computed(
  () => user.value?.displayName || user.value?.email?.split('@')[0] || 'Pengguna'
)
const userInitial = computed(() => userName.value.charAt(0).toUpperCase())
</script>

<template>
  <div class="max-w-2xl mx-auto">
    <div class="bg-softwhite border border-warmcream-300 rounded-2xl shadow-sm p-6 md:p-8">
      <div class="flex items-center gap-4">
        <img v-if="user?.photoURL" :src="user.photoURL" alt="" referrerpolicy="no-referrer"
          class="w-16 h-16 rounded-full object-cover" />
        <div v-else
          class="w-16 h-16 rounded-full bg-mocha-800 flex items-center justify-center text-2xl font-bold text-softwhite">
          {{ userInitial }}
        </div>
        <div class="min-w-0">
          <h3 class="text-lg font-serif font-bold text-mocha-900 truncate">{{ userName }}</h3>
          <p class="text-sm text-mocha-800/70 truncate">{{ user?.email }}</p>
        </div>
      </div>

      <dl class="mt-6 divide-y divide-warmcream-300/60 text-sm">
        <div class="flex justify-between py-3">
          <dt class="text-mocha-800/70">Nama</dt>
          <dd class="font-medium text-mocha-900">{{ userName }}</dd>
        </div>
        <div class="flex justify-between py-3">
          <dt class="text-mocha-800/70">Email</dt>
          <dd class="font-medium text-mocha-900">{{ user?.email || '-' }}</dd>
        </div>
        <div class="flex justify-between py-3">
          <dt class="text-mocha-800/70">Status Email</dt>
          <dd>
            <span v-if="user?.emailVerified"
              class="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">Terverifikasi</span>
            <span v-else class="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">Belum
              terverifikasi</span>
          </dd>
        </div>
      </dl>
    </div>
  </div>
</template>
