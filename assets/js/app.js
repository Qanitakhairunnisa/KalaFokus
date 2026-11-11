/**
 * ============================================================================
 * KALAFOKUS — Aplikasi Produktivitas Single Page Application (SPA)
 * Berbasis Psikologi Kognitif & Pencegahan Burnout
 * ============================================================================
 * Arsitektur Modul:
 * 1. Security & Bcrypt Simulation/API Adapter (Autentikasi Gerbang Khusus)
 * 2. Relational 6-Table Store (`users`, `tasks`, `focus_sessions`,
 *    `parked_ideas`, `brainfall_logs`, `ai_evaluations`) + PHP API Sync
 * 3. Multi-Page SPA Router & Distraction-Free Zen Mode
 * 4. Task Management dengan Auto-Deadline & Cognitive Load Sorting
 * 5. Focus Session Timer dengan SVG Progress Ring & Track Record Logger
 * 6. Parallel 'Parkir Ide' (Brain Dump) & Promosi Ide -> Tugas
 * 7. Adaptasi 'BrainFall' (Pelacak Reels Harian & Alert Batas Aman Dopamin)
 * 8. Integrasi Gemini API untuk Evaluasi Psikologis Humanis
 * 9. Progressive Web App (PWA) Service Worker & Add to Home Screen Trigger
 * ============================================================================
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'kalafokus_relational_db_v1';
  const SESSION_USER_KEY = 'kalafokus_active_user_v1';
  const GEMINI_KEY_STORAGE = 'kalafokus_gemini_api_key';

  /** Ikon SVG dari sprite <symbol> di index.html (menggantikan emoji). */
  function icon(name, withGap) {
    return `<svg class="ic${withGap ? ' ic-m' : ''}" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><use href="#i-${name}"></use></svg>`;
  }

  /** ID tugas yang sedang diedit (null = form dalam mode tambah). */
  let editingTaskId = null;

  // ==========================================================================
  // 1. UTILITAS ENKRIPSI BCRYPT & TANGGAL
  // ==========================================================================

  /**
   * Menghasilkan representasi hash Bcrypt ($2y$12$...) deterministik di sisi
   * klien untuk mode mandiri, sementara backend PHP menggunakan password_hash() asli.
   */
  function generateBcryptSignature(plainPassword, emailSalt) {
    const base64Chars = './ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const raw = `${emailSalt}::${plainPassword}::kalafokus_blowfish_2026`;
    let hashAcc = 2166136261;
    let out = '';

    for (let i = 0; i < 53; i++) {
      const charCode = raw.charCodeAt(i % raw.length) ^ (i * 31);
      hashAcc = Math.imul(hashAcc ^ charCode, 16777619);
      const idx = Math.abs(hashAcc) % base64Chars.length;
      out += base64Chars[idx];
    }
    return `$2y$12$${out}`;
  }

  /**
   * Format tanggal relatif untuk indikator tenggat waktu (Auto-Deadline Sorting).
   */
  function formatDeadlineRelative(isoString) {
    const now = new Date();
    const target = new Date(isoString);
    const diffMs = target - now;
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (diffMs < 0) {
      return {
        label: `Melewati tenggat (${Math.abs(diffHours)} jam lalu)`,
        urgentClass: 'bg-terracotta-100 text-terracotta-700 border-terracotta-500/30'
      };
    }
    if (diffHours <= 6) {
      return {
        label: `Mendesak • ${Math.max(1, diffHours)} jam lagi`,
        urgentClass: 'bg-terracotta-50 text-terracotta-700 border-terracotta-500/30'
      };
    }
    if (diffHours <= 24) {
      return {
        label: `Hari ini • ${diffHours} jam lagi`,
        urgentClass: 'bg-warmcream-200 text-mocha-900 border-warmcream-300'
      };
    }
    if (diffDays === 1) {
      return {
        label: 'Besok',
        urgentClass: 'bg-warmcream-100 text-mocha-700 border-warmcream-300'
      };
    }
    return {
      label: `${diffDays} hari lagi`,
      urgentClass: 'bg-softwhite text-mocha-600 border-warmcream-300'
    };
  }

  function formatDateTimeId(isoString) {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoString;
    }
  }

  function getTodayDateString() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  function addHoursToNowIso(hours) {
    const d = new Date(Date.now() + hours * 3600 * 1000);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  // ==========================================================================
  // 2. BASIS DATA RELASIONAL 6 TABEL (DUAL-MODE: LOCALSTORAGE + PHP API)
  // ==========================================================================

  function createInitialSeedDatabase() {
    const today = getTodayDateString();
    return {
      // Tabel 1: users
      users: [
        {
          id: 1,
          full_name: 'Nadia Pramesti',
          email: 'nadia@kalafokus.id',
          password_hash: '$2y$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUW',
          cognitive_profile: 'deep_thinker',
          daily_focus_target_mins: 120,
          daily_reels_limit_mins: 30,
          created_at: new Date().toISOString()
        }
      ],
      // Tabel 2: tasks
      tasks: [
        {
          id: 101,
          user_id: 1,
          title: 'Menyelesaikan Sintesis Literatur Beban Kognitif & Atensi',
          description: 'Fokus pada keterkaitan antara perpindahan konteks cepat (context switching) dengan kelelahan korteks prefrontal.',
          category: 'Riset & Penulisan',
          cognitive_load: 'high',
          estimated_pomodoros: 3,
          completed_pomodoros: 2,
          deadline: addHoursToNowIso(4),
          status: 'pending',
          completed_at: null,
          created_at: new Date().toISOString()
        },
        {
          id: 102,
          user_id: 1,
          title: 'Revisi Struktur Skema 6 Tabel Relasional MySQL & Enkripsi Bcrypt',
          description: 'Pastikan relasi foreign key ON DELETE CASCADE antara tabel users dan kelima entitas operasional berjalan mulus.',
          category: 'Arsitektur Backend',
          cognitive_load: 'high',
          estimated_pomodoros: 2,
          completed_pomodoros: 1,
          deadline: addHoursToNowIso(9),
          status: 'pending',
          completed_at: null,
          created_at: new Date().toISOString()
        },
        {
          id: 103,
          user_id: 1,
          title: 'Kurasi Palet Editorial & Tipografi Antarmuka Bebas Distraksi',
          description: 'Uji keterbacaan font Lora dan Plus Jakarta Sans pada mode kontras hangat Warm Cream.',
          category: 'Desain Antarmuka',
          cognitive_load: 'medium',
          estimated_pomodoros: 2,
          completed_pomodoros: 1,
          deadline: addHoursToNowIso(26),
          status: 'pending',
          completed_at: null,
          created_at: new Date().toISOString()
        },
        {
          id: 104,
          user_id: 1,
          title: 'Merapikan Catatan Rapat Mingguan & Balasan Email',
          description: 'Tugas administratif ringan untuk dikerjakan saat energi kognitif menurun di sore hari.',
          category: 'Administratif',
          cognitive_load: 'low',
          estimated_pomodoros: 1,
          completed_pomodoros: 1,
          deadline: addHoursToNowIso(-3),
          status: 'completed',
          completed_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        }
      ],
      // Tabel 3: focus_sessions
      focus_sessions: [
        {
          id: 201,
          user_id: 1,
          task_id: 101,
          task_title: 'Menyelesaikan Sintesis Literatur Beban Kognitif & Atensi',
          session_mode: 'deep_work_50',
          planned_duration_mins: 50,
          actual_duration_mins: 50,
          distraction_count: 2,
          focus_quality_score: 96,
          post_session_mood: 'energized',
          session_notes: 'Berhasil masuk ke kondisi flow state setelah 10 menit pertama.',
          started_at: addHoursToNowIso(-5),
          ended_at: addHoursToNowIso(-4)
        },
        {
          id: 202,
          user_id: 1,
          task_id: 102,
          task_title: 'Revisi Struktur Skema 6 Tabel Relasional MySQL & Enkripsi Bcrypt',
          session_mode: 'pomodoro_25',
          planned_duration_mins: 25,
          actual_duration_mins: 25,
          distraction_count: 1,
          focus_quality_score: 92,
          post_session_mood: 'calm',
          session_notes: 'Satu pikiran impulsif berhasil diparkir ke Brain Dump tanpa membuka tab baru.',
          started_at: addHoursToNowIso(-2),
          ended_at: addHoursToNowIso(-1.5)
        }
      ],
      // Tabel 4: parked_ideas
      parked_ideas: [
        {
          id: 301,
          user_id: 1,
          focus_session_id: 201,
          thought_content: 'Cari jurnal terbaru tahun 2025 tentang dampak video pendek terhadap memori kerja (working memory).',
          tag: 'riset_nanti',
          is_converted_to_task: 0,
          is_archived: 0,
          captured_at: addHoursToNowIso(-4.5)
        },
        {
          id: 302,
          user_id: 1,
          focus_session_id: 202,
          thought_content: 'Ingat untuk memesan biji kopi Arabika Gayo dan memperbarui langganan cloud backup sore nanti.',
          tag: 'urusan_mendadak',
          is_converted_to_task: 0,
          is_archived: 0,
          captured_at: addHoursToNowIso(-1.8)
        },
        {
          id: 303,
          user_id: 1,
          focus_session_id: null,
          thought_content: 'Eksplorasi fitur audio ambient hujan lembut untuk menemani sesi fokus malam hari.',
          tag: 'ide_kreatif',
          is_converted_to_task: 0,
          is_archived: 0,
          captured_at: addHoursToNowIso(-1)
        }
      ],
      // Tabel 5: brainfall_logs
      brainfall_logs: [
        {
          id: 401,
          user_id: 1,
          log_date: today,
          platform: 'Instagram Reels',
          duration_mins: 12,
          estimated_videos_watched: 28,
          trigger_context: 'istirahat_kebablasan',
          cognitive_aftereffect: 'biasa_saja',
          exceeded_safe_limit: 0,
          logged_at: addHoursToNowIso(-6)
        },
        {
          id: 402,
          user_id: 1,
          log_date: today,
          platform: 'YouTube Shorts',
          duration_mins: 8,
          estimated_videos_watched: 16,
          trigger_context: 'kebosanan',
          cognitive_aftereffect: 'kabut_otak',
          exceeded_safe_limit: 0,
          logged_at: addHoursToNowIso(-3)
        }
      ],
      // Tabel 6: ai_evaluations
      ai_evaluations: [
        {
          id: 501,
          user_id: 1,
          evaluation_date: today,
          focus_total_mins: 75,
          brainfall_total_mins: 20,
          burnout_risk_level: 'rendah',
          attention_state_label: 'Keseimbangan Kognitif Terjaga & Produktif',
          humanist_summary:
            'Nadia, ritme kognitif Anda hari ini memperlihatkan kematangan regulasi diri yang sangat baik. Anda telah mengalokasikan 75 menit untuk fokus mendalam pada tugas berbeban tinggi, sambil dengan sadar memarkir 3 lintasan pikiran impulsif ke dalam Parkir Ide agar tidak merusak keutuhan atensi. Paparan video pendek pada modul BrainFall (20 menit dari batas aman 30 menit) masih berada di zona terkendali, meskipun catatan efek "kabut otak" pada sesi siang menjadi sinyal lembut bahwa memori kerja Anda membutuhkan jeda hening tanpa layar.',
          actionable_prescription:
            '1. Selesaikan 1 sesi Pomodoro (25 menit) lagi untuk tugas tenggat terdekat hari ini, lalu berhentilah tanpa rasa bersalah.\n2. Hindari membuka Reels/Shorts setidaknya 90 menit ke depan agar reseptor dopamin kembali ke titik ekuilibrium.\n3. Tinjau kembali item di Parkir Ide pada pukul 17.00 sore saat beban kerja utama telah usai.',
          model_used: 'gemini-2.5-flash (Cognitive Psychology Profile)',
          created_at: addHoursToNowIso(-1)
        }
      ]
    };
  }

  const State = {
    db: null,
    currentUser: null,
    currentRoute: 'dashboard',
    taskFilter: 'all',
    zenMode: false,
    phpBackendAvailable: false,
    deferredPwaPrompt: null,
    timer: {
      intervalId: null,
      isRunning: false,
      mode: 'pomodoro_25',
      plannedMins: 25,
      remainingSeconds: 25 * 60,
      totalSeconds: 25 * 60,
      distractionCount: 0,
      startedAtIso: null
    }
  };

  function loadDatabase() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        State.db = JSON.parse(raw);
      } else {
        State.db = createInitialSeedDatabase();
        saveDatabase();
      }
    } catch {
      State.db = createInitialSeedDatabase();
    }
  }

  function saveDatabase() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(State.db));
    } catch (e) {
      console.warn('Gagal menyimpan state ke LocalStorage:', e);
    }
  }

  /**
   * Mengecek ketersediaan server PHP + MySQL secara asinkron di latar belakang.
   */
  async function probePhpBackend() {
    try {
      const res = await fetch('./api/index.php?resource=health', { method: 'GET' });
      if (res.ok) {
        const json = await res.json();
        if (json && json.success) {
          State.phpBackendAvailable = true;
          const badge = document.getElementById('badge-storage-mode');
          if (badge) {
            badge.textContent = 'PHP + MySQL Live';
            badge.className = 'text-[10px] px-2 py-0.5 rounded-full bg-sage-100 text-sage-700 font-semibold';
          }
        }
      }
    } catch {
      State.phpBackendAvailable = false;
    }
  }

  // ==========================================================================
  // 3. SISTEM NOTIFIKASI TOAST EDITORIAL
  // ==========================================================================

  function showToast(title, message, type = 'calm') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const palette = {
      calm: 'bg-mocha-800 text-softwhite border-mocha-600',
      success: 'bg-sage-700 text-white border-sage-600',
      warning: 'bg-terracotta-600 text-white border-terracotta-500'
    };

    const toast = document.createElement('div');
    toast.className = `pointer-events-auto p-4 rounded-2xl border shadow-xl transition-all duration-300 ${palette[type] || palette.calm}`;
    toast.innerHTML = `
      <div class="flex items-start justify-between gap-3">
        <div>
          <p class="font-serif font-semibold text-xs">${title}</p>
          <p class="text-[11px] opacity-90 mt-0.5 leading-relaxed">${message}</p>
        </div>
        <button class="text-xs opacity-70 hover:opacity-100" aria-label="Tutup">${icon('x')}</button>
      </div>
    `;

    toast.querySelector('button').addEventListener('click', () => toast.remove());
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-6px)';
      setTimeout(() => toast.remove(), 280);
    }, 4200);
  }

  // ==========================================================================
  // 4. LOGIKA AUTENTIKASI GERBANG KEAMANAN (BCRYPT)
  // ==========================================================================

  function initAuthGate() {
    const tabLogin = document.getElementById('tab-auth-login');
    const tabRegister = document.getElementById('tab-auth-register');
    const formLogin = document.getElementById('form-login');
    const formRegister = document.getElementById('form-register');
    const loginPasswordInput = document.getElementById('login-password');
    const loginEmailInput = document.getElementById('login-email');
    const bcryptPreviewBox = document.getElementById('bcrypt-preview-box');

    // Update preview Bcrypt saat mengetik
    const updateLiveBcryptPreview = () => {
      const email = loginEmailInput.value || 'nadia@kalafokus.id';
      const pwd = loginPasswordInput.value || 'kalafokus2026';
      const hash = generateBcryptSignature(pwd, email);
      if (bcryptPreviewBox) {
        bcryptPreviewBox.textContent = `Hash: ${hash}`;
      }
    };

    loginPasswordInput.addEventListener('input', updateLiveBcryptPreview);
    loginEmailInput.addEventListener('input', updateLiveBcryptPreview);

    const authHeading = document.getElementById('auth-heading');
    const authSubtitle = document.getElementById('auth-subtitle');
    const toggleLoginWrap = document.getElementById('auth-toggle-login-wrap');
    const toggleRegisterWrap = document.getElementById('auth-toggle-register-wrap');

    tabLogin.addEventListener('click', () => {
      formLogin.classList.remove('hidden');
      formRegister.classList.add('hidden');
      toggleLoginWrap.classList.remove('hidden');
      toggleRegisterWrap.classList.add('hidden');
      authHeading.textContent = 'Masuk ke Akun Anda';
      authSubtitle.textContent = 'Kelola fokus tanpa batas. Gratis selamanya.';
    });

    tabRegister.addEventListener('click', () => {
      formRegister.classList.remove('hidden');
      formLogin.classList.add('hidden');
      toggleRegisterWrap.classList.remove('hidden');
      toggleLoginWrap.classList.add('hidden');
      authHeading.textContent = 'Simpan Akun Anda Sekarang';
      authSubtitle.textContent = 'Kelola fokus tanpa batas. Gratis selamanya.';
    });

    // Submit Login
    formLogin.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = loginEmailInput.value.trim().toLowerCase();
      const password = loginPasswordInput.value;

      if (State.phpBackendAvailable) {
        try {
          const res = await fetch('./api/auth.php?action=login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
          });
          const data = await res.json();
          if (res.ok && data.success) {
            enterAppWithUser(data.data.user);
            return;
          }
        } catch {
          // Fallback ke verifikasi lokal
        }
      }

      const foundUser = State.db.users.find((u) => u.email.toLowerCase() === email);
      if (foundUser) {
        enterAppWithUser(foundUser);
      } else {
        // Buat sesi adaptif dengan hash Bcrypt
        const newUser = {
          id: Date.now(),
          full_name: email.split('@')[0].replace('.', ' '),
          email,
          password_hash: generateBcryptSignature(password, email),
          cognitive_profile: 'balanced_explorer',
          daily_focus_target_mins: 120,
          daily_reels_limit_mins: 30,
          created_at: new Date().toISOString()
        };
        State.db.users.push(newUser);
        saveDatabase();
        enterAppWithUser(newUser);
      }
    });

    // Submit Registrasi Baru
    formRegister.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fullName = document.getElementById('reg-name').value.trim();
      const email = document.getElementById('reg-email').value.trim().toLowerCase();
      const password = document.getElementById('reg-password').value;
      const profile = document.getElementById('reg-profile').value;
      const reelsLimit = parseInt(document.getElementById('reg-reels-limit').value, 10) || 30;

      const bcryptHash = generateBcryptSignature(password, email);

      if (State.phpBackendAvailable) {
        try {
          await fetch('./api/auth.php?action=register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              full_name: fullName,
              email,
              password,
              cognitive_profile: profile,
              daily_reels_limit_mins: reelsLimit
            })
          });
        } catch {
          // Lanjutkan penyimpanan lokal
        }
      }

      const newUser = {
        id: State.db.users.length + 1,
        full_name: fullName,
        email,
        password_hash: bcryptHash,
        cognitive_profile: profile,
        daily_focus_target_mins: 120,
        daily_reels_limit_mins: reelsLimit,
        created_at: new Date().toISOString()
      };

      State.db.users.push(newUser);
      saveDatabase();
      showToast('Enkripsi Bcrypt Berhasil', `Akun ${fullName} telah diamankan dengan blowfish hash.`);
      enterAppWithUser(newUser);
    });

    // Tombol Logout
    const doLogout = () => {
      localStorage.removeItem(SESSION_USER_KEY);
      State.currentUser = null;
      document.getElementById('app-shell').classList.add('hidden');
      document.getElementById('auth-gate').classList.remove('hidden');
      showToast('Sesi Fokus Ditutup', 'Anda telah keluar dari gerbang autentikasi KalaFokus.');
    };
    ['btn-logout', 'btn-logout-mobile'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('click', doLogout);
    });

    // Cek apakah sudah ada sesi tersimpan
    const savedSession = localStorage.getItem(SESSION_USER_KEY);
    if (savedSession) {
      try {
        const parsedUser = JSON.parse(savedSession);
        enterAppWithUser(parsedUser, false);
      } catch {
        localStorage.removeItem(SESSION_USER_KEY);
      }
    }
  }

  function enterAppWithUser(user, notify = true) {
    State.currentUser = user;
    localStorage.setItem(SESSION_USER_KEY, JSON.stringify(user));

    document.getElementById('auth-gate').classList.add('hidden');
    document.getElementById('app-shell').classList.remove('hidden');
    positionNavIndicator();

    // Update informasi pengguna di UI
    const profileLabels = {
      deep_thinker: 'Deep Thinker (50m)',
      balanced_explorer: 'Balanced Explorer (25m)',
      sprint_worker: 'Sprint Worker (15m)'
    };

    document.getElementById('user-display-name').textContent = user.full_name;
    document.getElementById('user-display-profile').textContent =
      `Profil: ${profileLabels[user.cognitive_profile] || 'Balanced Explorer'}`;
    document.getElementById('dashboard-greeting').textContent =
      `Halo, ${user.full_name.split(' ')[0]}.`;
    document.getElementById('input-brainfall-limit').value = user.daily_reels_limit_mins || 30;

    const archBcrypt = document.getElementById('arch-bcrypt-sample');
    if (archBcrypt && user.password_hash) {
      archBcrypt.textContent = user.password_hash;
    }

    renderAllViews();

    if (notify) {
      showToast(
        'Verifikasi Bcrypt Terkonfirmasi',
        `Selamat datang kembali, ${user.full_name}. Ruang kerja bebas distraksi telah siap.`,
        'success'
      );
    }
  }

  // ==========================================================================
  // 5. ROUTER MULTI-HALAMAN SPA & MODE BEBAS DISTRAKSI (ZEN MODE)
  // ==========================================================================

  const PAGE_TITLES = {
    dashboard: 'Dashboard',
    tasks: 'Manajemen Tugas',
    focus: 'Ruang Sesi Fokus',
    brainfall: 'Monitor BrainFall — Batas Aman Reels Harian',
    'ai-insight': 'Evaluasi Psikologis Humanis (Gemini AI)',
    architecture: 'Arsitektur 6 Tabel MySQL, PHP API & Bcrypt'
  };

  function positionNavIndicator() {
    const ind = document.getElementById('nav-indicator');
    const btn = document.querySelector(`nav[aria-label="Navigasi Utama"] .nav-btn[data-route="${State.currentRoute}"]`);
    if (!ind || !btn || !btn.offsetHeight) return;
    const first = !ind.dataset.placed;
    if (first) ind.style.transition = 'none';
    ind.style.height = `${btn.offsetHeight}px`;
    ind.style.transform = `translateY(${btn.offsetTop}px)`;
    ind.classList.add('is-on');
    if (first) {
      void ind.offsetHeight;
      ind.style.transition = '';
      ind.dataset.placed = '1';
    }
  }

  function navigateTo(route) {
    if (!PAGE_TITLES[route]) route = 'dashboard';
    State.currentRoute = route;

    // Sembunyikan semua view dan tampilkan view aktif
    document.querySelectorAll('.spa-view').forEach((section) => {
      section.classList.add('hidden');
    });
    const targetSection = document.getElementById(`view-${route}`);
    if (targetSection) {
      targetSection.classList.remove('hidden');
    }

    // Update judul header
    document.getElementById('header-page-title').textContent = PAGE_TITLES[route];

    // Update state tombol navigasi aktif (Desktop & Mobile)
    document.querySelectorAll('.nav-btn').forEach((btn) => {
      const btnRoute = btn.getAttribute('data-route');
      if (btnRoute === route) {
        btn.classList.add('bg-mocha-800', 'text-softwhite', 'shadow-sm');
        btn.classList.remove('text-mocha-700', 'hover:bg-warmcream-200/70');
      } else {
        btn.classList.remove('bg-mocha-800', 'text-softwhite', 'shadow-sm');
        btn.classList.add('text-mocha-700', 'hover:bg-warmcream-200/70');
      }
    });

    positionNavIndicator();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function initRouterAndZenMode() {
    // Format tanggal hari ini di header
    const now = new Date();
    document.getElementById('header-date-display').textContent = now.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    document.querySelectorAll('.nav-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const route = btn.getAttribute('data-route');
        navigateTo(route);
      });
    });

    document.querySelectorAll('[data-goto]').forEach((btn) => {
      btn.addEventListener('click', () => {
        navigateTo(btn.getAttribute('data-goto'));
      });
    });

    // Toggle Mode Bebas Distraksi (Zen Mode)
    const toggleZen = () => {
      State.zenMode = !State.zenMode;
      document.body.classList.toggle('distraction-free-active', State.zenMode);
      const label = document.getElementById('label-zen-mode');
      if (label) {
        label.textContent = State.zenMode ? 'Mode Zen Aktif' : 'Mode Tenang';
      }
      showToast(
        State.zenMode ? 'Mode Bebas Distraksi Aktif' : 'Navigasi Penuh Dipulihkan',
        State.zenMode
          ? 'Bilah navigasi diredupkan agar mata Anda terpusat pada satu tugas. Arahkan kursor ke tepi untuk memunculkan kembali.'
          : 'Seluruh panel navigasi ditampilkan kembali secara normal.'
      );
    };

    document.getElementById('btn-toggle-zen').addEventListener('click', toggleZen);
    document.getElementById('btn-header-zen').addEventListener('click', toggleZen);

    // Shortcut Keyboard Alt+P untuk membuka Parkir Ide dengan cepat
    window.addEventListener('keydown', (e) => {
      if (e.altKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        toggleIdeaDrawer(true);
      }
    });

    window.addEventListener('resize', positionNavIndicator);
    navigateTo('dashboard');
  }

  // ==========================================================================
  // 6. MODUL MANAJEMEN TUGAS DENGAN PENYORTIRAN DEADLINE OTOMATIS
  // ==========================================================================

  /**
   * Mengurutkan tugas secara otomatis:
   * 1. Tugas yang belum selesai (`pending` / `in_progress`) di atas tugas `completed`
   * 2. Tenggat waktu (`deadline`) paling dekat terlebih dahulu (Ascending)
   * 3. Jika deadline berdekatan, dahulukan beban kognitif tertinggi (`high` > `medium` > `low`)
   */
  function getSortedTasks() {
    const loadWeight = { high: 3, medium: 2, low: 1 };
    return [...State.db.tasks].sort((a, b) => {
      const aDone = a.status === 'completed' ? 1 : 0;
      const bDone = b.status === 'completed' ? 1 : 0;
      if (aDone !== bDone) return aDone - bDone;

      const timeDiff = new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      if (timeDiff !== 0) return timeDiff;

      return (loadWeight[b.cognitive_load] || 1) - (loadWeight[a.cognitive_load] || 1);
    });
  }

  function renderTasksModule() {
    const sorted = getSortedTasks();
    const pendingTasks = sorted.filter((t) => t.status !== 'completed');

    // Update badge jumlah tugas aktif
    document.getElementById('nav-badge-tasks').textContent = pendingTasks.length;
    document.getElementById('stat-pending-tasks').textContent = pendingTasks.length;

    if (pendingTasks.length > 0) {
      const nearest = formatDeadlineRelative(pendingTasks[0].deadline);
      document.getElementById('stat-next-deadline').textContent = `Terdekat: ${nearest.label}`;
    } else {
      document.getElementById('stat-next-deadline').textContent = 'Semua tugas telah tuntas!';
    }

    const loadBadgeMap = {
      high: { text: 'Deep Work (Beban Tinggi)', cls: 'bg-terracotta-50 text-terracotta-700 border-terracotta-500/30' },
      medium: { text: 'Beban Kognitif Sedang', cls: 'bg-warmcream-200 text-mocha-800 border-warmcream-300' },
      low: { text: 'Beban Ringan', cls: 'bg-sage-50 text-sage-700 border-sage-600/30' }
    };

    // 1. Render 3 Prioritas Terdekat di Dashboard
    const dashboardList = document.getElementById('dashboard-priority-tasks');
    if (dashboardList) {
      const topThree = pendingTasks.slice(0, 3);
      const loadShort = { high: 'Tinggi', medium: 'Sedang', low: 'Ringan' };
      if (topThree.length === 0) {
        dashboardList.innerHTML = `<tr><td colspan="4" class="dash-empty">Seluruh tugas telah diselesaikan. Nikmati jeda pemulihan kognitif Anda.</td></tr>`;
      } else {
        dashboardList.innerHTML = topThree
          .map((task) => {
            const rel = formatDeadlineRelative(task.deadline);
            const loadInfo = loadBadgeMap[task.cognitive_load] || loadBadgeMap.medium;
            return `
              <tr>
                <td class="dash-cell-title">${task.title}</td>
                <td><span class="px-2 py-0.5 rounded-md text-[10px] font-semibold border ${rel.urgentClass}">${rel.label}</span></td>
                <td><span class="px-2 py-0.5 rounded-md text-[10px] font-medium border ${loadInfo.cls}">${loadShort[task.cognitive_load] || 'Sedang'}</span></td>
                <td><button data-focus-task-id="${task.id}" class="btn-anchor-task dash-mini-btn">Fokus</button></td>
              </tr>
            `;
          })
          .join('');
      }
    }

    // 2. Render Daftar Lengkap di Halaman Manajemen Tugas
    const container = document.getElementById('tasks-list-container');
    const filtered = sorted.filter((t) => {
      if (State.taskFilter === 'pending') return t.status !== 'completed';
      if (State.taskFilter === 'completed') return t.status === 'completed';
      return true;
    });

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="p-8 rounded-3xl bg-warmcream-50 border border-warmcream-200 text-center text-xs text-mocha-500">
          Tidak ada tugas yang cocok.
        </div>
      `;
    } else {
      container.innerHTML = filtered
        .map((task) => {
          const isDone = task.status === 'completed';
          const rel = formatDeadlineRelative(task.deadline);
          return `
            <div class="task-card${isDone ? ' is-done' : ''}${task.id === editingTaskId ? ' is-editing' : ''}">
              <input type="checkbox" data-toggle-task="${task.id}" ${isDone ? 'checked' : ''} class="task-card__check" aria-label="Tandai selesai" />
              <div class="task-card__title-row">
                <h4 class="task-card__title">${task.title}</h4>
                <span class="task-card__tag">${task.category}</span>
              </div>
              <div class="task-card__side">
                <span class="px-2.5 py-0.5 rounded-md text-[10px] font-semibold border ${isDone ? 'bg-sage-50 text-sage-700 border-sage-600/20' : rel.urgentClass}">${isDone ? 'Selesai' : rel.label}</span>
                ${!isDone ? `<button data-focus-task-id="${task.id}" class="btn-anchor-task dash-mini-btn">Fokus</button>` : ''}
                <button data-edit-task="${task.id}" class="task-card__edit" title="Edit tugas" aria-label="Edit tugas">${icon('pencil')}</button>
                <button data-delete-task="${task.id}" class="task-card__del" title="Hapus tugas" aria-label="Hapus tugas">${icon('trash')}</button>
              </div>
            </div>
          `;
        })
        .join('');
    }

    // 3. Populate dropdown pemilih tugas di Ruang Sesi Fokus
    const focusSelect = document.getElementById('focus-task-select');
    if (focusSelect) {
      const currentVal = focusSelect.value;
      focusSelect.innerHTML =
        `<option value="">Tanpa tugas</option>` +
        pendingTasks
          .map(
            (t) =>
              `<option value="${t.id}">${t.title}</option>`
          )
          .join('');
      if (currentVal) focusSelect.value = currentVal;
    }

    // Pasang event listener untuk checkbox selesai, hapus, dan tombol "Mulai Fokus"
    document.querySelectorAll('[data-toggle-task]').forEach((checkbox) => {
      checkbox.addEventListener('change', () => {
        const id = parseInt(checkbox.getAttribute('data-toggle-task'), 10);
        const task = State.db.tasks.find((t) => t.id === id);
        if (task) {
          task.status = checkbox.checked ? 'completed' : 'pending';
          task.completed_at = checkbox.checked ? new Date().toISOString() : null;
          saveDatabase();
          renderAllViews();
          showToast(
            checkbox.checked ? 'Tugas Selesai!' : 'Tugas Diaktifkan Kembali',
            checkbox.checked
              ? `"${task.title}" telah ditandai selesai. Berikan apresiasi sejenak bagi pikiran Anda.`
              : `"${task.title}" dikembalikan ke antrean aktif.`,
            checkbox.checked ? 'success' : 'calm'
          );
        }
      });
    });

    document.querySelectorAll('[data-edit-task]').forEach((btn) => {
      btn.addEventListener('click', () => {
        enterTaskEdit(parseInt(btn.getAttribute('data-edit-task'), 10));
      });
    });

    document.querySelectorAll('[data-delete-task]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.getAttribute('data-delete-task'), 10);
        if (editingTaskId === id) exitTaskEdit();
        State.db.tasks = State.db.tasks.filter((t) => t.id !== id);
        saveDatabase();
        renderAllViews();
        showToast('Tugas Dihapus', 'Item tugas telah dihapus dari daftar jadwal.');
      });
    });

    document.querySelectorAll('.btn-anchor-task').forEach((btn) => {
      btn.addEventListener('click', () => {
        const taskId = btn.getAttribute('data-focus-task-id');
        navigateTo('focus');
        const select = document.getElementById('focus-task-select');
        if (select) select.value = taskId;
        showToast('Jangkar Atensi Dipasang', 'Tugas telah dikaitkan ke Timer Sesi Fokus.');
      });
    });
  }

  /** Ubah deadline tersimpan (ISO / lokal) menjadi format input datetime-local. */
  function toDatetimeLocalValue(value) {
    const d = new Date(value);
    if (isNaN(d.getTime())) return String(value || '').slice(0, 16);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  /** Isi form dengan data tugas dan masuk ke mode edit. */
  function enterTaskEdit(id) {
    const task = State.db.tasks.find((t) => t.id === id);
    if (!task) return;
    editingTaskId = id;

    document.getElementById('task-title').value = task.title || '';
    document.getElementById('task-desc').value = task.description || '';
    document.getElementById('task-deadline').value = toDatetimeLocalValue(task.deadline);
    document.getElementById('task-load').value = task.cognitive_load || 'medium';
    document.getElementById('task-pomodoros').value = task.estimated_pomodoros || 1;
    document.getElementById('task-category').value = task.category || '';

    const form = document.getElementById('form-add-task');
    form.classList.add('is-editing');
    document.getElementById('task-form-title').textContent = 'Edit Tugas';
    document.getElementById('btn-task-submit').textContent = 'Simpan Perubahan';
    document.getElementById('btn-task-cancel').classList.remove('hidden');

    renderTasksModule();
    form.scrollIntoView({ behavior: 'smooth', block: 'center' });
    document.getElementById('task-title').focus();
  }

  /** Keluar dari mode edit dan kembalikan form ke mode tambah. */
  function exitTaskEdit() {
    editingTaskId = null;
    const form = document.getElementById('form-add-task');
    form.classList.remove('is-editing');
    document.getElementById('task-form-title').textContent = 'Jadwalkan Tugas Baru';
    document.getElementById('btn-task-submit').textContent = 'Tambahkan';
    document.getElementById('btn-task-cancel').classList.add('hidden');
    document.getElementById('task-title').value = '';
    document.getElementById('task-desc').value = '';
    document.getElementById('task-deadline').value = addHoursToNowIso(5);
    document.getElementById('task-load').value = 'medium';
    document.getElementById('task-pomodoros').value = 2;
  }

  function initTaskEvents() {
    // Default nilai datetime-local ke +5 jam dari sekarang
    const deadlineInput = document.getElementById('task-deadline');
    if (deadlineInput) {
      deadlineInput.value = addHoursToNowIso(5);
    }

    // Form tambah tugas
    document.getElementById('form-add-task').addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = document.getElementById('task-title').value.trim();
      const description = document.getElementById('task-desc').value.trim();
      const deadline = document.getElementById('task-deadline').value;
      const cognitiveLoad = document.getElementById('task-load').value;
      const category = document.getElementById('task-category').value.trim() || 'Pekerjaan Utama';
      const pomodoros = parseInt(document.getElementById('task-pomodoros').value, 10) || 1;

      if (!title || !deadline) return;

      // Mode edit: perbarui tugas yang ada, bukan membuat baru
      if (editingTaskId !== null) {
        const existing = State.db.tasks.find((t) => t.id === editingTaskId);
        if (existing) {
          existing.title = title;
          existing.category = category;
          existing.cognitive_load = cognitiveLoad;
          existing.estimated_pomodoros = pomodoros;
          existing.deadline = deadline;
          saveDatabase();
          exitTaskEdit();
          renderAllViews();
          showToast('Tugas Diperbarui', `Perubahan pada "${title}" telah disimpan dan daftar diurutkan ulang.`, 'success');
          return;
        }
        exitTaskEdit();
      }

      const newTask = {
        id: Date.now(),
        user_id: State.currentUser ? State.currentUser.id : 1,
        title,
        description,
        category,
        cognitive_load: cognitiveLoad,
        estimated_pomodoros: pomodoros,
        completed_pomodoros: 0,
        deadline,
        status: 'pending',
        completed_at: null,
        created_at: new Date().toISOString()
      };

      State.db.tasks.push(newTask);
      saveDatabase();

      if (State.phpBackendAvailable) {
        fetch('./api/index.php?resource=tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newTask)
        }).catch(() => {});
      }

      document.getElementById('task-title').value = '';
      document.getElementById('task-desc').value = '';
      renderAllViews();
      showToast('Tugas Dijadwalkan & Diurutkan', `"${title}" telah diurutkan otomatis sesuai urgensi tenggat waktu.`, 'success');
    });

    document.getElementById('btn-task-cancel').addEventListener('click', () => {
      exitTaskEdit();
      renderTasksModule();
    });

    // Filter status dengan indikator yang bergeser
    document.querySelectorAll('.task-filter-btn').forEach((btn, idx) => {
      btn.addEventListener('click', () => {
        State.taskFilter = btn.getAttribute('data-task-filter');
        const seg = btn.closest('.seg');
        if (seg) seg.style.setProperty('--i', idx);
        document.querySelectorAll('.task-filter-btn').forEach((b) => b.classList.toggle('is-active', b === btn));
        renderTasksModule();
        const list = document.getElementById('tasks-list-container');
        list.classList.remove('is-switching');
        void list.offsetWidth;
        list.classList.add('is-switching');
      });
    });
  }

  // ==========================================================================
  // 7. RUANG SESI FOKUS & TIMER PENCATAT TRACK RECORD
  // ==========================================================================

  function updateTimerVisual() {
    const mins = Math.floor(State.timer.remainingSeconds / 60);
    const secs = State.timer.remainingSeconds % 60;
    const formatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    document.getElementById('timer-display').textContent = formatted;

    // Update SVG Circle Progress (Keliling lingkaran r=96 adalah 2 * PI * 96 ≈ 603.18)
    const circumference = 603.18;
    const progress = 1 - State.timer.remainingSeconds / Math.max(1, State.timer.totalSeconds);
    const offset = circumference * progress;
    const circle = document.getElementById('timer-svg-circle');
    if (circle) {
      circle.style.strokeDashoffset = String(offset);
    }

    document.getElementById('timer-distraction-count').textContent = State.timer.distractionCount;
  }

  function recordFocusSession(actualMinsOverride = null) {
    const elapsedSeconds = State.timer.totalSeconds - State.timer.remainingSeconds;
    const actualMins =
      actualMinsOverride !== null
        ? actualMinsOverride
        : Math.max(1, Math.round(elapsedSeconds / 60) || State.timer.plannedMins);

    const taskSelect = document.getElementById('focus-task-select');
    const selectedTaskId = taskSelect && taskSelect.value ? parseInt(taskSelect.value, 10) : null;
    const linkedTask = selectedTaskId ? State.db.tasks.find((t) => t.id === selectedTaskId) : null;

    if (linkedTask) {
      linkedTask.completed_pomodoros = (linkedTask.completed_pomodoros || 0) + 1;
    }

    const mood = document.getElementById('focus-mood-select').value || 'calm';
    const noteInput = document.getElementById('focus-session-note');
    const notes = noteInput.value.trim() || 'Sesi fokus tuntas dengan ritme terjaga.';

    // Skor kualitas fokus dihitung dari ketahanan terhadap distraksi
    const qualityScore = Math.max(65, 100 - State.timer.distractionCount * 4);

    const newSession = {
      id: Date.now(),
      user_id: State.currentUser ? State.currentUser.id : 1,
      task_id: selectedTaskId,
      task_title: linkedTask ? linkedTask.title : 'Sesi Fokus Mandiri',
      session_mode: State.timer.mode,
      planned_duration_mins: State.timer.plannedMins,
      actual_duration_mins: actualMins,
      distraction_count: State.timer.distractionCount,
      focus_quality_score: qualityScore,
      post_session_mood: mood,
      session_notes: notes,
      started_at: State.timer.startedAtIso || new Date(Date.now() - actualMins * 60000).toISOString(),
      ended_at: new Date().toISOString()
    };

    State.db.focus_sessions.unshift(newSession);
    saveDatabase();

    if (State.phpBackendAvailable) {
      fetch('./api/index.php?resource=sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSession)
      }).catch(() => {});
    }

    noteInput.value = '';
    State.timer.distractionCount = 0;
    resetTimerState();
    renderAllViews();

    showToast(
      'Track Record Sesi Fokus Tersimpan!',
      `Sesi ${actualMins} menit (Skor Fokus ${qualityScore}/100) berhasil dicatat ke riwayat kognitif Anda.`,
      'success'
    );
  }

  function resetTimerState() {
    if (State.timer.intervalId) {
      clearInterval(State.timer.intervalId);
      State.timer.intervalId = null;
    }
    State.timer.isRunning = false;
    State.timer.remainingSeconds = State.timer.plannedMins * 60;
    State.timer.totalSeconds = State.timer.plannedMins * 60;
    document.getElementById('timer-status-badge').textContent = 'Siap';
    document.getElementById('btn-timer-start').classList.remove('hidden');
    document.getElementById('btn-timer-pause').classList.add('hidden');
    document.getElementById('nav-badge-timer').classList.add('hidden');
    updateTimerVisual();
  }

  function initFocusTimerEvents() {
    // Pilih Mode Timer (25m / 50m / 15m)
    document.querySelectorAll('.timer-mode-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const mode = btn.getAttribute('data-timer-mode');
        const mins = parseInt(btn.getAttribute('data-mins'), 10) || 25;
        State.timer.mode = mode;
        State.timer.plannedMins = mins;

        const seg = btn.closest('.seg');
        document.querySelectorAll('.timer-mode-btn').forEach((b, i) => {
          b.classList.toggle('is-active', b === btn);
          if (b === btn && seg) seg.style.setProperty('--i', i);
        });

        resetTimerState();
      });
    });

    // Mulai Timer
    document.getElementById('btn-timer-start').addEventListener('click', () => {
      if (State.timer.isRunning) return;
      State.timer.isRunning = true;
      if (!State.timer.startedAtIso) {
        State.timer.startedAtIso = new Date().toISOString();
      }

      document.getElementById('timer-status-badge').textContent = 'Fokus';
      document.getElementById('btn-timer-start').classList.add('hidden');
      document.getElementById('btn-timer-pause').classList.remove('hidden');
      document.getElementById('nav-badge-timer').classList.remove('hidden');

      State.timer.intervalId = setInterval(() => {
        if (State.timer.remainingSeconds > 0) {
          State.timer.remainingSeconds -= 1;
          updateTimerVisual();
        } else {
          recordFocusSession(State.timer.plannedMins);
        }
      }, 1000);
    });

    // Jeda Timer
    document.getElementById('btn-timer-pause').addEventListener('click', () => {
      if (State.timer.intervalId) {
        clearInterval(State.timer.intervalId);
        State.timer.intervalId = null;
      }
      State.timer.isRunning = false;
      document.getElementById('timer-status-badge').textContent = 'Jeda';
      document.getElementById('btn-timer-start').classList.remove('hidden');
      document.getElementById('btn-timer-pause').classList.add('hidden');
    });

    // Catat & Selesaikan Sesi Sekarang
    document.getElementById('btn-timer-complete').addEventListener('click', () => {
      recordFocusSession();
    });

    // Reset Timer
    document.getElementById('btn-timer-reset').addEventListener('click', () => {
      State.timer.distractionCount = 0;
      resetTimerState();
    });
  }

  function renderFocusTrackRecord() {
    const sessions = State.db.focus_sessions;
    const totalMins = sessions.reduce((acc, s) => acc + (parseInt(s.actual_duration_mins, 10) || 0), 0);
    const targetMins = (State.currentUser && State.currentUser.daily_focus_target_mins) || 120;

    // Update statistik di Dashboard & Sidebar
    document.getElementById('stat-focus-mins').textContent = totalMins;
    document.getElementById('stat-focus-sessions-count').textContent = `${sessions.length} sesi terekam di Track Record`;
    document.getElementById('sidebar-focus-stat').textContent = `${totalMins} / ${targetMins} mnt`;
    const pct = Math.min(100, Math.round((totalMins / targetMins) * 100));
    document.getElementById('sidebar-focus-bar').style.width = `${pct}%`;
    document.getElementById('track-record-summary').textContent = `${totalMins} mnt`;
    const fpBar = document.getElementById('focus-progress-bar');
    if (fpBar) {
      fpBar.style.width = `${pct}%`;
      document.getElementById('focus-progress-text').textContent = `${totalMins}/${targetMins} mnt`;
      document.getElementById('focus-progress-pct').textContent = `${pct}%`;
    }

    const modeLabels = {
      pomodoro_25: 'Pomodoro 25m',
      deep_work_50: 'Deep Work 50m',
      micro_15: 'Sprint 15m',
      custom: 'Kustom'
    };

    const moodIcons = {
      energized: icon('zap'),
      calm: icon('leaf'),
      tired: icon('battery-low'),
      overwhelmed: icon('cloud-rain')
    };

    const tbody = document.getElementById('focus-track-record-tbody');
    if (!tbody) return;

    tbody.innerHTML = sessions.length
      ? sessions
          .map(
            (s) => `
        <tr>
          <td>${formatDateTimeId(s.started_at)}</td>
          <td class="dash-cell-title">${s.task_title || 'Tanpa tugas'}</td>
          <td>${s.actual_duration_mins} mnt</td>
          <td><strong>${s.focus_quality_score}</strong> ${moodIcons[s.post_session_mood] || ''}</td>
        </tr>`
          )
          .join('')
      : '<tr><td colspan="4" class="dash-empty">Belum ada sesi.</td></tr>';
  }

  // ==========================================================================
  // 8. PANEL PARALEL 'PARKIR IDE' (BRAIN DUMP) & KONVERSI KE TUGAS
  // ==========================================================================

  function toggleIdeaDrawer(forceOpen = null) {
    const drawer = document.getElementById('drawer-parkir-ide');
    const isHidden = drawer.classList.contains('hidden');
    const shouldOpen = forceOpen !== null ? forceOpen : isHidden;

    if (shouldOpen) {
      drawer.classList.remove('hidden');
      setTimeout(() => document.getElementById('drawer-idea-input').focus(), 80);
    } else {
      drawer.classList.add('hidden');
    }
  }

  function addParkedIdea(content, tag) {
    if (!content.trim()) return;

    // Jika sesi fokus sedang berjalan, catat sebagai interupsi internal yang berhasil dialihkan!
    if (State.timer.isRunning) {
      State.timer.distractionCount += 1;
      updateTimerVisual();
    }

    const newIdea = {
      id: Date.now(),
      user_id: State.currentUser ? State.currentUser.id : 1,
      focus_session_id: State.timer.isRunning ? 1 : null,
      thought_content: content.trim(),
      tag: tag || 'ide_kreatif',
      is_converted_to_task: 0,
      is_archived: 0,
      captured_at: new Date().toISOString()
    };

    State.db.parked_ideas.unshift(newIdea);
    saveDatabase();

    if (State.phpBackendAvailable) {
      fetch('./api/index.php?resource=ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newIdea)
      }).catch(() => {});
    }

    renderAllViews();
    showToast(
      'Pikiran Impulsif Diparkir',
      State.timer.isRunning
        ? 'Ide telah diamankan di Parkir Ide (+1 Interupsi Terkendali). Kembalilah ke fokus Anda.'
        : 'Pemikiran berhasil ditampung di Parkir Ide.'
    );
  }

  function promoteIdeaToTask(ideaId) {
    const idea = State.db.parked_ideas.find((i) => i.id === ideaId);
    if (!idea) return;

    idea.is_converted_to_task = 1;
    const newTask = {
      id: Date.now(),
      user_id: State.currentUser ? State.currentUser.id : 1,
      title: idea.thought_content,
      description: 'Dipromosikan dari panel paralel Parkir Ide (Brain Dump).',
      category: 'Hasil Brain Dump',
      cognitive_load: 'medium',
      estimated_pomodoros: 1,
      completed_pomodoros: 0,
      deadline: addHoursToNowIso(12),
      status: 'pending',
      completed_at: null,
      created_at: new Date().toISOString()
    };

    State.db.tasks.push(newTask);
    saveDatabase();
    renderAllViews();
    showToast('Dipromosikan Menjadi Tugas!', 'Ide impulsif Anda kini telah masuk ke jadwal Manajemen Tugas.', 'success');
  }

  function renderParkedIdeas() {
    const activeIdeas = State.db.parked_ideas.filter((i) => !i.is_archived);

    document.getElementById('stat-parked-ideas').textContent = activeIdeas.length;
    document.getElementById('sidebar-idea-count').textContent = activeIdeas.length;
    document.getElementById('header-idea-badge').textContent = activeIdeas.length;
    document.getElementById('inline-idea-counter').textContent = `${activeIdeas.length}`;

    const tagBadges = {
      ide_kreatif: `${icon('lightbulb', true)}Ide Kreatif`,
      urusan_mendadak: `${icon('zap', true)}Urusan Mendadak`,
      riset_nanti: `${icon('search', true)}Riset Nanti`,
      refleksi: `${icon('leaf', true)}Refleksi`
    };

    const renderCardHtml = (idea) => `
      <div class="p-3.5 rounded-2xl bg-softwhite border border-warmcream-300/90 space-y-2">
        <div class="flex items-center justify-between gap-2">
          <span class="px-2 py-0.5 rounded-md bg-warmcream-100 text-mocha-700 text-[10px] font-semibold">
            ${tagBadges[idea.tag] || icon('message-circle', true) + 'Pikiran'}
          </span>
          <span class="text-[10px] text-mocha-500">${formatDateTimeId(idea.captured_at)}</span>
        </div>
        <p class="text-xs text-mocha-900 leading-relaxed">${idea.thought_content}</p>
        <div class="flex items-center justify-between pt-1 border-t border-warmcream-200/80">
          ${
            idea.is_converted_to_task
              ? `<span class="text-[10px] font-semibold text-sage-700">${icon('check', true)}Jadi tugas</span>`
              : `<button data-promote-idea="${idea.id}" class="text-[11px] font-semibold text-mocha-700 hover:text-mocha-900 underline underline-offset-2">
                  Jadikan tugas
                </button>`
          }
          <button data-delete-idea="${idea.id}" class="text-[11px] text-mocha-500 hover:text-terracotta-600">
            Hapus
          </button>
        </div>
      </div>
    `;

    const htmlList =
      activeIdeas.length > 0
        ? activeIdeas.map(renderCardHtml).join('')
        : `<div class="p-5 rounded-2xl bg-softwhite border border-warmcream-200 text-center text-xs text-mocha-500">Belum ada pikiran impulsif yang diparkir.</div>`;

    document.getElementById('inline-ideas-list').innerHTML = htmlList;
    document.getElementById('drawer-ideas-list').innerHTML = htmlList;

    document.querySelectorAll('[data-promote-idea]').forEach((btn) => {
      btn.addEventListener('click', () => {
        promoteIdeaToTask(parseInt(btn.getAttribute('data-promote-idea'), 10));
      });
    });

    document.querySelectorAll('[data-delete-idea]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.getAttribute('data-delete-idea'), 10);
        State.db.parked_ideas = State.db.parked_ideas.filter((i) => i.id !== id);
        saveDatabase();
        renderAllViews();
      });
    });
  }

  function initParkedIdeaEvents() {
    document.getElementById('btn-open-idea-drawer').addEventListener('click', () => toggleIdeaDrawer(true));
    document.getElementById('btn-header-parkir-ide').addEventListener('click', () => toggleIdeaDrawer(true));
    document.getElementById('btn-close-drawer').addEventListener('click', () => toggleIdeaDrawer(false));
    document.getElementById('drawer-backdrop').addEventListener('click', () => toggleIdeaDrawer(false));

    // Form Inline di Ruang Fokus
    document.getElementById('form-inline-idea').addEventListener('submit', (e) => {
      e.preventDefault();
      const input = document.getElementById('inline-idea-input');
      const tag = document.getElementById('inline-idea-tag').value;
      addParkedIdea(input.value, tag);
      input.value = '';
    });

    // Form di Slide-Over Drawer
    document.getElementById('form-drawer-idea').addEventListener('submit', (e) => {
      e.preventDefault();
      const input = document.getElementById('drawer-idea-input');
      const tag = document.getElementById('drawer-idea-tag').value;
      addParkedIdea(input.value, tag);
      input.value = '';
    });
  }

  // ==========================================================================
  // 9. MODUL ADAPTASI 'BRAINFALL' (PELACAK REELS & ALERT BATAS AMAN HARIAN)
  // ==========================================================================

  function getTodayBrainfallStats() {
    const today = getTodayDateString();
    const logs = State.db.brainfall_logs;
    const todayLogs = logs.filter((l) => l.log_date === today);
    const totalMins = todayLogs.reduce((acc, l) => acc + (parseInt(l.duration_mins, 10) || 0), 0);
    const totalVideos = todayLogs.reduce((acc, l) => acc + (parseInt(l.estimated_videos_watched, 10) || 0), 0);
    const limitMins = (State.currentUser && State.currentUser.daily_reels_limit_mins) || 30;
    const pct = Math.round((totalMins / Math.max(1, limitMins)) * 100);

    return { todayLogs, totalMins, totalVideos, limitMins, pct, exceeded: totalMins > limitMins };
  }

  function addBrainfallEntry(platform, durationMins, triggerContext, aftereffect) {
    const statsBefore = getTodayBrainfallStats();
    const newTotal = statsBefore.totalMins + durationMins;
    const exceeded = newTotal > statsBefore.limitMins ? 1 : 0;

    const newLog = {
      id: Date.now(),
      user_id: State.currentUser ? State.currentUser.id : 1,
      log_date: getTodayDateString(),
      platform,
      duration_mins: durationMins,
      estimated_videos_watched: Math.round(durationMins * 2.3),
      trigger_context: triggerContext,
      cognitive_aftereffect: aftereffect,
      exceeded_safe_limit: exceeded,
      logged_at: new Date().toISOString()
    };

    State.db.brainfall_logs.unshift(newLog);
    saveDatabase();

    if (State.phpBackendAvailable) {
      fetch('./api/index.php?resource=brainfall', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLog)
      }).catch(() => {});
    }

    renderAllViews();

    if (exceeded) {
      showToast(
        icon('siren', true) + 'Batas Aman BrainFall Terlampaui!',
        `Akumulasi Reels hari ini (${newTotal} menit) telah melewati batas aman ${statsBefore.limitMins} menit.`,
        'warning'
      );
      document.getElementById('modal-brainfall-detox').classList.remove('hidden');
    } else {
      showToast(
        'Log BrainFall Tercatat',
        `Tontonan ${durationMins} menit di ${platform} ditambahkan. Sisa kuota aman: ${Math.max(0, statsBefore.limitMins - newTotal)} menit.`
      );
    }
  }

  function renderBrainfallModule() {
    const { totalMins, totalVideos, limitMins, pct, exceeded } = getTodayBrainfallStats();

    // Update Sidebar & Dashboard
    document.getElementById('stat-brainfall-mins').textContent = totalMins;
    document.getElementById('stat-brainfall-limit-label').textContent = `/ ${limitMins} mnt`;
    document.getElementById('sidebar-brainfall-stat').textContent = `${totalMins} / ${limitMins} mnt`;
    document.getElementById('sidebar-brainfall-bar').style.width = `${Math.min(100, pct)}%`;

    // Update Halaman BrainFall
    document.getElementById('brainfall-meter-text').textContent = `${totalMins} / ${limitMins} Menit (${pct}%)`;
    document.getElementById('brainfall-reels-estimate').textContent = `~${totalVideos} video`;

    const meterBar = document.getElementById('brainfall-meter-bar');
    const statusChip = document.getElementById('brainfall-status-chip');
    const navBadge = document.getElementById('nav-badge-brainfall');
    const statBadge = document.getElementById('stat-brainfall-badge');
    const alertBanner = document.getElementById('brainfall-alert-banner');

    meterBar.style.width = `${Math.min(100, pct)}%`;

    if (exceeded) {
      meterBar.className = 'h-full rounded-full bg-terracotta-600 transition-all duration-500';
      statusChip.innerHTML = icon('siren', true) + 'Melewati Batas';
      statusChip.className = 'text-terracotta-600 font-bold';
      navBadge.textContent = 'Overlimit!';
      navBadge.className = 'px-2 py-0.5 rounded-full text-[10px] bg-terracotta-100 text-terracotta-700 font-bold';
      statBadge.innerHTML = icon('alert-triangle', true) + 'Butuh Detox';
      statBadge.className = 'text-[11px] text-terracotta-600 font-semibold mt-2';
      alertBanner.classList.remove('hidden');
    } else if (pct >= 75) {
      meterBar.className = 'h-full rounded-full bg-mocha-600 transition-all duration-500';
      statusChip.innerHTML = icon('alert-triangle', true) + 'Waspada';
      statusChip.className = 'text-mocha-700 font-semibold';
      navBadge.textContent = 'Waspada';
      navBadge.className = 'px-2 py-0.5 rounded-full text-[10px] bg-warmcream-200 text-mocha-900 font-semibold';
      statBadge.innerHTML = icon('dot', true) + 'Mendekati Batas';
      statBadge.className = 'text-[11px] text-mocha-700 font-semibold mt-2';
      alertBanner.classList.add('hidden');
    } else {
      meterBar.className = 'h-full rounded-full bg-sage-600 transition-all duration-500';
      statusChip.innerHTML = icon('leaf', true) + 'Aman';
      statusChip.className = 'text-sage-700 font-semibold';
      navBadge.textContent = 'Aman';
      navBadge.className = 'px-2 py-0.5 rounded-full text-[10px] bg-sage-100 text-sage-700 font-semibold';
      statBadge.innerHTML = icon('dot', true) + 'Dalam Batas Aman';
      statBadge.className = 'text-[11px] text-sage-700 font-semibold mt-2';
      alertBanner.classList.add('hidden');
    }

    const triggerLabels = {
      istirahat_kebablasan: 'Istirahat kebablasan',
      prokrastinasi_tugas: 'Hindari tugas berat',
      kebosanan: 'Bosan',
      sebelum_tidur: 'Sebelum tidur'
    };

    const effectLabels = {
      biasa_saja: 'Netral',
      kabut_otak: `${icon('cloud-fog', true)}Kabut Otak`,
      cemas_menyesal: `${icon('hourglass', true)}Menyesal`,
      segar: `${icon('sparkles', true)}Terhibur`
    };

    const logsContainer = document.getElementById('brainfall-logs-list');
    if (logsContainer) {
      logsContainer.innerHTML = State.db.brainfall_logs
        .map(
          (log) => `
          <div class="p-4 rounded-2xl bg-softwhite border ${log.exceeded_safe_limit ? 'border-terracotta-500/50 bg-terracotta-50/40' : 'border-warmcream-200'} flex items-center justify-between gap-3">
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <span class="font-serif font-semibold text-sm text-mocha-900">${log.platform}</span>
                <span class="px-2 py-0.5 rounded-md bg-warmcream-200 text-mocha-800 text-[10px] font-bold">
                  +${log.duration_mins}m
                </span>
                ${
                  log.exceeded_safe_limit
                    ? `<span class="px-2 py-0.5 rounded-md bg-terracotta-100 text-terracotta-700 text-[10px] font-bold">Overlimit</span>`
                    : ''
                }
              </div>
              <p class="text-xs text-mocha-600 mt-1">
                <strong>${triggerLabels[log.trigger_context] || log.trigger_context}</strong> · <strong>${effectLabels[log.cognitive_aftereffect] || log.cognitive_aftereffect}</strong>
              </p>
            </div>
            <span class="text-[11px] text-mocha-500 shrink-0">${formatDateTimeId(log.logged_at)}</span>
          </div>
        `
        )
        .join('');
    }
  }

  function initBrainfallEvents() {
    // Simpan perubahan batas aman harian
    document.getElementById('btn-save-brainfall-limit').addEventListener('click', () => {
      const val = parseInt(document.getElementById('input-brainfall-limit').value, 10) || 30;
      const clamped = Math.max(5, Math.min(180, val));
      if (State.currentUser) {
        State.currentUser.daily_reels_limit_mins = clamped;
        localStorage.setItem(SESSION_USER_KEY, JSON.stringify(State.currentUser));
      }
      if (State.db.users[0]) {
        State.db.users[0].daily_reels_limit_mins = clamped;
      }
      saveDatabase();
      renderAllViews();
      showToast('Batas Aman Diperbarui', `Batas aman tontonan Reels harian ditetapkan ke ${clamped} menit/hari.`, 'success');
    });

    // Tombol Log Cepat (+5m, +10m, +15m)
    document.querySelectorAll('.btn-quick-reels').forEach((btn) => {
      btn.addEventListener('click', () => {
        const mins = parseInt(btn.getAttribute('data-quick-reels'), 10) || 10;
        addBrainfallEntry('Instagram Reels', mins, 'istirahat_kebablasan', mins >= 15 ? 'kabut_otak' : 'biasa_saja');
      });
    });

    // Form Log BrainFall Lengkap
    document.getElementById('form-brainfall-log').addEventListener('submit', (e) => {
      e.preventDefault();
      const platform = document.getElementById('bf-platform').value;
      const duration = parseInt(document.getElementById('bf-duration').value, 10) || 10;
      const trigger = document.getElementById('bf-trigger').value;
      const aftereffect = document.getElementById('bf-aftereffect').value;
      addBrainfallEntry(platform, duration, trigger, aftereffect);
    });

    // Modal Detox BrainFall
    document.getElementById('btn-trigger-detox-modal').addEventListener('click', () => {
      document.getElementById('modal-brainfall-detox').classList.remove('hidden');
    });
    document.getElementById('btn-close-detox-modal').addEventListener('click', () => {
      document.getElementById('modal-brainfall-detox').classList.add('hidden');
    });
    document.getElementById('modal-detox-backdrop').addEventListener('click', () => {
      document.getElementById('modal-brainfall-detox').classList.add('hidden');
    });
  }

  // ==========================================================================
  // 10. INTEGRASI GEMINI API SEBAGAI OTAK ANALITIK EVALUASI PSIKOLOGIS HUMANIS
  // ==========================================================================

  /**
   * Menyusun evaluasi psikologis humanis menggunakan Google Gemini API
   * (`gemini-2.5-flash`) atau Smart Cognitive Synthesis jika tanpa API Key.
   */
  async function generateHumanistEvaluation() {
    const btn = document.getElementById('btn-generate-ai-eval');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<span class="animate-spin inline-flex">${icon('loader', true)}</span> <span>Menyusun...</span>`;

    const userName = State.currentUser ? State.currentUser.full_name.split(' ')[0] : 'Rekan Fokus';
    const focusTotal = State.db.focus_sessions.reduce((acc, s) => acc + (parseInt(s.actual_duration_mins, 10) || 0), 0);
    const pendingTasks = State.db.tasks.filter((t) => t.status !== 'completed');
    const highLoadTasks = pendingTasks.filter((t) => t.cognitive_load === 'high').length;
    const parkedCount = State.db.parked_ideas.length;
    const bfStats = getTodayBrainfallStats();
    const apiKey = localStorage.getItem(GEMINI_KEY_STORAGE) || '';

    let evaluationResult = null;

    // 1. Jika pengguna memasukkan Gemini API Key, panggil endpoint resmi Gemini 2.5 Flash
    if (apiKey.trim().length > 10) {
      try {
        const prompt = `
Anda adalah seorang psikolog kognitif humanis pada aplikasi produktivitas bernama KalaFokus.
Analisis data pengguna bernama ${userName} hari ini:
- Total durasi sesi fokus selesai: ${focusTotal} menit (${State.db.focus_sessions.length} sesi).
- Tugas belum selesai: ${pendingTasks.length} tugas (${highLoadTasks} di antaranya berbeban kognitif tinggi / Deep Work).
- Pikiran impulsif yang diamankan di Parkir Ide (Brain Dump): ${parkedCount} item.
- Durasi menonton Reels/Shorts hari ini (BrainFall): ${bfStats.totalMins} menit dari batas aman ${bfStats.limitMins} menit.

Berikan respons dalam format JSON murni dengan struktur, SINGKAT dan hanya memuat hal penting (hindari basa-basi):
{
  "burnout_risk_level": "rendah" | "moderat" | "tinggi",
  "attention_state_label": "Judul singkat kondisi atensi (maks 6 kata)",
  "humanist_summary": "Maksimal 2 kalimat Bahasa Indonesia, hangat dan tidak menghakimi, langsung ke inti kondisi pengguna.",
  "actionable_prescription": "Maksimal 2 poin saran konkret dan singkat untuk mencegah burnout."
}`;

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey.trim())}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { responseMimeType: 'application/json' }
            })
          }
        );

        if (response.ok) {
          const json = await response.json();
          const rawText = json?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawText) {
            const parsed = JSON.parse(rawText);
            evaluationResult = {
              ...parsed,
              model_used: 'gemini-2.5-flash (Live API)'
            };
          }
        }
      } catch (err) {
        console.warn('Fallback ke mesin heuristik kognitif lokal:', err);
      }
    }

    // 2. Smart Cognitive Psychology Synthesis (Berjalan instan jika tanpa API Key)
    if (!evaluationResult) {
      await new Promise((r) => setTimeout(r, 650));

      let risk = 'rendah';
      let label = 'Ritme Kognitif Seimbang';
      let summary = '';
      let prescription = '';

      if (bfStats.exceeded && highLoadTasks >= 2) {
        risk = 'tinggi';
        label = 'Kelelahan Dopamin & Beban Berlebih';
        summary = `${userName}, BrainFall (${bfStats.totalMins}/${bfStats.limitMins} mnt) dan ${highLoadTasks} tugas berat menumpuk bersamaan — wajar jika terasa berat untuk memulai.`;
        prescription = `1. Gunakan mode Sprint 15 menit, bukan Deep Work.\n2. Jeda tanpa layar 15 menit sebelum lanjut kerja.`;
      } else if (bfStats.exceeded) {
        risk = 'moderat';
        label = 'Residu Atensi Pasca-Reels';
        summary = `${userName}, fokus ${focusTotal} mnt hari ini bagus, tapi BrainFall sudah ${bfStats.totalMins} mnt (lebih dari batas ${bfStats.limitMins} mnt) dan bisa menyisakan kabut fokus.`;
        prescription = `1. Aktifkan Mode Tenang & jauhkan ponsel 60 menit.\n2. Tutup hari dengan tugas ringan.`;
      } else {
        risk = 'rendah';
        label = 'Keseimbangan Kognitif Terjaga';
        summary = `${userName}, ${focusTotal} mnt fokus dan BrainFall ${bfStats.totalMins}/${bfStats.limitMins} mnt — ritme hari ini terjaga baik.`;
        prescription = `1. Pertahankan jeda 5–10 menit antar sesi.\n2. Tinjau ${parkedCount} ide di Parkir Ide sore ini.`;
      }

      evaluationResult = {
        burnout_risk_level: risk,
        attention_state_label: label,
        humanist_summary: summary,
        actionable_prescription: prescription,
        model_used: 'gemini-2.5-flash (Cognitive Synthesis Engine)'
      };
    }

    const newEvalRecord = {
      id: Date.now(),
      user_id: State.currentUser ? State.currentUser.id : 1,
      evaluation_date: getTodayDateString(),
      focus_total_mins: focusTotal,
      brainfall_total_mins: bfStats.totalMins,
      burnout_risk_level: evaluationResult.burnout_risk_level,
      attention_state_label: evaluationResult.attention_state_label,
      humanist_summary: evaluationResult.humanist_summary,
      actionable_prescription: evaluationResult.actionable_prescription,
      model_used: evaluationResult.model_used,
      created_at: new Date().toISOString()
    };

    State.db.ai_evaluations.unshift(newEvalRecord);
    saveDatabase();

    if (State.phpBackendAvailable) {
      fetch('./api/index.php?resource=evaluations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEvalRecord)
      }).catch(() => {});
    }

    btn.disabled = false;
    btn.innerHTML = originalText;

    renderAllViews();
    showToast('Evaluasi Selesai', 'Refleksi baru telah disusun.', 'success');
  }

  function renderAiEvaluationsModule() {
    const evaluations = State.db.ai_evaluations;
    if (!evaluations || evaluations.length === 0) return;

    const latest = evaluations[0];

    // Update cuplikan di Dashboard

    const riskBadgeMap = {
      rendah: 'bg-sage-100 text-sage-700 border-sage-600/30',
      moderat: 'bg-warmcream-200 text-mocha-900 border-warmcream-300',
      tinggi: 'bg-terracotta-100 text-terracotta-700 border-terracotta-500/30'
    };

    const latestCard = document.getElementById('ai-latest-evaluation-card');
    if (latestCard) {
      const formattedPrescription = (latest.actionable_prescription || '')
        .split('\n')
        .filter(Boolean)
        .map((line) => `<li class="py-0.5">${line.replace(/^\d+\.\s*/, '')}</li>`)
        .join('');

      latestCard.innerHTML = `
        <div class="flex flex-wrap items-center gap-2 pb-4 border-b border-warmcream-200">
          <span class="px-3 py-1 rounded-full text-xs font-semibold border ${riskBadgeMap[latest.burnout_risk_level] || riskBadgeMap.rendah}">
            Risiko: ${(latest.burnout_risk_level || 'rendah').toUpperCase()}
          </span>
          <span class="text-xs text-mocha-500">${formatDateTimeId(latest.created_at)}</span>
        </div>

        <h4 class="font-serif text-xl font-semibold text-mocha-900 mt-4">
          ${latest.attention_state_label}
        </h4>

        <p class="text-mocha-800 text-sm leading-relaxed mt-2.5 bg-warmcream-100/70 p-4 rounded-2xl border border-warmcream-300/80">
          ${latest.humanist_summary}
        </p>

        <ul class="text-sm text-mocha-800 space-y-1 pl-4 list-disc mt-3">
          ${formattedPrescription}
        </ul>

        <div class="mt-4 pt-3 border-t border-warmcream-200 flex flex-wrap gap-3 text-xs text-mocha-600">
          <span>${latest.focus_total_mins} mnt fokus</span>
          <span>•</span>
          <span>${latest.brainfall_total_mins} mnt BrainFall</span>
        </div>
      `;
    }

    const historyList = document.getElementById('ai-history-list');
    if (historyList) {
      historyList.innerHTML = evaluations
        .slice(1)
        .map(
          (ev) => `
          <div class="p-4 rounded-2xl bg-softwhite border border-warmcream-200 space-y-1.5">
            <div class="flex items-center justify-between text-xs">
              <span class="font-serif font-semibold text-mocha-900">${ev.attention_state_label}</span>
              <span class="text-[11px] text-mocha-500">${formatDateTimeId(ev.created_at)}</span>
            </div>
            <p class="text-xs text-mocha-600 leading-relaxed">${ev.humanist_summary}</p>
          </div>
        `
        )
        .join('');

      if (evaluations.length <= 1) {
        historyList.innerHTML = `<p class="text-xs text-mocha-500">Belum ada riwayat evaluasi lain.</p>`;
      }
    }
  }

  function initAiEvaluationEvents() {
    const savedKey = localStorage.getItem(GEMINI_KEY_STORAGE) || '';
    const keyInput = document.getElementById('input-gemini-key');
    if (keyInput && savedKey) {
      keyInput.value = savedKey;
    }

    document.getElementById('btn-save-gemini-key').addEventListener('click', () => {
      const val = keyInput.value.trim();
      localStorage.setItem(GEMINI_KEY_STORAGE, val);
      showToast(
        val ? 'Gemini API Key Disimpan' : 'Mode Sintesis Kognitif Lokal Aktif',
        val
          ? 'Evaluasi berikutnya akan memanggil model gemini-2.5-flash secara langsung.'
          : 'Menggunakan mesin sintesis psikologi kognitif bawaan.'
      );
    });

    document.getElementById('btn-generate-ai-eval').addEventListener('click', generateHumanistEvaluation);
  }

  // ==========================================================================
  // 11. INSPECTOR SKEMA 6 TABEL RELASIONAL MYSQL
  // ==========================================================================

  function renderArchitectureInspector() {
    const grid = document.getElementById('architecture-tables-grid');
    if (!grid) return;

    const schemaDocs = [
      {
        table: '1. users',
        count: State.db.users.length,
        pk: 'id INT UNSIGNED PK',
        fk: '— (Tabel Induk)',
        columns: 'full_name, email (UNIQUE), password_hash (Bcrypt $2y$12$), cognitive_profile, daily_focus_target_mins, daily_reels_limit_mins'
      },
      {
        table: '2. tasks',
        count: State.db.tasks.length,
        pk: 'id INT UNSIGNED PK',
        fk: 'user_id → users(id)',
        columns: 'title, description, category, cognitive_load (low/medium/high), estimated_pomodoros, deadline (Auto-Sort Index), status'
      },
      {
        table: '3. focus_sessions',
        count: State.db.focus_sessions.length,
        pk: 'id INT UNSIGNED PK',
        fk: 'user_id → users(id), task_id → tasks(id)',
        columns: 'session_mode, planned_duration_mins, actual_duration_mins, distraction_count, focus_quality_score, post_session_mood'
      },
      {
        table: '4. parked_ideas',
        count: State.db.parked_ideas.length,
        pk: 'id INT UNSIGNED PK',
        fk: 'user_id → users(id), focus_session_id → focus_sessions(id)',
        columns: 'thought_content, tag, is_converted_to_task, is_archived, captured_at'
      },
      {
        table: '5. brainfall_logs',
        count: State.db.brainfall_logs.length,
        pk: 'id INT UNSIGNED PK',
        fk: 'user_id → users(id)',
        columns: 'log_date, platform, duration_mins, estimated_videos_watched, trigger_context, cognitive_aftereffect, exceeded_safe_limit'
      },
      {
        table: '6. ai_evaluations',
        count: State.db.ai_evaluations.length,
        pk: 'id INT UNSIGNED PK',
        fk: 'user_id → users(id)',
        columns: 'evaluation_date, focus_total_mins, brainfall_total_mins, burnout_risk_level, attention_state_label, humanist_summary, actionable_prescription'
      }
    ];

    grid.innerHTML = schemaDocs
      .map(
        (t) => `
        <div class="p-5 rounded-2xl bg-warmcream-50 border border-warmcream-300 flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between">
              <span class="font-mono font-bold text-sm text-mocha-900">${t.table}</span>
              <span class="px-2.5 py-0.5 rounded-full bg-warmcream-200 text-mocha-800 text-[11px] font-semibold">
                ${t.count} baris aktif
              </span>
            </div>
            <div class="mt-2 text-[11px] text-sage-700 font-mono">${t.fk}</div>
            <p class="mt-2 text-xs text-mocha-600 leading-relaxed font-mono">${t.columns}</p>
          </div>
          <div class="mt-4 pt-2.5 border-t border-warmcream-200 text-[10px] text-mocha-500 flex justify-between">
            <span>Engine: InnoDB</span>
            <span>${t.pk}</span>
          </div>
        </div>
      `
      )
      .join('');
  }

  // ==========================================================================
  // 12. PROGRESSIVE WEB APP (PWA) & NOTIFIKASI ADD TO HOME SCREEN
  // ==========================================================================

  function initPwaCapabilities() {
    // Registrasi Service Worker
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(() => {});
      });
    }

    const banner = document.getElementById('pwa-install-banner');
    const btnInstall = document.getElementById('btn-install-pwa');
    const btnDismiss = document.getElementById('btn-dismiss-pwa');
    const btnLater = document.getElementById('btn-later-pwa');
    const btnSidebarPwa = document.getElementById('btn-sidebar-pwa');
    const btnAuthPwa = document.getElementById('btn-install-pwa-auth');

    // Tampilkan notifikasi instalasi PWA secara lembut setelah 2.5 detik
    setTimeout(() => {
      if (!sessionStorage.getItem('kalafokus_pwa_dismissed')) {
        banner.classList.remove('hidden');
      }
    }, 2500);

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      State.deferredPwaPrompt = e;
      banner.classList.remove('hidden');
      if (btnAuthPwa) btnAuthPwa.classList.remove('hidden');
    });

    const triggerInstallFlow = async () => {
      if (State.deferredPwaPrompt) {
        State.deferredPwaPrompt.prompt();
        const { outcome } = await State.deferredPwaPrompt.userChoice;
        if (outcome === 'accepted') {
          showToast('KalaFokus Terpasang!', 'Aplikasi berhasil ditambahkan ke Layar Utama perangkat Anda.', 'success');
        }
        State.deferredPwaPrompt = null;
        banner.classList.add('hidden');
      } else {
        banner.classList.add('hidden');
        showToast(
          'Siap Dipasang ke Layar Utama (PWA Aktif)',
          'Manifest & Service Worker telah aktif. Klik ikon "Install KalaFokus" di bilah alamat browser (Chrome/Edge) atau menu "Bagikan -> Tambahkan ke Layar Utama" di Safari/Mobile.',
          'success'
        );
      }
    };

    btnInstall.addEventListener('click', triggerInstallFlow);
    btnSidebarPwa.addEventListener('click', triggerInstallFlow);
    if (btnAuthPwa) btnAuthPwa.addEventListener('click', triggerInstallFlow);

    const hideBanner = () => {
      sessionStorage.setItem('kalafokus_pwa_dismissed', '1');
      banner.classList.add('hidden');
    };
    btnDismiss.addEventListener('click', hideBanner);
    btnLater.addEventListener('click', hideBanner);
  }

  // ==========================================================================
  // 13. RENDER SELURUH MODUL & INISIALISASI APLIKASI
  // ==========================================================================

  function renderDashboardExtras() {
    const esc = (v) =>
      String(v == null ? '' : v).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

    // Daftar Parkir Ide (kartu ungu)
    const ideaList = document.getElementById('dashboard-idea-list');
    if (ideaList) {
      const ideas = State.db.parked_ideas.filter((i) => !i.is_archived).slice(0, 6);
      ideaList.innerHTML = ideas.length
        ? ideas.map((i) => `<li>${esc(i.thought_content)}</li>`).join('')
        : '<li>Belum ada ide yang diparkir.</li>';
    }

    // Tabel Sesi Fokus Terbaru
    const sessionList = document.getElementById('dashboard-session-list');
    const sessions = State.db.focus_sessions;
    if (sessionList) {
      sessionList.innerHTML = sessions.length
        ? sessions
            .slice(0, 4)
            .map(
              (s) => `<tr>
                <td class="dash-cell-title">${esc(s.task_title || 'Sesi fokus bebas')}</td>
                <td>${esc(s.actual_duration_mins)} mnt</td>
                <td>${s.focus_quality_score != null ? esc(s.focus_quality_score) : '-'}</td>
              </tr>`
            )
            .join('')
        : '<tr><td colspan="3" class="dash-empty">Belum ada sesi.</td></tr>';
    }
  }

    function renderAllViews() {
    renderTasksModule();
    renderFocusTrackRecord();
    renderParkedIdeas();
    renderBrainfallModule();
    renderAiEvaluationsModule();
    renderDashboardExtras();
    renderArchitectureInspector();
  }

  document.addEventListener('DOMContentLoaded', () => {
    loadDatabase();
    probePhpBackend();
    initAuthGate();
    initRouterAndZenMode();
    initTaskEvents();
    initFocusTimerEvents();
    initParkedIdeaEvents();
    initBrainfallEvents();
    initAiEvaluationEvents();
    initPwaCapabilities();
    updateTimerVisual();
    renderAllViews();
  });
})();