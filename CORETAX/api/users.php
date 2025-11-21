<?php
declare(strict_types=1);

require __DIR__ . '/bootstrap.php';

$user = requireAuth(['admin']);
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $users = readJson('users.json');
    foreach ($users as &$item) {
        unset($item['password']);
    }
    respond(['items' => $users]);
}

if ($method === 'PATCH') {
    $payload = getJsonInput();
    $targetId = $payload['id'] ?? null;
    if (!$targetId) {
        respond(['error' => 'id diperlukan'], 400);
    }

    $users = readJson('users.json');
    $found = false;

    foreach ($users as $index => $u) {
        if ($u['id'] === $targetId) {
            $users[$index]['isActive'] = (bool)($payload['isActive'] ?? $u['isActive']);
            $users[$index]['role'] = $payload['role'] ?? $u['role'];
            $found = true;
            break;
        }
    }

    if (!$found) {
        respond(['error' => 'User tidak ditemukan'], 404);
    }

    writeJson('users.json', $users);
    respond(['items' => array_map(static function ($u) {
        unset($u['password']);
        return $u;
    }, $users)]);
}

respond(['error' => 'Route not found'], 404);
