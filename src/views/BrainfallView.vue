<!-- src/views/BrainfallView.vue -->
<template>
  <section class="spa-view space-y-6">
    <div class="p-6 sm:p-8 rounded-3xl bg-warmcream-100 border border-warmcream-300 transition-all">
      <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div class="max-w-2xl">
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-softwhite border border-warmcream-300 text-xs font-semibold text-mocha-800">
            <span><BaseIcon name="smartphone" with-margin />Modul Adaptasi BrainFall</span>
            <span>•</span>
            <span :class="isBrainfallOverlimit ? 'text-terracotta-600' : 'text-sage-700'">
              {{ isBrainfallOverlimit ? 'Zona Overstimulasi' : 'Zona Dopamin Aman' }}
            </span>
          </div>
          <h3 class="font-serif text-2xl sm:text-3xl font-semibold text-mocha-900 mt-3">
            Batas Aman Tontonan Reels Harian
          </h3>
          <p class="text-xs sm:text-sm text-mocha-600 mt-2 leading-relaxed">
            Tetapkan batas harian Anda dan catat setiap sesi scrolling.
          </p>
        </div>

        <div class="p-4 rounded-2xl bg-softwhite border border-warmcream-300 shrink-0 w-full lg:w-72">
          <label class="block text-[11px] font-semibold uppercase tracking-wider text-mocha-500">Batas Aman Harian</label>
          <div class="flex items-center gap-2 mt-2">
            <input
              v-model.number="state.settings.reelsLimit"
              type="number"
              min="5"
              max="180"
              class="w-20 px-3 py-2 rounded-xl bg-warmcream-50 border border-warmcream-300 font-serif text-lg font-semibold text-mocha-900 text-center"
            />
            <span class="text-xs text-mocha-600 font-medium">menit/hari</span>
          </div>
        </div>
      </div>

      <div class="mt-6 pt-6 border-t border-warmcream-300/80">
        <div class="flex flex-wrap items-baseline justify-between gap-2 mb-2">
          <div>
            <span class="text-xs font-semibold text-mocha-800">Hari Ini: </span>
            <span class="font-serif text-xl font-semibold text-mocha-900">
              {{ brainfallMinutesToday }} / {{ state.settings.reelsLimit }} Menit ({{ brainfallPercentage }}%)
            </span>
          </div>
          <span class="text-xs text-mocha-600">~{{ Math.round(brainfallMinutesToday * 2.2) }} video</span>
        </div>

        <!-- Reusable ProgressBar -->
        <ProgressBar
          :percentage="brainfallPercentage"
          :color-class="isBrainfallOverlimit ? 'bg-terracotta-500' : 'bg-sage-600'"
          track-class="w-full h-4 rounded-full bg-softwhite border border-warmcream-300 overflow-hidden p-0.5"
        />

        <div class="mt-4 flex flex-wrap items-center justify-between gap-3">
          <span class="text-xs text-mocha-600 font-medium">Catat Cepat:</span>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="mins in [5, 10, 15]"
              :key="mins"
              type="button"
              class="px-3 py-1.5 rounded-xl border text-xs font-semibold transition"
              :class="mins === 15 ? 'bg-terracotta-50 border-terracotta-500/30 text-terracotta-700' : 'bg-softwhite border-warmcream-300 text-mocha-800'"
              @click="quickLog(mins)"
            >
              +{{ mins }}m
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Alert Banner jika Overlimit -->
    <div v-if="isBrainfallOverlimit" class="p-6 rounded-3xl bg-terracotta-50 border-2 border-terracotta-500 text-terracotta-700">
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2 font-bold text-sm uppercase tracking-wider">
            <span><BaseIcon name="siren" with-margin />Batas Aman Terlampaui</span>
          </div>
          <p class="text-xs sm:text-sm mt-1.5 leading-relaxed">Ambil jeda sejenak sebelum kembali bekerja.</p>
        </div>
        <button
          type="button"
          class="px-4 py-2.5 rounded-xl bg-terracotta-600 hover:bg-terracotta-700 text-white text-xs font-semibold shrink-0 shadow-sm transition"
          @click="state.isDetoxModalOpen = true"
        >
          <BaseIcon name="wind" with-margin />Reset Atensi 60 Detik
        </button>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div class="lg:col-span-5 p-6 rounded-3xl bg-warmcream-50 border border-warmcream-200 h-fit">
        <h4 class="font-serif text-lg font-semibold text-mocha-900">Jurnal Konsumsi Reels</h4>
        <form class="space-y-3.5 mt-4" @submit.prevent="submitFormLog">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-mocha-800 mb-1">Platform</label>
              <select v-model="form.platform" class="w-full px-3 py-2 rounded-xl bg-softwhite border border-warmcream-300 text-xs text-mocha-900">
                <option value="Instagram Reels">Instagram Reels</option>
                <option value="TikTok">TikTok</option>
                <option value="YouTube Shorts">YouTube Shorts</option>
                <option value="X / Mixed Feeds">X / Mixed Feeds</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-mocha-800 mb-1">Durasi (Menit)</label>
              <input v-model.number="form.duration" type="number" min="1" max="240" required class="w-full px-3 py-2 rounded-xl bg-softwhite border border-warmcream-300 text-xs text-mocha-900" />
            </div>
          </div>

          <div>
            <label class="block text-xs font-semibold text-mocha-800 mb-1">Konteks Pemicu Awal (Trigger)</label>
            <select v-model="form.trigger" class="w-full px-3 py-2 rounded-xl bg-softwhite border border-warmcream-300 text-xs text-mocha-900">
              <option value="istirahat_kebablasan">Niat istirahat 5 menit tapi kebablasan</option>
              <option value="prokrastinasi_tugas">Menghindari tugas yang terasa berat</option>
              <option value="kebosanan">Refleks membuka HP saat bosan</option>
              <option value="sebelum_tidur">Scrolling pasif sebelum tidur</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-semibold text-mocha-800 mb-1">Efek Kognitif Setelah Menonton</label>
            <select v-model="form.aftereffect" class="w-full px-3 py-2 rounded-xl bg-softwhite border border-warmcream-300 text-xs text-mocha-900">
              <option value="biasa_saja">Biasa saja / Netral</option>
              <option value="kabut_otak">Kabut otak (Sulit kembali fokus)</option>
              <option value="cemas_menyesal">Menyesal waktu terbuang</option>
              <option value="segar">Terhibur & siap kembali kerja</option>
            </select>
          </div>

          <button type="submit" class="w-full py-3 px-4 rounded-xl bg-mocha-800 hover:bg-mocha-900 text-softwhite text-xs font-semibold transition">
            Catat ke Log BrainFall
          </button>
        </form>
      </div>

      <div class="lg:col-span-7 p-6 rounded-3xl bg-warmcream-50 border border-warmcream-200">
        <h4 class="font-serif text-lg font-semibold text-mocha-900 mb-4">Riwayat Reels</h4>
        <div class="space-y-3">
          <div
            v-for="item in state.brainfallLogs"
            :key="item.id"
            class="p-4 rounded-2xl bg-softwhite border border-warmcream-200 flex items-center justify-between"
          >
            <div>
              <p class="text-xs font-semibold text-mocha-900">{{ item.platform }} ({{ item.duration }} mnt)</p>
              <span class="text-[11px] text-mocha-500">{{ item.trigger }} • {{ item.aftereffect }}</span>
            </div>
            <span class="text-xs text-mocha-500">{{ item.time }}</span>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { reactive, computed } from 'vue'
