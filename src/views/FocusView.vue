<!-- src/views/FocusView.vue -->
<template>
  <section class="spa-view focus">
    <div class="focus-layout">
      <!-- Kiri: Parkir Ide Inline -->
      <div class="focus-col">
        <div class="focus-card">
          <div class="focus-card__head">
            <h4>Parkir Ide</h4>
            <span class="dash-chip">{{ state.ideas.length }}</span>
          </div>
          <form class="focus-idea-form" @submit.prevent="handleInlineIdea">
            <input v-model="inlineIdeaText" type="text" required class="task-input"
              placeholder="Tulis pikiran, lalu Enter" />
            <select v-model="inlineIdeaTag" class="task-input">
              <option value="ide_kreatif">Ide</option>
              <option value="urusan_mendadak">Urusan</option>
              <option value="riset_nanti">Cari</option>
              <option value="refleksi">Refleksi</option>
            </select>
            <button type="submit" class="dash-btn dash-btn--primary">Parkir</button>
          </form>
          <div class="focus-ideas space-y-2 mt-3">
            <div v-for="idea in state.ideas" :key="idea.id"
              class="text-xs p-2.5 rounded-xl bg-warmcream-50 border border-warmcream-200">
              {{ idea.text }}
            </div>
          </div>
        </div>
      </div>

      <!-- Kanan: Timer + Track Record -->
      <div class="focus-col">
        <div class="focus-card focus-timer">
          <SegmentedControl v-model="selectedMode" variant="blue" button-class="timer-mode-btn" :options="timerModes"
            @update:model-value="changeMode" />

          <div class="focus-ring">
            <svg viewBox="0 0 220 220" aria-hidden="true">
              <circle cx="110" cy="110" r="96" fill="none" stroke="#E8F1FB" stroke-width="9" />
              <circle class="timer-progress-ring" cx="110" cy="110" r="96" fill="none" stroke="#4A90D9" stroke-width="9"
                stroke-linecap="round" stroke-dasharray="603.18" :stroke-dashoffset="dashOffset" />
            </svg>
            <div class="focus-ring__center">
              <span class="focus-ring__status">{{ isRunning ? 'Fokus' : 'Siap' }}</span>
              <div class="focus-ring__time">{{ formattedTime }}</div>
              <span class="focus-ring__idea" title="Pikiran yang diparkir selama sesi">
                <BaseIcon name="message-circle" with-margin />
                <strong>{{ sessionDistractions }}</strong>
              </span>
            </div>
          </div>

          <select v-model="selectedTaskTitle" class="focus-pill" aria-label="Tugas yang difokuskan">
            <option value="Sesi Fokus Mandiri">Tanpa tugas</option>
            <option v-for="t in pendingTasks" :key="t.id" :value="t.title">{{ t.title }}</option>
          </select>

          <div class="focus-controls">
            <button type="button" class="focus-ctl" aria-label="Reset" @click="resetTimer">
              <BaseIcon name="rotate-ccw" />
            </button>
            <button v-if="!isRunning" type="button" class="dash-btn dash-btn--primary focus-main" @click="startTimer">
              <BaseIcon name="play" with-margin />Mulai
            </button>
            <button v-else type="button" class="dash-btn dash-btn--primary focus-main" @click="pauseTimer">
              <BaseIcon name="pause" with-margin />Jeda
            </button>
            <button type="button" class="focus-ctl" aria-label="Catat sesi" @click="completeSession">
              <BaseIcon name="check" />
            </button>
          </div>

          <div class="focus-meta">
            <select v-model="sessionMood" class="task-input" aria-label="Kondisi">
              <option value="calm">Tenang</option>
              <option value="energized">Berenergi</option>
              <option value="tired">Lelah</option>
              <option value="overwhelmed">Kewalahan</option>
            </select>
            <input v-model="sessionNote" type="text" class="task-input" placeholder="Catatan sesi" />
          </div>
        </div>
      </div>
    </div>

    <!-- Riwayat Sesi -->
    <BasePanel title="Riwayat Sesi" panel-class="focus-card focus-history" head-class="focus-card__head">
      <template #action>
        <span class="dash-chip">{{ focusMinutesToday }} mnt</span>
      </template>
      <div class="dash-table-wrap">
        <table class="dash-table">
          <thead>
            <tr>
              <th>Waktu</th>
              <th>Tugas</th>
              <th>Durasi</th>
              <th>Skor</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in state.sessions" :key="s.id">
              <td>{{ s.time }}</td>
              <td class="dash-cell-title">{{ s.taskTitle }}</td>
              <td>{{ s.duration }} mnt</td>
              <td>{{ s.score }}%</td>
            </tr>
          </tbody>
        </table>
      </div>
    </BasePanel>
  </section>
</template>

<script setup>
import { ref, computed, onUnmounted } from 'vue';
import { useKalaFokus } from '../composables/useKalaFokus';
import SegmentedControl from '../components/ui/SegmentedControl.vue';
import BasePanel from '../components/ui/BasePanel.vue';
import BaseIcon from '../components/ui/BaseIcon.vue';

const { state, pendingTasks, focusMinutesToday, addIdea } = useKalaFokus();

const timerModes = [
  { label: 'Pomodoro', value: '25' },
  { label: 'Deep Work', value: '50' },
  { label: 'Sprint', value: '15' }
];

const selectedMode = ref('25');
const totalSeconds = ref(25 * 60);
const remainingSeconds = ref(25 * 60);
const isRunning = ref(false);
const sessionDistractions = ref(0);
const selectedTaskTitle = ref('Sesi Fokus Mandiri');
const sessionMood = ref('calm');
const sessionNote = ref('');
const inlineIdeaText = ref('');
const inlineIdeaTag = ref('ide_kreatif');
let intervalId = null;

const formattedTime = computed(() => {
  const m = String(Math.floor(remainingSeconds.value / 60)).padStart(2, '0');
  const s = String(remainingSeconds.value % 60).padStart(2, '0');
  return `${m}:${s}`;
});

const dashOffset = computed(() => {
  const circumference = 603.18;
  const progress = remainingSeconds.value / totalSeconds.value;
  return circumference * (1 - progress);
});

function changeMode(mins) {
  pauseTimer();
  totalSeconds.value = Number(mins) * 60;
  remainingSeconds.value = totalSeconds.value;
}

function startTimer() {
  if (isRunning.value) return;
  isRunning.value = true;
  intervalId = setInterval(() => {
    if (remainingSeconds.value > 0) {
      remainingSeconds.value--;
    } else {
      completeSession();
    }
  }, 1000);
}

function pauseTimer() {
  isRunning.value = false;
  clearInterval(intervalId);
}

function resetTimer() {
  pauseTimer();
  remainingSeconds.value = totalSeconds.value;
}

function completeSession() {
  pauseTimer();
  const mins = Math.round(totalSeconds.value / 60);
  state.sessions.unshift({
    id: Date.now(),
    time: new Date().toTimeString().slice(0, 5),
    taskTitle: selectedTaskTitle.value,
    duration: mins,
    score: Math.max(70, 100 - sessionDistractions.value * 5),
    mood: sessionMood.value
  });
  sessionDistractions.value = 0;
  resetTimer();
}

function handleInlineIdea() {
  addIdea(inlineIdeaText.value, inlineIdeaTag.value);
  inlineIdeaText.value = '';
  if (isRunning.value) sessionDistractions.value++;
}

onUnmounted(() => clearInterval(intervalId));
</script>