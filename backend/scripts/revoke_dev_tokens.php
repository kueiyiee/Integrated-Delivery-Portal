<?php
require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;

$count = 0;
foreach (User::with('tokens')->get() as $user) {
    $deleted = $user->tokens()->where('name', 'dev-smoke-token')->delete();
    $count += $deleted;
}

echo "revoked: {$count}\n";
