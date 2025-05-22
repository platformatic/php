<?php
// Set the content type to JSON
header('Content-Type: application/json');

$headers = [];
foreach ($_SERVER as $key => $value) {
  if (strpos($key, 'HTTP_') === 0) {
    $headers[$key] = $value;
  }
}

// Output headers as JSON with pretty printing
echo json_encode($headers, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
?>
