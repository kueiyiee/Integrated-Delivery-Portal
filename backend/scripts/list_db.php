<?php
$host = '127.0.0.1';
$port = 3306;
$db = 'delivery_portal';
$user = 'root';
$pass = '';

try {
    $pdo = new PDO("mysql:host=$host;port=$port;dbname=$db", $user, $pass, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
    echo "Tables in $db:\n";
    foreach ($pdo->query("SHOW TABLES") as $row) {
        echo " - " . $row[0] . "\n";
    }

    echo "\nMigrations table rows:\n";
    $stmt = $pdo->query("SELECT migration, batch FROM migrations ORDER BY id");
    foreach ($stmt as $row) {
        echo " - {$row['migration']} (batch {$row['batch']})\n";
    }
} catch (Exception $e) {
    echo 'ERR: ' . $e->getMessage() . PHP_EOL;
}
