<?php
$host = '127.0.0.1';
$port = 3306;
$db = 'delivery_portal';
$user = 'root';
$pass = '';
$schemaFile = __DIR__ . '/../database/schema/mysql-schema.sql';

if (! file_exists($schemaFile)) {
    echo "Schema file not found: $schemaFile\n";
    exit(1);
}

$sql = file_get_contents($schemaFile);
if ($sql === false) {
    echo "Failed to read schema file\n";
    exit(1);
}

// Normalize line endings
$sql = str_replace(["\r\n", "\r"], "\n", $sql);
// Remove /*!...*/ comment wrappers but keep their inner content if needed, however we'll just remove SET SQL_NOTES lines
$sql = preg_replace('/\/\*!\d+\s+SET\s+@?OLD_SQL_NOTES.*?\*\//s', '', $sql);

$statements = preg_split('/;\n/', $sql);

$pdo = new PDO("mysql:host=$host;port=$port;dbname=$db", $user, $pass, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
$errors = 0;
$executed = 0;
foreach ($statements as $idx => $stmt) {
    $stmt = trim($stmt);
    if ($stmt === '') continue;
    try {
        $pdo->exec($stmt);
        $executed++;
    } catch (Throwable $e) {
        $errors++;
        echo "Statement #$idx failed: " . $e->getMessage() . "\n";
        // continue
    }
}

echo "Executed: $executed, Errors: $errors\n";
if ($errors > 0) exit(1);
exit(0);
