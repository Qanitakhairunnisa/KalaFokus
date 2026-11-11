<script setup>
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { api } from '@/lib/api'

const route = useRoute()
const status = ref('loading') // loading | success | error
const message = ref('')

onMounted(async () => {
  try {
    const { data } = await api.post('/auth/verify-email', { token: route.query.token })
    status.value = 'success'
    message.value = data.message
  } catch (e) {
    status.value = 'error'
    message.value = e.response?.data?.message ?? 'Verifikasi gagal.'
  }
})
</script>

<template>
  <div>
    <p v-if="status === 'loading'">Memverifikasi email...</p>
    <template v-else>
      <p>{{ message }}</p>
      <router-link v-if="status === 'success'" to="/login">Ke halaman login</router-link>
      <router-link v-else to="/register">Kirim ulang verifikasi</router-link>
    </template>
  </div>
</template>