<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('api_keys')) {
            Schema::table('api_keys', function (Blueprint $table): void {
                if (! Schema::hasColumn('api_keys', 'description')) {
                    $table->text('description')->nullable()->after('name');
                }
                if (! Schema::hasColumn('api_keys', 'public_key')) {
                    $table->string('public_key')->unique()->after('description');
                }
                if (! Schema::hasColumn('api_keys', 'key_prefix')) {
                    $table->string('key_prefix', 32)->nullable()->index()->after('public_key');
                }
                if (! Schema::hasColumn('api_keys', 'secret_hash')) {
                    $table->string('secret_hash')->nullable()->after('key_prefix');
                }
                if (! Schema::hasColumn('api_keys', 'environment')) {
                    $table->string('environment', 16)->default('production')->after('secret_hash');
                }
                if (! Schema::hasColumn('api_keys', 'permissions')) {
                    $table->json('permissions')->nullable()->after('description');
                }
                if (! Schema::hasColumn('api_keys', 'last_used_at')) {
                    $table->timestamp('last_used_at')->nullable()->after('permissions');
                }
                if (! Schema::hasColumn('api_keys', 'status')) {
                    $table->string('status')->default('active')->index()->after('expires_at');
                }
                if (! Schema::hasColumn('api_keys', 'created_by')) {
                    $table->unsignedBigInteger('created_by')->nullable()->after('status');
                }
                if (! Schema::hasColumn('api_keys', 'revoked_at')) {
                    $table->timestamp('revoked_at')->nullable()->after('created_by');
                }
                if (! Schema::hasColumn('api_keys', 'deleted_at')) {
                    $table->softDeletes()->after('updated_at');
                }
            });
        }

        if (Schema::hasTable('webhook_endpoints')) {
            Schema::table('webhook_endpoints', function (Blueprint $table): void {
                if (! Schema::hasColumn('webhook_endpoints', 'description')) {
                    $table->text('description')->nullable()->after('name');
                }
                if (! Schema::hasColumn('webhook_endpoints', 'status')) {
                    $table->string('status')->default('active')->index()->after('target_url');
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
                if (! Schema::hasColumn('webhook_endpoints', 'secret_cipher')) {
                    $table->string('secret_cipher', 1024)->nullable()->after('secret');
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
                if (! Schema::hasColumn('webhook_endpoints', 'created_by')) {
                    $table->unsignedBigInteger('created_by')->nullable()->after('status');
                }
                if (! Schema::hasColumn('webhook_endpoints', 'deleted_at')) {
                    $table->softDeletes()->after('updated_at');
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('api_keys')) {
            Schema::table('api_keys', function (Blueprint $table): void {
                if (Schema::hasColumn('api_keys', 'description')) {
                    $table->dropColumn('description');
                }
                if (Schema::hasColumn('api_keys', 'public_key')) {
                    $table->dropColumn('public_key');
                }
                if (Schema::hasColumn('api_keys', 'key_prefix')) {
                    $table->dropColumn('key_prefix');
                }
                if (Schema::hasColumn('api_keys', 'secret_hash')) {
                    $table->dropColumn('secret_hash');
                }
                if (Schema::hasColumn('api_keys', 'environment')) {
                    $table->dropColumn('environment');
                }
                if (Schema::hasColumn('api_keys', 'permissions')) {
                    $table->dropColumn('permissions');
                }
                if (Schema::hasColumn('api_keys', 'last_used_at')) {
                    $table->dropColumn('last_used_at');
                }
                if (Schema::hasColumn('api_keys', 'status')) {
                    $table->dropColumn('status');
                }
                if (Schema::hasColumn('api_keys', 'created_by')) {
                    $table->dropColumn('created_by');
                }
                if (Schema::hasColumn('api_keys', 'revoked_at')) {
                    $table->dropColumn('revoked_at');
                }
                if (Schema::hasColumn('api_keys', 'deleted_at')) {
                    $table->dropSoftDeletes();
                }
            });
        }

        if (Schema::hasTable('webhook_endpoints')) {
            Schema::table('webhook_endpoints', function (Blueprint $table): void {
                if (Schema::hasColumn('webhook_endpoints', 'description')) {
                    $table->dropColumn('description');
                }
                if (Schema::hasColumn('webhook_endpoints', 'status')) {
                    $table->dropColumn('status');
                }
                if (Schema::hasColumn('webhook_endpoints', 'http_method')) {
                    $table->dropColumn('http_method');
                }
                if (Schema::hasColumn('webhook_endpoints', 'retry_count')) {
                    $table->dropColumn('retry_count');
                }
                if (Schema::hasColumn('webhook_endpoints', 'timeout_seconds')) {
                    $table->dropColumn('timeout_seconds');
                }
                if (Schema::hasColumn('webhook_endpoints', 'secret_cipher')) {
                    $table->dropColumn('secret_cipher');
                }
                if (Schema::hasColumn('webhook_endpoints', 'last_delivery_at')) {
                    $table->dropColumn('last_delivery_at');
                }
                if (Schema::hasColumn('webhook_endpoints', 'last_status')) {
                    $table->dropColumn('last_status');
                }
                if (Schema::hasColumn('webhook_endpoints', 'last_error')) {
                    $table->dropColumn('last_error');
                }
                if (Schema::hasColumn('webhook_endpoints', 'created_by')) {
                    $table->dropColumn('created_by');
                }
                if (Schema::hasColumn('webhook_endpoints', 'deleted_at')) {
                    $table->dropSoftDeletes();
                }
            });
        }
    }
};
