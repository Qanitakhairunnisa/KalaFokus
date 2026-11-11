-- ============================================================================
-- KALAFOKUS - COGNITIVE PRODUCTIVITY & ANTI-BURNOUT SPA
-- Skema Basis Data Relasional MySQL (6 Tabel Utama)
-- Engine: InnoDB | Charset: utf8mb4_unicode_ci
-- ============================================================================

CREATE DATABASE IF NOT EXISTS `kalafokus_db`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `kalafokus_db`;

-- ----------------------------------------------------------------------------
-- 1. TABEL `users`
-- Menyimpan profil pengguna, kredensial terenkripsi Bcrypt, dan parameter
-- kapasitas kognitif harian (batas fokus & batas aman tontonan Reels/BrainFall).
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `full_name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(150) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL COMMENT 'Hash Bcrypt ($2y$12$...) dari password_hash() PHP',
  `cognitive_profile` ENUM('deep_thinker', 'sprint_worker', 'balanced_explorer') DEFAULT 'balanced_explorer',
  `daily_focus_target_mins` SMALLINT UNSIGNED DEFAULT 120 COMMENT 'Target durasi fokus harian (menit)',
  `daily_reels_limit_mins` SMALLINT UNSIGNED DEFAULT 30 COMMENT 'Batas aman harian tontonan Reels/Shorts pada fitur BrainFall (menit)',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 2. TABEL `tasks`
-- Modul Manajemen Tugas dengan penyortiran deadline otomatis dan tingkat
-- beban kognitif (Cognitive Load Theory).
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `tasks` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT UNSIGNED NOT NULL,
  `title` VARCHAR(200) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `category` VARCHAR(60) DEFAULT 'Pekerjaan Utama',
  `cognitive_load` ENUM('low', 'medium', 'high') DEFAULT 'medium' COMMENT 'Beban kognitif: low (Ringan), medium (Sedang), high (Deep Work)',
  `estimated_pomodoros` TINYINT UNSIGNED DEFAULT 1,
  `completed_pomodoros` TINYINT UNSIGNED DEFAULT 0,
  `deadline` DATETIME NOT NULL COMMENT 'Digunakan untuk penyortiran urgensi otomatis (Auto-Deadline Sorting)',
  `status` ENUM('pending', 'in_progress', 'completed') DEFAULT 'pending',
  `completed_at` DATETIME DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_tasks_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX `idx_tasks_user_deadline` (`user_id`, `status`, `deadline` ASC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 3. TABEL `focus_sessions`
-- Ruang Sesi Fokus dengan Timer pencatat Track Record historis, jumlah
-- distraksi/interupsi yang berhasil ditahan, serta kondisi afektif pasca-sesi.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `focus_sessions` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT UNSIGNED NOT NULL,
  `task_id` INT UNSIGNED DEFAULT NULL COMMENT 'Opsional: terkait tugas spesifik atau sesi fokus bebas',
  `session_mode` ENUM('pomodoro_25', 'deep_work_50', 'micro_15', 'custom') DEFAULT 'pomodoro_25',
  `planned_duration_mins` SMALLINT UNSIGNED NOT NULL DEFAULT 25,
  `actual_duration_mins` SMALLINT UNSIGNED NOT NULL DEFAULT 25,
  `distraction_count` TINYINT UNSIGNED DEFAULT 0 COMMENT 'Jumlah pikiran impulsif yang dialihkan ke Parkir Ide selama sesi',
  `focus_quality_score` TINYINT UNSIGNED DEFAULT 100 COMMENT 'Skor kualitas fokus (0-100)',
  `post_session_mood` ENUM('energized', 'calm', 'tired', 'overwhelmed') DEFAULT 'calm',
  `session_notes` VARCHAR(255) DEFAULT NULL,
  `started_at` DATETIME NOT NULL,
  `ended_at` DATETIME DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_sessions_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_sessions_task`
    FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  INDEX `idx_sessions_user_date` (`user_id`, `started_at` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 4. TABEL `parked_ideas`
-- Panel "Parkir Ide" paralel (Brain Dump) untuk menampung pemikiran impulsif
-- agar tidak merusak rentang fokus saat bekerja.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `parked_ideas` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT UNSIGNED NOT NULL,
  `focus_session_id` INT UNSIGNED DEFAULT NULL COMMENT 'Jika ditangkap saat sesi fokus sedang berlangsung',
  `thought_content` TEXT NOT NULL COMMENT 'Isi pemikiran impulsif / ide mendadak',
  `tag` ENUM('ide_kreatif', 'urusan_mendadak', 'riset_nanti', 'refleksi') DEFAULT 'ide_kreatif',
  `is_converted_to_task` TINYINT(1) DEFAULT 0 COMMENT '1 jika sudah dipromosikan menjadi item Tugas',
  `is_archived` TINYINT(1) DEFAULT 0,
  `captured_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_ideas_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_ideas_session`
    FOREIGN KEY (`focus_session_id`) REFERENCES `focus_sessions` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  INDEX `idx_ideas_user_status` (`user_id`, `is_archived`, `captured_at` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 5. TABEL `brainfall_logs`
-- Fitur adaptasi "BrainFall" untuk melacak durasi tontonan Reels/Shorts/TikTok
-- harian dan memicu alert batas aman kelelahan dopamin (Dopamine Fatigue).
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `brainfall_logs` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT UNSIGNED NOT NULL,
  `log_date` DATE NOT NULL,
  `platform` ENUM('Instagram Reels', 'TikTok', 'YouTube Shorts', 'X / Mixed Feeds') DEFAULT 'Instagram Reels',
  `duration_mins` SMALLINT UNSIGNED NOT NULL COMMENT 'Durasi tontonan dalam menit',
  `estimated_videos_watched` SMALLINT UNSIGNED DEFAULT 0 COMMENT 'Estimasi jumlah video pendek yang dikonsumsi',
  `trigger_context` ENUM('kebosanan', 'prokrastinasi_tugas', 'istirahat_kebablasan', 'sebelum_tidur') DEFAULT 'istirahat_kebablasan',
  `cognitive_aftereffect` ENUM('segar', 'biasa_saja', 'kabut_otak', 'cemas_menyesal') DEFAULT 'biasa_saja',
  `exceeded_safe_limit` TINYINT(1) DEFAULT 0 COMMENT '1 jika akumulasi hari tersebut melewati batas aman pengguna',
  `logged_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_brainfall_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX `idx_brainfall_user_date` (`user_id`, `log_date` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 6. TABEL `ai_evaluations`
-- Menyimpan hasil sintesis psikologis humanis dari Gemini API berdasarkan
-- metrik tugas, track record sesi fokus, Parkir Ide, dan paparan BrainFall.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `ai_evaluations` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT UNSIGNED NOT NULL,
  `evaluation_date` DATE NOT NULL,
  `focus_total_mins` SMALLINT UNSIGNED DEFAULT 0,
  `brainfall_total_mins` SMALLINT UNSIGNED DEFAULT 0,
  `burnout_risk_level` ENUM('rendah', 'moderat', 'tinggi') DEFAULT 'rendah',
  `attention_state_label` VARCHAR(100) DEFAULT 'Keseimbangan Kognitif Terjaga',
  `humanist_summary` TEXT NOT NULL COMMENT 'Narasi reflektif psikologis dari Gemini API',
  `actionable_prescription` TEXT NOT NULL COMMENT 'Saran pemulihan kognitif yang lembut & terukur',
  `model_used` VARCHAR(60) DEFAULT 'gemini-2.5-flash',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_evaluations_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX `idx_evaluations_user_date` (`user_id`, `evaluation_date` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- DATA AWAL (SEEDER) UNTUK PENGUJIAN LANGSUNG
-- Password akun demo: "kalafokus2026" (Dienkripsi dengan Bcrypt cost 12)
-- ============================================================================
INSERT INTO `users` (`id`, `full_name`, `email`, `password_hash`, `cognitive_profile`, `daily_focus_target_mins`, `daily_reels_limit_mins`)
VALUES (
  1,
  'Nadia Pramesti',
  'nadia@kalafokus.id',
  '$2y$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUW',
  'deep_thinker',
  120,
  30
) ON DUPLICATE KEY UPDATE `full_name` = VALUES(`full_name`);
