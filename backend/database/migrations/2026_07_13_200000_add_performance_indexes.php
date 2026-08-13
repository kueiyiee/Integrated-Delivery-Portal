<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            if (Schema::hasColumn('users', 'status') && ! Schema::hasIndex('users', 'users_status_index')) {
                $table->index('status', 'users_status_index');
            }
        });

        Schema::table('companies', function (Blueprint $table): void {
            if (Schema::hasColumn('companies', 'status') && ! Schema::hasIndex('companies', 'companies_status_index')) {
                $table->index('status', 'companies_status_index');
            }
        });

        Schema::table('deliveries', function (Blueprint $table): void {
            if (Schema::hasColumn('deliveries', 'status') && ! Schema::hasIndex('deliveries', 'deliveries_status_index')) {
                $table->index('status', 'deliveries_status_index');
            }
        });

        Schema::table('api_keys', function (Blueprint $table): void {
            if (Schema::hasColumn('api_keys', 'status') && ! Schema::hasIndex('api_keys', 'api_keys_status_index')) {
                $table->index('status', 'api_keys_status_index');
            }
        });

        Schema::table('webhook_endpoints', function (Blueprint $table): void {
            if (Schema::hasColumn('webhook_endpoints', 'status') && ! Schema::hasIndex('webhook_endpoints', 'webhook_endpoints_status_index')) {
                $table->index('status', 'webhook_endpoints_status_index');
            }
        });

        Schema::table('drivers', function (Blueprint $table): void {
            if (Schema::hasColumn('drivers', 'status') && ! Schema::hasIndex('drivers', 'drivers_status_index')) {
                $table->index('status', 'drivers_status_index');
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            if (Schema::hasColumn('users', 'status') && Schema::hasIndex('users', 'users_status_index')) {
                $table->dropIndex('users_status_index');
            }
        });

        Schema::table('companies', function (Blueprint $table): void {
            if (Schema::hasColumn('companies', 'status') && Schema::hasIndex('companies', 'companies_status_index')) {
                $table->dropIndex('companies_status_index');
            }
        });

        Schema::table('deliveries', function (Blueprint $table): void {
            if (Schema::hasColumn('deliveries', 'status') && Schema::hasIndex('deliveries', 'deliveries_status_index')) {
                $table->dropIndex('deliveries_status_index');
            }
        });

        Schema::table('api_keys', function (Blueprint $table): void {
            if (Schema::hasColumn('api_keys', 'status') && Schema::hasIndex('api_keys', 'api_keys_status_index')) {
                $table->dropIndex('api_keys_status_index');
            }
        });

        Schema::table('webhook_endpoints', function (Blueprint $table): void {
            if (Schema::hasColumn('webhook_endpoints', 'status') && Schema::hasIndex('webhook_endpoints', 'webhook_endpoints_status_index')) {
                $table->dropIndex('webhook_endpoints_status_index');
            }
        });

        Schema::table('drivers', function (Blueprint $table): void {
            if (Schema::hasColumn('drivers', 'status') && Schema::hasIndex('drivers', 'drivers_status_index')) {
                $table->dropIndex('drivers_status_index');
            }
        });
    }
};
