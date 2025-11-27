<?php
// Simple email helper for sending OTP. Uses PHP mail() by default; for dev the OTP is also logged.

function get_config($key, $default = null) {
    $val = getenv($key);
    if ($val === false || $val === null) return $default;
    return $val;
}

function send_email($to, $subject, $message, $headers = '') {
    // Try to use mail(); for simple demos it's fine. In production, use a proper SMTP transport.
    try {
        if ($headers === '') {
            $from = get_config('CORETAX_MAIL_FROM', 'no-reply@coretax.local');
            $headers = "From: " . $from . "\r\n" .
                "MIME-Version: 1.0\r\n" .
                "Content-type: text/html; charset=UTF-8\r\n";
        }

        // On many systems, mail() may not be configured; return true/false.
        $ok = mail($to, $subject, $message, $headers);
        // Also log for dev purposes
        $logDir = __DIR__ . '/../data/mail_logs';
        if (!is_dir($logDir)) mkdir($logDir, 0775, true);
        $entry = [
            'to' => $to,
            'subject' => $subject,
            'headers' => $headers,
            'message' => $message,
            'timestamp' => date('c'),
            'mail_result' => $ok,
        ];
        file_put_contents($logDir . '/' . time() . '.json', json_encode($entry, JSON_PRETTY_PRINT));

        return $ok;
    } catch (Exception $e) {
        return false;
    }
}

?>
