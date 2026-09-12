<?php
$pdo = new PDO('mysql:host=127.0.0.1;port=3306;dbname=delivery_portal;charset=utf8', 'root', '', [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
$stmt = $pdo->prepare('SELECT password FROM users WHERE email = ?');
$stmt->execute(['systemadmin@d.com']);
$row = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$row) {
    echo "NO_ROW\n";
    exit;
}
echo $row['password'] . "\n";
