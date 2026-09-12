<?php

$host = '127.0.0.1';
$db = 'delivery_portal';
$user = 'root';
$pass = '';
$email = 'systemadmin@d.com';
$password = 'Adminsite@21';

try {
    $pdo = new PDO("mysql:host=$host;port=3306;dbname=$db;charset=utf8", $user, $pass, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
    $stmt = $pdo->prepare('SELECT id FROM users WHERE email = ?');
    $stmt->execute([$email]);
    if ($stmt->fetch()) {
        echo "EXISTS\n";
        exit(0);
    }

    $hash = password_hash($password, PASSWORD_BCRYPT);
    $uuid = bin2hex(random_bytes(18));
    $now = date('Y-m-d H:i:s');

    $stmt = $pdo->prepare('INSERT INTO users (company_id, uuid, name, email, password, status, is_system_owner, email_verified_at, approved_at, failed_login_attempts, locked_until, mfa_enabled, created_at, updated_at) VALUES (NULL, ?, ?, ?, ?, ?, 1, ?, ?, 0, NULL, 0, ?, ?)');
    $stmt->execute([$uuid, 'System Administrator', $email, $hash, 'active', $now, $now, $now, $now]);

    echo "CREATED\n";
    exit(0);
} catch (Throwable $e) {
    echo 'ERROR: ' . $e->getMessage() . "\n";
    exit(1);
}
