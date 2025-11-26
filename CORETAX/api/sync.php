<?php
// Simple sync endpoint for CORETAX: stores per-user data snapshots and returns latest.

header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];
$dataDir = __DIR__ . '/../data';
if (!is_dir($dataDir)) {
    mkdir($dataDir, 0775, true);
}

function bad_request($msg, $code = 400) {
    http_response_code($code);
    echo json_encode(['error' => $msg]);
    exit;
}

function sanitize_key($key) {
    return preg_replace('/[^a-zA-Z0-9_\-]/', '_', $key);
}

if ($method === 'POST') {
    $payload = json_decode(file_get_contents('php://input'), true);
    if (!is_array($payload)) {
        bad_request('Invalid JSON');
    }

    $userId = isset($payload['userId']) ? sanitize_key($payload['userId']) : null;
    $changes = $payload['changes'] ?? [];

    if (!$userId) {
        bad_request('Missing userId');
    }
    if (!is_array($changes)) {
        bad_request('Invalid changes payload');
    }

    $userDir = $dataDir . '/' . $userId;
    if (!is_dir($userDir)) {
        mkdir($userDir, 0775, true);
    }

    $saved = 0;
    foreach ($changes as $change) {
        $key = sanitize_key($change['key'] ?? '');
        if (!$key) {
            continue;
        }
        $content = [
            'payload' => $change['payload'] ?? null,
            'timestamp' => $change['timestamp'] ?? date('c'),
        ];
        file_put_contents($userDir . '/' . $key . '.json', json_encode($content, JSON_PRETTY_PRINT));
        $saved++;
    }

    echo json_encode(['status' => 'ok', 'saved' => $saved]);
    exit;
}

if ($method === 'GET') {
    $userId = isset($_GET['userId']) ? sanitize_key($_GET['userId']) : null;
    if (!$userId) {
        bad_request('Missing userId');
    }

    $userDir = $dataDir . '/' . $userId;
    if (!is_dir($userDir)) {
        echo json_encode(['data' => new stdClass(), 'lastSync' => null]);
        exit;
    }

    $result = [];
    $lastSync = null;
    foreach (glob($userDir . '/*.json') as $file) {
        $key = basename($file, '.json');
        $content = json_decode(file_get_contents($file), true);
        if (isset($content['payload'])) {
            $result[$key] = $content['payload'];
        }
        if (isset($content['timestamp'])) {
            if (!$lastSync || strtotime($content['timestamp']) > strtotime($lastSync)) {
                $lastSync = $content['timestamp'];
            }
        }
    }

    echo json_encode(['data' => $result, 'lastSync' => $lastSync]);
    exit;
}

bad_request('Method not allowed', 405);
