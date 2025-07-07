<?php
// Set the content type to JSON
header('Content-Type: application/json');

// Get the raw POST data
$json_input = file_get_contents('php://input');

// Parse the JSON data
$data = json_decode($json_input, true);

// Check if JSON parsing was successful
if (json_last_error() !== JSON_ERROR_NONE) {
    // Handle JSON parsing error
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON: ' . json_last_error_msg()]);
    exit;
}

// Ensure $data is an array (in case of null or other types)
if (!is_array($data)) {
    $data = [];
}

// Output the parsed data as JSON with pretty printing
echo json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
?>
