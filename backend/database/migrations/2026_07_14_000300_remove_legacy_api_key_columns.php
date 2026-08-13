<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('api_keys', function (Blueprint $table): void {
            if (Schema::hasColumn('api_keys', 'key')) {
                $table->dropUnique(['key']);
                $table->dropColumn('key');
            }
            if (Schema::hasColumn('api_keys', 'secret_fingerprint')) {
                $table->dropColumn('secret_fingerprint');
            }
        });
    }

    public function down(): void
    {
        Schema::table('api_keys', function (Blueprint $table): void {
            if (! Schema::hasColumn('api_keys', 'key')) {
                $table->string('key')->unique()->after('key_prefix');
            }
            if (! Schema::hasColumn('api_keys', 'secret_fingerprint')) {
                $table->string('secret_fingerprint')->after('secret_hash');
            }
        });
    }
};
