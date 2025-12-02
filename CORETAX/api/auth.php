<?php
/**
 * Authentication API for CORETAX
 * Handles: register, login, logout, verify-session, refresh-token
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once __DIR__ . '/email_utils.php';

$method = $_SERVER['REQUEST_METHOD'];
$dataDir = __DIR__ . '/../data';
$usersDir = $dataDir . '/users';
$sessionsDir = $dataDir . '/sessions';

// Ensure directories exist
foreach ([$dataDir, $usersDir, $sessionsDir] as $dir) {
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

function sanitize_id($id) {
    return preg_replace('/[^a-zA-Z0-9_\-]/', '_', $id);
}

function generate_token($length = 64) {
    return bin2hex(random_bytes($length / 2));
}

function generate_user_id() {
    return 'user-' . time() . '-' . bin2hex(random_bytes(4));
}

function hash_password($password) {
    return password_hash($password, PASSWORD_DEFAULT);
}

function verify_password($password, $hash) {
    return password_verify($password, $hash);
}

// User file operations
function get_user_by_id($userId) {
    global $usersDir;
    $file = $usersDir . '/' . sanitize_id($userId) . '.json';
    if (!file_exists($file)) return null;
    return json_decode(file_get_contents($file), true);
}

function get_user_by_email($email) {
    global $usersDir;
    $email = strtolower(trim($email));
    foreach (glob($usersDir . '/*.json') as $file) {
        $user = json_decode(file_get_contents($file), true);
        if ($user && strtolower($user['email'] ?? '') === $email) {
            return $user;
        }
    }
    return null;
}

function get_user_by_username($username) {
    global $usersDir;
    $username = strtolower(trim($username));
    foreach (glob($usersDir . '/*.json') as $file) {
        $user = json_decode(file_get_contents($file), true);
        if ($user && strtolower($user['username'] ?? '') === $username) {
            return $user;
        }
    }
    return null;
}

function save_user($user) {
    global $usersDir;
    $file = $usersDir . '/' . sanitize_id($user['id']) . '.json';
    file_put_contents($file, json_encode($user, JSON_PRETTY_PRINT));
    return true;
}

function get_all_users() {
    global $usersDir;
    $users = [];
    foreach (glob($usersDir . '/*.json') as $file) {
        $user = json_decode(file_get_contents($file), true);
        if ($user) {
            // Remove password from response
            unset($user['password']);
            $users[] = $user;
        }
    }
    return $users;
}

// Session operations
function create_session($userId, $metadata = []) {
    global $sessionsDir;
    $token = generate_token();
    $expiresAt = time() + (7 * 24 * 60 * 60); // 7 days
    
    $session = [
        'token' => $token,
        'userId' => $userId,
        'createdAt' => date('c'),
        'expiresAt' => date('c', $expiresAt),
        'lastActivity' => date('c'),
        'metadata' => $metadata
    ];
    
    $file = $sessionsDir . '/' . $token . '.json';
    file_put_contents($file, json_encode($session, JSON_PRETTY_PRINT));
    
    return $session;
}

function get_session($token) {
    global $sessionsDir;
    $file = $sessionsDir . '/' . sanitize_id($token) . '.json';
    if (!file_exists($file)) return null;
    
    $session = json_decode(file_get_contents($file), true);
    if (!$session) return null;
    
    // Check expiration
    if (strtotime($session['expiresAt']) < time()) {
        @unlink($file);
        return null;
    }
    
    return $session;
}

function update_session_activity($token) {
    global $sessionsDir;
    $file = $sessionsDir . '/' . sanitize_id($token) . '.json';
    if (!file_exists($file)) return false;
    
    $session = json_decode(file_get_contents($file), true);
    if (!$session) return false;
    
    $session['lastActivity'] = date('c');
    file_put_contents($file, json_encode($session, JSON_PRETTY_PRINT));
    return true;
}

function delete_session($token) {
    global $sessionsDir;
    $file = $sessionsDir . '/' . sanitize_id($token) . '.json';
    if (file_exists($file)) {
        @unlink($file);
        return true;
    }
    return false;
}

function delete_user_sessions($userId) {
    global $sessionsDir;
    $count = 0;
    foreach (glob($sessionsDir . '/*.json') as $file) {
        $session = json_decode(file_get_contents($file), true);
        if ($session && ($session['userId'] ?? '') === $userId) {
            @unlink($file);
            $count++;
        }
    }
    return $count;
}

// Get auth token from header
function get_auth_token() {
    $headers = getallheaders();
    $auth = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    if (preg_match('/Bearer\s+(.+)/i', $auth, $matches)) {
        return $matches[1];
    }
    return null;
}

// Verify authenticated user
function get_authenticated_user() {
    $token = get_auth_token();
    if (!$token) return null;
    
    $session = get_session($token);
    if (!$session) return null;
    
    $user = get_user_by_id($session['userId']);
    if (!$user) return null;
    
    update_session_activity($token);
    return $user;
}

$action = $_GET['action'] ?? '';

// ========== REGISTER ==========
if ($method === 'POST' && $action === 'register') {
    $payload = json_decode(file_get_contents('php://input'), true);
    if (!is_array($payload)) {
        bad_request('Invalid JSON');
    }
    
    $name = trim($payload['name'] ?? '');
    $email = strtolower(trim($payload['email'] ?? ''));
    $username = strtolower(trim($payload['username'] ?? ''));
    $password = $payload['password'] ?? '';
    $nik = preg_replace('/\D/', '', $payload['nik'] ?? '');
    $dateOfBirth = $payload['dateOfBirth'] ?? '';
    $phone = $payload['phone'] ?? '';
    $address = $payload['address'] ?? '';
    
    // Validations
    if (strlen($name) < 3) {
        bad_request('Name must be at least 3 characters');
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        bad_request('Invalid email format');
    }
    if (strlen($username) < 3 || !preg_match('/^[a-z0-9_]+$/', $username)) {
        bad_request('Username must be at least 3 characters and contain only lowercase letters, numbers, and underscores');
    }
    if (strlen($password) < 6) {
        bad_request('Password must be at least 6 characters');
    }
    if (strlen($nik) !== 16) {
        bad_request('NIK must be 16 digits');
    }
    if (!$dateOfBirth) {
        bad_request('Date of birth is required');
    }
    
    // Check for duplicates
    if (get_user_by_email($email)) {
        bad_request('Email already registered');
    }
    if (get_user_by_username($username)) {
        bad_request('Username already taken');
    }
    
    $userId = generate_user_id();
    $user = [
        'id' => $userId,
        'name' => $name,
        'fullName' => $name,
        'email' => $email,
        'username' => $username,
        'password' => hash_password($password),
        'nik' => $nik,
        'dateOfBirth' => $dateOfBirth,
        'phone' => $phone,
        'address' => $address,
        'role' => 'user',
        'isActive' => true,
        'createdAt' => date('c'),
        'updatedAt' => date('c')
    ];
    
    save_user($user);
    
    // Create session immediately
    $session = create_session($userId, [
        'ip' => $_SERVER['REMOTE_ADDR'] ?? '',
        'userAgent' => $_SERVER['HTTP_USER_AGENT'] ?? '',
        'action' => 'register'
    ]);
    
    // Send welcome email
    send_welcome_email($email, $name);
    
    // Remove password from response
    unset($user['password']);
    
    success_response([
        'message' => 'Registration successful',
        'user' => $user,
        'token' => $session['token'],
        'expiresAt' => $session['expiresAt']
    ], 201);
}

// ========== LOGIN ==========
if ($method === 'POST' && $action === 'login') {
    $payload = json_decode(file_get_contents('php://input'), true);
    if (!is_array($payload)) {
        bad_request('Invalid JSON');
    }
    
    $identifier = trim($payload['identifier'] ?? '');
    $password = $payload['password'] ?? '';
    $location = $payload['location'] ?? null;
    
    if (!$identifier || !$password) {
        bad_request('Email/username and password are required');
    }
    
    // Find user by email or username
    $user = get_user_by_email($identifier);
    if (!$user) {
        $user = get_user_by_username($identifier);
    }
    
    if (!$user) {
        bad_request('Invalid credentials', 401);
    }
    
    if (!verify_password($password, $user['password'])) {
        bad_request('Invalid credentials', 401);
    }
    
    if (!($user['isActive'] ?? true)) {
        bad_request('Account is deactivated', 403);
    }
    
    // Create session
    $metadata = [
        'ip' => $_SERVER['REMOTE_ADDR'] ?? '',
        'userAgent' => $_SERVER['HTTP_USER_AGENT'] ?? '',
        'action' => 'login'
    ];
    if ($location) {
        $metadata['location'] = $location;
    }
    
    $session = create_session($user['id'], $metadata);
    
    // Update last login
    $user['lastLoginAt'] = date('c');
    save_user($user);
    
    // Remove password from response
    unset($user['password']);
    
    success_response([
        'message' => 'Login successful',
        'user' => $user,
        'token' => $session['token'],
        'expiresAt' => $session['expiresAt']
    ]);
}

// ========== LOGOUT ==========
if ($method === 'POST' && $action === 'logout') {
    $token = get_auth_token();
    if (!$token) {
        bad_request('No token provided', 401);
    }
    
    delete_session($token);
    
    success_response(['message' => 'Logged out successfully']);
}

// ========== LOGOUT ALL ==========
if ($method === 'POST' && $action === 'logout-all') {
    $user = get_authenticated_user();
    if (!$user) {
        bad_request('Unauthorized', 401);
    }
    
    $count = delete_user_sessions($user['id']);
    
    success_response([
        'message' => 'All sessions logged out',
        'sessionsRemoved' => $count
    ]);
}

// ========== VERIFY SESSION ==========
if ($method === 'GET' && $action === 'verify') {
    $user = get_authenticated_user();
    if (!$user) {
        bad_request('Invalid or expired session', 401);
    }
    
    unset($user['password']);
    
    success_response([
        'valid' => true,
        'user' => $user
    ]);
}

// ========== REFRESH TOKEN ==========
if ($method === 'POST' && $action === 'refresh') {
    $token = get_auth_token();
    if (!$token) {
        bad_request('No token provided', 401);
    }
    
    $session = get_session($token);
    if (!$session) {
        bad_request('Invalid or expired session', 401);
    }
    
    $user = get_user_by_id($session['userId']);
    if (!$user) {
        bad_request('User not found', 401);
    }
    
    // Delete old session and create new one
    delete_session($token);
    $newSession = create_session($user['id'], $session['metadata'] ?? []);
    
    unset($user['password']);
    
    success_response([
        'message' => 'Token refreshed',
        'user' => $user,
        'token' => $newSession['token'],
        'expiresAt' => $newSession['expiresAt']
    ]);
}

// ========== CHANGE PASSWORD ==========
if ($method === 'POST' && $action === 'change-password') {
    $user = get_authenticated_user();
    if (!$user) {
        bad_request('Unauthorized', 401);
    }
    
    $payload = json_decode(file_get_contents('php://input'), true);
    if (!is_array($payload)) {
        bad_request('Invalid JSON');
    }
    
    $oldPassword = $payload['oldPassword'] ?? '';
    $newPassword = $payload['newPassword'] ?? '';
    
    if (!verify_password($oldPassword, $user['password'])) {
        bad_request('Current password is incorrect', 401);
    }
    
    if (strlen($newPassword) < 6) {
        bad_request('New password must be at least 6 characters');
    }
    
    if ($oldPassword === $newPassword) {
        bad_request('New password must be different from old password');
    }
    
    $user['password'] = hash_password($newPassword);
    $user['updatedAt'] = date('c');
    save_user($user);
    
    // Optionally invalidate all other sessions
    if ($payload['logoutOtherSessions'] ?? false) {
        delete_user_sessions($user['id']);
        $session = create_session($user['id'], [
            'action' => 'password-change'
        ]);
        success_response([
            'message' => 'Password changed and other sessions logged out',
            'token' => $session['token'],
            'expiresAt' => $session['expiresAt']
        ]);
    }
    
    success_response(['message' => 'Password changed successfully']);
}

// ========== REQUEST PASSWORD RESET ==========
if ($method === 'POST' && $action === 'forgot-password') {
    $payload = json_decode(file_get_contents('php://input'), true);
    if (!is_array($payload)) {
        bad_request('Invalid JSON');
    }
    
    $email = strtolower(trim($payload['email'] ?? ''));
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        bad_request('Invalid email format');
    }
    
    $user = get_user_by_email($email);
    if (!$user) {
        // Don't reveal if email exists
        success_response(['message' => 'If the email exists, a reset code will be sent']);
    }
    
    // Generate reset token
    $resetToken = strtoupper(bin2hex(random_bytes(3))); // 6 char hex
    $resetExpires = time() + 3600; // 1 hour
    
    $user['resetToken'] = password_hash($resetToken, PASSWORD_DEFAULT);
    $user['resetTokenExpires'] = date('c', $resetExpires);
    save_user($user);
    
    // Send email using new helper
    send_reset_email($email, $resetToken, $user['name']);
    
    success_response([
        'message' => 'Reset code sent to email',
        'email' => $email
    ]);
}

// ========== RESET PASSWORD ==========
if ($method === 'POST' && $action === 'reset-password') {
    $payload = json_decode(file_get_contents('php://input'), true);
    if (!is_array($payload)) {
        bad_request('Invalid JSON');
    }
    
    $email = strtolower(trim($payload['email'] ?? ''));
    $token = strtoupper(trim($payload['token'] ?? ''));
    $newPassword = $payload['newPassword'] ?? '';
    
    if (!$email || !$token || !$newPassword) {
        bad_request('Email, token, and new password are required');
    }
    
    if (strlen($newPassword) < 6) {
        bad_request('New password must be at least 6 characters');
    }
    
    $user = get_user_by_email($email);
    if (!$user || !isset($user['resetToken'])) {
        bad_request('Invalid reset request', 400);
    }
    
    if (strtotime($user['resetTokenExpires']) < time()) {
        bad_request('Reset token expired', 400);
    }
    
    if (!password_verify($token, $user['resetToken'])) {
        bad_request('Invalid reset token', 400);
    }
    
    $user['password'] = hash_password($newPassword);
    unset($user['resetToken']);
    unset($user['resetTokenExpires']);
    $user['updatedAt'] = date('c');
    save_user($user);
    
    // Invalidate all sessions
    delete_user_sessions($user['id']);
    
    success_response(['message' => 'Password reset successfully']);
}

// ========== GET ALL USERS (ADMIN) ==========
if ($method === 'GET' && $action === 'users') {
    $user = get_authenticated_user();
    if (!$user) {
        bad_request('Unauthorized', 401);
    }
    
    if (($user['role'] ?? 'user') !== 'admin') {
        bad_request('Forbidden', 403);
    }
    
    $users = get_all_users();
    
    success_response(['users' => $users]);
}

// ========== UPDATE USER STATUS (ADMIN) ==========
if ($method === 'POST' && $action === 'update-user-status') {
    $authUser = get_authenticated_user();
    if (!$authUser) {
        bad_request('Unauthorized', 401);
    }
    
    if (($authUser['role'] ?? 'user') !== 'admin') {
        bad_request('Forbidden', 403);
    }
    
    $payload = json_decode(file_get_contents('php://input'), true);
    $targetUserId = $payload['userId'] ?? '';
    $isActive = $payload['isActive'] ?? null;
    
    if (!$targetUserId) {
        bad_request('User ID is required');
    }
    
    $targetUser = get_user_by_id($targetUserId);
    if (!$targetUser) {
        bad_request('User not found', 404);
    }
    
    if ($isActive !== null) {
        $targetUser['isActive'] = (bool) $isActive;
    }
    
    $targetUser['updatedAt'] = date('c');
    save_user($targetUser);
    
    if (!$targetUser['isActive']) {
        delete_user_sessions($targetUserId);
    }
    
    unset($targetUser['password']);
    
    success_response([
        'message' => 'User status updated',
        'user' => $targetUser
    ]);
}

bad_request('Action not allowed', 405);
