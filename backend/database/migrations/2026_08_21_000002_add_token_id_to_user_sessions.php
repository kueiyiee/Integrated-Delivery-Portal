<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('user_sessions') && ! Schema::hasColumn('user_sessions', 'token_id')) {
            Schema::table('user_sessions', function (Blueprint $table): void {
                $table->unsignedBigInteger('token_id')->nullable()->after('user_id')->index();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('user_sessions') && Schema::hasColumn('user_sessions', 'token_id')) {
            Schema::table('user_sessions', function (Blueprint $table): void {
                $table->dropColumn('token_id');
            });
        }
    }
};
