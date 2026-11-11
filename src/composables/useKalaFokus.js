import { reactive, computed, watch } from 'vue';
import { useRouter } from 'vue-router';

// ====== Konfigurasi ======
const STORAGE_KEY = 'kalafokus:v1';
const LOGIN_PATH = '/login'; // ganti sesuai route login kamu
const DEFAULT_FOCUS_SECONDS = 25 * 60;
const VIEW_PATHS = {
  dashboard: '/',
  focus: '/focus',
  tasks: '/tasks',
  brainfall: '/brainfall',
  'ai-insight': '/ai-insight'
};

// ====== Helper ======
const uid = () =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const isToday = (ts) => new Date(ts).toDateString() === new Date().toDateString();
const pad = (n) => String(n).padStart(2, '0');

function loadSaved() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

const saved = loadSaved();

// ====== State global (level modul => dipakai bersama semua komponen) ======
const state = reactive({
  users: saved.users ?? [],
  user: saved.user ?? null,
  isAuthenticated: saved.isAuthenticated ?? false,
  tasks: saved.tasks ?? [],
  ideas: saved.ideas ?? [],
  focusLogs: saved.focusLogs ?? [],
  brainfallLogs: saved.brainfallLogs ?? [],
  activeTaskId: saved.activeTaskId ?? null,
  currentView: 'dashboard',
  isIdeaDrawerOpen: false,
  isDetoxModalOpen: false,
  timer: {
    isRunning: false,
    duration: DEFAULT_FOCUS_SECONDS,
    remaining: DEFAULT_FOCUS_SECONDS
  }
});

// Simpan otomatis (timer sengaja tidak ikut disimpan)
watch(
  () => [
    state.users,
    state.user,
    state.isAuthenticated,
    state.tasks,
    state.ideas,
    state.focusLogs,
    state.brainfallLogs,
    state.activeTaskId
  ],
  () => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          users: state.users,
          user: state.user,
          isAuthenticated: state.isAuthenticated,
          tasks: state.tasks,
          ideas: state.ideas,
          focusLogs: state.focusLogs,
          brainfallLogs: state.brainfallLogs,
          activeTaskId: state.activeTaskId
        })
      );
    } catch {
      /* storage penuh / diblokir: abaikan */
    }
  },
  { deep: true }
);

// ====== Timer ======
let intervalId = null;
let endAt = 0;

function stopInterval() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

function tick() {
  const left = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
  state.timer.remaining = left;
  if (left === 0) completeFocusSession();
}

function startTimer() {
  if (state.timer.isRunning) return;
  if (state.timer.remaining <= 0) state.timer.remaining = state.timer.duration;
  endAt = Date.now() + state.timer.remaining * 1000;
  state.timer.isRunning = true;
  stopInterval();
  intervalId = setInterval(tick, 1000);
}

function pauseTimer() {
  stopInterval();
  state.timer.isRunning = false;
}

function toggleTimer() {
  if (state.timer.isRunning) pauseTimer();
  else startTimer();
}

function resetTimer() {
  pauseTimer();
  state.timer.remaining = state.timer.duration;
}

function completeFocusSession() {
  pauseTimer();
  const minutes = Math.round((state.timer.duration - state.timer.remaining) / 60);
  if (minutes > 0) {
    state.focusLogs.push({
      id: uid(),
      taskId: state.activeTaskId,
      minutes,
      createdAt: Date.now()
    });
  }
  state.timer.remaining = state.timer.duration;
}

// ====== Computed ======
const user = computed(() => state.user);
const tasks = computed(() => state.tasks);
const ideas = computed(() => state.ideas);
const isAuthenticated = computed(() => state.isAuthenticated);
const isTimerRunning = computed(() => state.timer.isRunning);

const isIdeaDrawerOpen = computed({
  get: () => state.isIdeaDrawerOpen,
  set: (val) => { state.isIdeaDrawerOpen = val; }
});
const isDetoxModalOpen = computed({
  get: () => state.isDetoxModalOpen,
  set: (val) => { state.isDetoxModalOpen = val; }
});

