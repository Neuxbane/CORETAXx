<?php
/**
 * Setup script to initialize admin user and required directories
 * Run this once when deploying the application
 */

header('Content-Type: application/json');

$dataDir = __DIR__ . '/data';
$usersDir = $dataDir . '/users';
$sessionsDir = $dataDir . '/sessions';
$userDataDir = $dataDir . '/userdata';
$otpDir = $dataDir . '/otp';
$mailLogsDir = $dataDir . '/mail_logs';

// Create directories
$dirs = [$dataDir, $usersDir, $sessionsDir, $userDataDir, $otpDir, $mailLogsDir];
foreach ($dirs as $dir) {
    if (!is_dir($dir)) {
        mkdir($dir, 0775, true);
        echo "Created directory: $dir\n";
    }
}

// Check if admin user exists
$adminFile = $usersDir . '/admin-1.json';
if (!file_exists($adminFile)) {
    // Create default admin user
    $adminUser = [
        'id' => 'admin-1',
        'name' => 'Admin System',
        'fullName' => 'Admin System',
        'email' => 'admin@coretax.go.id',
        'username' => 'admin',
        'password' => password_hash('admin123', PASSWORD_DEFAULT),
        'nik' => '0000000000000000',
        'dateOfBirth' => '1990-01-01',
        'role' => 'admin',
        'isActive' => true,
        'createdAt' => date('c'),
        'updatedAt' => date('c')
    ];
    
    file_put_contents($adminFile, json_encode($adminUser, JSON_PRETTY_PRINT));
    echo "Created admin user\n";
    echo "  Username: admin\n";
    echo "  Password: admin123\n";
} else {
    echo "Admin user already exists\n";
}

// Create .htaccess to protect data directory
$htaccessFile = $dataDir . '/.htaccess';
if (!file_exists($htaccessFile)) {
    $htaccessContent = "Deny from all\n";
    file_put_contents($htaccessFile, $htaccessContent);
    echo "Created .htaccess protection for data directory\n";
}

echo "\nSetup complete!\n";
echo json_encode([
    'success' => true,
    'message' => 'Setup complete',
    'directories' => $dirs
], JSON_PRETTY_PRINT);
