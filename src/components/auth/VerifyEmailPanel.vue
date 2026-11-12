<script setup>
// src/components/auth/VerifyEmailPanel.vue
defineProps({
  email: { type: String, default: '' },
  loading: Boolean,
  error: { type: String, default: '' },
  info: { type: String, default: '' },
  cooldown: { type: Number, default: 0 }
})

defineEmits(['check', 'resend', 'switch-account'])
</script>

<template>
  <div class="text-center space-y-4">
    <h2 class="text-lg font-semibold text-mocha">Verifikasi email Anda</h2>
    <p class="text-sm text-mocha/80">
      Kami mengirim link verifikasi ke
      <span class="font-semibold">{{ email }}</span>.
      Buka email tersebut (cek folder Spam juga), klik link-nya, lalu kembali ke sini.
    </p>

    <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
    <p v-if="info" class="text-sm text-green-700">{{ info }}</p>

    <button
      @click="$emit('check')"
      :disabled="loading"
      class="w-full py-2.5 rounded-lg bg-terracotta text-white font-semibold disabled:opacity-60"
    >
      {{ loading ? 'Memeriksa...' : 'Saya sudah verifikasi' }}
    </button>
    <button
      @click="$emit('resend')"
      :disabled="cooldown > 0"
      class="w-full py-2.5 rounded-lg border border-mocha/30 text-mocha disabled:opacity-50"
    >
      {{ cooldown > 0 ? `Kirim ulang email (${cooldown}d)` : 'Kirim ulang email' }}
    </button>
    <button @click="$emit('switch-account')" class="text-sm text-mocha/70 underline">
      Pakai akun lain
    </button>
  </div>
</template>