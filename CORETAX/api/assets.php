<?php
declare(strict_types=1);

require __DIR__ . '/bootstrap.php';

$user = requireAuth();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    listAssets($user);
} elseif ($method === 'POST') {
    createAsset($user);
} elseif ($method === 'PUT' || $method === 'PATCH') {
    updateAsset($user);
} elseif ($method === 'DELETE') {
    deleteAsset($user);
} else {
    respond(['error' => 'Method not allowed'], 405);
}

function listAssets(array $user): void
{
    $assets = readJson('assets.json');
    if (($user['role'] ?? 'user') !== 'admin') {
        $assets = array_values(array_filter($assets, static fn ($a) => $a['userId'] === $user['id']));
    }

    respond(['items' => $assets]);
}

function createAsset(array $user): void
{
    $payload = getJsonInput();
    $required = ['name', 'type', 'registrationNumber'];
    foreach ($required as $field) {
        if (empty($payload[$field])) {
            respond(['error' => "Field {$field} wajib diisi"], 400);
        }
    }

    $assets = readJson('assets.json');
    $asset = [
        'id' => generateId('ast'),
        'userId' => $payload['userId'] ?? $user['id'],
        'name' => $payload['name'],
        'type' => $payload['type'],
        'registrationNumber' => $payload['registrationNumber'],
        'location' => $payload['location'] ?? '',
        'assetCategory' => $payload['assetCategory'] ?? 'lancar',
        'estimatedValue' => (float)($payload['estimatedValue'] ?? 0),
        'photos' => $payload['photos'] ?? [],
        'createdAt' => date(DATE_ATOM),
    ];

    if (($user['role'] ?? 'user') !== 'admin' && $asset['userId'] !== $user['id']) {
        respond(['error' => 'Anda tidak boleh menambahkan aset untuk user lain'], 403);
    }

    $assets[] = $asset;
    writeJson('assets.json', $assets);
    ensureAssetTax($asset);

    respond(['item' => $asset], 201);
}

function updateAsset(array $user): void
{
    $payload = getJsonInput();
    $assetId = $payload['id'] ?? $_GET['id'] ?? null;
    if (!$assetId) {
        respond(['error' => 'ID aset diperlukan'], 400);
    }

    $assets = readJson('assets.json');
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
                'assetCategory' => $payload['assetCategory'] ?? $asset['assetCategory'],
                'estimatedValue' => (float)($payload['estimatedValue'] ?? $asset['estimatedValue']),
                'photos' => $payload['photos'] ?? $asset['photos'],
            ]);

            $found = true;
            $asset = $assets[$index];
            ensureAssetTax($asset);
            break;
        }
    }

    if (!$found) {
        respond(['error' => 'Aset tidak ditemukan'], 404);
    }

    writeJson('assets.json', $assets);
    respond(['item' => $asset]);
}

function deleteAsset(array $user): void
{
    $assetId = $_GET['id'] ?? null;
    if (!$assetId) {
        respond(['error' => 'ID aset diperlukan'], 400);
    }

    $assets = readJson('assets.json');
    $asset = null;

    foreach ($assets as $item) {
        if ($item['id'] === $assetId) {
            $asset = $item;
            break;
        }
    }

    if (!$asset) {
        respond(['error' => 'Aset tidak ditemukan'], 404);
    }

    if (($user['role'] ?? 'user') !== 'admin' && $asset['userId'] !== $user['id']) {
        respond(['error' => 'Tidak boleh menghapus aset user lain'], 403);
    }

    $assets = array_values(array_filter($assets, static fn ($a) => $a['id'] !== $assetId));
    writeJson('assets.json', $assets);

    $taxes = readJson('taxes.json');
    $taxes = array_values(array_filter($taxes, static fn ($t) => $t['assetId'] !== $assetId));
    writeJson('taxes.json', $taxes);

    respond(['message' => 'Aset dihapus']);
}
