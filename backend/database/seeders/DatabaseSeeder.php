<?php

namespace Database\Seeders;

use App\Models\ApiKey;
use App\Models\Company;
use App\Models\Delivery;
use App\Models\Driver;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use App\Models\WebhookEndpoint;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use OTPHP\TOTP;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call(SystemAdminSeeder::class);
        $this->call(CompanySeeder::class);

        // Remove legacy demo/admin seed accounts if they exist
        User::whereIn('email', ['admin@acme.com', 'superadmin@acme.com', 'demo@acme.com'])->delete();
    }
}