<?php
/**
 * File Upload/Download API for CORETAX
 * Handles: upload, download, delete for photos and documents
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];
$dataDir = __DIR__ . '/../data';
$uploadsDir = $dataDir . '/uploads';
$sessionsDir = $dataDir . '/sessions';
$usersDir = $dataDir . '/users';

// Max file sizes
$maxImageSize = 5 * 1024 * 1024; // 5MB
$maxDocSize = 10 * 1024 * 1024; // 10MB

// Allowed file types
$allowedImages = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
$allowedDocs = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

// Ensure directories exist
foreach ([$dataDir, $uploadsDir, $sessionsDir, $usersDir] as $dir) {
    if (!is_dir($dir)) {
        mkdir($dir, 0775, true);
    }
}

function bad_request($msg, $code = 400) {
    http_response_code($code);
    echo json_encode(['error' => $msg, 'success' => false]);
    exit;
}

function success_response($data, $code = 200) {
    http_response_code($code);
    echo json_encode(array_merge(['success' => true], $data));
    exit;
}

function sanitize_key($key) {
    return preg_replace('/[^a-zA-Z0-9_\-]/', '_', $key);
}

function get_auth_token() {
    $headers = getallheaders();
    $auth = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    if (preg_match('/Bearer\s+(.+)/i', $auth, $matches)) {
        return $matches[1];
    }
    return null;
}

function get_session($token) {
    global $sessionsDir;
    $file = $sessionsDir . '/' . sanitize_key($token) . '.json';
    if (!file_exists($file)) return null;
    
    $session = json_decode(file_get_contents($file), true);
    if (!$session) return null;
    
    if (strtotime($session['expiresAt']) < time()) {
        @unlink($file);
        return null;
    }
    
    return $session;
}

function get_user_by_id($userId) {
    global $usersDir;
    $file = $usersDir . '/' . sanitize_key($userId) . '.json';
    if (!file_exists($file)) return null;
    return json_decode(file_get_contents($file), true);
}

function get_authenticated_user() {
    $token = get_auth_token();
    if (!$token) return null;
    
    $session = get_session($token);
    if (!$session) return null;
    
    return get_user_by_id($session['userId']);
}

function get_user_uploads_dir($userId) {
    global $uploadsDir;
    $dir = $uploadsDir . '/' . sanitize_key($userId);
    if (!is_dir($dir)) {
        mkdir($dir, 0775, true);
    }
    return $dir;
}

function generate_file_id() {
    return 'file-' . time() . '-' . bin2hex(random_bytes(4));
}

function get_file_extension($mimeType) {
    $map = [
        'image/jpeg' => 'jpg',
        'image/jpg' => 'jpg',
        'image/png' => 'png',
        'image/gif' => 'gif',
        'image/webp' => 'webp',
        'application/pdf' => 'pdf',
        'application/msword' => 'doc',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' => 'docx',
    ];
    return $map[$mimeType] ?? 'bin';
}

// ========== UPLOAD FILE ==========
if ($method === 'POST' && isset($_GET['action']) && $_GET['action'] === 'upload') {
    $user = get_authenticated_user();
    if (!$user) {
        bad_request('Unauthorized', 401);
    }
    
    if (!isset($_FILES['file'])) {
        bad_request('No file uploaded');
    }
    
    $file = $_FILES['file'];
    $fileType = $_POST['type'] ?? 'image'; // 'image' or 'document'
    $assetId = $_POST['assetId'] ?? null;
    
    if ($file['error'] !== UPLOAD_ERR_OK) {
        $errors = [
            UPLOAD_ERR_INI_SIZE => 'File too large (server limit)',
            UPLOAD_ERR_FORM_SIZE => 'File too large (form limit)',
            UPLOAD_ERR_PARTIAL => 'File only partially uploaded',
            UPLOAD_ERR_NO_FILE => 'No file uploaded',
            UPLOAD_ERR_NO_TMP_DIR => 'Missing temp folder',
            UPLOAD_ERR_CANT_WRITE => 'Failed to write file',
        ];
        bad_request($errors[$file['error']] ?? 'Upload error');
    }
    
    $mimeType = mime_content_type($file['tmp_name']);
    
    if ($fileType === 'image') {
        global $allowedImages, $maxImageSize;
        if (!in_array($mimeType, $allowedImages)) {
            bad_request('Invalid image type. Allowed: JPG, PNG, GIF, WEBP');
        }
        if ($file['size'] > $maxImageSize) {
            bad_request('Image too large. Max 5MB');
        }
    } else {
        global $allowedDocs, $maxDocSize;
        if (!in_array($mimeType, $allowedDocs)) {
            bad_request('Invalid document type. Allowed: PDF, DOC, DOCX');
        }
        if ($file['size'] > $maxDocSize) {
            bad_request('Document too large. Max 10MB');
        }
    }
    
    $userDir = get_user_uploads_dir($user['id']);
    $fileId = generate_file_id();
    $extension = get_file_extension($mimeType);
    $filename = $fileId . '.' . $extension;
    $filepath = $userDir . '/' . $filename;
    
    if (!move_uploaded_file($file['tmp_name'], $filepath)) {
        bad_request('Failed to save file');
    }
    
    // Create metadata file
    $metadata = [
        'id' => $fileId,
        'filename' => $filename,
        'originalName' => $file['name'],
        'mimeType' => $mimeType,
        'size' => $file['size'],
        'type' => $fileType,
        'assetId' => $assetId,
        'userId' => $user['id'],
        'uploadedAt' => date('c'),
    ];
    
    file_put_contents($userDir . '/' . $fileId . '.meta.json', json_encode($metadata, JSON_PRETTY_PRINT));
    
    // Generate URL for the file
    $baseUrl = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http') 
        . '://' . $_SERVER['HTTP_HOST'] 
        . dirname($_SERVER['SCRIPT_NAME']);
    $fileUrl = $baseUrl . '/files.php?action=download&id=' . $fileId;
    
    success_response([
        'message' => 'File uploaded successfully',
        'file' => [
            'id' => $fileId,
            'name' => $file['name'],
            'url' => $fileUrl,
            'type' => $fileType,
            'mimeType' => $mimeType,
            'size' => $file['size'],
        ]
    ], 201);
}

// ========== UPLOAD BASE64 ==========
if ($method === 'POST' && isset($_GET['action']) && $_GET['action'] === 'upload-base64') {
    $user = get_authenticated_user();
    if (!$user) {
        bad_request('Unauthorized', 401);
    }
    
    $payload = json_decode(file_get_contents('php://input'), true);
    if (!is_array($payload)) {
        bad_request('Invalid JSON');
    }
    
    $data = $payload['data'] ?? '';
    $name = $payload['name'] ?? 'file';
    $fileType = $payload['type'] ?? 'image';
    $assetId = $payload['assetId'] ?? null;
    
    if (!$data) {
        bad_request('No data provided');
    }
    
    // Parse base64 data URL
    if (preg_match('/^data:([^;]+);base64,(.+)$/', $data, $matches)) {
        $mimeType = $matches[1];
        $base64Data = $matches[2];
    } else {
        bad_request('Invalid base64 data format');
    }
    
    $binaryData = base64_decode($base64Data);
    if ($binaryData === false) {
        bad_request('Failed to decode base64 data');
    }
    
    $size = strlen($binaryData);
    
    if ($fileType === 'image') {
        global $allowedImages, $maxImageSize;
        if (!in_array($mimeType, $allowedImages)) {
            bad_request('Invalid image type. Allowed: JPG, PNG, GIF, WEBP');
        }
        if ($size > $maxImageSize) {
            bad_request('Image too large. Max 5MB');
        }
    } else {
        global $allowedDocs, $maxDocSize;
        if (!in_array($mimeType, $allowedDocs)) {
            bad_request('Invalid document type. Allowed: PDF, DOC, DOCX');
        }
        if ($size > $maxDocSize) {
            bad_request('Document too large. Max 10MB');
        }
    }
    
    $userDir = get_user_uploads_dir($user['id']);
    $fileId = generate_file_id();
    $extension = get_file_extension($mimeType);
    $filename = $fileId . '.' . $extension;
    $filepath = $userDir . '/' . $filename;
    
    if (file_put_contents($filepath, $binaryData) === false) {
        bad_request('Failed to save file');
    }
    
    // Create metadata file
    $metadata = [
        'id' => $fileId,
        'filename' => $filename,
        'originalName' => $name,
        'mimeType' => $mimeType,
        'size' => $size,
        'type' => $fileType,
        'assetId' => $assetId,
        'userId' => $user['id'],
        'uploadedAt' => date('c'),
    ];
    
    file_put_contents($userDir . '/' . $fileId . '.meta.json', json_encode($metadata, JSON_PRETTY_PRINT));
    
    // Generate URL for the file
    $baseUrl = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http') 
        . '://' . $_SERVER['HTTP_HOST'] 
        . dirname($_SERVER['SCRIPT_NAME']);
    $fileUrl = $baseUrl . '/files.php?action=download&id=' . $fileId;
    
    success_response([
        'message' => 'File uploaded successfully',
        'file' => [
            'id' => $fileId,
            'name' => $name,
            'url' => $fileUrl,
            'type' => $fileType,
            'mimeType' => $mimeType,
            'size' => $size,
        ]
    ], 201);
}

// ========== DOWNLOAD FILE ==========
if ($method === 'GET' && isset($_GET['action']) && $_GET['action'] === 'download') {
    $fileId = sanitize_key($_GET['id'] ?? '');
    if (!$fileId) {
        bad_request('File ID required');
    }
    
    // Search for file in all user directories
    global $uploadsDir;
    $found = false;
    $filepath = null;
    $metadata = null;
    
    foreach (glob($uploadsDir . '/*', GLOB_ONLYDIR) as $userDir) {
        $metaFile = $userDir . '/' . $fileId . '.meta.json';
        if (file_exists($metaFile)) {
            $metadata = json_decode(file_get_contents($metaFile), true);
            $filepath = $userDir . '/' . $metadata['filename'];
            if (file_exists($filepath)) {
                $found = true;
                break;
            }
        }
    }
    
    if (!$found) {
        bad_request('File not found', 404);
    }
    
    // Output the file
    header('Content-Type: ' . $metadata['mimeType']);
    header('Content-Length: ' . filesize($filepath));
    header('Content-Disposition: inline; filename="' . $metadata['originalName'] . '"');
    header('Cache-Control: public, max-age=86400');
    
    readfile($filepath);
    exit;
}

// ========== LIST USER FILES ==========
if ($method === 'GET' && isset($_GET['action']) && $_GET['action'] === 'list') {
    $user = get_authenticated_user();
    if (!$user) {
        bad_request('Unauthorized', 401);
    }
    
    $userDir = get_user_uploads_dir($user['id']);
    $assetId = $_GET['assetId'] ?? null;
    $fileType = $_GET['type'] ?? null;
    
    $files = [];
    foreach (glob($userDir . '/*.meta.json') as $metaFile) {
        $meta = json_decode(file_get_contents($metaFile), true);
        if (!$meta) continue;
        
        // Filter by assetId if provided
        if ($assetId && ($meta['assetId'] ?? '') !== $assetId) continue;
        
        // Filter by type if provided
        if ($fileType && ($meta['type'] ?? '') !== $fileType) continue;
        
        $baseUrl = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http') 
            . '://' . $_SERVER['HTTP_HOST'] 
            . dirname($_SERVER['SCRIPT_NAME']);
        
        $files[] = [
            'id' => $meta['id'],
            'name' => $meta['originalName'],
            'url' => $baseUrl . '/files.php?action=download&id=' . $meta['id'],
            'type' => $meta['type'],
            'mimeType' => $meta['mimeType'],
            'size' => $meta['size'],
            'assetId' => $meta['assetId'],
            'uploadedAt' => $meta['uploadedAt'],
        ];
    }
    
    success_response(['files' => $files]);
}

// ========== DELETE FILE ==========
if ($method === 'DELETE' || ($method === 'POST' && isset($_GET['action']) && $_GET['action'] === 'delete')) {
    $user = get_authenticated_user();
    if (!$user) {
        bad_request('Unauthorized', 401);
    }
    
    $fileId = sanitize_key($_GET['id'] ?? '');
    if (!$fileId) {
        $payload = json_decode(file_get_contents('php://input'), true);
        $fileId = sanitize_key($payload['id'] ?? '');
    }
    
    if (!$fileId) {
        bad_request('File ID required');
    }
    
    $userDir = get_user_uploads_dir($user['id']);
    $metaFile = $userDir . '/' . $fileId . '.meta.json';
    
    if (!file_exists($metaFile)) {
        bad_request('File not found', 404);
    }
    
    $metadata = json_decode(file_get_contents($metaFile), true);
    $filepath = $userDir . '/' . $metadata['filename'];
    
    // Delete both files
    @unlink($filepath);
    @unlink($metaFile);
    
    success_response(['message' => 'File deleted successfully']);
}

// ========== BULK UPLOAD BASE64 ==========
if ($method === 'POST' && isset($_GET['action']) && $_GET['action'] === 'upload-bulk') {
    $user = get_authenticated_user();
    if (!$user) {
        bad_request('Unauthorized', 401);
    }
    
    $payload = json_decode(file_get_contents('php://input'), true);
    if (!is_array($payload) || !isset($payload['files'])) {
        bad_request('Invalid JSON or missing files array');
    }
    
    $assetId = $payload['assetId'] ?? null;
    $results = [];
    
    foreach ($payload['files'] as $fileData) {
        $data = $fileData['data'] ?? '';
        $name = $fileData['name'] ?? 'file';
        $fileType = $fileData['type'] ?? 'image';
        
        if (!$data) continue;
        
        // Parse base64 data URL
        if (!preg_match('/^data:([^;]+);base64,(.+)$/', $data, $matches)) {
            $results[] = ['name' => $name, 'error' => 'Invalid base64 format'];
            continue;
        }
        
        $mimeType = $matches[1];
        $base64Data = $matches[2];
        $binaryData = base64_decode($base64Data);
        
        if ($binaryData === false) {
            $results[] = ['name' => $name, 'error' => 'Failed to decode'];
            continue;
        }
        
        $size = strlen($binaryData);
        
        // Validate
        if ($fileType === 'image') {
            global $allowedImages, $maxImageSize;
            if (!in_array($mimeType, $allowedImages)) {
                $results[] = ['name' => $name, 'error' => 'Invalid image type'];
                continue;
            }
            if ($size > $maxImageSize) {
                $results[] = ['name' => $name, 'error' => 'Image too large'];
                continue;
            }
        } else {
            global $allowedDocs, $maxDocSize;
            if (!in_array($mimeType, $allowedDocs)) {
                $results[] = ['name' => $name, 'error' => 'Invalid document type'];
                continue;
            }
            if ($size > $maxDocSize) {
                $results[] = ['name' => $name, 'error' => 'Document too large'];
                continue;
            }
        }
        
        $userDir = get_user_uploads_dir($user['id']);
        $fileId = generate_file_id();
        $extension = get_file_extension($mimeType);
        $filename = $fileId . '.' . $extension;
        $filepath = $userDir . '/' . $filename;
        
        if (file_put_contents($filepath, $binaryData) === false) {
            $results[] = ['name' => $name, 'error' => 'Failed to save'];
            continue;
        }
        
        $metadata = [
            'id' => $fileId,
            'filename' => $filename,
            'originalName' => $name,
            'mimeType' => $mimeType,
            'size' => $size,
            'type' => $fileType,
            'assetId' => $assetId,
            'userId' => $user['id'],
            'uploadedAt' => date('c'),
        ];
        
        file_put_contents($userDir . '/' . $fileId . '.meta.json', json_encode($metadata, JSON_PRETTY_PRINT));
        
        $baseUrl = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http') 
            . '://' . $_SERVER['HTTP_HOST'] 
            . dirname($_SERVER['SCRIPT_NAME']);
        
        $results[] = [
            'id' => $fileId,
            'name' => $name,
            'url' => $baseUrl . '/files.php?action=download&id=' . $fileId,
            'type' => $fileType,
            'mimeType' => $mimeType,
            'size' => $size,
            'success' => true,
        ];
    }
    
    success_response([
        'message' => 'Bulk upload complete',
        'files' => $results,
    ]);
}

bad_request('Action not allowed', 405);
