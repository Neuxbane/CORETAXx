<?php
declare(strict_types=1);

require __DIR__ . '/bootstrap.php';

$user = requireAuth();
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

if ($method === 'GET') {
    listTaxes($user);
} elseif ($method === 'POST' && $action === 'pay') {
    payTax($user);
} else {
    respond(['error' => 'Route not found'], 404);
}

function listTaxes(array $user): void
{
    $taxes = readJson('taxes.json');
    if (($user['role'] ?? 'user') !== 'admin') {
        $taxes = array_values(array_filter($taxes, static fn ($t) => $t['userId'] === $user['id']));
    }

    respond(['items' => $taxes]);
}

function payTax(array $user): void
{
    $payload = getJsonInput();
    $taxId = $payload['taxId'] ?? null;
    $method = $payload['method'] ?? 'transfer';

    if (!$taxId) {
        respond(['error' => 'taxId diperlukan'], 400);
    }

    $taxes = readJson('taxes.json');
    $found = false;
    $taxItem = null;

    foreach ($taxes as $index => $tax) {
        if ($tax['id'] === $taxId) {
            if (($user['role'] ?? 'user') !== 'admin' && $tax['userId'] !== $user['id']) {
                respond(['error' => 'Tidak boleh membayar pajak user lain'], 403);
            }

            $tax['status'] = 'paid';
            $tax['paidAt'] = date(DATE_ATOM);
            $taxes[$index] = $tax;
            $taxItem = $tax;
            $found = true;
            break;
        }
    }

    if (!$found || !$taxItem) {
        respond(['error' => 'Tagihan tidak ditemukan'], 404);
    }

    writeJson('taxes.json', $taxes);

    $transactions = readJson('transactions.json');
    $transactions[] = [
        'id' => generateId('txn'),
        'userId' => $taxItem['userId'],
        'taxId' => $taxItem['id'],
        'assetId' => $taxItem['assetId'] ?? '',
        'amount' => $taxItem['amount'],
        'method' => $method,
        'status' => 'completed',
        'createdAt' => date(DATE_ATOM),
    ];
    writeJson('transactions.json', $transactions);

    respond(['item' => $taxItem]);
}
