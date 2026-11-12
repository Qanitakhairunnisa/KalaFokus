<script setup>
// src/views/AuthView.vue
import { ref, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import AuthForm from '../components/auth/AuthForm.vue'
import GoogleButton from '../components/auth/GoogleButton.vue'
import VerifyEmailPanel from '../components/auth/VerifyEmailPanel.vue'

const router = useRouter()
const {
  state,
  needsVerification,
  register: registerUser,
  login: loginUser,
  loginWithGoogle,
  resendVerification,
  refreshUser,
  logout,
  getErrorMessage
} = useAuth()

const mode = ref('login') // 'login' | 'register'
const loading = ref(false)
const error = ref('')
const info = ref('')

// Jeda kirim ulang email supaya tidak kena "too-many-requests"
const cooldown = ref(0)
let timer = null
const startCooldown = () => {
  cooldown.value = 60
  clearInterval(timer)
  timer = setInterval(() => {
    cooldown.value -= 1
    if (cooldown.value <= 0) clearInterval(timer)
  }, 1000)
}
onUnmounted(() => clearInterval(timer))

const goHome = () => router.replace({ name: 'dashboard' })

const clearMessages = () => {
  error.value = ''
  info.value = ''
}

const switchMode = (m) => {
  mode.value = m
  clearMessages()
}

// Satu handler untuk login & register, dibedakan oleh `mode`
const handleSubmit = async (payload) => {
  clearMessages()
  loading.value = true
  try {
    if (mode.value === 'register') {
      await registerUser(payload)
      startCooldown()
      // needsVerification jadi true -> panel verifikasi muncul otomatis
    } else {
      const verified = await loginUser(payload)
      if (verified) goHome()
    }
  } catch (e) {
    error.value = getErrorMessage(e)
  } finally {
    loading.value = false
  }
}

const handleGoogle = async () => {
  clearMessages()
  loading.value = true
  try {
    await loginWithGoogle()
    goHome()
  } catch (e) {
    error.value = getErrorMessage(e)
  } finally {
    loading.value = false
  }
}

const handleCheckVerified = async () => {
  clearMessages()
  loading.value = true
  try {
    const ok = await refreshUser()
    if (ok) goHome()
    else error.value = 'Email belum terverifikasi. Klik link di email kami, lalu coba lagi.'
  } catch (e) {
    error.value = getErrorMessage(e)
  } finally {
    loading.value = false
  }
}

const handleResend = async () => {
  if (cooldown.value > 0) return
  clearMessages()
  try {
    await resendVerification()
    info.value = 'Email verifikasi dikirim ulang.'
    startCooldown()
  } catch (e) {
    error.value = getErrorMessage(e)
  }
}

const handleSwitchAccount = async () => {
  await logout()
  switchMode('login')
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-warmcream px-4 py-10">
    <div class="w-full max-w-md bg-softwhite rounded-2xl shadow-lg p-8">
      <h1 class="text-2xl font-bold text-mocha text-center">KalaFokus</h1>
      <p class="text-sm text-mocha/70 text-center mt-1 mb-6">Cognitive Workspace</p>

      <VerifyEmailPanel
        v-if="needsVerification"
        :email="state.user?.email"
        :loading="loading"
        :error="error"
        :info="info"
        :cooldown="cooldown"
        @check="handleCheckVerified"
        @resend="handleResend"
        @switch-account="handleSwitchAccount"
      />

      <div v-else>
        <div class="flex rounded-lg bg-warmcream p-1 mb-6">
          <button
            type="button"
            @click="switchMode('login')"
            :class="mode === 'login' ? 'bg-softwhite text-mocha shadow' : 'text-mocha/60'"
            class="flex-1 py-2 rounded-md text-sm font-semibold transition"
          >
            Masuk
          </button>
          <button
            type="button"
            @click="switchMode('register')"
            :class="mode === 'register' ? 'bg-softwhite text-mocha shadow' : 'text-mocha/60'"
            class="flex-1 py-2 rounded-md text-sm font-semibold transition"
          >
            Daftar
          </button>
        </div>

        <GoogleButton :disabled="loading" @click="handleGoogle" />

        <div class="flex items-center gap-3 my-5">
          <div class="flex-1 h-px bg-mocha/20"></div>
          <span class="text-xs text-mocha/60">atau dengan email</span>
          <div class="flex-1 h-px bg-mocha/20"></div>
        </div>

        <AuthForm :mode="mode" :loading="loading" :error="error" @submit="handleSubmit" />
      </div>
    </div>
  </div>
</template>