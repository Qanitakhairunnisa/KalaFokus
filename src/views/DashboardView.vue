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
              <tr v-for="task in priorityTasks" :key="task.id">
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

    <BasePanel title="Sesi Hari Ini" panel-class="dash-panel dash-panel--wide">
      <div class="dash-table-wrap">
        <table class="dash-table">
          <thead>
            <tr>
              <th>Tugas</th>
              <th>Durasi</th>
              <th>Skor</th>
              <th>Status Tugas</th>
              <th>Catatan Terakhir</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="session in sessionsToday" :key="session.id">
              <td class="dash-cell-title">{{ taskTitle(session.taskId, session.taskTitle) }}</td>
              <td>{{ formatMinutes(session.duration) }}</td>
              <td>{{ session.score }}%</td>
              <td>
                <span class="session-status" :class="`session-status--${sessionTaskStatus(session)}`">
                  {{ TASK_STATUS_LABEL[sessionTaskStatus(session)] }}
                </span>
              </td>
              <td class="session-note" :title="session.note">{{ session.note || '—' }}</td>
            </tr>
            <tr v-if="sessionsToday.length === 0">
              <td colspan="5" class="text-center py-4 text-xs opacity-60">
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
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import { TASK_STATUS_LABEL, formatDeadline, formatMinutes, isToday, useAppState } from '../composables/useAppState'
import StatCard from '../components/ui/StatCard.vue'
import BasePanel from '../components/ui/BasePanel.vue'

const router = useRouter()
const { state: authState } = useAuth()
const { state, pendingTasks, focusMinutesToday, brainfallMinutesToday, taskTitle, sessionTaskStatus } = useAppState()

const firstName = computed(() => {
  const full = authState.user?.displayName || authState.user?.email?.split('@')[0] || 'Teman'
  return full.split(' ')[0]
})

// Tugas prioritas = tenggat terdekat dulu
const priorityTasks = computed(() =>
  pendingTasks.value
    .slice()
    .sort((a, b) => String(a.deadline || '9999').localeCompare(String(b.deadline || '9999')))
    .slice(0, 4)
)

const sessionsToday = computed(() => state.sessions.filter(isToday))

function startFocusOnTask(task) {
  state.activeTaskId = task.id
  if (!state.timer.isRunning) state.timer.selectedTaskId = task.id
  router.push('/focus')
}
</script>

<style scoped>
.session-status {
  display: inline-block;
  padding: 0.15rem 0.55rem;
  border-radius: 999px;
  font-size: 0.7rem;
  font-weight: 600;
  white-space: nowrap;
  background: #f1ece4;
  color: #6b5a4a;
}
.session-status--done { background: #e3efe3; color: #3f6b46; }
.session-status--pending { background: #fbeee0; color: #a2622a; }
.session-note {
  max-width: 260px;
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 0.75rem;
}
@media (max-width: 768px) {
  .dash {
    display: flex;
    flex-direction: column;
  }

  /* 1. Header sapaan & tombol tetap di paling atas */
  .dash-top {
    order: 1;
  }

  /* 2. Tugas Prioritas & Parkir Ide naik ke atas */
  .dash-grid {
    order: 2;
  }

  /* 3. Sesi Terbaru tepat di bawahnya */
  .dash :deep(.dash-panel--wide) {
    order: 3;
  }

  /* 4. Kartu Fokus, Antrean, Parkir Ide, BrainFall pindah ke paling bawah */
  .dash-stats {
    order: 4;
    margin-top: 1rem; /* Jaga jarak dari panel Sesi Terbaru jika sebelumnya tidak ada gap */
  }
}
</style>
