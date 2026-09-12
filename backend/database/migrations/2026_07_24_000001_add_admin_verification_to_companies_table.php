<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('companies', function (Blueprint $table): void {
            if (! Schema::hasColumn('companies', 'admin_verified_at')) {
                $table->timestamp('admin_verified_at')->nullable()->after('email_verified_at');
            }
            if (! Schema::hasColumn('companies', 'admin_verified_by')) {
                $table->unsignedBigInteger('admin_verified_by')->nullable()->after('admin_verified_at');
            }
            if (! Schema::hasColumn('companies', 'admin_verification_status')) {
                $table->string('admin_verification_status')->default('Pending')->after('admin_verified_by');
            }
            if (! Schema::hasColumn('companies', 'admin_verification_note')) {
                $table->text('admin_verification_note')->nullable()->after('admin_verification_status');
            }

            if (! Schema::hasColumn('companies', 'admin_verified_by')) {
                $table->foreign('admin_verified_by')->references('id')->on('users')->onDelete('set null');
            }
        });
    }

    public function down(): void
    {
        Schema::table('companies', function (Blueprint $table): void {
            if (Schema::hasColumn('companies', 'admin_verified_by')) {
                $table->dropForeign(['admin_verified_by']);
            }
            $table->dropColumn([
                'admin_verified_at',
                'admin_verified_by',
                'admin_verification_status',
                'admin_verification_note',
            ]);
        });
    }
};
