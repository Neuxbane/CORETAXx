<?php
/**
 * Assets Management API
 */

declare(strict_types=1);

require __DIR__ . '/bootstrap.php';

$user = requireAuth();
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

if ($method === 'GET' && $action === 'list') {
    listAssets($user);
} elseif ($method === 'POST' && $action === 'create') {
    createAsset($user);
} elseif ($method === 'PUT' && $action === 'update') {
    updateAsset($user);
} elseif ($method === 'DELETE' && $action === 'delete') {
    deleteAsset($user);
} else {
    respond(['error' => 'Route not found'], 404);
}

function listAssets(array $user): void
{
    $assets = readJson(ASSETS_FILE);
    if (($user['role'] ?? 'user') !== 'admin') {
        $assets = array_values(array_filter($assets, static fn($a) => $a['userId'] === $user['id']));
    }
    respond(['items' => $assets]);
}

function createAsset(array $user): void
{
    $payload = getJsonInput();
    $name = trim($payload['name'] ?? '');
    $type = trim($payload['type'] ?? '');
    $registrationNumber = trim($payload['registrationNumber'] ?? '');

    if (!$name || !$type || !$registrationNumber) {
        respond(['error' => 'Nama, tipe, dan nomor registrasi harus diisi'], 400);
    }

    $asset = [
        'id' => 'ast-' . substr(bin2hex(random_bytes(8)), 0, 12),
        'userId' => $user['id'],
        'name' => $name,
        'type' => $type,
        'registrationNumber' => $registrationNumber,
        'location' => $payload['location'] ?? '',
        'assetKind' => $payload['assetKind'] ?? '',
        'value' => (float)($payload['value'] ?? 0),
        'acquisitionValue' => (float)($payload['acquisitionValue'] ?? 0),
        'taxAmount' => (float)($payload['taxAmount'] ?? 0),
        'taxRate' => (float)($payload['taxRate'] ?? 0),
        'photos' => $payload['photos'] ?? [],
        'attachments' => $payload['attachments'] ?? [],
        'createdAt' => date(DATE_ATOM),
    ];

    $assets = readJson(ASSETS_FILE);
    $assets[] = $asset;
    writeJson(ASSETS_FILE, $assets);

    // Create corresponding tax record
    createTaxRecord($asset);

    respond(['item' => $asset], 201);
}

function updateAsset(array $user): void
{
    $payload = getJsonInput();
    $assetId = $payload['id'] ?? null;

    if (!$assetId) {
        respond(['error' => 'ID aset diperlukan'], 400);
    }

    $assets = readJson(ASSETS_FILE);
    $found = false;

    foreach ($assets as $index => $asset) {
        if ($asset['id'] === $assetId) {
            if (($user['role'] ?? 'user') !== 'admin' && $asset['userId'] !== $user['id']) {
                respond(['error' => 'Tidak boleh mengubah aset user lain'], 403);
            }

            $assets[$index] = array_merge($asset, [
                'name' => $payload['name'] ?? $asset['name'],
                'type' => $payload['type'] ?? $asset['type'],
                'registrationNumber' => $payload['registrationNumber'] ?? $asset['registrationNumber'],
                'location' => $payload['location'] ?? $asset['location'],
                'value' => (float)($payload['value'] ?? $asset['value']),
                'taxAmount' => (float)($payload['taxAmount'] ?? $asset['taxAmount']),
                'taxRate' => (float)($payload['taxRate'] ?? $asset['taxRate']),
                'photos' => $payload['photos'] ?? $asset['photos'],
                'attachments' => $payload['attachments'] ?? $asset['attachments'],
            ]);

            $found = true;
            break;
        }
    }

    if (!$found) {
        respond(['error' => 'Aset tidak ditemukan'], 404);
    }

    writeJson(ASSETS_FILE, $assets);
    respond(['item' => $assets[$index] ?? null]);
}

function deleteAsset(array $user): void
{
    $assetId = $_GET['id'] ?? null;

    if (!$assetId) {
        respond(['error' => 'ID aset diperlukan'], 400);
    }

    $assets = readJson(ASSETS_FILE);
    $found = false;

    foreach ($assets as $index => $asset) {
        if ($asset['id'] === $assetId) {
            if (($user['role'] ?? 'user') !== 'admin' && $asset['userId'] !== $user['id']) {
                respond(['error' => 'Tidak boleh menghapus aset user lain'], 403);
            }

            // Delete corresponding tax records
            $taxes = readJson(TAXES_FILE);
            $taxes = array_values(array_filter($taxes, static fn($t) => $t['assetId'] !== $assetId));
            writeJson(TAXES_FILE, $taxes);

            unset($assets[$index]);
            $found = true;
            break;
        }
    }

    if (!$found) {
        respond(['error' => 'Aset tidak ditemukan'], 404);
    }

    writeJson(ASSETS_FILE, array_values($assets));
    respond(['message' => 'Aset berhasil dihapus']);
}

function createTaxRecord(array $asset): void
{
    $taxes = readJson(TAXES_FILE);
    
    $dueDate = date('Y-m-d', strtotime('+1 year'));
    
    $tax = [
        'id' => 'tax-' . substr(bin2hex(random_bytes(8)), 0, 12),
        'userId' => $asset['userId'],
        'assetId' => $asset['id'],
        'assetName' => $asset['name'],
        'amount' => $asset['taxAmount'] ?? 0,
        'rate' => $asset['taxRate'] ?? 0,
        'dueDate' => $dueDate,
        'status' => 'unpaid',
        'createdAt' => date(DATE_ATOM),
    ];
    
    $taxes[] = $tax;
    writeJson(TAXES_FILE, $taxes);
}
