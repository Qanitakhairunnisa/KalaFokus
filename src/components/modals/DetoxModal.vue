<!-- src/components/modals/DetoxModal.vue -->
<template>
  <div v-if="state.isDetoxModalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div class="absolute inset-0 bg-mocha-900/50 backdrop-blur-xs" @click="state.isDetoxModalOpen = false"></div>
    <div class="relative bg-softwhite border border-warmcream-300 rounded-3xl max-w-lg w-full p-6 sm:p-8 text-center shadow-2xl">
      <div class="w-16 h-16 rounded-full bg-terracotta-100 text-terracotta-700 flex items-center justify-center mx-auto text-2xl">
        <BaseIcon name="leaf" />
      </div>
      <span class="text-[11px] uppercase tracking-widest text-terracotta-600 font-bold block mt-3">
        Intervensi Psikologi Kognitif
      </span>
      <h3 class="font-serif text-2xl font-semibold text-mocha-900 mt-1">Batas Aman Tontonan Reels Terlampaui</h3>
      <p class="text-xs sm:text-sm text-mocha-600 mt-2.5 leading-relaxed">
        Otak Anda baru saja menerima ratusan stimulus visual berganti cepat. Sebelum kembali ke tugas utama, lakukan
        <strong>Jeda Dekompresi Dopamin</strong> selama beberapa napas dalam agar rentang atensi pulih.
      </p>

      <div class="my-6 p-5 rounded-2xl bg-warmcream-100 border border-warmcream-300">
        <p class="font-serif italic text-mocha-800 text-sm">
          "Tarik napas perlahan selama 4 detik... tahan 4 detik... embuskan perlahan selama 6 detik. Alihkan pandangan ke objek sejauh 6 meter dari layar."
        </p>
      </div>

      <div class="flex items-center justify-center gap-3">
        <button
          type="button"
          class="px-5 py-2.5 rounded-xl bg-mocha-800 hover:bg-mocha-900 text-softwhite text-xs font-semibold transition"
          @click="state.isDetoxModalOpen = false"
        >
          Saya Sudah Menjauhkan Ponsel & Siap Fokus
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useKalaFokus } from '../../composables/useKalaFokus';
import BaseIcon from '../ui/BaseIcon.vue';

const { state } = useKalaFokus();
</script>