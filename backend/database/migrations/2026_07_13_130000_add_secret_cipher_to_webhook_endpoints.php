<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('webhook_endpoints', function (Blueprint $table) {
            if (! Schema::hasColumn('webhook_endpoints', 'secret_cipher')) {
                $table->string('secret_cipher', 1024)->nullable()->after('timeout_seconds');
            }
        });
    }

    public function down(): void
    {
        Schema::table('webhook_endpoints', function (Blueprint $table) {
            if (Schema::hasColumn('webhook_endpoints', 'secret_cipher')) {
                $table->dropColumn('secret_cipher');
            }
        });
    }
};
