<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('drivers', function (Blueprint $table): void {
            if (! Schema::hasColumn('drivers', 'email')) {
                $table->string('email')->nullable()->after('name');
            }
            if (! Schema::hasColumn('drivers', 'phone')) {
                $table->string('phone')->nullable()->after('email');
            }
            if (! Schema::hasColumn('drivers', 'vehicle_number')) {
                $table->string('vehicle_number')->nullable()->after('vehicle_type');
            }
            if (! Schema::hasColumn('drivers', 'notes')) {
                $table->text('notes')->nullable()->after('license_number');
            }
            if (! Schema::hasColumn('drivers', 'last_seen_at')) {
                $table->timestamp('last_seen_at')->nullable()->after('updated_at');
            }
            if (! Schema::hasColumn('drivers', 'deleted_at')) {
                $table->softDeletes()->after('updated_at');
            }
        });

        Schema::table('api_keys', function (Blueprint $table): void {
            if (! Schema::hasColumn('api_keys', 'description')) {
                $table->text('description')->nullable()->after('name');
            }
            if (! Schema::hasColumn('api_keys', 'permissions')) {
                $table->json('permissions')->nullable()->after('description');
            }
            if (! Schema::hasColumn('api_keys', 'last_used_at')) {
                $table->timestamp('last_used_at')->nullable()->after('expires_at');
            }
            if (! Schema::hasColumn('api_keys', 'last_used_ip')) {
                $table->string('last_used_ip')->nullable()->after('last_used_at');
            }
            if (! Schema::hasColumn('api_keys', 'revoked_at')) {
                $table->timestamp('revoked_at')->nullable()->after('last_used_ip');
            }
            if (! Schema::hasColumn('api_keys', 'deleted_at')) {
                $table->softDeletes()->after('updated_at');
            }
        });

        Schema::table('webhook_endpoints', function (Blueprint $table): void {
            if (! Schema::hasColumn('webhook_endpoints', 'description')) {
                $table->text('description')->nullable()->after('name');
            }
            if (! Schema::hasColumn('webhook_endpoints', 'http_method')) {
                $table->string('http_method')->default('POST')->after('target_url');
            }
            if (! Schema::hasColumn('webhook_endpoints', 'retry_count')) {
                $table->unsignedInteger('retry_count')->default(3)->after('http_method');
            }
            if (! Schema::hasColumn('webhook_endpoints', 'timeout_seconds')) {
                $table->unsignedInteger('timeout_seconds')->default(10)->after('retry_count');
            }
            if (! Schema::hasColumn('webhook_endpoints', 'last_delivery_at')) {
                $table->timestamp('last_delivery_at')->nullable()->after('updated_at');
            }
            if (! Schema::hasColumn('webhook_endpoints', 'last_status')) {
                $table->string('last_status')->nullable()->after('last_delivery_at');
            }
            if (! Schema::hasColumn('webhook_endpoints', 'last_error')) {
                $table->text('last_error')->nullable()->after('last_status');
            }
            if (! Schema::hasColumn('webhook_endpoints', 'deleted_at')) {
                $table->softDeletes()->after('updated_at');
            }
        });
    }

    public function down(): void
    {
        Schema::table('drivers', function (Blueprint $table): void {
            $table->dropSoftDeletes();
            $table->dropColumn(['email', 'phone', 'vehicle_number', 'notes', 'last_seen_at']);
        });

        Schema::table('api_keys', function (Blueprint $table): void {
            $table->dropSoftDeletes();
            $table->dropColumn(['description', 'permissions', 'last_used_at', 'last_used_ip', 'revoked_at']);
        });

        Schema::table('webhook_endpoints', function (Blueprint $table): void {
            $table->dropSoftDeletes();
            $table->dropColumn(['description', 'http_method', 'retry_count', 'timeout_seconds', 'last_delivery_at', 'last_status', 'last_error']);
        });
    }
};
