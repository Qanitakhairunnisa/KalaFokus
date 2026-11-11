<?php
/**
 * KALAFOKUS - RESTful API Endpoint Utama (6 Tabel Relasional + Proxy Gemini AI)
 * Menangani modul:
 *  - tasks          (Manajemen Tugas & Auto-Deadline Sorting)
 *  - focus_sessions (Track Record Ruang Sesi Fokus)
 *  - parked_ideas   (Panel Paralel Parkir Ide / Brain Dump)
 *  - brainfall_logs (Pelacakan Tontonan Reels & Alert Batas Aman)
 *  - ai_evaluations (Riwayat Evaluasi Psikologis Humanis Gemini API)
 */

declare(strict_types=1);

require_once __DIR__ . '/config.php';

session_start();

$resource = $_GET['resource'] ?? 'health';
$method   = $_SERVER['REQUEST_METHOD'];
$body     = getJsonBody();
$userId   = (int)($_SESSION['kalafokus_user_id'] ?? ($body['user_id'] ?? ($_GET['user_id'] ?? 1)));

try {
    if ($resource === 'health') {
        $pdo = getDbConnection();
        sendJsonResponse(200, true, 'Backend PHP & MySQL KalaFokus aktif dan terhubung.', [
            'tables' => ['users', 'tasks', 'focus_sessions', 'parked_ideas', 'brainfall_logs', 'ai_evaluations'],
            'encryption' => 'Bcrypt ($2y$12$)'
        ]);
    }

    $pdo = getDbConnection();

    switch ($resource) {
        // ====================================================================
        // MODUL 1: MANAJEMEN TUGAS (Auto-Sorting berdasarkan Deadline & Beban)
        // ====================================================================
        case 'tasks':
            if ($method === 'GET') {
                $stmt = $pdo->prepare("
                    SELECT * FROM tasks
                    WHERE user_id = :user_id
                    ORDER BY
                        CASE WHEN status = 'completed' THEN 1 ELSE 0 END ASC,
                        deadline ASC,
                        FIELD(cognitive_load, 'high', 'medium', 'low')
                ");
                $stmt->execute(['user_id' => $userId]);
                sendJsonResponse(200, true, 'Daftar tugas berhasil diurutkan berdasarkan deadline terdekat.', [
                    'tasks' => $stmt->fetchAll()
                ]);
            }

            if ($method === 'POST') {
                $stmt = $pdo->prepare('
                    INSERT INTO tasks (user_id, title, description, category, cognitive_load, estimated_pomodoros, deadline, status)
                    VALUES (:user_id, :title, :description, :category, :cognitive_load, :estimated_pomodoros, :deadline, :status)
                ');
                $stmt->execute([
                    'user_id'             => $userId,
                    'title'               => trim($body['title'] ?? 'Tugas Baru'),
                    'description'         => trim($body['description'] ?? ''),
                    'category'            => $body['category'] ?? 'Pekerjaan Utama',
                    'cognitive_load'      => $body['cognitive_load'] ?? 'medium',
                    'estimated_pomodoros' => max(1, (int)($body['estimated_pomodoros'] ?? 1)),
                    'deadline'            => $body['deadline'] ?? date('Y-m-d H:i:s', strtotime('+1 day')),
                    'status'              => 'pending'
                ]);
                sendJsonResponse(201, true, 'Tugas berhasil dijadwalkan.', ['id' => (int)$pdo->lastInsertId()]);
            }

            if ($method === 'PATCH') {
                $taskId = (int)($body['id'] ?? 0);
                $status = $body['status'] ?? 'completed';
                $completedAt = ($status === 'completed') ? date('Y-m-d H:i:s') : null;
                $stmt = $pdo->prepare('UPDATE tasks SET status = :status, completed_at = :completed_at WHERE id = :id AND user_id = :user_id');
                $stmt->execute([
                    'status'       => $status,
                    'completed_at' => $completedAt,
                    'id'           => $taskId,
                    'user_id'      => $userId
                ]);
                sendJsonResponse(200, true, 'Status tugas diperbarui.');
            }

            if ($method === 'DELETE') {
                $taskId = (int)($_GET['id'] ?? ($body['id'] ?? 0));
                $stmt = $pdo->prepare('DELETE FROM tasks WHERE id = :id AND user_id = :user_id');
                $stmt->execute(['id' => $taskId, 'user_id' => $userId]);
                sendJsonResponse(200, true, 'Tugas dihapus.');
            }
            break;

        // ====================================================================
        // MODUL 2: RUANG SESI FOKUS & TRACK RECORD TIMER
        // ====================================================================
        case 'sessions':
            if ($method === 'GET') {
                $stmt = $pdo->prepare('
                    SELECT fs.*, t.title AS task_title
                    FROM focus_sessions fs
                    LEFT JOIN tasks t ON fs.task_id = t.id
                    WHERE fs.user_id = :user_id
                    ORDER BY fs.started_at DESC
                    LIMIT 50
                ');
                $stmt->execute(['user_id' => $userId]);
                sendJsonResponse(200, true, 'Track record sesi fokus dimuat.', [
                    'sessions' => $stmt->fetchAll()
                ]);
            }

            if ($method === 'POST') {
                $stmt = $pdo->prepare('
                    INSERT INTO focus_sessions
                    (user_id, task_id, session_mode, planned_duration_mins, actual_duration_mins, distraction_count, focus_quality_score, post_session_mood, session_notes, started_at, ended_at)
                    VALUES
                    (:user_id, :task_id, :session_mode, :planned, :actual, :distractions, :score, :mood, :notes, :started_at, :ended_at)
                ');
                $stmt->execute([
                    'user_id'      => $userId,
                    'task_id'      => !empty($body['task_id']) ? (int)$body['task_id'] : null,
                    'session_mode' => $body['session_mode'] ?? 'pomodoro_25',
                    'planned'      => (int)($body['planned_duration_mins'] ?? 25),
                    'actual'       => (int)($body['actual_duration_mins'] ?? 25),
                    'distractions' => (int)($body['distraction_count'] ?? 0),
                    'score'        => (int)($body['focus_quality_score'] ?? 95),
                    'mood'         => $body['post_session_mood'] ?? 'calm',
                    'notes'        => $body['session_notes'] ?? '',
                    'started_at'   => $body['started_at'] ?? date('Y-m-d H:i:s', strtotime('-25 minutes')),
                    'ended_at'     => date('Y-m-d H:i:s')
                ]);
                sendJsonResponse(201, true, 'Track record sesi fokus berhasil disimpan.', ['id' => (int)$pdo->lastInsertId()]);
            }
            break;

        // ====================================================================
        // MODUL 3: PANEL PARALEL "PARKIR IDE" (BRAIN DUMP)
        // ====================================================================
        case 'ideas':
            if ($method === 'GET') {
                $stmt = $pdo->prepare('SELECT * FROM parked_ideas WHERE user_id = :user_id AND is_archived = 0 ORDER BY captured_at DESC');
                $stmt->execute(['user_id' => $userId]);
                sendJsonResponse(200, true, 'Daftar pemikiran di Parkir Ide dimuat.', [
                    'ideas' => $stmt->fetchAll()
                ]);
            }

            if ($method === 'POST') {
                $stmt = $pdo->prepare('
                    INSERT INTO parked_ideas (user_id, focus_session_id, thought_content, tag)
                    VALUES (:user_id, :focus_session_id, :thought_content, :tag)
                ');
                $stmt->execute([
                    'user_id'          => $userId,
                    'focus_session_id' => !empty($body['focus_session_id']) ? (int)$body['focus_session_id'] : null,
                    'thought_content'  => trim($body['thought_content'] ?? ''),
                    'tag'              => $body['tag'] ?? 'ide_kreatif'
                ]);
                sendJsonResponse(201, true, 'Pemikiran impulsif berhasil diparkir agar fokus Anda tetap utuh.', ['id' => (int)$pdo->lastInsertId()]);
            }

            if ($method === 'DELETE') {
                $ideaId = (int)($_GET['id'] ?? ($body['id'] ?? 0));
                $stmt = $pdo->prepare('DELETE FROM parked_ideas WHERE id = :id AND user_id = :user_id');
                $stmt->execute(['id' => $ideaId, 'user_id' => $userId]);
                sendJsonResponse(200, true, 'Item Parkir Ide dihapus.');
            }
            break;

        // ====================================================================
        // MODUL 4: ADAPTASI "BRAINFALL" (PELACAKAN REELS & BATAS AMAN HARIAN)
        // ====================================================================
        case 'brainfall':
            if ($method === 'GET') {
                $stmt = $pdo->prepare('SELECT * FROM brainfall_logs WHERE user_id = :user_id ORDER BY log_date DESC, logged_at DESC LIMIT 30');
                $stmt->execute(['user_id' => $userId]);
                sendJsonResponse(200, true, 'Log paparan Reels BrainFall dimuat.', [
                    'logs' => $stmt->fetchAll()
                ]);
            }

            if ($method === 'POST') {
                $logDate  = $body['log_date'] ?? date('Y-m-d');
                $duration = max(1, (int)($body['duration_mins'] ?? 15));

                // Hitung akumulasi hari ini untuk menentukan status batas aman
                $stmtSum = $pdo->prepare('SELECT COALESCE(SUM(duration_mins), 0) AS total FROM brainfall_logs WHERE user_id = :user_id AND log_date = :log_date');
                $stmtSum->execute(['user_id' => $userId, 'log_date' => $logDate]);
                $currentTotal = (int)$stmtSum->fetchColumn();

                $stmtLimit = $pdo->prepare('SELECT daily_reels_limit_mins FROM users WHERE id = :id');
                $stmtLimit->execute(['id' => $userId]);
                $dailyLimit = (int)($stmtLimit->fetchColumn() ?: 30);

                $exceeded = (($currentTotal + $duration) > $dailyLimit) ? 1 : 0;

                $stmt = $pdo->prepare('
                    INSERT INTO brainfall_logs
                    (user_id, log_date, platform, duration_mins, estimated_videos_watched, trigger_context, cognitive_aftereffect, exceeded_safe_limit)
                    VALUES (:user_id, :log_date, :platform, :duration_mins, :videos, :trigger_context, :aftereffect, :exceeded)
                ');
                $stmt->execute([
                    'user_id'         => $userId,
                    'log_date'        => $logDate,
                    'platform'        => $body['platform'] ?? 'Instagram Reels',
                    'duration_mins'   => $duration,
                    'videos'          => (int)($body['estimated_videos_watched'] ?? ($duration * 2)),
                    'trigger_context' => $body['trigger_context'] ?? 'istirahat_kebablasan',
                    'aftereffect'     => $body['cognitive_aftereffect'] ?? 'biasa_saja',
                    'exceeded'        => $exceeded
                ]);

                sendJsonResponse(201, true, $exceeded ? 'Peringatan BrainFall: Batas aman tontonan Reels harian telah terlampaui!' : 'Log konsumsi media sosial tercatat.', [
                    'id'                  => (int)$pdo->lastInsertId(),
                    'daily_total_mins'    => $currentTotal + $duration,
                    'daily_limit_mins'    => $dailyLimit,
                    'exceeded_safe_limit' => (bool)$exceeded
                ]);
            }
            break;

        // ====================================================================
        // MODUL 5: EVALUASI PSIKOLOGIS HUMANIS (GEMINI API)
        // ====================================================================
        case 'evaluations':
            if ($method === 'GET') {
                $stmt = $pdo->prepare('SELECT * FROM ai_evaluations WHERE user_id = :user_id ORDER BY created_at DESC LIMIT 10');
                $stmt->execute(['user_id' => $userId]);
                sendJsonResponse(200, true, 'Riwayat evaluasi psikologis Gemini dimuat.', [
                    'evaluations' => $stmt->fetchAll()
                ]);
            }

            if ($method === 'POST') {
                $stmt = $pdo->prepare('
                    INSERT INTO ai_evaluations
                    (user_id, evaluation_date, focus_total_mins, brainfall_total_mins, burnout_risk_level, attention_state_label, humanist_summary, actionable_prescription, model_used)
                    VALUES (:user_id, :eval_date, :focus_mins, :brainfall_mins, :risk, :label, :summary, :prescription, :model)
                ');
                $stmt->execute([
                    'user_id'        => $userId,
                    'eval_date'      => date('Y-m-d'),
                    'focus_mins'     => (int)($body['focus_total_mins'] ?? 0),
                    'brainfall_mins' => (int)($body['brainfall_total_mins'] ?? 0),
                    'risk'           => $body['burnout_risk_level'] ?? 'rendah',
                    'label'          => $body['attention_state_label'] ?? 'Keseimbangan Kognitif Terjaga',
                    'summary'        => $body['humanist_summary'] ?? '',
                    'prescription'   => $body['actionable_prescription'] ?? '',
                    'model'          => $body['model_used'] ?? 'gemini-2.5-flash'
                ]);
                sendJsonResponse(201, true, 'Evaluasi psikologis berhasil disimpan ke basis data.', ['id' => (int)$pdo->lastInsertId()]);
            }
            break;

        default:
            sendJsonResponse(404, false, 'Resource endpoint tidak ditemukan.');
    }
} catch (Throwable $e) {
    sendJsonResponse(500, false, 'Server database belum aktif: ' . $e->getMessage());
}
