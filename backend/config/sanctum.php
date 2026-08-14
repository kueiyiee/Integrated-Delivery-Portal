<?php

return [
    'stateful' => array_values(array_filter(array_map('trim', explode(',', env('SANCTUM_STATEFUL_DOMAINS', ''))))),
    'guard' => ['web'],
    'expiration' => env('SANCTUM_EXPIRATION', null),
    'middleware' => [
        'verify_csrf_token' => App\Middleware\VerifyCsrfToken::class,
        'encrypt_cookies' => Illuminate\Cookie\Middleware\EncryptCookies::class,
    ],
];
