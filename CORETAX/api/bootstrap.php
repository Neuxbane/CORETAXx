<?php
/**
 * CORETAX API Bootstrap
 * Shared utilities and configuration
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Configuration
define('DATA_DIR', __DIR__ . '/../data');
define('SESSION_DIR', DATA_DIR . '/sessions');
define('USERS_FILE', DATA_DIR . '/users.json');
define('ASSETS_FILE', DATA_DIR . '/assets.json');
define('TAXES_FILE', DATA_DIR . '/taxes.json');
define('TRANSACTIONS_FILE', DATA_DIR . '/transactions.json');

// Ensure data directory exists
if (!is_dir(DATA_DIR)) {
    mkdir(DATA_DIR, 0755, true);
}
if (!is_dir(SESSION_DIR)) {
    mkdir(SESSION_DIR, 0755, true);
}

/**
 * Read JSON file
 */
function readJson(string $filePath): array
{
    if (!file_exists($filePath)) {
        return [];
    }
    $content = file_get_contents($filePath);
    return json_decode($content, true) ?? [];
}

/**
 * Write JSON file
 */
function writeJson(string $filePath, array $data): void
{
    $dir = dirname($filePath);
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }
    file_put_contents($filePath, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

/**
 * Get JSON input from request body
 */
function getJsonInput(): array
{
    $input = file_get_contents('php://input');
    return json_decode($input, true) ?? [];
}

/**
 * Send JSON response
 */
function respond(array $data, int $statusCode = 200): void
{
    http_response_code($statusCode);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

/**
 * Get Authorization header token
 */
function getAuthorizationToken(): ?string
{
    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (preg_match('/Bearer\s+([a-z0-9]+)/i', $header, $matches)) {
        return $matches[1];
    }
    return null;
}

/**
 * Create session
 */
function createSession(string $userId): array
{
    $token = bin2hex(random_bytes(16));
    $session = [
        'userId' => $userId,
        'token' => $token,
        'createdAt' => date(DATE_ATOM),
        'expiresAt' => date(DATE_ATOM, strtotime('+30 days')),
    ];
    
    $file = SESSION_DIR . '/' . $token . '.json';
    writeJson($file, $session);
    
    return $session;
}

/**
 * Get session
 */
function getSession(string $token): ?array
{
    $file = SESSION_DIR . '/' . $token . '.json';
    if (!file_exists($file)) {
        return null;
    }
    
    $session = readJson($file);
    
    // Check if expired
    $expiresAt = strtotime($session['expiresAt'] ?? 'now');
    if ($expiresAt < time()) {
        unlink($file);
        return null;
    }
    
    return $session;
}

/**
 * Delete session
 */
function deleteSession(string $token): void
{
    $file = SESSION_DIR . '/' . $token . '.json';
    if (file_exists($file)) {
        unlink($file);
    }
}

/**
 * Require authentication
 */
function requireAuth(): array
{
    $token = getAuthorizationToken();
    if (!$token) {
        respond(['error' => 'Unauthorized: No token provided'], 401);
    }
    
    $session = getSession($token);
    if (!$session) {
        respond(['error' => 'Unauthorized: Invalid or expired token'], 401);
    }
    
    $users = readJson(USERS_FILE);
    $user = null;
    foreach ($users as $u) {
        if ($u['id'] === $session['userId']) {
            $user = $u;
            break;
        }
    }
    
    if (!$user) {
        respond(['error' => 'User not found'], 404);
    }
    
    return $user;
}

// Initialize demo data
function initializeDemoData(): void
{
    // Create demo users
    if (!file_exists(USERS_FILE)) {
        $users = [
            [
                'id' => 'admin-1',
                'name' => 'Admin System',
                'email' => 'admin@pwd.go.id',
                'username' => 'admin',
                'password' => password_hash('admin123', PASSWORD_BCRYPT),
                'nik' => '0000000000000000',
                'dateOfBirth' => '1990-01-01',
                'phone' => '',
                'address' => '',
                'profilePhoto' => '',
                'role' => 'admin',
                'isActive' => true,
                'createdAt' => date(DATE_ATOM),
            ],
        ];
        writeJson(USERS_FILE, $users);
    }
    
    // Create empty assets, taxes, transactions
    if (!file_exists(ASSETS_FILE)) {
        writeJson(ASSETS_FILE, []);
    }
    if (!file_exists(TAXES_FILE)) {
        writeJson(TAXES_FILE, []);
    }
    if (!file_exists(TRANSACTIONS_FILE)) {
        writeJson(TRANSACTIONS_FILE, []);
    }
}

// Initialize on startup
initializeDemoData();
