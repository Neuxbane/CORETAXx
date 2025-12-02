<?php
/**
 * Users API for CORETAX
 * Handles: user profile, update, data management
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];
$dataDir = __DIR__ . '/../data';
$usersDir = $dataDir . '/users';
$userDataDir = $dataDir . '/userdata';

// Ensure directories exist
foreach ([$dataDir, $usersDir, $userDataDir] as $dir) {
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

// Get auth token from header
function get_auth_token() {
    $headers = getallheaders();
    $auth = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    if (preg_match('/Bearer\s+(.+)/i', $auth, $matches)) {
        return $matches[1];
    }
    return null;
}

// Session and user functions
function get_session($token) {
    global $dataDir;
    $sessionsDir = $dataDir . '/sessions';
    $file = $sessionsDir . '/' . sanitize_id($token) . '.json';
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
    $file = $usersDir . '/' . sanitize_id($userId) . '.json';
    if (!file_exists($file)) return null;
    return json_decode(file_get_contents($file), true);
}

function save_user($user) {
    global $usersDir;
    $file = $usersDir . '/' . sanitize_id($user['id']) . '.json';
    file_put_contents($file, json_encode($user, JSON_PRETTY_PRINT));
    return true;
}

function get_authenticated_user() {
    $token = get_auth_token();
    if (!$token) return null;
    
    $session = get_session($token);
    if (!$session) return null;
    
    $user = get_user_by_id($session['userId']);
    return $user;
}

// User data storage functions
function get_user_data_dir($userId) {
    global $userDataDir;
    $dir = $userDataDir . '/' . sanitize_id($userId);
    if (!is_dir($dir)) {
        mkdir($dir, 0775, true);
    }
    return $dir;
}

function get_user_data($userId, $key) {
    $dir = get_user_data_dir($userId);
    $file = $dir . '/' . sanitize_id($key) . '.json';
    if (!file_exists($file)) return null;
    $data = json_decode(file_get_contents($file), true);
    return $data['value'] ?? null;
}

function set_user_data($userId, $key, $value) {
    $dir = get_user_data_dir($userId);
    $file = $dir . '/' . sanitize_id($key) . '.json';
    $data = [
        'key' => $key,
        'value' => $value,
        'updatedAt' => date('c')
    ];
    file_put_contents($file, json_encode($data, JSON_PRETTY_PRINT));
    return true;
}

function get_all_user_data($userId) {
    $dir = get_user_data_dir($userId);
    $result = [];
    foreach (glob($dir . '/*.json') as $file) {
        $data = json_decode(file_get_contents($file), true);
        if ($data && isset($data['key'])) {
            $result[$data['key']] = $data['value'] ?? null;
        }
    }
    return $result;
}

function delete_user_data($userId, $key) {
    $dir = get_user_data_dir($userId);
    $file = $dir . '/' . sanitize_id($key) . '.json';
    if (file_exists($file)) {
        @unlink($file);
        return true;
    }
    return false;
}

$action = $_GET['action'] ?? '';

// ========== GET PROFILE ==========
if ($method === 'GET' && $action === 'profile') {
    $user = get_authenticated_user();
    if (!$user) {
        bad_request('Unauthorized', 401);
    }
    
    unset($user['password']);
    unset($user['resetToken']);
    unset($user['resetTokenExpires']);
    
    success_response(['user' => $user]);
}

// ========== UPDATE PROFILE ==========
if ($method === 'PUT' && $action === 'profile') {
    $user = get_authenticated_user();
    if (!$user) {
        bad_request('Unauthorized', 401);
    }
    
    $payload = json_decode(file_get_contents('php://input'), true);
    if (!is_array($payload)) {
        bad_request('Invalid JSON');
    }
    
    // Fields that can be updated
    $allowedFields = ['name', 'fullName', 'phone', 'address', 'profilePhoto'];
    
    foreach ($allowedFields as $field) {
        if (isset($payload[$field])) {
            $user[$field] = $payload[$field];
        }
    }
    
    // Update fullName when name is updated
    if (isset($payload['name'])) {
        $user['fullName'] = $payload['name'];
    }
    
    $user['updatedAt'] = date('c');
    save_user($user);
    
    unset($user['password']);
    
    success_response([
        'message' => 'Profile updated',
        'user' => $user
    ]);
}

// ========== GET USER DATA (all keys) ==========
if ($method === 'GET' && $action === 'data') {
    $user = get_authenticated_user();
    if (!$user) {
        bad_request('Unauthorized', 401);
    }
    
    $key = $_GET['key'] ?? null;
    
    if ($key) {
        $value = get_user_data($user['id'], $key);
        success_response(['key' => $key, 'value' => $value]);
    } else {
        $data = get_all_user_data($user['id']);
        success_response(['data' => $data]);
    }
}

// ========== SET USER DATA ==========
if ($method === 'POST' && $action === 'data') {
    $user = get_authenticated_user();
    if (!$user) {
        bad_request('Unauthorized', 401);
    }
    
    $payload = json_decode(file_get_contents('php://input'), true);
    if (!is_array($payload)) {
        bad_request('Invalid JSON');
    }
    
    $key = $payload['key'] ?? '';
    $value = $payload['value'] ?? null;
    
    if (!$key) {
        bad_request('Key is required');
    }
    
    set_user_data($user['id'], $key, $value);
    
    success_response([
        'message' => 'Data saved',
        'key' => $key
    ]);
}

// ========== BULK SET USER DATA ==========
if ($method === 'POST' && $action === 'data-bulk') {
    $user = get_authenticated_user();
    if (!$user) {
        bad_request('Unauthorized', 401);
    }
    
    $payload = json_decode(file_get_contents('php://input'), true);
    if (!is_array($payload)) {
        bad_request('Invalid JSON');
    }
    
    $items = $payload['items'] ?? [];
    $saved = 0;
    
    foreach ($items as $item) {
        $key = $item['key'] ?? '';
        $value = $item['value'] ?? null;
        if ($key) {
            set_user_data($user['id'], $key, $value);
            $saved++;
        }
    }
    
    success_response([
        'message' => 'Bulk data saved',
        'saved' => $saved
    ]);
}

// ========== DELETE USER DATA ==========
if ($method === 'DELETE' && $action === 'data') {
    $user = get_authenticated_user();
    if (!$user) {
        bad_request('Unauthorized', 401);
    }
    
    $key = $_GET['key'] ?? '';
    
    if (!$key) {
        bad_request('Key is required');
    }
    
    delete_user_data($user['id'], $key);
    
    success_response([
        'message' => 'Data deleted',
        'key' => $key
    ]);
}

// ========== GET ASSETS ==========
if ($method === 'GET' && $action === 'assets') {
    $user = get_authenticated_user();
    if (!$user) {
        bad_request('Unauthorized', 401);
    }
    
    $assets = get_user_data($user['id'], 'assets') ?? [];
    
    success_response(['assets' => $assets]);
}

// ========== SET ASSETS ==========
if ($method === 'POST' && $action === 'assets') {
    $user = get_authenticated_user();
    if (!$user) {
        bad_request('Unauthorized', 401);
    }
    
    $payload = json_decode(file_get_contents('php://input'), true);
    if (!is_array($payload)) {
        bad_request('Invalid JSON');
    }
    
    $assets = $payload['assets'] ?? [];
    set_user_data($user['id'], 'assets', $assets);
    
    success_response([
        'message' => 'Assets saved',
        'count' => count($assets)
    ]);
}

// ========== GET TAXES ==========
if ($method === 'GET' && $action === 'taxes') {
    $user = get_authenticated_user();
    if (!$user) {
        bad_request('Unauthorized', 401);
    }
    
    $taxes = get_user_data($user['id'], 'taxes') ?? [];
    
    success_response(['taxes' => $taxes]);
}

// ========== SET TAXES ==========
if ($method === 'POST' && $action === 'taxes') {
    $user = get_authenticated_user();
    if (!$user) {
        bad_request('Unauthorized', 401);
    }
    
    $payload = json_decode(file_get_contents('php://input'), true);
    if (!is_array($payload)) {
        bad_request('Invalid JSON');
    }
    
    $taxes = $payload['taxes'] ?? [];
    set_user_data($user['id'], 'taxes', $taxes);
    
    success_response([
        'message' => 'Taxes saved',
        'count' => count($taxes)
    ]);
}

// ========== GET TRANSACTIONS ==========
if ($method === 'GET' && $action === 'transactions') {
    $user = get_authenticated_user();
    if (!$user) {
        bad_request('Unauthorized', 401);
    }
    
    $transactions = get_user_data($user['id'], 'transactions') ?? [];
    
    success_response(['transactions' => $transactions]);
}

// ========== SET TRANSACTIONS ==========
if ($method === 'POST' && $action === 'transactions') {
    $user = get_authenticated_user();
    if (!$user) {
        bad_request('Unauthorized', 401);
    }
    
    $payload = json_decode(file_get_contents('php://input'), true);
    if (!is_array($payload)) {
        bad_request('Invalid JSON');
    }
    
    $transactions = $payload['transactions'] ?? [];
    set_user_data($user['id'], 'transactions', $transactions);
    
    success_response([
        'message' => 'Transactions saved',
        'count' => count($transactions)
    ]);
}

// ========== GET USER LOCATION ==========
if ($method === 'GET' && $action === 'location') {
    $user = get_authenticated_user();
    if (!$user) {
        bad_request('Unauthorized', 401);
    }
    
    $location = get_user_data($user['id'], 'location') ?? null;
    
    success_response(['location' => $location]);
}

// ========== SET USER LOCATION ==========
if ($method === 'POST' && $action === 'location') {
    $user = get_authenticated_user();
    if (!$user) {
        bad_request('Unauthorized', 401);
    }
    
    $payload = json_decode(file_get_contents('php://input'), true);
    if (!is_array($payload)) {
        bad_request('Invalid JSON');
    }
    
    $currentLocation = $payload['currentLocation'] ?? null;
    
    // Get existing location data
    $locationData = get_user_data($user['id'], 'location') ?? [
        'userId' => $user['id'],
        'locationHistory' => []
    ];
    
    if ($currentLocation) {
        $currentLocation['timestamp'] = date('c');
        
        // Add to history (keep last 100 entries)
        if (!isset($locationData['locationHistory'])) {
            $locationData['locationHistory'] = [];
        }
        array_unshift($locationData['locationHistory'], $currentLocation);
        $locationData['locationHistory'] = array_slice($locationData['locationHistory'], 0, 100);
        
        $locationData['currentLocation'] = $currentLocation;
    }
    
    set_user_data($user['id'], 'location', $locationData);
    
    success_response([
        'message' => 'Location updated',
        'location' => $locationData
    ]);
}

// ========== ADMIN: GET ALL USER LOCATIONS ==========
if ($method === 'GET' && $action === 'all-locations') {
    $user = get_authenticated_user();
    if (!$user) {
        bad_request('Unauthorized', 401);
    }
    
    if (($user['role'] ?? 'user') !== 'admin') {
        bad_request('Forbidden', 403);
    }
    
    global $userDataDir, $usersDir;
    
    $locations = [];
    
    foreach (glob($usersDir . '/*.json') as $file) {
        $userData = json_decode(file_get_contents($file), true);
        if (!$userData) continue;
        
        $userId = $userData['id'];
        $locationFile = $userDataDir . '/' . sanitize_id($userId) . '/location.json';
        
        $locationData = null;
        if (file_exists($locationFile)) {
            $locFileData = json_decode(file_get_contents($locationFile), true);
            $locationData = $locFileData['value'] ?? null;
        }
        
        if ($locationData && isset($locationData['currentLocation'])) {
            $locations[] = [
                'userId' => $userId,
                'username' => $userData['username'] ?? '',
                'fullName' => $userData['fullName'] ?? $userData['name'] ?? '',
                'email' => $userData['email'] ?? '',
                'role' => $userData['role'] ?? 'user',
                'currentLocation' => $locationData['currentLocation'],
                'locationHistory' => $locationData['locationHistory'] ?? []
            ];
        }
    }
    
    success_response(['locations' => $locations]);
}

// ========== ADMIN: GET ALL ASSETS ==========
if ($method === 'GET' && $action === 'all-assets') {
    $user = get_authenticated_user();
    if (!$user) {
        bad_request('Unauthorized', 401);
    }
    
    if (($user['role'] ?? 'user') !== 'admin') {
        bad_request('Forbidden', 403);
    }
    
    global $userDataDir, $usersDir;
    
    $allAssets = [];
    
    foreach (glob($usersDir . '/*.json') as $file) {
        $userData = json_decode(file_get_contents($file), true);
        if (!$userData) continue;
        
        $userId = $userData['id'];
        $assetsFile = $userDataDir . '/' . sanitize_id($userId) . '/assets.json';
        
        if (file_exists($assetsFile)) {
            $assetsData = json_decode(file_get_contents($assetsFile), true);
            $assets = $assetsData['value'] ?? [];
            foreach ($assets as $asset) {
                $asset['ownerName'] = $userData['fullName'] ?? $userData['name'] ?? '';
                $asset['ownerEmail'] = $userData['email'] ?? '';
                $allAssets[] = $asset;
            }
        }
    }
    
    success_response(['assets' => $allAssets]);
}

// ========== ADMIN: GET ALL TRANSACTIONS ==========
if ($method === 'GET' && $action === 'all-transactions') {
    $user = get_authenticated_user();
    if (!$user) {
        bad_request('Unauthorized', 401);
    }
    
    if (($user['role'] ?? 'user') !== 'admin') {
        bad_request('Forbidden', 403);
    }
    
    global $userDataDir, $usersDir;
    
    $allTransactions = [];
    
    foreach (glob($usersDir . '/*.json') as $file) {
        $userData = json_decode(file_get_contents($file), true);
        if (!$userData) continue;
        
        $userId = $userData['id'];
        $transactionsFile = $userDataDir . '/' . sanitize_id($userId) . '/transactions.json';
        
        if (file_exists($transactionsFile)) {
            $transactionsData = json_decode(file_get_contents($transactionsFile), true);
            $transactions = $transactionsData['value'] ?? [];
            foreach ($transactions as $transaction) {
                $transaction['userName'] = $userData['fullName'] ?? $userData['name'] ?? '';
                $transaction['userEmail'] = $userData['email'] ?? '';
                $allTransactions[] = $transaction;
            }
        }
    }
    
    // Sort by date descending
    usort($allTransactions, function($a, $b) {
        return strtotime($b['paymentDate'] ?? 0) - strtotime($a['paymentDate'] ?? 0);
    });
    
    success_response(['transactions' => $allTransactions]);
}

bad_request('Action not allowed', 405);