const formattedTimer = computed(() => {
  const s = Math.max(0, state.timer.remaining);
  return `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
});

const pendingTasks = computed(() => state.tasks.filter((t) => !t.done));
const completedTasks = computed(() => state.tasks.filter((t) => t.done));
const activeTask = computed(
  () => state.tasks.find((t) => t.id === state.activeTaskId) ?? null
);

const focusMinutesToday = computed(() =>
  state.focusLogs.filter((l) => isToday(l.createdAt)).reduce((sum, l) => sum + l.minutes, 0)
);
const brainfallMinutesToday = computed(() =>
  state.brainfallLogs.filter((l) => isToday(l.createdAt)).reduce((sum, l) => sum + l.minutes, 0)
);

// ====== Tugas ======
function addTask(input) {
  const extra = input && typeof input === 'object' ? input : {};
  const title = String(typeof input === 'string' ? input : extra.title ?? '').trim();
  if (!title) return null;
  const task = { ...extra, id: uid(), title, done: false, createdAt: Date.now() };
  state.tasks.unshift(task);
  return task;
}

function toggleTask(id) {
  const task = state.tasks.find((t) => t.id === id);
  if (!task) return;
  task.done = !task.done;
  task.completedAt = task.done ? Date.now() : null;
}

function removeTask(id) {
  const i = state.tasks.findIndex((t) => t.id === id);
  if (i === -1) return;
  state.tasks.splice(i, 1);
  if (state.activeTaskId === id) state.activeTaskId = null;
}

// ====== Ide ======
function addIdea(input) {
  const extra = input && typeof input === 'object' ? input : {};
  const text = String(typeof input === 'string' ? input : extra.text ?? '').trim();
  if (!text) return null;
  const idea = { ...extra, id: uid(), text, createdAt: Date.now() };
  state.ideas.unshift(idea);
  return idea;
}

function removeIdea(id) {
  const i = state.ideas.findIndex((x) => x.id === id);
  if (i !== -1) state.ideas.splice(i, 1);
}

// ====== BrainFall ======
// Terima angka (menit) atau objek { minutes, note }
function addBrainfallLog(input) {
  const minutes = typeof input === 'number' ? input : Number(input?.minutes) || 0;
  const note = typeof input === 'object' && input ? input.note ?? '' : '';
  const entry = { id: uid(), minutes, note, createdAt: Date.now() };
  state.brainfallLogs.push(entry);
  return entry;
}

// ====== Drawer & Modal ======
const openIdeaDrawer = () => { state.isIdeaDrawerOpen = true; };
const closeIdeaDrawer = () => { state.isIdeaDrawerOpen = false; };
const toggleIdeaDrawer = () => { state.isIdeaDrawerOpen = !state.isIdeaDrawerOpen; };

const openDetoxModal = () => { state.isDetoxModalOpen = true; };
const closeDetoxModal = () => { state.isDetoxModalOpen = false; };
const toggleDetoxModal = () => { state.isDetoxModalOpen = !state.isDetoxModalOpen; };

// ====== Auth (MOCK lokal: ganti dengan request ke backend kalau sudah ada) ======
async function register(arg1, arg2, arg3) {
  const data = arg1 && typeof arg1 === 'object' ? arg1 : { name: arg1, email: arg2, password: arg3 };
  const name = String(data.name ?? '').trim();
  const email = String(data.email ?? '').trim().toLowerCase();
  if (!name || !email || !data.password) {
    return { ok: false, error: 'Semua field wajib diisi.' };
  }
  if (state.users.some((u) => u.email === email)) {
    return { ok: false, error: 'Email sudah terdaftar.' };
  }
  const newUser = { id: uid(), name, email };
  state.users.push(newUser);
  state.user = { ...newUser };
  state.isAuthenticated = true;
  return { ok: true, user: state.user };
}

async function login(arg1, arg2) {
  const data = arg1 && typeof arg1 === 'object' ? arg1 : { email: arg1, password: arg2 };
  const email = String(data.email ?? '').trim().toLowerCase();
  if (!email || !data.password) {
    return { ok: false, error: 'Email dan password wajib diisi.' };
  }
  const found = state.users.find((u) => u.email === email);
  if (!found) return { ok: false, error: 'Akun tidak ditemukan.' };
  state.user = { ...found };
  state.isAuthenticated = true;
  return { ok: true, user: state.user };
}

// ====== Composable ======
export function useKalaFokus() {
  // Hanya fungsi yang butuh router yang ada di dalam sini
  const router = useRouter();

  function navigate(viewKey) {
    state.currentView = viewKey;
    router?.push(VIEW_PATHS[viewKey] ?? viewKey);
  }

  function selectTaskForFocus(id) {
    state.activeTaskId = id;
    navigate('focus');
  }

  function logout() {
    resetTimer();
    state.user = null;
    state.isAuthenticated = false;
    state.activeTaskId = null;
    state.isIdeaDrawerOpen = false;
    state.isDetoxModalOpen = false;
    router?.push(LOGIN_PATH);
  }

  return {
    state,
    user,
    tasks,
    ideas,
    isAuthenticated,
    isTimerRunning,
    isIdeaDrawerOpen,
    isDetoxModalOpen,
    formattedTime: formattedTimer,
    formattedTimer,
    pendingTasks,
    completedTasks,
    focusMinutesToday,
    brainfallMinutesToday,
    activeTask,
    navigate,
    selectTaskForFocus,
    login,
    register,
    logout,
    addTask,
    toggleTask,
    removeTask,
    deleteTask: removeTask,
    addIdea,
    removeIdea,
    deleteIdea: removeIdea,
    addBrainfallLog,
    startTimer,
    pauseTimer,
    toggleTimer,
    resetTimer,
    completeFocusSession,
    openIdeaDrawer,
    closeIdeaDrawer,
    toggleIdeaDrawer,
    openDetoxModal,
    closeDetoxModal,
    toggleDetoxModal
  };
}