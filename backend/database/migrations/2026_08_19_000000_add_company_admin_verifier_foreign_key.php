<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('companies')
            || ! Schema::hasTable('users')
            || ! Schema::hasColumn('companies', 'admin_verified_by')) {
            return;
        }

        $database = DB::connection()->getDatabaseName();
        $foreignKeyExists = DB::table('information_schema.KEY_COLUMN_USAGE')
            ->where('CONSTRAINT_SCHEMA', $database)
            ->where('TABLE_NAME', 'companies')
            ->where('COLUMN_NAME', 'admin_verified_by')
            ->where('REFERENCED_TABLE_NAME', 'users')
            ->where('REFERENCED_COLUMN_NAME', 'id')
            ->exists();

        if (! $foreignKeyExists) {
            Schema::table('companies', function (Blueprint $table): void {
                $table->foreign('admin_verified_by')
                    ->references('id')
                    ->on('users')
                    ->nullOnDelete();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('companies') && Schema::hasColumn('companies', 'admin_verified_by')) {
            Schema::table('companies', function (Blueprint $table): void {
                $table->dropForeign(['admin_verified_by']);
            });
        }
    }
};
