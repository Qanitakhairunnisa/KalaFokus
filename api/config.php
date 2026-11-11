<?php
/**
 * KALAFOKUS - Konfigurasi Koneksi Basis Data MySQL & Helper Keamanan
 * Dipersiapkan untuk integrasi penuh dengan Frontend SPA KalaFokus.
 */

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Konfigurasi Kredensial MySQL (Sesuaikan dengan Laragon / XAMPP / Docker)
define('DB_HOST', getenv('KALAFOKUS_DB_HOST') ?: '127.0.0.1');
define('DB_PORT', getenv('KALAFOKUS_DB_PORT') ?: '3306');
define('DB_NAME', getenv('KALAFOKUS_DB_NAME') ?: 'kalafokus_db');
define('DB_USER', getenv('KALAFOKUS_DB_USER') ?: 'root');
define('DB_PASS', getenv('KALAFOKUS_DB_PASS') ?: '');

// Konfigurasi Opsional Server-Side Gemini API Key
define('GEMINI_API_KEY', getenv('GEMINI_API_KEY') ?: '');

// Cost factor untuk algoritma enkripsi Bcrypt
define('BCRYPT_COST', 12);

/**
 * Membuat instance PDO tunggal (Singleton) ke basis data MySQL.
 */
function getDbConnection(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        $dsn = sprintf('mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4', DB_HOST, DB_PORT, DB_NAME);
        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ];
        $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
    }
    return $pdo;
}

/**
 * Helper untuk mengirim respons JSON terstandarisasi.
 */
function sendJsonResponse(int $statusCode, bool $success, string $message, array $data = []): void {
    http_response_code($statusCode);
    echo json_encode([
        'success'   => $success,
        'message'   => $message,
        'timestamp' => date('c'),
        'data'      => $data
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * Membaca payload JSON dari body request.
 */
function getJsonBody(): array {
    $raw = file_get_contents('php://input');
    if (!$raw) {
        return [];
    }
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}
