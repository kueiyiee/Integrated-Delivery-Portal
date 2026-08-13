<?php
// One-off script to create a temporary personal access token for local testing.
require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;

$user = User::whereNotNull('company_id')->first() ?? User::first();
if (! $user) {
    echo "NO_USER\n";
    exit(1);
}

$token = $user->createToken('dev-smoke-token')->plainTextToken;
echo $token . "\n";
