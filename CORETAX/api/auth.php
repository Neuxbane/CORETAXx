<?php
declare(strict_types=1);

require __DIR__ . '/bootstrap.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

if ($method === 'POST' && $action === 'register') {
    handleRegister();
} elseif ($method === 'POST' && $action === 'login') {
    handleLogin();
} elseif ($method === 'POST' && $action === 'logout') {
    $user = requireAuth();
    $token = getAuthorizationToken();
    if ($token) {
        deleteSession($token);
    }
    respond(['message' => 'Logged out', 'user' => $user]);
} elseif ($method === 'GET' && $action === 'me') {
    $user = requireAuth();
    unset($user['password']);
    respond(['user' => $user]);
}

respond(['error' => 'Route not found'], 404);

function handleRegister(): void
{
    $payload = getJsonInput();
    $name = trim($payload['name'] ?? '');
    $emailInput = trim($payload['email'] ?? '');
    $email = strtolower($emailInput);
    $usernameInput = trim($payload['username'] ?? '');
    $username = $usernameInput;
    $password = trim($payload['password'] ?? '');
    $confirmPassword = trim($payload['confirmPassword'] ?? '');
    $nik = trim($payload['nik'] ?? '');
    $dateOfBirth = trim($payload['dateOfBirth'] ?? '');

    if (!$name || !$email || !$username || !$password) {
        respond(['error' => 'Nama, email, username, dan password wajib diisi'], 400);
    }

    if (!$confirmPassword) {
        respond(['error' => 'Konfirmasi password wajib diisi'], 400);
    }

    if ($password !== $confirmPassword) {
        respond(['error' => 'Password dan konfirmasi tidak cocok'], 400);
    }

    if (strlen($password) < 6) {
        respond(['error' => 'Password minimal 6 karakter'], 400);
    }

    if (!preg_match('/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/', $emailInput)) {
        respond(['error' => 'Format email tidak valid'], 400);
    }

    if (!$nik) {
        respond(['error' => 'NIK wajib diisi'], 400);
    }

    if (!preg_match('/^[0-9]{16}$/', $nik)) {
        respond(['error' => 'NIK harus terdiri dari 16 digit numerik'], 400);
    }

    if (!$dateOfBirth) {
        respond(['error' => 'Tanggal lahir wajib diisi'], 400);
    }

    if (!preg_match('/^\\d{4}-\\d{2}-\\d{2}$/', $dateOfBirth)) {
        respond(['error' => 'Format tanggal lahir tidak valid (YYYY-MM-DD)'], 400);
    }

    $dobDate = DateTime::createFromFormat('Y-m-d', $dateOfBirth);
    if (!$dobDate || $dobDate->format('Y-m-d') !== $dateOfBirth) {
        respond(['error' => 'Tanggal lahir tidak valid'], 400);
    }

    // Uniqueness checks (case-insensitive for email/username)
    $users = readJson('users.json');
    foreach ($users as $existing) {
        $existingEmail = strtolower(trim($existing['email'] ?? ''));
        $existingUsername = strtolower(trim($existing['username'] ?? ''));
        if ($existingEmail === $email) {
            respond(['error' => 'Email sudah terdaftar'], 409);
        }
        if ($existingUsername === strtolower($username)) {
            respond(['error' => 'Username sudah digunakan'], 409);
        }
        if (($existing['nik'] ?? '') === $nik) {
            respond(['error' => 'NIK sudah terdaftar'], 409);
        }
    }

    $user = [
        'id' => generateId('usr'),
        'name' => $name,
        'email' => $email,
        'username' => $username,
        'password' => password_hash($password, PASSWORD_DEFAULT),
        'role' => 'user',
        'nik' => $nik,
        'dateOfBirth' => $dateOfBirth,
        'phone' => $payload['phone'] ?? '',
        'address' => $payload['address'] ?? '',
        'isActive' => true,
        'createdAt' => date(DATE_ATOM),
    ];

    $users[] = $user;
    writeJson('users.json', $users);

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

    $users = readJson('users.json');
    foreach ($users as $user) {
        if (
            strtolower($user['email'] ?? '') === $identifier ||
            strtolower($user['username'] ?? '') === $identifier
        ) {
            if (!($user['isActive'] ?? false)) {
                respond(['error' => 'Akun dinonaktifkan'], 403);
            }
            if (password_verify($password, $user['password'])) {
                $session = createSession($user['id']);
                unset($user['password']);
                respond(['user' => $user, 'token' => $session['token']]);
            }
        }
    }

    respond(['error' => 'Kredensial tidak valid'], 401);
}
