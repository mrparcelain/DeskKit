<?php
// Load the API key. Copy key.env.example to key.env and put your key in it.
$env = is_readable('./key.env') ? parse_ini_file('./key.env') : [];
$expectedKey = $env['API_KEY'] ?? '';

if ($expectedKey === '') {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'API key not configured']);
    exit;
}

// Get all headers (case-insensitive)
$headers = getallheaders();

$authHeader = null;
foreach ($headers as $key => $value) {
    if (strtolower($key) === 'authorization') {
        $authHeader = $value;
        break;
    }
}

// Workarounds if Authorization header is missing
if (!$authHeader) {
    if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
        $authHeader = $_SERVER['HTTP_AUTHORIZATION'];
    } elseif (isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
        $authHeader = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
    }
}

header('Content-Type: application/json');

// Authorization check
if (!$authHeader || !hash_equals("Bearer " . $expectedKey, trim($authHeader))) {
    http_response_code(401);
    echo json_encode(["error" => "Unauthorized"]);
    exit;
}

// Only accept POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Invalid request method. Only POST allowed.']);
    exit;
}

// Parse JSON input
$data = json_decode(file_get_contents('php://input'), true);

if (!isset($data['url']) || empty($data['url'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing or invalid "url" in request body.']);
    exit;
}

$url = $data['url'];

// Check for "missingcoverart.png" and skip deletion if matched
if (stripos($url, 'missingcoverart.png') !== false) {
    echo json_encode(['success' => true, 'message' => 'Cannot delete missingcoverart.png image.']);
    exit;
}

// Extract path part from URL
$path = parse_url($url, PHP_URL_PATH);
if ($path === null) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid URL format.']);
    exit;
}

// Normalize slashes
$path = str_replace('\\', '/', $path);

// Adjust this prefix to your uploads directory path in URL
$expectedPrefix = '/api/uploads/';

if (stripos($path, $expectedPrefix) !== 0) {
    http_response_code(403);
    echo json_encode([
        'error' => 'Unauthorized file path.',
        'debug' => [
            'url' => $url,
            'normalizedPath' => $path,
            'expectedPrefix' => $expectedPrefix
        ]
    ]);
    exit;
}

// Convert URL path to local file path
$relativePath = ltrim($path, '/');
$fullPath = $_SERVER['DOCUMENT_ROOT'] . '/' . $relativePath;

// Check file exists
if (!file_exists($fullPath) || !is_file($fullPath)) {
    http_response_code(404);
    echo json_encode(['error' => 'File does not exist.']);
    exit;
}

// Attempt to delete
if (unlink($fullPath)) {
    echo json_encode(['success' => true, 'message' => 'File deleted.']);
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Could not delete file.']);
}