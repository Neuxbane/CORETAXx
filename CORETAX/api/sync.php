<?php
/**
 * Enhanced Sync endpoint for CORETAX
 * Stores per-user data snapshots with authentication support
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];
$dataDir = __DIR__ . '/../data';
$userDataDir = $dataDir . '/userdata';
$sessionsDir = $dataDir . '/sessions';
$usersDir = $dataDir . '/users';

foreach ([$dataDir, $userDataDir, $sessionsDir, $usersDir] as $dir) {
    if (!is_dir($dir)) {
        mkdir($dir, 0775, true);
    }
}

function bad_request($msg, $code = 400) {
    http_response_code($code);
    echo json_encode(['error' => $msg, 'success' => false]);
    exit;
}

function success_response($data, $code = 200) {
    http_response_code($code);
    echo json_encode(array_merge(['success' => true], $data));
    exit;
}

function sanitize_key($key) {
    return preg_replace('/[^a-zA-Z0-9_\-]/', '_', $key);
}

function get_auth_token() {
    $headers = getallheaders();
    $auth = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    if (preg_match('/Bearer\s+(.+)/i', $auth, $matches)) {
        return $matches[1];
    }
    return null;
}

function get_session($token) {
    global $sessionsDir;
    $file = $sessionsDir . '/' . sanitize_key($token) . '.json';
    if (!file_exists($file)) return null;
    
    $session = json_decode(file_get_contents($file), true);
    if (!$session) return null;
    
    if (strtotime($session['expiresAt']) < time()) {
        @unlink($file);
        return null;
    }
    
    return $session;
}

function get_user_by_id($userId) {
    global $usersDir;
    $file = $usersDir . '/' . sanitize_key($userId) . '.json';
    if (!file_exists($file)) return null;
    return json_decode(file_get_contents($file), true);
}

function get_authenticated_user() {
    $token = get_auth_token();
    if (!$token) {
        // Also check for token in JSON payload (for sendBeacon)
        $payload = json_decode(file_get_contents('php://input'), true);
        if (is_array($payload) && isset($payload['token'])) {
            $token = $payload['token'];
        }
    }
    if (!$token) return null;
    
    $session = get_session($token);
    if (!$session) return null;
    
    return get_user_by_id($session['userId']);
}

function get_user_data_dir($userId) {
    global $userDataDir;
    $dir = $userDataDir . '/' . sanitize_key($userId);
    if (!is_dir($dir)) {
        mkdir($dir, 0775, true);
    }
    return $dir;
}

// ========== PUSH (POST) - Save local changes to server ==========
if ($method === 'POST') {
    $payload = json_decode(file_get_contents('php://input'), true);
    if (!is_array($payload)) {
        bad_request('Invalid JSON');
    }

    // Check for auth token first
    $user = get_authenticated_user();
    $userId = null;
    
    if ($user) {
        $userId = $user['id'];
    } else {
        // Fallback to userId in payload (legacy support, less secure)
        $userId = isset($payload['userId']) ? sanitize_key($payload['userId']) : null;
    }

    if (!$userId) {
        bad_request('Authentication required or missing userId', 401);
    }

    $changes = $payload['changes'] ?? [];
    if (!is_array($changes)) {
        bad_request('Invalid changes payload');
    }

    $userDir = get_user_data_dir($userId);
    $saved = 0;
    $lastTimestamp = null;

    foreach ($changes as $change) {
        $key = sanitize_key($change['key'] ?? '');
        if (!$key) {
            continue;
        }
        
        $timestamp = $change['timestamp'] ?? date('c');
        $content = [
            'key' => $key,
            'value' => $change['payload'] ?? null,
            'timestamp' => $timestamp,
            'updatedAt' => date('c')
        ];
        
        file_put_contents($userDir . '/' . $key . '.json', json_encode($content, JSON_PRETTY_PRINT));
        $saved++;
        
        if (!$lastTimestamp || strtotime($timestamp) > strtotime($lastTimestamp)) {
            $lastTimestamp = $timestamp;
        }
    }

    success_response([
        'message' => 'Sync complete',
        'saved' => $saved,
        'lastSync' => $lastTimestamp ?? date('c')
    ]);
}

// ========== PULL (GET) - Get server data ==========
if ($method === 'GET') {
    // Check for auth token first
    $user = get_authenticated_user();
    $userId = null;
    
    if ($user) {
        $userId = $user['id'];
    } else {
        // Fallback to userId in query params (legacy support)
        $userId = isset($_GET['userId']) ? sanitize_key($_GET['userId']) : null;
    }

    if (!$userId) {
        bad_request('Authentication required or missing userId', 401);
    }

    $userDir = get_user_data_dir($userId);
    $since = $_GET['since'] ?? null; // Optional: only get changes since timestamp

    $result = [];
    $lastSync = null;

    foreach (glob($userDir . '/*.json') as $file) {
        $content = json_decode(file_get_contents($file), true);
        if (!$content) continue;
        
        $key = $content['key'] ?? basename($file, '.json');
        $timestamp = $content['timestamp'] ?? $content['updatedAt'] ?? null;
        
        // If since is provided, only include changes after that time
        if ($since && $timestamp && strtotime($timestamp) <= strtotime($since)) {
            continue;
        }
        
        $result[$key] = $content['value'] ?? null;
        
        if ($timestamp) {
            if (!$lastSync || strtotime($timestamp) > strtotime($lastSync)) {
                $lastSync = $timestamp;
            }
        }
    }

    // Also include user profile data (without sensitive fields)
    if ($user) {
        $userProfile = $user;
        unset($userProfile['password']);
        unset($userProfile['resetToken']);
        unset($userProfile['resetTokenExpires']);
        $result['_user'] = $userProfile;
    }

    success_response([
        'data' => empty($result) ? new stdClass() : $result,
        'lastSync' => $lastSync,
        'userId' => $userId
    ]);
}

bad_request('Method not allowed', 405);
