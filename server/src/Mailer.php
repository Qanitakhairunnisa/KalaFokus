<?php
declare(strict_types=1);

namespace App;

use PHPMailer\PHPMailer\Exception;
use PHPMailer\PHPMailer\PHPMailer;

class Mailer
{
    public static function sendVerification(string $to, string $name, string $token): bool
    {
        $link = rtrim((string) env('FRONTEND_URL'), '/') . '/verify-email?token=' . urlencode($token);
        $safeName = htmlspecialchars($name, ENT_QUOTES, 'UTF-8');

        $mail = new PHPMailer(true);
        try {
            $mail->isSMTP();
            $mail->Host       = (string) env('MAIL_HOST');
            $mail->SMTPAuth   = true;
            $mail->Username   = (string) env('MAIL_USER');
            $mail->Password   = (string) env('MAIL_PASS');
            $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
            $mail->Port       = (int) env('MAIL_PORT', 587);
            $mail->CharSet    = 'UTF-8';

            $mail->setFrom((string) env('MAIL_FROM'), (string) env('MAIL_FROM_NAME', 'KalaFokus'));
            $mail->addAddress($to, $name);

            $mail->isHTML(true);
            $mail->Subject = 'Verifikasi email akun KalaFokus';
            $mail->Body = "
                <div style='font-family:Arial,sans-serif;max-width:480px;margin:auto'>
                  <h2>Halo, {$safeName} 👋</h2>
                  <p>Terima kasih sudah mendaftar di KalaFokus. Klik tombol di bawah untuk memverifikasi email kamu.</p>
                  <p style='margin:28px 0'>
                    <a href='{$link}' style='background:#4f46e5;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none'>
                      Verifikasi Email
                    </a>
                  </p>
                  <p style='font-size:13px;color:#666'>Link berlaku 24 jam. Jika tombol tidak berfungsi, salin link ini:<br>{$link}</p>
                  <p style='font-size:13px;color:#666'>Jika kamu tidak merasa mendaftar, abaikan email ini.</p>
                </div>";
            $mail->AltBody = "Halo {$name}, verifikasi email kamu di: {$link} (berlaku 24 jam)";

            $mail->send();
            return true;
        } catch (Exception $e) {
            error_log('Mail error: ' . $mail->ErrorInfo);
            return false;
        }
    }
}