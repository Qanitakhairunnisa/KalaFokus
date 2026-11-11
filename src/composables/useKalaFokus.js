// src/composables/useKalaFokus.js
import { reactive, computed } from 'vue';

const state = reactive({
  isAuthenticated: false,
  currentRoute: 'dashboard',
  isZenMode: false,
  isIdeaDrawerOpen: false,
  isDetoxModalOpen: false,
  showPwaBanner: false,

  user: {
    name: 'Nadia Pramesti',
    email: 'nadia@kalafokus.id',
    profile: 'deep_thinker',
    focusTarget: 120,
    reelsLimit: 30,
  },

  tasks: [
    { id: 1, title: 'Menyusun Bab 3 Metodologi Riset Kognitif', deadline: '2026-11-05T14:00', load: 'high', pomodoros: 3, category: 'Riset & Penulisan', completed: false },
    { id: 2, title: 'Review jurnal perhatian visual & dopamin', deadline: '2026-11-06T10:00', load: 'medium', pomodoros: 2, category: 'Riset & Penulisan', completed: false },
    { id: 3, title: 'Rapikan catatan literatur Zettelkasten', deadline: '2026-11-07T17:00', load: 'low', pomodoros: 1, category: 'Dokumentasi', completed: true }
  ],

  ideas: [
    { id: 1, text: 'Cek referensi buku Cal Newport untuk bab pembuka', tag: 'riset_nanti', createdAt: '10:15' },
    { id: 2, text: 'Balas email dosen pembimbing terkait jadwal seminar', tag: 'urusan_mendadak', createdAt: '10:42' },
    { id: 3, text: 'Ide visualisasi grafik kurva kelelahan atensi', tag: 'ide_kreatif', createdAt: '11:05' }
  ],

  sessions: [
    { id: 1, time: '09:30', taskTitle: 'Menyusun Bab 3 Metodologi Riset Kognitif', duration: 50, score: 94, mood: 'calm' },
    { id: 2, time: '11:00', taskTitle: 'Review jurnal perhatian visual & dopamin', duration: 25, score: 88, mood: 'energized' }
  ],

  brainfallLogs: [
    { id: 1, platform: 'Instagram Reels', duration: 10, trigger: 'istirahat_kebablasan', aftereffect: 'kabut_otak', time: '12:15' },
    { id: 2, platform: 'TikTok', duration: 10, trigger: 'kebosanan', aftereffect: 'biasa_saja', time: '13:40' }
  ],

  aiEvaluations: [
    {
      id: 1,
      date: 'Rabu, 4 November 2026',
      status: 'Ritme Kognitif Stabil',
      summary: 'Anda berhasil mempertahankan 75 menit fokus mendalam dengan tingkat distraksi rendah. Paparan Reels masih berada di angka 20 menit (di bawah batas 30 menit), namun perhatikan pemicu "istirahat kebablasan" pada siang hari.',
      recommendation: 'Gunakan teknik jeda non-layar (melihat objek jauh selama 60 detik) setelah sesi Pomodoro berikutnya.'
    }
  ]
});

export function useKalaFokus() {
  const focusMinutesToday = computed(() =>
    state.sessions.reduce((acc, s) => acc + Number(s.duration), 0)
  );

  const pendingTasks = computed(() =>
    state.tasks.filter(t => !t.completed)
  );

  const brainfallMinutesToday = computed(() =>
    state.brainfallLogs.reduce((acc, log) => acc + Number(log.duration), 0)
  );

  const brainfallPercentage = computed(() =>
    Math.min(100, Math.round((brainfallMinutesToday.value / state.user.reelsLimit) * 100))
  );

  const isBrainfallOverlimit = computed(() =>
    brainfallMinutesToday.value >= state.user.reelsLimit
  );

  const profileLabel = computed(() => {
    const map = {
      deep_thinker: 'Deep Thinker',
      balanced_explorer: 'Balanced',
      sprint_worker: 'Sprint Worker'
    };
    return map[state.user.profile] || 'Balanced';
  });

  // Actions
  function navigate(route) {
    state.currentRoute = route;
  }

  function addIdea(text, tag = 'ide_kreatif') {
    if (!text.trim()) return;
    const now = new Date();
    const timeStr = now.toTimeString().slice(0, 5);
    state.ideas.unshift({ id: Date.now(), text: text.trim(), tag, createdAt: timeStr });
  }

  function removeIdea(id) {
    state.ideas = state.ideas.filter(i => i.id !== id);
  }

  function promoteIdeaToTask(idea) {
    state.tasks.push({
      id: Date.now(),
      title: idea.text,
      deadline: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
      load: 'medium',
      pomodoros: 1,
      category: 'Hasil Parkir Ide',
      completed: false
    });
    removeIdea(idea.id);
  }

  function logBrainfall({ platform, duration, trigger, aftereffect }) {
    const now = new Date().toTimeString().slice(0, 5);
    state.brainfallLogs.unshift({
      id: Date.now(),
      platform,
      duration: Number(duration),
      trigger,
      aftereffect,
      time: now
    });
    if (brainfallMinutesToday.value >= state.user.reelsLimit) {
      state.isDetoxModalOpen = true;
    }
  }

  return {
    state,
    focusMinutesToday,
    pendingTasks,
    brainfallMinutesToday,
    brainfallPercentage,
    isBrainfallOverlimit,
    profileLabel,
    navigate,
    addIdea,
    removeIdea,
    promoteIdeaToTask,
    logBrainfall
  };
}