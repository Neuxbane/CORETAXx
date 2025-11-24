<?php
/**
 * CORETAX Authentication API
 * Handles login, register, logout, and user management
 */

declare(strict_types=1);

require __DIR__ . '/bootstrap.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

if ($method === 'POST' && $action === 'register') {
    handleRegister();
} elseif ($method === 'POST' && $action === 'login') {
    handleLogin();
} elseif ($method === 'POST' && $action === 'logout') {
    handleLogout();
} elseif ($method === 'GET' && $action === 'me') {
    handleGetMe();
} else {
    respond(['error' => 'Route not found'], 404);
}

function handleRegister(): void
{
    $payload = getJsonInput();
    $name = trim($payload['name'] ?? '');
    $emailInput = trim($payload['email'] ?? '');
    $email = strtolower($emailInput);
    $username = trim($payload['username'] ?? '');
    $password = $payload['password'] ?? '';
    $confirmPassword = $payload['confirmPassword'] ?? '';
    $nik = trim($payload['nik'] ?? '');
    $dateOfBirth = $payload['dateOfBirth'] ?? '';
    $address = $payload['address'] ?? '';

    // Validation
    if (!$name) {
        respond(['error' => 'Nama harus diisi'], 400);
    }
    if (!$email || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        respond(['error' => 'Email tidak valid'], 400);
    }
    if (!$username) {
        respond(['error' => 'Username harus diisi'], 400);
    }
    if (!$password || strlen($password) < 6) {
        respond(['error' => 'Password minimal 6 karakter'], 400);
    }
    if ($password !== $confirmPassword) {
        respond(['error' => 'Password tidak cocok'], 400);
    }
    if (!$nik || strlen($nik) !== 16 || !ctype_digit($nik)) {
        respond(['error' => 'NIK harus 16 digit angka'], 400);
    }
    if (!$dateOfBirth) {
        respond(['error' => 'Tanggal lahir harus diisi'], 400);
    }

    // Check if email exists
    $users = readJson(USERS_FILE);
    foreach ($users as $user) {
        if (strtolower($user['email'] ?? '') === $email) {
            respond(['error' => 'Email sudah terdaftar'], 400);
        }
        if (strtolower($user['username'] ?? '') === strtolower($username)) {
            respond(['error' => 'Username sudah digunakan'], 400);
        }
    }

    // Create new user
    $user = [
        'id' => 'user-' . substr(bin2hex(random_bytes(8)), 0, 12),
        'name' => $name,
        'email' => $email,
        'username' => $username,
        'password' => password_hash($password, PASSWORD_BCRYPT),
        'nik' => $nik,
        'dateOfBirth' => $dateOfBirth,
        'phone' => $payload['phone'] ?? '',
        'address' => $address,
        'profilePhoto' => '',
        'role' => 'user',
        'isActive' => true,
        'createdAt' => date(DATE_ATOM),
    ];

    $users[] = $user;
    writeJson(USERS_FILE, $users);

    $session = createSession($user['id']);
    $safeUser = $user;
    unset($safeUser['password']);

    respond(['user' => $safeUser, 'token' => $session['token']], 201);
}

function handleLogin(): void
{
    $payload = getJsonInput();
    $identifier = strtolower(trim($payload['identifier'] ?? ''));
    $password = $payload['password'] ?? '';

    if (!$identifier || !$password) {
        respond(['error' => 'Masukkan email/username dan password'], 400);
    }

    $users = readJson(USERS_FILE);
    $user = null;

    foreach ($users as $u) {
        if (
            strtolower($u['email'] ?? '') === $identifier ||
            strtolower($u['username'] ?? '') === $identifier
        ) {
            $user = $u;
            break;
        }
    }

    if (!$user || !password_verify($password, $user['password'] ?? '')) {
        respond(['error' => 'Email/Username atau Password salah'], 401);
    }

    if (!$user['isActive']) {
        respond(['error' => 'Akun Anda belum diaktivasi'], 403);
    }

    $session = createSession($user['id']);
    $safeUser = $user;
    unset($safeUser['password']);

    respond(['user' => $safeUser, 'token' => $session['token']]);
}

function handleLogout(): void
{
    $user = requireAuth();
    $token = getAuthorizationToken();
    if ($token) {
        deleteSession($token);
    }
    respond(['message' => 'Logged out', 'user' => $user]);
}

function handleGetMe(): void
{
    $user = requireAuth();
    unset($user['password']);
    respond(['user' => $user]);
}
