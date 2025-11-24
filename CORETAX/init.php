<?php
/**
 * Initialize demo data for testing
 * Run this once: php init.php
 */

define('DATA_DIR', __DIR__ . '/data');
define('USERS_FILE', DATA_DIR . '/users.json');
define('ASSETS_FILE', DATA_DIR . '/assets.json');
define('TAXES_FILE', DATA_DIR . '/taxes.json');

// Create data directory
if (!is_dir(DATA_DIR)) {
    mkdir(DATA_DIR, 0755, true);
}

// Helper to write JSON
function writeJson($filePath, $data) {
    $dir = dirname($filePath);
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }
    file_put_contents($filePath, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

// Create demo users
$users = [
    [
        'id' => 'admin-1',
        'name' => 'Admin System',
        'email' => 'admin@pwd.go.id',
        'username' => 'admin',
        'password' => password_hash('admin123', PASSWORD_BCRYPT),
        'nik' => '0000000000000000',
        'dateOfBirth' => '1990-01-01',
        'phone' => '082123456789',
        'address' => 'Jakarta, Indonesia',
        'profilePhoto' => '',
        'role' => 'admin',
        'isActive' => true,
        'createdAt' => date(DATE_ATOM),
    ],
    [
        'id' => 'user-1',
        'name' => 'Budi Santoso',
        'email' => 'budi@example.com',
        'username' => 'budi',
        'password' => password_hash('password123', PASSWORD_BCRYPT),
        'nik' => '1234567890123456',
        'dateOfBirth' => '1985-05-15',
        'phone' => '081234567890',
        'address' => 'Bandung, Jawa Barat',
        'profilePhoto' => '',
        'role' => 'user',
        'isActive' => true,
        'createdAt' => date(DATE_ATOM),
    ],
];

writeJson(USERS_FILE, $users);

// Create demo assets
$assets = [
    [
        'id' => 'ast-001',
        'userId' => 'user-1',
        'name' => 'Toyota Avanza Hitam',
        'type' => 'Kendaraan',
        'registrationNumber' => 'B1234ABC',
        'location' => 'Bandung',
        'assetKind' => 'Kendaraan',
        'value' => 150000000,
        'acquisitionValue' => 150000000,
        'taxAmount' => 2250000,
        'taxRate' => 1.5,
        'fuelType' => 'Bensin',
        'vehicleType' => 'Mobil Penumpang',
        'photos' => [],
        'attachments' => [],
        'createdAt' => date(DATE_ATOM),
    ],
    [
        'id' => 'ast-002',
        'userId' => 'user-1',
        'name' => 'Rumah Tinggal di Arcamanik',
        'type' => 'Bangunan',
        'registrationNumber' => 'HM-2024-001',
        'location' => 'Bandung, Arcamanik',
        'assetKind' => 'Bangunan',
        'value' => 500000000,
        'acquisitionValue' => 500000000,
        'taxAmount' => 2000000,
        'taxRate' => 0.4,
        'buildingArea' => 150,
        'landArea' => 300,
        'certificateType' => 'SHM',
        'buildingType' => 'Rumah Tinggal',
        'photos' => [],
        'attachments' => [],
        'createdAt' => date(DATE_ATOM),
    ],
];

writeJson(ASSETS_FILE, $assets);

// Create demo taxes
$taxes = [
    [
        'id' => 'tax-001',
        'userId' => 'user-1',
        'assetId' => 'ast-001',
        'assetName' => 'Toyota Avanza Hitam',
        'amount' => 2250000,
        'rate' => 1.5,
        'dueDate' => date('Y-m-d', strtotime('+6 months')),
        'status' => 'unpaid',
        'createdAt' => date(DATE_ATOM),
    ],
    [
        'id' => 'tax-002',
        'userId' => 'user-1',
        'assetId' => 'ast-002',
        'assetName' => 'Rumah Tinggal di Arcamanik',
        'amount' => 2000000,
        'rate' => 0.4,
        'dueDate' => date('Y-m-d', strtotime('+10 months')),
        'status' => 'unpaid',
        'createdAt' => date(DATE_ATOM),
    ],
];

writeJson(TAXES_FILE, $taxes);

echo "✓ Demo data initialized successfully!\n";
echo "✓ Users file: " . USERS_FILE . "\n";
echo "✓ Assets file: " . ASSETS_FILE . "\n";
echo "✓ Taxes file: " . TAXES_FILE . "\n\n";
echo "Demo credentials:\n";
echo "  Admin: admin / admin123\n";
echo "  User: budi / password123\n";
