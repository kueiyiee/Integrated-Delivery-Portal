<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('users')) {
            return;
        }

        Schema::table('users', function (Blueprint $table): void {
            if (! Schema::hasColumn('users', 'is_system_owner')) {
                return;
            }

            if (! Schema::hasIndex('users', 'users_is_system_owner_index')) {
                $table->index('is_system_owner', 'users_is_system_owner_index');
            }

            if (! Schema::hasIndex('users', 'users_status_index')) {
                $table->index('status');
            }
        });

        if (Schema::hasColumn('users', 'email')) {
            try {
                DB::statement('ALTER TABLE users ADD CONSTRAINT users_system_owner_email_unique UNIQUE (email)');
            } catch (Throwable $e) {
                // Ignore duplicate/unsupported errors during migration replay.
            }
        }
    }

    public function down(): void
    {
        if (! Schema::hasTable('users')) {
            return;
        }

        try {
            DB::statement('ALTER TABLE users DROP INDEX users_is_system_owner_index');
        } catch (Throwable $e) {
            // Ignore missing index.
        }

        try {
            DB::statement('ALTER TABLE users DROP INDEX users_status_index');
        } catch (Throwable $e) {
            // Ignore missing index.
        }

        try {
            DB::statement('ALTER TABLE users DROP INDEX users_system_owner_email_unique');
        } catch (Throwable $e) {
            // Ignore missing constraint.
        }
    }
};
