<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class HealthCheck extends Command
{
    protected $signature = 'app:health';
    protected $description = 'Output application health status.';

    public function handle(): int
    {
        $this->info('Delivery Portal backend is healthy.');

        return self::SUCCESS;
    }
}
