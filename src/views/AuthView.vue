<!-- src/views/AuthView.vue -->
<template>
  <section
    class="min-h-screen flex items-center justify-center p-5 sm:p-10 relative overflow-hidden bg-gradient-to-br from-mocha-700 via-mocha-800 to-mocha-900">
    <span class="pointer-events-none absolute -top-8 -left-8 w-24 h-24 rounded-full border-2 border-white/25"></span>
    <span class="pointer-events-none absolute -bottom-10 -right-10 w-40 h-40 rounded-full bg-white/10"></span>

    <div
      class="relative z-10 w-full max-w-4xl bg-softwhite rounded-[28px] sm:rounded-[36px] shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-2">
      <div class="hidden lg:block relative bg-mocha-800">
        <img src="./download (36).jpg'" @error="onImageError" alt="Ilustrasi KalaFokus"
          class="w-full h-full object-cover" />
      </div>

      <div class="p-8 sm:p-10 lg:p-12 flex flex-col justify-center">
        <div>
          <h2 class="font-serif text-2xl sm:text-[26px] font-bold text-mocha-900">
            {{ isRegister ? 'Buat Akun Baru' : 'Masuk ke Akun Anda' }}
          </h2>
          <p class="text-xs sm:text-sm text-mocha-600 mt-1.5 leading-relaxed">
            Kelola fokus tanpa batas. Gratis selamanya.
          </p>
        </div>

        <!-- Form Login -->
        <form v-if="!isRegister" class="space-y-4 mt-7" @submit.prevent="handleLogin">
          <input v-model="loginEmail" type="email" required
            class="w-full py-2.5 border-b border-warmcream-300 bg-transparent text-sm text-mocha-900 focus:outline-none focus:border-mocha-700 transition"
            placeholder="Email" />
          <input v-model="loginPassword" type="password" required
            class="w-full py-2.5 border-b border-warmcream-300 bg-transparent text-sm text-mocha-900 focus:outline-none focus:border-mocha-700 transition"
            placeholder="Password" />
          <div class="pt-2 flex items-center justify-center">
            <button type="submit"
              class="px-7 py-2.5 rounded-full bg-mocha-800 hover:bg-mocha-900 text-softwhite font-semibold text-sm shadow-sm transition flex items-center gap-2 cursor-pointer">
              <span>Masuk</span>
              <BaseIcon name="arrow-right" />
            </button>
          </div>
        </form>

        <!-- Form Registrasi -->
        <form v-else class="space-y-4 mt-7" @submit.prevent="handleRegister">
          <input v-model="regForm.name" type="text" required
            class="w-full py-2.5 border-b border-warmcream-300 bg-transparent text-sm text-mocha-900 focus:outline-none focus:border-mocha-700 transition"
            placeholder="Nama atau nickname" />
          <input v-model="regForm.email" type="email" required
            class="w-full py-2.5 border-b border-warmcream-300 bg-transparent text-sm text-mocha-900 focus:outline-none focus:border-mocha-700 transition"
            placeholder="Email" />
          <input v-model="regForm.password" type="password" minlength="8" required
            class="w-full py-2.5 border-b border-warmcream-300 bg-transparent text-sm text-mocha-900 focus:outline-none focus:border-mocha-700 transition"
            placeholder="Password (min. 8 karakter)" />
          <div class="grid grid-cols-2 gap-4 pt-1">
            <div>
              <label class="block text-[11px] font-semibold text-mocha-500 mb-1">Profil Kognitif</label>
              <select v-model="regForm.profile"
                class="w-full py-1.5 border-b border-warmcream-300 bg-transparent text-xs text-mocha-900 focus:outline-none">
                <option value="deep_thinker">Deep Thinker (50m)</option>
                <option value="balanced_explorer">Balanced (25m)</option>
                <option value="sprint_worker">Sprint Worker (15m)</option>
              </select>
            </div>
            <div>
              <label class="block text-[11px] font-semibold text-mocha-500 mb-1">Batas Reels/Hari</label>
              <input v-model.number="regForm.reelsLimit" type="number" min="10" max="120"
                class="w-full py-1.5 border-b border-warmcream-300 bg-transparent text-xs text-mocha-900 focus:outline-none" />
            </div>
          </div>
          <div class="pt-2 flex items-center justify-center">
            <button type="submit"
              class="px-7 py-2.5 rounded-full bg-mocha-800 hover:bg-mocha-900 text-softwhite font-semibold text-sm shadow-sm transition flex items-center gap-2 cursor-pointer">
              <span>Daftar</span>
              <BaseIcon name="arrow-right" />
            </button>
          </div>
        </form>

        <p class="text-center text-xs text-mocha-600 mt-6">
          <span v-if="!isRegister">
            Belum punya akun?
            <button type="button" class="text-mocha-800 font-semibold hover:underline" @click="isRegister = true">
              Daftar
            </button>
          </span>
          <span v-else>
            Sudah punya akun?
            <button type="button" class="text-mocha-800 font-semibold hover:underline" @click="isRegister = false">
              Masuk
            </button>
          </span>
        </p>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { useKalaFokus } from '../composables/useKalaFokus';
import BaseIcon from '../components/ui/BaseIcon.vue';

const { state, login, register, navigate } = useKalaFokus();

const isRegister = ref(false);
const loginEmail = ref('nadia@kalafokus.id');
const loginPassword = ref('kalafokus2026');


const regForm = reactive({
  name: '',
  email: '',
  password: '',
  profile: 'balanced_explorer',
  reelsLimit: 30
});

function handleLogin() {
  if (login) {
    login({ email: loginEmail.value, password: loginPassword.value });
  } else {
    state.user.email = loginEmail.value;
    state.isAuthenticated = true;
    navigate('dashboard');
  }
}

function handleRegister() {
  if (register) {
    register({ ...regForm });
  } else {
    state.user.name = regForm.name;
    state.user.email = regForm.email;
    state.user.profile = regForm.profile;
    state.user.reelsLimit = regForm.reelsLimit;
    state.isAuthenticated = true;
    navigate('dashboard');
  }
}
</script>