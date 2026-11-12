<!-- src/views/AiInsightView.vue -->
<template>
  <section class="spa-view space-y-6">
    <div class="p-6 sm:p-8 rounded-3xl bg-warmcream-100 border border-warmcream-300">
      <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div class="max-w-2xl">
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-softwhite border border-warmcream-300 text-xs font-semibold text-mocha-800">
            <span><BaseIcon name="sparkles" with-margin />Gemini Cognitive Psychologist Engine</span>
          </div>
          <h3 class="font-serif text-2xl sm:text-3xl font-semibold text-mocha-900 mt-3">
            Evaluasi Psikologis & Burnout
          </h3>
          <p class="text-xs sm:text-sm text-mocha-600 mt-2 leading-relaxed">
            Refleksi singkat dari pola fokus, ide yang diparkir, dan BrainFall hari ini.
          </p>
        </div>

        <button
          type="button"
          class="px-5 py-3.5 rounded-2xl bg-mocha-800 hover:bg-mocha-900 text-softwhite font-semibold text-xs shadow-md transition flex items-center justify-center gap-2 shrink-0"
          @click="generateEvaluation"
        >
          <BaseIcon name="sparkles" with-margin />Susun Evaluasi Sekarang
        </button>
      </div>

      <div class="mt-6 pt-5 border-t border-warmcream-300/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div class="text-xs text-mocha-700">
          <strong class="text-mocha-900">Gemini API Key (Opsional):</strong> kosongkan untuk pakai mesin bawaan.
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <input
            v-model="apiKey"
            type="password"
            class="w-full sm:w-64 px-3.5 py-2 rounded-xl bg-softwhite border border-warmcream-300 text-xs text-mocha-900 font-mono"
            placeholder="AIzaSy... (Opsional)"
          />
          <button type="button" class="px-3.5 py-2 rounded-xl bg-softwhite hover:bg-warmcream-200 border border-warmcream-300 text-xs font-semibold text-mocha-800">
            Simpan
          </button>
        </div>
      </div>
    </div>

    <!-- Hasil Evaluasi Terbaru -->
    <div v-if="latestEval" class="p-6 sm:p-8 rounded-3xl bg-warmcream-50 border border-warmcream-300 shadow-sm space-y-3">
      <span class="px-3 py-1 rounded-full bg-sage-100 text-sage-700 text-xs font-semibold">{{ latestEval.status }}</span>
      <h4 class="font-serif text-xl font-semibold text-mocha-900">{{ latestEval.date }}</h4>
      <p class="text-sm text-mocha-700 leading-relaxed">{{ latestEval.summary }}</p>
      <div class="p-4 rounded-2xl bg-softwhite border border-warmcream-200 text-xs text-mocha-800">
        <strong>Saran Kognitif:</strong> {{ latestEval.recommendation }}
      </div>
    </div>

    <!-- Riwayat Evaluasi -->
    <div class="p-6 rounded-3xl bg-warmcream-50 border border-warmcream-200">
      <h4 class="font-serif text-lg font-semibold text-mocha-900 mb-4">Riwayat Evaluasi</h4>
      <div class="space-y-3">
        <div
          v-for="ev in state.aiEvaluations"
          :key="ev.id"
          class="p-4 rounded-2xl bg-softwhite border border-warmcream-200"
        >
          <div class="flex justify-between text-xs font-semibold text-mocha-900">
            <span>{{ ev.status }}</span>
            <span class="text-mocha-500">{{ ev.date }}</span>
          </div>
          <p class="text-xs text-mocha-600 mt-1">{{ ev.summary }}</p>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, reactive } from 'vue'
import BaseIcon from '../components/ui/BaseIcon.vue'

const state = window.__kalafokus || reactive({
  settings: { reelsLimit: 30 },
  ideas: [],
  sessions: [],
  brainfallLogs: [],
  aiEvaluations: []
})

const apiKey = ref('')

const focusMinutesToday = computed(() =>
  state.sessions.reduce((acc, s) => acc + Number(s.duration || 0), 0)
)

const brainfallMinutesToday = computed(() =>
  state.brainfallLogs.reduce((acc, log) => acc + Number(log.duration || 0), 0)
)

const latestEval = computed(() => state.aiEvaluations[0])

function generateEvaluation() {
  const limit = Number(state.settings?.reelsLimit) || 30
  state.aiEvaluations.unshift({
    id: Date.now(),
    date: 'Evaluasi Real-Time Baru Saja',
    status: brainfallMinutesToday.value > limit ? 'Waspada Kelelahan Dopamin' : 'Fokus Terjaga Baik',
    summary: `Total fokus hari ini mencapai ${focusMinutesToday.value} menit dengan ${state.ideas.length} ide impulsif berhasil diamankan di Parkir Ide, serta konsumsi Reels ${brainfallMinutesToday.value} menit.`,
    recommendation: 'Pertahankan sesi kerja dengan metode Pomodoro dan pastikan Anda mempromosikan ide yang relevan menjadi tugas terjadwal.'
  })
}
</script>