import BaseIcon from '../components/ui/BaseIcon.vue'
import ProgressBar from '../components/ui/ProgressBar.vue'

const state = window.__kalafokus || reactive({
  isDetoxModalOpen: false,
  settings: { reelsLimit: 30 },
  brainfallLogs: []
})

const brainfallMinutesToday = computed(() =>
  state.brainfallLogs.reduce((acc, log) => acc + Number(log.duration || 0), 0)
)

const brainfallPercentage = computed(() => {
  const limit = Number(state.settings?.reelsLimit) || 30
  return Math.min(100, Math.round((brainfallMinutesToday.value / limit) * 100))
})

const isBrainfallOverlimit = computed(() => {
  const limit = Number(state.settings?.reelsLimit) || 30
  return brainfallMinutesToday.value >= limit
})

const form = reactive({
  platform: 'Instagram Reels',
  duration: 10,
  trigger: 'istirahat_kebablasan',
  aftereffect: 'biasa_saja'
})

function logBrainfall({ platform, duration, trigger, aftereffect }) {
  state.brainfallLogs.unshift({
    id: Date.now(),
    platform,
    duration: Number(duration),
    trigger,
    aftereffect,
    time: new Date().toTimeString().slice(0, 5)
  })
  if (brainfallMinutesToday.value >= (Number(state.settings?.reelsLimit) || 30)) {
    state.isDetoxModalOpen = true
  }
}

function quickLog(mins) {
  logBrainfall({
    platform: 'Quick Log Reels',
    duration: mins,
    trigger: 'istirahat_kebablasan',
    aftereffect: 'biasa_saja'
  })
}

function submitFormLog() {
  logBrainfall({ ...form })
}
</script>
