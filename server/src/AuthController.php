<?php
declare(strict_types=1);

namespace App;

use PDO;
use PDOException;

class AuthController
{
    private const RESEND_COOLDOWN_SEC = 60;

    // POST /api/auth/register
    public static function register(): void
    {
        $in       = request_body();
        $name     = trim((string) ($in['name'] ?? ''));
        $email    = strtolower(trim((string) ($in['email'] ?? '')));
        $password = (string) ($in['password'] ?? '');

        $errors = [];
        if ($name === '' || mb_strlen($name) > 120) {
            $errors['name'] = 'Nama wajib diisi (maks. 120 karakter).';
        }
        if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 255) {
            $errors['email'] = 'Format email tidak valid.';
        }
        if (strlen($password) < 8 || strlen($password) > 72) { // batas bcrypt 72 byte
            $errors['password'] = 'Password harus 8–72 karakter.';
        }
        if ($errors) {
            json_error('Data tidak valid.', 422, 'VALIDATION', ['errors' => $errors]);
        }

        $pdo  = db();
        $stmt = $pdo->prepare('SELECT id, email_verified FROM users WHERE email = ?');
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        if ($user) {
            if ((int) $user['email_verified'] === 1) {
                json_error('Email sudah terdaftar. Silakan login.', 409, 'EMAIL_EXISTS');
            }
            // Sudah daftar tapi belum verifikasi: kirim ulang saja.
            // Password TIDAK diubah, supaya orang lain tidak bisa menimpa password akun ini.
            $userId = (int) $user['id'];
            self::assertCooldown($pdo, $userId);
        } else {
            try {
                $stmt = $pdo->prepare(
                    'INSERT INTO users (email, email_verified, name, password_hash) VALUES (?, 0, ?, ?)'
                );
                $stmt->execute([$email, $name, password_hash($password, PASSWORD_DEFAULT)]);
                $userId = (int) $pdo->lastInsertId();
            } catch (PDOException $e) {
                if ($e->getCode() === '23000') { // duplicate (race condition)
                    json_error('Email sudah terdaftar.', 409, 'EMAIL_EXISTS');
                }
                throw $e;
            }
        }

        $token = self::issueVerificationToken($pdo, $userId);
        $sent  = Mailer::sendVerification($email, $name, $token);

