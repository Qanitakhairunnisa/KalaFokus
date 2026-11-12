<!-- src/views/TasksView.vue -->
<template>
  <section class="spa-view tasks">
    <div class="tasks-layout">
      <form class="task-form" :class="{ 'is-editing': editingId }" @submit.prevent="saveTask">
        <h3 class="task-form__title">{{ editingId ? 'Edit Tugas' : 'Jadwalkan Tugas Baru' }}</h3>
        <label class="task-field">Judul
          <input v-model="form.title" type="text" required class="task-input" placeholder="Nama tugas" />
        </label>
        <label class="task-field">Tenggat
          <input v-model="form.deadline" type="datetime-local" required class="task-input" />
        </label>
        <div class="task-form__row">
          <label class="task-field">Beban
            <select v-model="form.load" class="task-input">
              <option value="high">Tinggi</option>
              <option value="medium">Sedang</option>
              <option value="low">Ringan</option>
            </select>
          </label>
          <label class="task-field">Sesi
            <input v-model.number="form.pomodoros" type="number" min="1" max="12" class="task-input" />
          </label>
        </div>
        <label class="task-field">Kategori
          <input v-model="form.category" type="text" class="task-input" />
        </label>
        <button type="submit" class="dash-btn dash-btn--primary">
          {{ editingId ? 'Simpan Perubahan' : 'Tambahkan' }}
        </button>
        <button v-if="editingId" type="button" class="dash-btn dash-btn--ghost task-form__cancel" @click="cancelEdit">
          Batal
        </button>
      </form>

      <div class="tasks-main">
        <!-- Reusable SegmentedControl -->
        <SegmentedControl v-model="activeFilter" :options="filterOptions" />

        <div class="task-list">
          <div
            v-for="task in filteredTasks"
            :key="task.id"
            class="task-card p-4 rounded-2xl bg-warmcream-50 border border-warmcream-200 flex items-center justify-between gap-3"
            :class="{ 'is-editing': editingId === task.id }"
          >
            <label class="flex items-start gap-3 cursor-pointer">
              <input v-model="task.completed" type="checkbox" class="mt-1" />
              <div>
                <p class="text-sm font-semibold text-mocha-900" :class="{ 'line-through opacity-50': task.completed }">
                  {{ task.title }}
                </p>
                <span class="text-xs text-mocha-500">{{ task.category }} • {{ task.deadline.replace('T', ' ') }}</span>
              </div>
            </label>
            <div class="task-card__side flex items-center gap-2">
              <span class="px-2.5 py-0.5 rounded-full text-[11px] bg-warmcream-200 text-mocha-800">{{ task.load }}</span>
              <button type="button" class="task-card__edit" title="Edit" @click="startEdit(task)">
                <BaseIcon name="pencil" />
              </button>
              <button type="button" class="task-card__edit text-terracotta-600" title="Hapus" @click="deleteTask(task.id)">
                <BaseIcon name="trash" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import SegmentedControl from '../components/ui/SegmentedControl.vue'
import BaseIcon from '../components/ui/BaseIcon.vue'

const state = window.__kalafokus || reactive({ tasks: [] })

const activeFilter = ref('all')
const editingId = ref(null)
const filterOptions = [
  { label: 'Semua', value: 'all' },
  { label: 'Aktif', value: 'pending' },
  { label: 'Selesai', value: 'completed' }
]

const form = reactive({
  title: '',
  deadline: '2026-11-13T12:00',
  load: 'medium',
  pomodoros: 2,
  category: 'Riset & Penulisan'
})

const filteredTasks = computed(() => {
  if (activeFilter.value === 'pending') return state.tasks.filter((t) => !t.completed)
  if (activeFilter.value === 'completed') return state.tasks.filter((t) => t.completed)
  return state.tasks
})

function saveTask() {
  if (editingId.value) {
    const idx = state.tasks.findIndex((t) => t.id === editingId.value)
    if (idx !== -1) Object.assign(state.tasks[idx], { ...form })
    cancelEdit()
  } else {
    state.tasks.push({ id: Date.now(), ...form, completed: false })
    form.title = ''
  }
}

function startEdit(task) {
  editingId.value = task.id
  Object.assign(form, {
    title: task.title,
    deadline: task.deadline,
    load: task.load,
    pomodoros: task.pomodoros,
    category: task.category
  })
}

function cancelEdit() {
  editingId.value = null
  form.title = ''
}

function deleteTask(id) {
  state.tasks = state.tasks.filter((t) => t.id !== id)
}
</script>
