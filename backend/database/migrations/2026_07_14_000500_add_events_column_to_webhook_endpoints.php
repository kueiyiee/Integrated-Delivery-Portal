<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('webhook_endpoints', function (Blueprint $table): void {
            if (! Schema::hasColumn('webhook_endpoints', 'events')) {
                $table->json('events')->nullable()->after('status');
            }
        });
    }

    public function down(): void
    {
        Schema::table('webhook_endpoints', function (Blueprint $table): void {
            if (Schema::hasColumn('webhook_endpoints', 'events')) {
                $table->dropColumn('events');
            }
        });
    }
};
