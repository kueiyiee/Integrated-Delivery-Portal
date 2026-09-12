<?php
$host = '127.0.0.1';
$db = 'delivery_portal';
$user = 'root';
$pass = '';
$pdo = new PDO("mysql:host=$host;dbname=$db;charset=utf8", $user, $pass, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
$stmt = $pdo->prepare("SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? ORDER BY ORDINAL_POSITION");
$stmt->execute([$db, 'users']);
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
if (! $rows) {
    echo "No columns or table missing.\n";
    exit(1);
}
foreach ($rows as $r) {
    echo $r['COLUMN_NAME'] . '\t' . $r['COLUMN_TYPE'] . '\t' . $r['IS_NULLABLE'] . '\t' . ($r['COLUMN_DEFAULT'] ?? 'NULL') . "\n";
}
