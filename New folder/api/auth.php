<?php
/**
 * KALAFOKUS - Modul Autentikasi Gerbang Keamanan (Bcrypt Encryption)
 * Mengimplementasikan hashing Bcrypt (Cost 12) sesuai standar keamanan modern.
 */

declare(strict_types=1);

require_once __DIR__ . '/config.php';

session_start();

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? 'status';
$body   = getJsonBody();

try {
    $pdo = getDbConnection();

    // 1. REGISTRASI PENGGUNA BARU DENGAN ENKRIPSI BCRYPT
    if ($method === 'POST' && $action === 'register') {
        $fullName         = trim($body['full_name'] ?? '');
        $email            = strtolower(trim($body['email'] ?? ''));
        $password         = $body['password'] ?? '';
        $cognitiveProfile = $body['cognitive_profile'] ?? 'balanced_explorer';
        $dailyReelsLimit  = max(10, min(180, (int)($body['daily_reels_limit_mins'] ?? 30)));

        if ($fullName === '' || !filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($password) < 8) {
            sendJsonResponse(422, false, 'Nama lengkap, email valid, dan kata sandi minimal 8 karakter wajib diisi.');
        }

        // Cek apakah email sudah terdaftar
        $stmtCheck = $pdo->prepare('SELECT id FROM users WHERE email = :email LIMIT 1');
        $stmtCheck->execute(['email' => $email]);
        if ($stmtCheck->fetch()) {
            sendJsonResponse(409, false, 'Alamat email ini sudah terdaftar di KalaFokus.');
        }

        // Enkripsi kata sandi menggunakan algoritma Bcrypt (Blowfish Cipher)
        $bcryptHash = password_hash($password, PASSWORD_BCRYPT, ['cost' => BCRYPT_COST]);

        $stmtInsert = $pdo->prepare('
            INSERT INTO users (full_name, email, password_hash, cognitive_profile, daily_focus_target_mins, daily_reels_limit_mins)
            VALUES (:full_name, :email, :password_hash, :cognitive_profile, 120, :daily_reels_limit)
        ');
        $stmtInsert->execute([
            'full_name'         => $fullName,
            'email'             => $email,
            'password_hash'     => $bcryptHash,
            'cognitive_profile' => $cognitiveProfile,
            'daily_reels_limit' => $dailyReelsLimit,
        ]);

        $userId = (int)$pdo->lastInsertId();
        $_SESSION['kalafokus_user_id'] = $userId;

        sendJsonResponse(201, true, 'Akun berhasil dibuat dengan proteksi enkripsi Bcrypt.', [
            'user' => [
                'id'                      => $userId,
                'full_name'               => $fullName,
                'email'                   => $email,
                'cognitive_profile'       => $cognitiveProfile,
                'daily_focus_target_mins' => 120,
                'daily_reels_limit_mins'  => $dailyReelsLimit,
                'bcrypt_signature'        => substr($bcryptHash, 0, 29) . '...'
            ]
        ]);
    }

    // 2. LOGIN & VERIFIKASI HASH BCRYPT
    if ($method === 'POST' && $action === 'login') {
        $email    = strtolower(trim($body['email'] ?? ''));
        $password = $body['password'] ?? '';

        if ($email === '' || $password === '') {
            sendJsonResponse(400, false, 'Email dan kata sandi wajib diisi.');
        }

        $stmt = $pdo->prepare('SELECT * FROM users WHERE email = :email LIMIT 1');
        $stmt->execute(['email' => $email]);
        $user = $stmt->fetch();

        if (!$user || !password_verify($password, $user['password_hash'])) {
            sendJsonResponse(401, false, 'Kredensial tidak cocok. Verifikasi Bcrypt menolak akses.');
        }

        // Rehash otomatis apabila cost factor Bcrypt ditingkatkan di masa depan
        if (password_needs_rehash($user['password_hash'], PASSWORD_BCRYPT, ['cost' => BCRYPT_COST])) {
            $newHash = password_hash($password, PASSWORD_BCRYPT, ['cost' => BCRYPT_COST]);
            $pdo->prepare('UPDATE users SET password_hash = :hash WHERE id = :id')
                ->execute(['hash' => $newHash, 'id' => $user['id']]);
        }

        $_SESSION['kalafokus_user_id'] = (int)$user['id'];

        sendJsonResponse(200, true, 'Verifikasi Bcrypt berhasil. Selamat datang di ruang tenang KalaFokus.', [
            'user' => [
                'id'                      => (int)$user['id'],
                'full_name'               => $user['full_name'],
                'email'                   => $user['email'],
                'cognitive_profile'       => $user['cognitive_profile'],
                'daily_focus_target_mins' => (int)$user['daily_focus_target_mins'],
                'daily_reels_limit_mins'  => (int)$user['daily_reels_limit_mins'],
                'bcrypt_signature'        => substr($user['password_hash'], 0, 29) . '...'
            ]
        ]);
    }

    // 3. LOGOUT SESI
    if ($method === 'POST' && $action === 'logout') {
        session_destroy();
        sendJsonResponse(200, true, 'Sesi fokus telah ditutup dengan aman.');
    }

    sendJsonResponse(400, false, 'Aksi autentikasi tidak dikenali.');
} catch (Throwable $e) {
    sendJsonResponse(500, false, 'Koneksi basis data belum aktif atau terjadi kesalahan server.', [
        'hint' => 'Impor file database/kalafokus_schema.sql ke MySQL atau gunakan Mode Mandiri (LocalStorage) pada SPA.'
    ]);
}
