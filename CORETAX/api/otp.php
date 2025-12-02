<?php
// OTP endpoint: send and verify one-time codes for email verification.

header('Content-Type: application/json');
// simple CORS for local dev; restrict in production
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once __DIR__ . '/email_utils.php';

$method = $_SERVER['REQUEST_METHOD'];
$dataDir = __DIR__ . '/../data/otp';
if (!is_dir($dataDir)) {
    mkdir($dataDir, 0775, true);
}

function bad_request($msg, $code = 400) {
    http_response_code($code);
    echo json_encode(['error' => $msg]);
    exit;
}

function sanitize_email_key($email) {
    return preg_replace('/[^a-zA-Z0-9_@\.\-]/', '_', $email);
}

function read_otp_record($emailKey) {
    global $dataDir;
    $file = $dataDir . '/' . $emailKey . '.json';
    if (!file_exists($file)) return null;
    return json_decode(file_get_contents($file), true);
}

function write_otp_record($emailKey, $payload) {
    global $dataDir;
    $file = $dataDir . '/' . $emailKey . '.json';
    file_put_contents($file, json_encode($payload, JSON_PRETTY_PRINT));
}

// POST /api/otp.php?action=send -> { email }
if ($method === 'POST' && isset($_GET['action']) && $_GET['action'] === 'send') {
    $payload = json_decode(file_get_contents('php://input'), true);
    if (!is_array($payload)) {
        bad_request('Invalid JSON');
    }
    $email = trim($payload['email'] ?? '');
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        bad_request('Invalid email');
    }

    $emailKey = sanitize_email_key($email);
    $record = read_otp_record($emailKey) ?? [];

    $now = time();
    // Rate limit: max 5 sends in the last hour
    $windowStart = $now - 3600;
    $sends = array_filter($record['sends'] ?? [], function($ts) use ($windowStart) {
        return $ts >= $windowStart;
    });
    if (count($sends) >= 5) {
        bad_request('Rate limit exceeded. Try later.', 429);
    }

    // Generate 6-digit code
    $code = str_pad((string)random_int(0, 999999), 6, '0', STR_PAD_LEFT);
    $hash = password_hash($code, PASSWORD_DEFAULT);
    $expiresIn = intval(getenv('CORETAX_OTP_EXPIRES') ?: 600); // default 10 minutes

    $newRecord = [
        'hash' => $hash,
        'expiresAt' => $now + $expiresIn,
        'sends' => array_merge($sends, [$now]),
        'lastSent' => $now,
        'attempts' => 0,
    ];

    write_otp_record($emailKey, $newRecord);

    // Send OTP email using the new helper
    $name = $payload['name'] ?? 'User';
    $sent = send_otp_email($email, $code, $name);
    // Even if mail fails, we still keep the code server side; in dev, we log messages in data/mail_logs

    echo json_encode(['status' => 'ok', 'email' => $email, 'sent' => (bool)$sent]);
    exit;
}

// POST /api/otp.php?action=verify -> { email, code }
if ($method === 'POST' && isset($_GET['action']) && $_GET['action'] === 'verify') {
    $payload = json_decode(file_get_contents('php://input'), true);
    if (!is_array($payload)) {
        bad_request('Invalid JSON');
    }
    $email = trim($payload['email'] ?? '');
    $code = trim($payload['code'] ?? '');
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        bad_request('Invalid email');
    }
    if (!preg_match('/^\d{6}$/', $code)) {
        bad_request('Invalid code');
    }

    $emailKey = sanitize_email_key($email);
    $record = read_otp_record($emailKey);
    if (!$record) {
        bad_request('No code requested for this email', 404);
    }
    $now = time();
    if ($record['expiresAt'] < $now) {
        bad_request('Code expired', 410);
    }

    // To avoid brute-force, track attempts and block after 10
    $attempts = $record['attempts'] ?? 0;
    if ($attempts >= 10) {
        bad_request('Too many attempts', 429);
    }

    $ok = password_verify($code, $record['hash']);
    // Update attempts
    $record['attempts'] = $attempts + 1;
    write_otp_record($emailKey, $record);

    if (!$ok) {
        bad_request('Invalid code', 401);
    }

    // Success: remove OTP record
    @unlink(__DIR__ . '/../data/otp/' . $emailKey . '.json');
    echo json_encode(['status' => 'ok', 'email' => $email]);
    exit;
}

bad_request('Action not allowed', 405);
?>