        json_response([
            'success'    => true,
            'email_sent' => $sent,
            'message'    => $sent
                ? 'Pendaftaran berhasil. Cek email kamu untuk verifikasi.'
                : 'Akun dibuat, tetapi email gagal terkirim. Silakan kirim ulang verifikasi.',
        ], 201);
    }

    // POST /api/auth/verify-email   body: { token }
    public static function verifyEmail(): void
    {
        $token = (string) (request_body()['token'] ?? '');
        if (!preg_match('/^[a-f0-9]{64}$/', $token)) {
            json_error('Token tidak valid.', 400, 'INVALID_TOKEN');
        }

        $pdo  = db();
        $stmt = $pdo->prepare(
            'SELECT ev.id, ev.user_id, ev.used_at, (ev.expires_at > NOW()) AS still_valid, u.email_verified
             FROM email_verifications ev
             JOIN users u ON u.id = ev.user_id
             WHERE ev.token_hash = ?'
        );
        $stmt->execute([hash('sha256', $token)]);
        $row = $stmt->fetch();

        if (!$row) {
            json_error('Token tidak valid atau sudah diganti dengan yang baru.', 400, 'INVALID_TOKEN');
        }
        if ((int) $row['email_verified'] === 1) {
            json_response(['success' => true, 'message' => 'Email sudah terverifikasi. Silakan login.']);
        }
        if (!(int) $row['still_valid']) {
            json_error('Link verifikasi sudah kedaluwarsa. Silakan kirim ulang.', 410, 'TOKEN_EXPIRED');
        }

        $pdo->beginTransaction();
        $pdo->prepare('UPDATE email_verifications SET used_at = NOW() WHERE id = ?')->execute([$row['id']]);
        $pdo->prepare('UPDATE users SET email_verified = 1 WHERE id = ?')->execute([$row['user_id']]);
        $pdo->commit();

        json_response(['success' => true, 'message' => 'Email berhasil diverifikasi. Silakan login.']);
    }

    // POST /api/auth/resend-verification   body: { email }
    public static function resendVerification(): void
    {
        $email = strtolower(trim((string) (request_body()['email'] ?? '')));
        $generic = ['success' => true, 'message' => 'Jika email terdaftar dan belum terverifikasi, link baru telah dikirim.'];

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            json_response($generic); // jawaban sama, agar email tidak bisa ditebak
        }

        $pdo  = db();
        $stmt = $pdo->prepare('SELECT id, name FROM users WHERE email = ? AND email_verified = 0');
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        if ($user) {
            self::assertCooldown($pdo, (int) $user['id']);
            $token = self::issueVerificationToken($pdo, (int) $user['id']);
            Mailer::sendVerification($email, $user['name'], $token);
        }

        json_response($generic);
    }

    // POST /api/auth/login   body: { email, password }
    public static function login(): void
    {
        $in       = request_body();
        $email    = strtolower(trim((string) ($in['email'] ?? '')));
        $password = (string) ($in['password'] ?? '');

        $stmt = db()->prepare('SELECT * FROM users WHERE email = ?');
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        if ($user && $user['password_hash'] === null) {
            json_error('Akun ini terdaftar lewat Google. Silakan masuk dengan Google.', 400, 'USE_GOOGLE');
        }
        if (!$user || !password_verify($password, $user['password_hash'])) {
            json_error('Email atau password salah.', 401, 'INVALID_CREDENTIALS');
        }
        if ((int) $user['email_verified'] !== 1) {
            json_error('Email belum diverifikasi. Cek inbox kamu.', 403, 'EMAIL_NOT_VERIFIED');
        }

        self::startSession($user);
        json_response(['success' => true, 'user' => self::publicUser($user)]);
    }

    // POST /api/auth/google   body: { credential }  (ID token dari Google Identity Services)
    public static function google(): void
    {
        $idToken = (string) (request_body()['credential'] ?? '');
        if ($idToken === '') {
            json_error('Token Google tidak ada.', 400, 'INVALID_TOKEN');
        }

        $ch = curl_init('https://oauth2.googleapis.com/tokeninfo?id_token=' . urlencode($idToken));
        curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 10]);
        $res  = curl_exec($ch);
        $http = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        $p = $res ? json_decode($res, true) : null;
        if ($http !== 200 || !is_array($p)
            || ($p['aud'] ?? '') !== env('GOOGLE_CLIENT_ID')
            || !in_array($p['iss'] ?? '', ['accounts.google.com', 'https://accounts.google.com'], true)
            || ($p['email_verified'] ?? '') !== 'true') {
            json_error('Token Google tidak valid.', 401, 'INVALID_TOKEN');
        }

        $sub    = (string) $p['sub'];
        $email  = strtolower((string) $p['email']);
        $name   = (string) ($p['name'] ?? $email);
        $avatar = $p['picture'] ?? null;

        $pdo  = db();
        $stmt = $pdo->prepare('SELECT * FROM users WHERE google_sub = ?');
        $stmt->execute([$sub]);
        $user = $stmt->fetch();

        if (!$user) {
            $stmt = $pdo->prepare('SELECT * FROM users WHERE email = ?');
            $stmt->execute([$email]);
            $user = $stmt->fetch();

            if ($user) {
                // Email sudah ada (daftar manual): tautkan ke akun Google.
                // Jika akun manual itu belum terverifikasi, password-nya dibuang
                // karena belum terbukti milik pemilik email.
                $passwordHash = (int) $user['email_verified'] === 1 ? $user['password_hash'] : null;
                $pdo->prepare(
                    'UPDATE users SET google_sub = ?, email_verified = 1,
                            avatar_url = COALESCE(avatar_url, ?), password_hash = ? WHERE id = ?'
                )->execute([$sub, $avatar, $passwordHash, $user['id']]);
            } else {
                $pdo->prepare(
                    'INSERT INTO users (google_sub, email, email_verified, name, avatar_url) VALUES (?, ?, 1, ?, ?)'
                )->execute([$sub, $email, $name, $avatar]);
            }

            $stmt = $pdo->prepare('SELECT * FROM users WHERE email = ?');
            $stmt->execute([$email]);
            $user = $stmt->fetch();
        }

        self::startSession($user);
        json_response(['success' => true, 'user' => self::publicUser($user)]);
    }

    // GET /api/auth/me
    public static function me(): void
    {
        $id = $_SESSION['user_id'] ?? null;
        if (!$id) {
            json_error('Belum login.', 401, 'UNAUTHENTICATED');
        }
        $stmt = db()->prepare('SELECT * FROM users WHERE id = ?');
        $stmt->execute([$id]);
        $user = $stmt->fetch();
        if (!$user) {
            json_error('Belum login.', 401, 'UNAUTHENTICATED');
        }
        json_response(['success' => true, 'user' => self::publicUser($user)]);
    }

    // POST /api/auth/logout
    public static function logout(): void
    {
        $_SESSION = [];
        session_destroy();
        json_response(['success' => true]);
    }

    // ---------------- helpers ----------------

    private static function issueVerificationToken(PDO $pdo, int $userId): string
    {
        // Token lama yang belum dipakai dibatalkan; hanya link terbaru yang berlaku.
        $pdo->prepare('DELETE FROM email_verifications WHERE user_id = ? AND used_at IS NULL')->execute([$userId]);

        $token = bin2hex(random_bytes(32)); // 64 karakter hex
        $pdo->prepare(
            'INSERT INTO email_verifications (user_id, token_hash, expires_at)
             VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 24 HOUR))'
        )->execute([$userId, hash('sha256', $token)]);

        return $token;
    }

    private static function assertCooldown(PDO $pdo, int $userId): void
    {
        $stmt = $pdo->prepare(
            'SELECT TIMESTAMPDIFF(SECOND, created_at, NOW()) AS age
             FROM email_verifications WHERE user_id = ? ORDER BY id DESC LIMIT 1'
        );
        $stmt->execute([$userId]);
        $age = $stmt->fetchColumn();

        if ($age !== false && (int) $age < self::RESEND_COOLDOWN_SEC) {
            $wait = self::RESEND_COOLDOWN_SEC - (int) $age;
            json_error("Tunggu {$wait} detik sebelum meminta email lagi.", 429, 'TOO_MANY_REQUESTS');
        }
    }

    private static function startSession(array $user): void
    {
        session_regenerate_id(true);
        $_SESSION['user_id'] = (int) $user['id'];
        db()->prepare('UPDATE users SET last_login_at = NOW() WHERE id = ?')->execute([$user['id']]);
    }

    private static function publicUser(array $u): array
    {
        return [
            'id'         => (int) $u['id'],
            'name'       => $u['name'],
            'email'      => $u['email'],
            'avatar_url' => $u['avatar_url'],
        ];
    }
}