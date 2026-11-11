-- ============================================================================
-- KALAFOKUS - COGNITIVE PRODUCTIVITY & ANTI-BURNOUT SPA
-- Skema Basis Data Relasional MySQL (6 Tabel Utama + Data Awal Lengkap)
-- Siap Diimpor Langsung melalui phpMyAdmin / HeidiSQL (Laragon)
-- ============================================================================

CREATE DATABASE IF NOT EXISTS `kalafokus_db`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `kalafokus_db`;

-- ----------------------------------------------------------------------------
-- 1. TABEL `users` (Profil Kognitif & Enkripsi Bcrypt)
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
-- 2. TABEL `tasks` (Manajemen Tugas & Auto-Deadline Sorting)
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
-- 3. TABEL `focus_sessions` (Track Record Ruang Sesi Fokus)
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
-- 4. TABEL `parked_ideas` (Panel Paralel Parkir Ide / Brain Dump)
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
-- 5. TABEL `brainfall_logs` (Pelacak Tontonan Reels & Alert Batas Aman Harian)
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
-- 6. TABEL `ai_evaluations` (Evaluasi Psikologis Humanis Gemini API)
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
-- DATA AWAL (SEEDER) UNTUK PENGUJIAN LANGSUNG DI PHPMYADMIN
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

INSERT INTO `tasks` (`id`, `user_id`, `title`, `description`, `category`, `cognitive_load`, `estimated_pomodoros`, `completed_pomodoros`, `deadline`, `status`)
VALUES
  (101, 1, 'Menyelesaikan Sintesis Literatur Beban Kognitif & Atensi', 'Fokus pada keterkaitan antara context switching dengan kelelahan korteks prefrontal.', 'Riset & Penulisan', 'high', 3, 2, DATE_ADD(NOW(), INTERVAL 4 HOUR), 'pending'),
  (102, 1, 'Revisi Struktur Skema 6 Tabel Relasional MySQL & Enkripsi Bcrypt', 'Pastikan relasi foreign key ON DELETE CASCADE berjalan mulus.', 'Arsitektur Backend', 'high', 2, 1, DATE_ADD(NOW(), INTERVAL 9 HOUR), 'pending'),
  (103, 1, 'Kurasi Palet Editorial & Tipografi Antarmuka Bebas Distraksi', 'Uji keterbacaan font Lora dan Plus Jakarta Sans pada mode kontras hangat Warm Cream.', 'Desain Antarmuka', 'medium', 2, 1, DATE_ADD(NOW(), INTERVAL 26 HOUR), 'pending')
ON DUPLICATE KEY UPDATE `title` = VALUES(`title`);

INSERT INTO `focus_sessions` (`id`, `user_id`, `task_id`, `session_mode`, `planned_duration_mins`, `actual_duration_mins`, `distraction_count`, `focus_quality_score`, `post_session_mood`, `session_notes`, `started_at`, `ended_at`)
VALUES
  (201, 1, 101, 'deep_work_50', 50, 50, 2, 96, 'energized', 'Berhasil masuk ke kondisi flow state setelah 10 menit pertama.', DATE_SUB(NOW(), INTERVAL 3 HOUR), DATE_SUB(NOW(), INTERVAL 2 HOUR)),
  (202, 1, 102, 'pomodoro_25', 25, 25, 1, 92, 'calm', 'Satu pikiran impulsif berhasil diparkir ke Brain Dump tanpa membuka tab baru.', DATE_SUB(NOW(), INTERVAL 1 HOUR), NOW())
ON DUPLICATE KEY UPDATE `session_notes` = VALUES(`session_notes`);

INSERT INTO `parked_ideas` (`id`, `user_id`, `focus_session_id`, `thought_content`, `tag`, `is_converted_to_task`, `is_archived`)
VALUES
  (301, 1, 201, 'Cari jurnal terbaru tentang dampak video pendek terhadap memori kerja (working memory).', 'riset_nanti', 0, 0),
  (302, 1, 202, 'Ingat untuk memesan biji kopi Arabika Gayo dan memperbarui backup cloud sore nanti.', 'urusan_mendadak', 0, 0)
ON DUPLICATE KEY UPDATE `thought_content` = VALUES(`thought_content`);

INSERT INTO `brainfall_logs` (`id`, `user_id`, `log_date`, `platform`, `duration_mins`, `estimated_videos_watched`, `trigger_context`, `cognitive_aftereffect`, `exceeded_safe_limit`)
VALUES
  (401, 1, CURDATE(), 'Instagram Reels', 12, 28, 'istirahat_kebablasan', 'biasa_saja', 0),
  (402, 1, CURDATE(), 'YouTube Shorts', 8, 16, 'kebosanan', 'kabut_otak', 0)
ON DUPLICATE KEY UPDATE `duration_mins` = VALUES(`duration_mins`);

INSERT INTO `ai_evaluations` (`id`, `user_id`, `evaluation_date`, `focus_total_mins`, `brainfall_total_mins`, `burnout_risk_level`, `attention_state_label`, `humanist_summary`, `actionable_prescription`, `model_used`)
VALUES
  (501, 1, CURDATE(), 75, 20, 'rendah', 'Keseimbangan Kognitif Terjaga & Produktif', 'Nadia, ritme kognitif Anda hari ini memperlihatkan kematangan regulasi diri yang sangat baik. Anda telah mengalokasikan 75 menit untuk fokus mendalam pada tugas berbeban tinggi, sambil dengan sadar memarkir lintasan pikiran impulsif ke dalam Parkir Ide agar tidak merusak keutuhan atensi.', '1. Selesaikan 1 sesi Pomodoro (25 menit) lagi untuk tugas tenggat terdekat hari ini.\n2. Hindari membuka Reels/Shorts setidaknya 90 menit ke depan agar reseptor dopamin kembali stabil.\n3. Tinjau kembali item di Parkir Ide pada pukul 17.00 sore.', 'gemini-2.5-flash')
ON DUPLICATE KEY UPDATE `attention_state_label` = VALUES(`attention_state_label`);
