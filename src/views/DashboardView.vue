<!-- src/views/DashboardView.vue -->
<template>
  <section class="spa-view dash">
    <div class="dash-top">
      <h3 class="dash-greeting">Halo, {{ state.user.name.split(' ')[0] }}.</h3>
      <div class="dash-actions">
        <button type="button" class="dash-btn dash-btn--primary" @click="navigate('focus')">Mulai Fokus</button>
        <button type="button" class="dash-btn dash-btn--ghost" @click="navigate('tasks')">Tugas</button>
      </div>
    </div>

    <!-- Pemakaian Reusable StatCard -->
    <div class="dash-stats">
      <StatCard
        variant="a"
        icon="hourglass"
        :value="focusMinutesToday"
        :unit="`/ ${state.user.focusTarget} mnt`"
        label="Fokus"
      />
      <StatCard
        variant="b"
        icon="clipboard-list"
        :value="pendingTasks.length"
        unit="tugas"
        label="Antrean"
      />
      <StatCard
        variant="c"
        icon="message-circle"
        :value="state.ideas.length"
        unit="ide"
        label="Parkir Ide"
      />
      <StatCard
        variant="d"
        icon="smartphone"
        :value="brainfallMinutesToday"
        :unit="`/ ${state.user.reelsLimit} mnt`"
        label="BrainFall"
      />
    </div>

    <div class="dash-grid">
      <!-- Pemakaian Reusable BasePanel -->
      <BasePanel title="Tugas Prioritas">
        <template #action>
          <button type="button" class="dash-link" @click="navigate('tasks')">Semua</button>
        </template>
        <div class="dash-table-wrap">
          <table class="dash-table">
            <thead>
              <tr><th>Tugas</th><th>Tenggat</th><th>Beban</th><th></th></tr>
            </thead>
            <tbody>
              <tr v-for="task in pendingTasks.slice(0, 4)" :key="task.id">
                <td class="dash-cell-title font-medium">{{ task.title }}</td>
                <td>{{ task.deadline.replace('T', ' ') }}</td>
                <td><span>{{ task.load }}</span></td>
                <td>
                  <button type="button" class="dash-link" @click="navigate('focus')">Fokus</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </BasePanel>

      <aside class="dash-ideas">
        <h4>Parkir Ide</h4>
        <ul>
          <li v-for="idea in state.ideas.slice(0, 4)" :key="idea.id">
            {{ idea.text }}
          </li>
        </ul>
      </aside>
    </div>

    <BasePanel title="Sesi Terbaru" panel-class="dash-panel dash-panel--wide">
      <div class="dash-table-wrap">
        <table class="dash-table">
          <thead>
            <tr><th>Tugas</th><th>Durasi</th><th>Skor</th></tr>
          </thead>
          <tbody>
            <tr v-for="session in state.sessions" :key="session.id">
              <td class="dash-cell-title">{{ session.taskTitle }}</td>
              <td>{{ session.duration }} mnt</td>
              <td>{{ session.score }}%</td>
            </tr>
          </tbody>
        </table>
      </div>
    </BasePanel>
  </section>
</template>

<script setup>
import { useKalaFokus } from '../composables/useKalaFokus';
import StatCard from '../components/ui/StatCard.vue';
import BasePanel from '../components/ui/BasePanel.vue';

const { state, focusMinutesToday, pendingTasks, brainfallMinutesToday, navigate } = useKalaFokus();
</script>