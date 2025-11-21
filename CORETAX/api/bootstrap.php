<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

const DATA_DIR = __DIR__ . '/../data';

if (!function_exists('getallheaders')) {
    function getallheaders(): array
    {
        $headers = [];
        foreach ($_SERVER as $name => $value) {
            if (str_starts_with($name, 'HTTP_')) {
                $key = str_replace(' ', '-', ucwords(strtolower(str_replace('_', ' ', substr($name, 5)))));
                $headers[$key] = $value;
            }
        }
        return $headers;
    }
}

if (!function_exists('str_starts_with')) {
    function str_starts_with(string $haystack, string $needle): bool
    {
        return $needle === '' || strncmp($haystack, $needle, strlen($needle)) === 0;
    }
}

ensureStorage();
seedAdmin();

function ensureStorage(): void
{
    if (!is_dir(DATA_DIR)) {
        mkdir(DATA_DIR, 0775, true);
    }

    $files = [
        'users.json' => [],
        'sessions.json' => [],
        'assets.json' => [],
        'taxes.json' => [],
        'transactions.json' => [],
    ];

    foreach ($files as $file => $default) {
        $path = DATA_DIR . '/' . $file;
        if (!file_exists($path)) {
            file_put_contents($path, json_encode($default, JSON_PRETTY_PRINT));
        }
    }
}

function seedAdmin(): void
{
    $users = readJson('users.json');
    $hasAdmin = array_filter($users, static fn ($u) => ($u['role'] ?? '') === 'admin');

    if ($hasAdmin) {
        return;
    }

    $admin = [
        'id' => generateId('usr'),
        'name' => 'Admin Sistem',
        'email' => 'admin@pwd.go.id',
        'username' => 'admin',
        'password' => password_hash('admin123', PASSWORD_DEFAULT),
        'role' => 'admin',
        'nik' => '0000000000000000',
        'dateOfBirth' => '1990-01-01',
        'phone' => '',
        'address' => '',
        'isActive' => true,
        'createdAt' => date(DATE_ATOM),
    ];

    $users[] = $admin;
    writeJson('users.json', $users);
}

function readJson(string $file): array
{
    $path = DATA_DIR . '/' . $file;
    if (!file_exists($path)) {
        return [];
    }

    $contents = file_get_contents($path);
    $decoded = json_decode($contents ?: '[]', true);

    return is_array($decoded) ? $decoded : [];
}

function writeJson(string $file, array $data): void
{
    $path = DATA_DIR . '/' . $file;
    $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    file_put_contents($path, $json, LOCK_EX);
}

function respond(array $payload, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($payload);
    exit;
}

function getJsonInput(): array
{
    $raw = file_get_contents('php://input');
    $decoded = json_decode($raw ?: '[]', true);

    return is_array($decoded) ? $decoded : [];
}

function generateId(string $prefix): string
{
    return $prefix . '-' . bin2hex(random_bytes(6));
}

function getAuthorizationToken(): ?string
{
    $headers = getallheaders();
    $auth = $headers['Authorization'] ?? $headers['authorization'] ?? '';

    if (preg_match('/Bearer\\s+(.*)$/i', $auth, $matches)) {
        return trim($matches[1]);
    }

    return $_GET['token'] ?? null;
}

function requireAuth(?array $roles = null): array
{
    $token = getAuthorizationToken();
    if (!$token) {
        respond(['error' => 'Unauthorized'], 401);
    }

    $session = findSession($token);
    if (!$session) {
        respond(['error' => 'Session expired or invalid'], 401);
    }

    $user = findUser($session['userId']);
    if (!$user || !($user['isActive'] ?? false)) {
        respond(['error' => 'User inactive or missing'], 401);
    }

    if ($roles && !in_array($user['role'] ?? 'user', $roles, true)) {
        respond(['error' => 'Forbidden'], 403);
    }

    return $user;
}

function findSession(string $token): ?array
{
    $sessions = readJson('sessions.json');
    $now = time();
    $validSessions = [];
    $matched = null;

    foreach ($sessions as $session) {
        if (($session['expiresAt'] ?? 0) > $now) {
            $validSessions[] = $session;
            if ($session['token'] === $token) {
                $matched = $session;
            }
        }
    }

    writeJson('sessions.json', $validSessions);

    return $matched;
}

function createSession(string $userId): array
{
    $sessions = readJson('sessions.json');
    $token = bin2hex(random_bytes(20));

    $session = [
        'token' => $token,
        'userId' => $userId,
        'createdAt' => time(),
        'expiresAt' => time() + (60 * 60 * 4),
    ];

    $sessions[] = $session;
    writeJson('sessions.json', $sessions);

    return $session;
}

function findUser(string $userId): ?array
{
    $users = readJson('users.json');
    foreach ($users as $user) {
        if ($user['id'] === $userId) {
            return $user;
        }
    }

    return null;
}

function saveUser(array $user): void
{
    $users = readJson('users.json');
    $updated = false;

    foreach ($users as $index => $existing) {
        if ($existing['id'] === $user['id']) {
            $users[$index] = $user;
            $updated = true;
            break;
        }
    }

    if (!$updated) {
        $users[] = $user;
    }

    writeJson('users.json', $users);
}

function deleteSession(string $token): void
{
    $sessions = readJson('sessions.json');
    $sessions = array_values(array_filter($sessions, static fn ($s) => $s['token'] !== $token));
    writeJson('sessions.json', $sessions);
}

function ensureAssetTax(array $asset): void
{
    $taxes = readJson('taxes.json');
    $exists = array_filter($taxes, static fn ($t) => $t['assetId'] === $asset['id'] && $t['status'] === 'unpaid');
    if ($exists) {
        return;
    }

    $amount = round(($asset['estimatedValue'] ?? 0) * 0.01) ?: 150000;
    $taxes[] = [
        'id' => generateId('tax'),
        'userId' => $asset['userId'],
        'assetId' => $asset['id'],
        'description' => 'Pajak tahunan ' . ($asset['name'] ?? 'Aset'),
        'amount' => $amount,
        'status' => 'unpaid',
        'dueDate' => date('Y-m-d', strtotime('+1 month')),
        'createdAt' => date(DATE_ATOM),
        'paidAt' => null,
    ];

    writeJson('taxes.json', $taxes);
}
