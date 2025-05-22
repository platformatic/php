<?php
// Set the content type to JSON
header('Content-Type: application/json');

$data = [];
foreach ($_POST as $key => $value) {
  $data[$key] = $value;
}

// Output headers as JSON with pretty printing
echo json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
?>
