<?php
// Load the API key. Copy key.env.example to key.env and put your key in it.
$env = is_readable('./key.env') ? parse_ini_file('./key.env') : [];
$expectedKey = $env['API_KEY'] ?? '';

// Refuse to run with an empty key (otherwise "Bearer " alone could pass)
if ($expectedKey === '') {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'API key not configured. Add API_KEY=your-secret to api/key.env']);
    exit;
}

// Get all headers
$headers = getallheaders();

// Find Authorization header (case-insensitive)
$authHeader = null;
foreach ($headers as $key => $value) {
    if (strtolower($key) === 'authorization') {
        $authHeader = $value;
        break;
    }
}

// Fallbacks if missing
if (!$authHeader) {
    if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
        $authHeader = $_SERVER['HTTP_AUTHORIZATION'];
    } elseif (isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
        $authHeader = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
    }
}

// Simple auth check (adjust as needed)
if (!$authHeader || !hash_equals('Bearer ' . $expectedKey, trim($authHeader))) {
    http_response_code(401);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Unauthorized - Missing or invalid Authorization header']);
    exit;
}

// Detect content type to decide image or JSON upload
$contentType = $_SERVER['CONTENT_TYPE'] ?? '';

if (stripos($contentType, 'multipart/form-data') !== false) {
    // === IMAGE UPLOAD ===

    // Configuration
    $uploadDir = __DIR__ . '/uploads/';
    $maxFileSize = 5 * 1024 * 1024; // 5MB max
    // MIME type => extension we save as (never trust the uploaded file name)
    $allowedMimeTypes = [
        'image/png'  => 'png',
        'image/jpeg' => 'jpg',
        'image/webp' => 'webp',
        'image/gif'  => 'gif',
    ];

    // Create upload directory if it doesn't exist
    if (!file_exists($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }

    // Check if file is uploaded
    if (!isset($_FILES['file'])) {
        http_response_code(400);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'No file uploaded']);
        exit;
    }

    $file = $_FILES['file'];

    // Check for upload errors
    if ($file['error'] !== UPLOAD_ERR_OK) {
        http_response_code(400);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Upload error code: ' . $file['error']]);
        exit;
    }

    // Validate file size
    if ($file['size'] > $maxFileSize) {
        http_response_code(400);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'File is too large. Max size is 5MB.']);
        exit;
    }

    // Validate MIME type
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mimeType = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);

    if (!isset($allowedMimeTypes[$mimeType])) {
        http_response_code(400);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Invalid file type. Only PNG, JPEG, WebP, and GIF allowed.']);
        exit;
    }

    // Generate a unique filename with original extension
    $ext = $allowedMimeTypes[$mimeType];
    $uniqueName = uniqid('img_', true) . '.' . $ext;

    // Move uploaded file to uploads folder
    $targetPath = $uploadDir . $uniqueName;
    if (!move_uploaded_file($file['tmp_name'], $targetPath)) {
        http_response_code(500);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Failed to save uploaded file.']);
        exit;
    }

    // Construct public URL for the uploaded file
    // (works on any domain or sub-folder, e.g. https://example.com/api/uploads/...)
    $isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
    $scheme = $isHttps ? 'https' : 'http';
    $apiPath = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'])), '/');
    $publicUrl = $scheme . '://' . $_SERVER['HTTP_HOST'] . $apiPath . '/uploads/' . $uniqueName;

    // Send JSON response with the URL
    header('Content-Type: application/json');
    echo json_encode(['url' => $publicUrl]);
    exit;

} elseif (stripos($contentType, 'application/json') !== false) {
    // === JSON UPLOAD ===

    // Read raw POST data
    $jsonData = file_get_contents('php://input');

    if (!$jsonData) {
        http_response_code(400);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'No JSON data received']);
        exit;
    }

    // Which file to write: ?target=music (default) or ?target=photos
    $target = $_GET['target'] ?? 'music';
    if (!in_array($target, ['music', 'photos'], true)) {
        http_response_code(400);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Unknown target. Use music or photos.']);
        exit;
    }

    if ($target === 'music') {
        // music.json: a list of artists (an empty list "[]" is valid)
        $decoded = json_decode($jsonData, true);
        if (json_last_error() !== JSON_ERROR_NONE || !is_array($decoded) || (count($decoded) > 0 && array_keys($decoded) !== range(0, count($decoded) - 1))) {
            http_response_code(400);
            header('Content-Type: application/json');
            echo json_encode(['error' => 'Invalid JSON: expected a list of artists']);
            exit;
        }

        foreach ($decoded as $i => $artist) {
            if (!is_array($artist) || !isset($artist['name']) || !is_string($artist['name']) || !isset($artist['albums']) || !is_array($artist['albums'])) {
                http_response_code(400);
                header('Content-Type: application/json');
                echo json_encode(['error' => "Artist #$i is missing a name or albums list"]);
                exit;
            }
        }
    } else {
        // photos.json: { "Library": { "2024": { "Album": ["photo url", ...] } } }
        // Decoded as objects (not arrays) so empty {} and year keys survive re-encoding.
        $decoded = json_decode($jsonData, false);
        if (json_last_error() !== JSON_ERROR_NONE || !is_object($decoded)) {
            http_response_code(400);
            header('Content-Type: application/json');
            echo json_encode(['error' => 'Invalid JSON: expected an object of photo libraries']);
            exit;
        }

        foreach ($decoded as $library => $years) {
            if (!is_object($years)) {
                http_response_code(400);
                header('Content-Type: application/json');
                echo json_encode(['error' => "Library \"$library\" should contain years"]);
                exit;
            }
            foreach ($years as $year => $albums) {
                if (!is_object($albums)) {
                    http_response_code(400);
                    header('Content-Type: application/json');
                    echo json_encode(['error' => "Library \"$library\", $year should contain albums"]);
                    exit;
                }
                foreach ($albums as $album => $photos) {
                    if (!is_array($photos) || count(array_filter($photos, 'is_string')) !== count($photos)) {
                        http_response_code(400);
                        header('Content-Type: application/json');
                        echo json_encode(['error' => "Album \"$album\" should be a list of photo links"]);
                        exit;
                    }
                }
            }
        }
    }

    // Each app keeps its data in its own folder: apps/music/music.json, apps/photos/photos.json
    $savePath = __DIR__ . "/../apps/$target/$target.json";

    // Keep the previous version as a backup, then write atomically
    if (file_exists($savePath)) {
        @copy($savePath, __DIR__ . "/../apps/$target/$target.backup.json");
    }
    $pretty = json_encode($decoded, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    $tmpPath = $savePath . '.tmp';

    if ($pretty === false || file_put_contents($tmpPath, $pretty, LOCK_EX) === false || !rename($tmpPath, $savePath)) {
        http_response_code(500);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Failed to save JSON']);
        exit;
    }

    // Success response
    header('Content-Type: application/json');
    echo json_encode(['success' => true, 'target' => $target]);
    exit;

} else {
    // Unsupported Content-Type
    http_response_code(415);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Unsupported Content-Type']);
    exit;
}
