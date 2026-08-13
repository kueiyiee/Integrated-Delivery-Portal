<?php

use Illuminate\Support\Facades\Artisan;

Artisan::command('app:health', function (): void {
    $this->info('Delivery Portal backend is healthy.');
})->purpose('Application health check');
