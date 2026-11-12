<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'

const router = useRouter()
const { refreshUser } = useAuth()
const status = ref('loading')
const message = ref('')

onMounted(async () => {
  try {
    const ok = await refreshUser()
    if (ok) {
      status.value = 'success'
      message.value = 'Email berhasil diverifikasi.'
      setTimeout(() => router.replace({ name: 'dashboard' }), 1200)
    } else {
      status.value = 'error'
      message.value = 'Silakan selesaikan verifikasi melalui link di email Anda.'
    }
  } catch {
    status.value = 'error'
    message.value = 'Verifikasi belum selesai. Silakan masuk kembali.'
  }
})
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-warmcream px-4 py-10">
    <div class="w-full max-w-md bg-softwhite rounded-2xl shadow-lg p-8 text-center space-y-4">
      <p v-if="status === 'loading'" class="text-sm text-mocha">Memeriksa status verifikasi email...</p>
      <template v-else>
        <p class="text-sm text-mocha font-medium">{{ message }}</p>
        <RouterLink to="/auth" class="inline-block px-5 py-2.5 rounded-lg bg-terracotta text-white text-sm font-semibold">
          Kembali ke Halaman Masuk
        </RouterLink>
      </template>
    </div>
  </div>
</template>
