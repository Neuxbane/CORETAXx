<?php
/**
 * Email utilities for CORETAX using Mailtrap API (cURL)
 */

// Mailtrap configuration
define('MAILTRAP_API_KEY', 'ed07b232dc4d44f67b87e71adcf82805');
define('MAILTRAP_FROM_EMAIL', 'hello@coretax.epajak.id');
define('MAILTRAP_FROM_NAME', 'CORETAX System');
define('MAILTRAP_API_URL', 'https://send.api.mailtrap.io/api/send');

function send_email($to, $subject, $htmlMessage, $textMessage = null) {
    // Log for dev purposes
    $logDir = __DIR__ . '/../data/mail_logs';
    if (!is_dir($logDir)) mkdir($logDir, 0775, true);
    
    $entry = [
        'to' => $to,
        'subject' => $subject,
        'timestamp' => date('c'),
    ];
    
    // Prepare text version if not provided
    if ($textMessage === null) {
        $textMessage = strip_tags($htmlMessage);
    }
    
    // Prepare payload for Mailtrap API
    $payload = [
        'from' => [
            'email' => MAILTRAP_FROM_EMAIL,
            'name' => MAILTRAP_FROM_NAME
        ],
        'to' => [
            ['email' => $to]
        ],
        'subject' => $subject,
        'html' => $htmlMessage,
        'text' => $textMessage,
        'category' => 'CORETAX'
    ];
    
    // Send via cURL
    $ch = curl_init();
    
    curl_setopt_array($ch, [
        CURLOPT_URL => MAILTRAP_API_URL,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($payload),
        CURLOPT_HTTPHEADER => [
            'Authorization: Bearer ' . MAILTRAP_API_KEY,
            'Content-Type: application/json'
        ],
        CURLOPT_TIMEOUT => 30
    ]);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);
    
    // Parse response
    $responseData = json_decode($response, true);
    
    $entry['http_code'] = $httpCode;
    $entry['response'] = $responseData;
    $entry['method'] = 'mailtrap_curl';
    
    if ($curlError) {
        $entry['curl_error'] = $curlError;
        $entry['mail_result'] = false;
    } else {
        $entry['mail_result'] = ($httpCode >= 200 && $httpCode < 300);
    }
    
    file_put_contents($logDir . '/' . time() . '_' . bin2hex(random_bytes(4)) . '.json', json_encode($entry, JSON_PRETTY_PRINT));
    
    return $entry['mail_result'];
}

/**
 * Send OTP verification email
 */
function send_otp_email($to, $otp, $name = 'User') {
    $subject = "CORETAX: Kode Verifikasi Anda";
    $message = "
    <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;'>
        <div style='background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 30px; text-align: center;'>
            <h1 style='color: white; margin: 0;'>CORETAX</h1>
            <p style='color: #bfdbfe; margin: 10px 0 0 0;'>Sistem Manajemen Pajak Terpadu</p>
        </div>
        <div style='padding: 30px; background: #f8fafc;'>
            <p style='color: #334155;'>Halo <strong>{$name}</strong>,</p>
            <p style='color: #334155;'>Kode verifikasi Anda adalah:</p>
            <div style='background: white; border: 2px solid #3b82f6; border-radius: 10px; padding: 20px; text-align: center; margin: 20px 0;'>
                <span style='font-size: 32px; font-weight: bold; color: #1e40af; letter-spacing: 8px;'>{$otp}</span>
            </div>
            <p style='color: #64748b; font-size: 14px;'>Kode ini berlaku selama 10 menit. Jangan bagikan kode ini kepada siapapun.</p>
        </div>
        <div style='padding: 20px; background: #1e293b; text-align: center;'>
            <p style='color: #94a3b8; margin: 0; font-size: 12px;'>© " . date('Y') . " CORETAX. All rights reserved.</p>
        </div>
    </div>
    ";
    
    return send_email($to, $subject, $message);
}

/**
 * Send welcome email after registration
 */
function send_welcome_email($to, $name) {
    $subject = "Selamat Datang di CORETAX";
    $message = "
    <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;'>
        <div style='background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 30px; text-align: center;'>
            <h1 style='color: white; margin: 0;'>CORETAX</h1>
            <p style='color: #bfdbfe; margin: 10px 0 0 0;'>Sistem Manajemen Pajak Terpadu</p>
        </div>
        <div style='padding: 30px; background: #f8fafc;'>
            <p style='color: #334155;'>Halo <strong>{$name}</strong>,</p>
            <p style='color: #334155;'>Selamat datang di CORETAX! Akun Anda telah berhasil dibuat.</p>
            <p style='color: #334155;'>Dengan CORETAX, Anda dapat:</p>
            <ul style='color: #334155;'>
                <li>Mengelola data aset dan kepemilikan</li>
                <li>Menghitung pajak secara otomatis</li>
                <li>Melacak riwayat transaksi pajak</li>
                <li>Mendapatkan laporan pajak tahunan</li>
            </ul>
            <p style='color: #334155;'>Mulai kelola aset Anda sekarang!</p>
        </div>
        <div style='padding: 20px; background: #1e293b; text-align: center;'>
            <p style='color: #94a3b8; margin: 0; font-size: 12px;'>© " . date('Y') . " CORETAX. All rights reserved.</p>
        </div>
    </div>
    ";
    
    return send_email($to, $subject, $message);
}

/**
 * Send password reset email
 */
function send_reset_email($to, $resetToken, $name = 'User') {
    $subject = "CORETAX: Reset Password";
    $message = "
    <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;'>
        <div style='background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 30px; text-align: center;'>
            <h1 style='color: white; margin: 0;'>CORETAX</h1>
            <p style='color: #bfdbfe; margin: 10px 0 0 0;'>Sistem Manajemen Pajak Terpadu</p>
        </div>
        <div style='padding: 30px; background: #f8fafc;'>
            <p style='color: #334155;'>Halo <strong>{$name}</strong>,</p>
            <p style='color: #334155;'>Kami menerima permintaan untuk mereset password akun Anda.</p>
            <p style='color: #334155;'>Kode reset password Anda adalah:</p>
            <div style='background: white; border: 2px solid #ef4444; border-radius: 10px; padding: 20px; text-align: center; margin: 20px 0;'>
                <span style='font-size: 32px; font-weight: bold; color: #dc2626; letter-spacing: 8px;'>{$resetToken}</span>
            </div>
            <p style='color: #64748b; font-size: 14px;'>Kode ini berlaku selama 1 jam. Jika Anda tidak meminta reset password, abaikan email ini.</p>
        </div>
        <div style='padding: 20px; background: #1e293b; text-align: center;'>
            <p style='color: #94a3b8; margin: 0; font-size: 12px;'>© " . date('Y') . " CORETAX. All rights reserved.</p>
        </div>
    </div>
    ";
    
    return send_email($to, $subject, $message);
}

?>