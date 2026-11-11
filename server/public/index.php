<?php
declare(strict_types=1);

require __DIR__ . '/../config/config.php';
require __DIR__ . '/../config/database.php';

use App\AuthController;

$path   = '/' . trim((string) parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/');
$method = $_SERVER['REQUEST_METHOD'];

try {
    match ("$method $path") {
        'POST /api/auth/register'            => AuthController::register(),
        'POST /api/auth/verify-email'        => AuthController::verifyEmail(),
        'POST /api/auth/resend-verification' => AuthController::resendVerification(),
        'POST /api/auth/login'               => AuthController::login(),
        'POST /api/auth/google'              => AuthController::google(),
        'GET /api/auth/me'                   => AuthController::me(),
        'POST /api/auth/logout'              => AuthController::logout(),
        default                              => json_error('Endpoint tidak ditemukan.', 404, 'NOT_FOUND'),
    };
} catch (Throwable $e) {
    error_log($e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine());
    json_error('Terjadi kesalahan pada server.', 500, 'SERVER_ERROR');
}