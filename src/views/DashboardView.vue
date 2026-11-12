<!-- src/views/DashboardView.vue -->
<template>
  <section class="spa-view dash">
    <div class="dash-top">
      <h3 class="dash-greeting">Halo, {{ firstName }}.</h3>
      <div class="dash-actions">
        <button type="button" class="dash-btn dash-btn--primary" @click="router.push('/focus')">
          Mulai Fokus
        </button>
        <button type="button" class="dash-btn dash-btn--ghost" @click="router.push('/tasks')">
          Tugas
        </button>
      </div>
    </div>

    <!-- Pemakaian Reusable StatCard -->
    <div class="dash-stats">
      <StatCard variant="a" icon="hourglass" :value="focusMinutesToday" :unit="`/ ${state.settings?.focusTarget || 120} mnt`"
        label="Fokus" />
      <StatCard variant="b" icon="clipboard-list" :value="pendingTasks.length" unit="tugas" label="Antrean" />
      <StatCard variant="c" icon="message-circle" :value="state.ideas.length" unit="ide" label="Parkir Ide" />
      <StatCard variant="d" icon="smartphone" :value="brainfallMinutesToday"
        :unit="`/ ${state.settings?.reelsLimit || 30} mnt`" label="BrainFall" />
    </div>

    <div class="dash-grid">
      <!-- Pemakaian Reusable BasePanel -->
      <BasePanel title="Tugas Prioritas">
        <template #action>
          <button type="button" class="dash-link" @click="router.push('/tasks')">Semua</button>
        </template>
        <div class="dash-table-wrap">
          <table class="dash-table">
            <thead>
              <tr>
                <th>Tugas</th>
                <th>Tenggat</th>
                <th>Beban</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="task in pendingTasks.slice(0, 4)" :key="task.id">
                <td class="dash-cell-title font-medium">{{ task.title }}</td>
                <td>{{ formatDeadline(task.deadline) }}</td>
                <td><span>{{ task.load }}</span></td>
                <td>
                  <button type="button" class="dash-link" @click="startFocusOnTask(task)">
                    Fokus
                  </button>
                </td>
              </tr>
              <tr v-if="pendingTasks.length === 0">
                <td colspan="4" class="text-center py-4 text-xs opacity-60">
                  Semua tugas selesai! Tambahkan tugas baru di menu Tugas.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </BasePanel>

      <aside class="dash-ideas">
        <div class="flex items-center justify-between mb-2">
          <h4>Parkir Ide</h4>
          <button type="button" class="dash-link text-xs" @click="state.isIdeaDrawerOpen = true">
            + Tambah
          </button>
        </div>
        <ul v-if="state.ideas.length > 0">
          <li v-for="idea in state.ideas.slice(0, 4)" :key="idea.id">
            {{ idea.text }}
          </li>
        </ul>
        <p v-else class="text-xs opacity-60 py-2">Belum ada ide yang diparkir.</p>
      </aside>
    </div>

    <BasePanel title="Sesi Terbaru" panel-class="dash-panel dash-panel--wide">
      <div class="dash-table-wrap">
        <table class="dash-table">
          <thead>
            <tr>
              <th>Tugas</th>
              <th>Durasi</th>
              <th>Skor</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="session in state.sessions" :key="session.id">
              <td class="dash-cell-title">{{ session.taskTitle }}</td>
              <td>{{ session.duration }} mnt</td>
              <td>{{ session.score }}%</td>
            </tr>
            <tr v-if="!state.sessions || state.sessions.length === 0">
              <td colspan="3" class="text-center py-4 text-xs opacity-60">
                Belum ada riwayat sesi fokus hari ini.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </BasePanel>
  </section>
</template>

<script setup>
import { computed, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import StatCard from '../components/ui/StatCard.vue'
import BasePanel from '../components/ui/BasePanel.vue'

const router = useRouter()
const { state: authState } = useAuth()

const state = window.__kalafokus || reactive({
  isIdeaDrawerOpen: false,
  activeTaskId: null,
  settings: { focusTarget: 120, reelsLimit: 30 },
  tasks: [],
  ideas: [],
  sessions: [],
  brainfallLogs: [],
  timer: { selectedTaskTitle: 'Sesi Fokus Mandiri' }
})

const firstName = computed(() => {
  const full = authState.user?.displayName || authState.user?.email?.split('@')[0] || 'Teman'
  return full.split(' ')[0]
})

const pendingTasks = computed(() => state.tasks.filter((t) => !t.completed))

const focusMinutesToday = computed(() =>
  state.sessions.reduce((acc, s) => acc + Number(s.duration || 0), 0)
)

const brainfallMinutesToday = computed(() =>
  state.brainfallLogs.reduce((acc, l) => acc + Number(l.duration || 0), 0)
)

function formatDeadline(deadline) {
  if (!deadline) return '-'
  return deadline.replace('T', ' ')
}

function startFocusOnTask(task) {
  state.activeTaskId = task.id
  if (state.timer) {
    state.timer.selectedTaskTitle = task.title
  }
  router.push('/focus')
}
</script>
