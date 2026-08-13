<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('companies') && ! Schema::hasColumn('companies', 'deletion_type')) {
            Schema::table('companies', function (Blueprint $table): void {
                $table->string('deletion_type')->nullable()->after('status')->index()->comment('auto_deleted|admin_deleted|user_deleted|null');
                $table->text('deletion_reason')->nullable()->after('deletion_type');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('companies') && Schema::hasColumn('companies', 'deletion_type')) {
            Schema::table('companies', function (Blueprint $table): void {
                $table->dropColumn(['deletion_reason', 'deletion_type']);
            });
        }
    }
};
