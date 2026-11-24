<!-- src/components/modals/NextTaskModal.vue -->
<template>
  <div v-if="state.isNextTaskModalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div class="absolute inset-0 bg-mocha-900/50 backdrop-blur-xs" @click="close"></div>
    <div role="dialog" aria-modal="true" aria-labelledby="next-task-title"
      class="relative bg-softwhite border border-warmcream-300 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl">
      <div class="text-center">
        <div class="text-4xl">{{ last.completed ? '🎉' : '⏹️' }}</div>
        <h3 id="next-task-title" class="font-serif text-2xl font-semibold text-mocha-900 mt-2">
          {{ last.completed ? 'Pomodoro Selesai!' : 'Sesi Dihentikan' }}
        </h3>
        <p class="text-sm text-mocha-600 mt-1.5">
          <template v-if="last.minutes >= 1">
            Kamu fokus <strong>{{ last.minutes }} menit</strong>
            <template v-if="last.taskId"> pada "{{ taskTitle(last.taskId, last.taskTitle) }}"</template>.
          </template>
          <template v-else>Sesi kurang dari 1 menit, jadi tidak dicatat.</template>
        </p>
      </div>

      <label v-if="lastTask" class="mt-5 flex items-center gap-2 text-sm text-mocha-800 cursor-pointer">
        <input v-model="markLastDone" type="checkbox" />
        Tandai "{{ lastTask.title }}" sudah selesai
      </label>

      <h4 class="mt-5 text-xs uppercase tracking-widest font-bold text-mocha-800/70">Kegiatan Selanjutnya</h4>

      <div v-if="nextTasks.length" class="mt-2 space-y-2 max-h-64 overflow-y-auto pr-1">
        <label v-for="t in nextTasks" :key="t.id"
          class="flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition"
          :class="selectedId === t.id ? 'border-mocha-800 bg-warmcream-100' : 'border-warmcream-300 hover:bg-warmcream-50'">
          <input v-model="selectedId" type="radio" :value="t.id" class="mt-1" />
          <div class="min-w-0">
            <p class="text-sm font-semibold text-mocha-900 truncate">{{ t.title }}</p>
            <span class="text-xs text-mocha-500">
              {{ t.category }} • {{ formatDeadline(t.deadline) }} • {{ loadLabel[t.load] || t.load }}
            </span>
          </div>
        </label>
      </div>
      <div v-else class="mt-2 p-4 rounded-xl bg-warmcream-100 border border-warmcream-300 text-sm text-mocha-800 text-center">
        Belum ada tugas yang tersisa.
        <button type="button" class="underline font-semibold cursor-pointer" @click="goToTasks">Tambah di halaman Tugas</button>
      </div>

      <div class="mt-6 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
        <button type="button" @click="close"
          class="px-5 py-2.5 rounded-xl border border-warmcream-300 text-mocha-800 text-sm font-semibold hover:bg-warmcream-100 cursor-pointer">
          Istirahat Dulu
        </button>
        <button type="button" @click="startNext"
          class="px-5 py-2.5 rounded-xl bg-mocha-800 hover:bg-mocha-900 text-softwhite text-sm font-semibold cursor-pointer">
          ▶ Mulai Pomodoro Berikutnya
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useFocusTimer } from '../../composables/useFocusTimer'
import { formatDeadline, useAppState } from '../../composables/useAppState'

const router = useRouter()
const { start } = useFocusTimer()
const { state, taskTitle } = useAppState()

const loadLabel = { high: 'Beban tinggi', medium: 'Beban sedang', low: 'Beban ringan' }

const last = computed(() => state.lastSession || { completed: false, minutes: 0, taskId: null })
const lastTask = computed(() =>
  last.value.taskId ? state.tasks.find((t) => !t.completed && t.id === last.value.taskId) : null
)

const markLastDone = ref(false)
const selectedId = ref(null)

// Tugas yang belum selesai, diurutkan dari tenggat terdekat
const nextTasks = computed(() =>
  state.tasks
    .filter((t) => !t.completed && !(markLastDone.value && t.id === lastTask.value?.id))
    .slice()
    .sort((a, b) => String(a.deadline || '9999').localeCompare(String(b.deadline || '9999')))
)

// Setiap pop-up dibuka: pilih otomatis tugas yang tenggatnya paling dekat
watch(
  () => state.isNextTaskModalOpen,
  (open) => {
    if (!open) return
    markLastDone.value = false
    selectedId.value = nextTasks.value[0]?.id ?? null
  },
  { immediate: true }
)
// Kalau tugas terpilih dicentang selesai, pindah ke tugas berikutnya
watch(nextTasks, (list) => {
  if (!list.some((t) => t.id === selectedId.value)) selectedId.value = list[0]?.id ?? null
})

function applyChoices() {
  if (markLastDone.value && lastTask.value) lastTask.value.completed = true
  const next = state.tasks.find((t) => t.id === selectedId.value)
  state.timer.selectedTaskId = next ? next.id : null
  state.activeTaskId = next ? next.id : null
}

function close() {
  applyChoices()
  state.isNextTaskModalOpen = false
}

function startNext() {
  close()
  start()
  router.push('/focus')
}

function goToTasks() {
  close()
  router.push('/tasks')
}

const onKeydown = (e) => {
  if (e.key === 'Escape' && state.isNextTaskModalOpen) close()
}
onMounted(() => document.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown))
</script>
