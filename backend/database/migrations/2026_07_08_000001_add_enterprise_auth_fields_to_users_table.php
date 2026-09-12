<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'email_verified_at')) {
                $table->timestamp('email_verified_at')->nullable()->after('password');
            }

            if (!Schema::hasColumn('users', 'remember_token')) {
                $table->string('remember_token', 100)->nullable()->after('email_verified_at');
            }

            if (!Schema::hasColumn('users', 'approved_at')) {
                $table->timestamp('approved_at')->nullable()->after('email_verified_at');
            }

            if (!Schema::hasColumn('users', 'approved_by')) {
                $table->unsignedBigInteger('approved_by')->nullable()->after('approved_at');
            }

            if (!Schema::hasColumn('users', 'approval_notes')) {
                $table->text('approval_notes')->nullable()->after('approved_by');
            }

            if (!Schema::hasColumn('users', 'last_password_changed_at')) {
                $table->timestamp('last_password_changed_at')->nullable()->after('approval_notes');
            }

            if (!Schema::hasColumn('users', 'failed_login_attempts')) {
                $table->unsignedInteger('failed_login_attempts')->default(0)->after('last_password_changed_at');
            }

            if (!Schema::hasColumn('users', 'locked_until')) {
                $table->timestamp('locked_until')->nullable()->after('failed_login_attempts');
            }

            if (!Schema::hasColumn('users', 'mfa_enabled')) {
                $table->boolean('mfa_enabled')->default(false)->after('locked_until');
            }

            if (!Schema::hasColumn('users', 'webauthn_credentials')) {
                $table->json('webauthn_credentials')->nullable()->after('mfa_enabled');
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $columns = [
                'email_verified_at',
                'remember_token',
                'approved_at',
                'approved_by',
                'approval_notes',
                'last_password_changed_at',
                'failed_login_attempts',
                'locked_until',
                'mfa_enabled',
                'webauthn_credentials',
            ];

            foreach ($columns as $col) {
                if (Schema::hasColumn('users', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
