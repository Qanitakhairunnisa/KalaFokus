<script setup>
// src/components/auth/AuthForm.vue
// Satu form untuk Masuk DAN Daftar, dibedakan lewat prop `mode`.
// Contoh: <AuthForm mode="login" :loading="loading" :error="error" @submit="handleSubmit" />
import { reactive, ref, computed, watch } from 'vue'
import FormInput from './FormInput.vue'

const props = defineProps({
  mode: {
    type: String,
    default: 'login',
    validator: (v) => ['login', 'register'].includes(v)
  },
  loading: Boolean,
  error: { type: String, default: '' } // error dari server/Firebase (dikirim parent)
})

const emit = defineEmits(['submit'])

const isRegister = computed(() => props.mode === 'register')
const form = reactive({ name: '', email: '', password: '', confirm: '' })
const localError = ref('') // error validasi form

// Email tetap terisi saat pindah tab; sandi dan error dibersihkan
watch(
  () => props.mode,
  () => {
    form.password = ''
    form.confirm = ''
    localError.value = ''
  }
)

const submit = () => {
  localError.value = ''

  if (isRegister.value) {
    if (!form.name.trim()) return (localError.value = 'Nama wajib diisi.')
    if (form.password.length < 8) return (localError.value = 'Kata sandi minimal 8 karakter.')
    if (form.password !== form.confirm) return (localError.value = 'Konfirmasi kata sandi tidak cocok.')
  }

  emit('submit', {
    name: form.name.trim(),
    email: form.email.trim(),
    password: form.password
  })
}
</script>

<template>
  <form @submit.prevent="submit" class="space-y-4">
    <FormInput
      v-if="isRegister"
      v-model="form.name"
      label="Nama"
      autocomplete="name"
    />

    <FormInput
      v-model="form.email"
      label="Email"
      type="email"
      autocomplete="email"
    />

    <FormInput
      v-model="form.password"
      label="Kata sandi"
      type="password"
      :autocomplete="isRegister ? 'new-password' : 'current-password'"
    />

    <FormInput
      v-if="isRegister"
      v-model="form.confirm"
      label="Konfirmasi kata sandi"
      type="password"
      autocomplete="new-password"
    />

    <p v-if="localError || error" class="text-sm text-red-600">{{ localError || error }}</p>

    <button
      type="submit"
      :disabled="loading"
      class="w-full py-2.5 rounded-lg bg-terracotta text-white font-semibold disabled:opacity-60"
    >
      {{ loading ? 'Memproses...' : isRegister ? 'Daftar' : 'Masuk' }}
    </button>
  </form>
</template>