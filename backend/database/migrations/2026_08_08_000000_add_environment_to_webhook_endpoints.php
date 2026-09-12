<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class() extends Migration {
    public function up(): void
    {
        if (! Schema::hasTable('webhook_endpoints')) {
            return;
        }

        Schema::table('webhook_endpoints', function (Blueprint $table) {
            if (! Schema::hasColumn('webhook_endpoints', 'environment')) {
                $table->string('environment')->default('production')->nullable()->after('target_url');
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('webhook_endpoints')) {
            return;
        }

        Schema::table('webhook_endpoints', function (Blueprint $table) {
            if (Schema::hasColumn('webhook_endpoints', 'environment')) {
                $table->dropColumn('environment');
            }
        });
    }
};
