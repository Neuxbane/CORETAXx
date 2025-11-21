<?php
declare(strict_types=1);

require __DIR__ . '/bootstrap.php';

$user = requireAuth();

$transactions = readJson('transactions.json');
if (($user['role'] ?? 'user') !== 'admin') {
    $transactions = array_values(array_filter($transactions, static fn ($t) => $t['userId'] === $user['id']));
}

respond(['items' => $transactions]);
