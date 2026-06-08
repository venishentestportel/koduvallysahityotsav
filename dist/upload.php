<?php
// Secure PHP receiver for static results.json (Hostinger Shared Host Deployment)
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Define your secure access key (Change this to a strong secret token!)
$SECRET_ACCESS_KEY = "SAHITYOTSAV_SECRET_2026";

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["error" => "Method not allowed"]);
    exit;
}

// Extract Authorization Header
$headers = getallheaders();
$auth_header = isset($headers['Authorization']) ? $headers['Authorization'] : '';

if (empty($auth_header) && isset($_SERVER['HTTP_AUTHORIZATION'])) {
    $auth_header = $_SERVER['HTTP_AUTHORIZATION'];
}

if ($auth_header !== "Bearer " . $SECRET_ACCESS_KEY) {
    http_response_code(401);
    echo json_encode(["error" => "Unauthorized: Invalid or missing API key."]);
    exit;
}

// Read incoming JSON content
$input = file_get_contents('php://input');
$json = json_decode($input);

if (!$json) {
    http_response_code(400);
    echo json_encode(["error" => "Invalid JSON payload."]);
    exit;
}

// Write the JSON cache directly to results.json
$file_path = __DIR__ . '/results.json';
if (file_put_contents($file_path, $input) !== false) {
    echo json_encode([
        "success" => true,
        "message" => "results.json successfully updated."
    ]);
} else {
    http_response_code(500);
    echo json_encode(["error" => "Failed to write results.json file on server. Check folder permissions."]);
}
?>
