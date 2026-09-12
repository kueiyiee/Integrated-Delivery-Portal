<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return response()->view('welcome');
});

Route::get('/verify-email', function () {
    return redirect()->to(config('app.frontend_url', config('app.url', 'http://localhost:5173')) . '/verify-email');
})->name('frontend.verify-email');

Route::get('/reset-password', function (Request $request) {
    $frontendUrl = rtrim(config('app.frontend_url', config('app.url', 'http://localhost:5173')), '/');
    $query = $request->getQueryString();
    $redirectUrl = $frontendUrl . '/reset-password' . ($query ? '?' . $query : '');

    return redirect()->to($redirectUrl);
})->name('frontend.reset-password');
