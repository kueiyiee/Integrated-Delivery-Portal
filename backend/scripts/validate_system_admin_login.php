<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Services\Authentication\AuthenticationService;
use Illuminate\Support\Facades\Hash;

$email = 'systemadmin@d.com';
$password = 'Adminsite@21';

$service = app(AuthenticationService::class);
try {
    $result = $service->authenticate(['email' => $email, 'password' => $password]);
    echo "SUCCESS\n";
    echo json_encode(['token' => $result['token'], 'user' => $result['user']->only(['id','email','name','status'])], JSON_PRETTY_PRINT);
} catch (Throwable $e) {
    echo "FAILURE\n";
    echo $e->getMessage() . "\n";
    if ($e->getCode()) {
        echo 'Code: ' . $e->getCode() . "\n";
    }
}
