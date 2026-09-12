<?php

return [
    'defaults' => [
        'guard' => 'web',
        'passwords' => 'users',
    ],

    'guards' => [
        'web' => [
            'driver' => 'session',
            'provider' => 'users',
        ],

        'api' => [
            'driver' => 'sanctum',
            'provider' => 'users',
        ],
    ],

    'providers' => [
        'users' => [
            'driver' => 'eloquent',
            'model' => App\Models\User::class,
        ],
    ],

    'passwords' => [
        'users' => [
            'provider' => 'users',
            'table' => 'password_resets',
            'expire' => 60,
            'throttle' => 60,
        ],
    ],
    'password_rotation_days' => env('PASSWORD_ROTATION_DAYS', 90),
    'verification' => [
        'expire' => (int) env('VERIFICATION_EXPIRE_MINUTES', 1440),
        'resend_limit' => (int) env('VERIFICATION_RESEND_LIMIT', 6),
        'resend_decay' => (int) env('VERIFICATION_RESEND_DECAY_SECONDS', 3600),
    ],
    'lockout' => [
        'failed_attempts' => (int) env('LOCKOUT_FAILED_ATTEMPTS', 5),
        'lock_minutes' => (int) env('LOCKOUT_MINUTES', 15),
    ],
];
