<?php
require __DIR__.'/../vendor/autoload.php';
$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\User;

$user = User::where('email', 'systemadmin@d.com')->first();
if (!$user) {
    echo "NO_USER\n";
    exit;
}

echo $user->email . "|" . $user->status . "|" . ($user->hasRole('System Administrator') ? 'yes' : 'no') . "\n";
