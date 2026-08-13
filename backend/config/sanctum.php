<?php

return [
    'stateful' => explode(',', env('SANCTUM_STATEFUL_DOMAINS', 'localhost,127.0.0.1,localhost:5173')),
    'guard' => ['web'],
    'expiration' => env('SANCTUM_EXPIRATION', null),
    'middleware' => [
        'verify_csrf_token' => App\Middleware\VerifyCsrfToken::class,
        'encrypt_cookies' => Illuminate\Cookie\Middleware\EncryptCookies::class,
    ],
];
