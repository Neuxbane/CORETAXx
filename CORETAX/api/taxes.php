<?php
/**
 * Tax Management API
 */

declare(strict_types=1);

require __DIR__ . '/bootstrap.php';

$user = requireAuth();
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

if ($method === 'GET' && $action === 'list') {
    listTaxes($user);
} elseif ($method === 'PUT' && $action === 'update') {
    updateTax($user);
} else {
    respond(['error' => 'Route not found'], 404);
}

function listTaxes(array $user): void
{
    $taxes = readJson(TAXES_FILE);
    if (($user['role'] ?? 'user') !== 'admin') {
        $taxes = array_values(array_filter($taxes, static fn($t) => $t['userId'] === $user['id']));
    }
    respond(['items' => $taxes]);
}

function updateTax(array $user): void
{
    $payload = getJsonInput();
    $taxId = $payload['id'] ?? null;

    if (!$taxId) {
        respond(['error' => 'ID pajak diperlukan'], 400);
    }

    $taxes = readJson(TAXES_FILE);
    $found = false;

    foreach ($taxes as $index => $tax) {
        if ($tax['id'] === $taxId) {
            if (($user['role'] ?? 'user') !== 'admin' && $tax['userId'] !== $user['id']) {
                respond(['error' => 'Tidak boleh mengubah pajak user lain'], 403);
            }

            $taxes[$index] = array_merge($tax, [
                'status' => $payload['status'] ?? $tax['status'],
                'paymentDate' => $payload['paymentDate'] ?? null,
                'paymentMethod' => $payload['paymentMethod'] ?? null,
            ]);

            $found = true;
            break;
        }
    }

    if (!$found) {
        respond(['error' => 'Pajak tidak ditemukan'], 404);
    }

    writeJson(TAXES_FILE, $taxes);
    respond(['item' => $taxes[$index] ?? null]);
}
