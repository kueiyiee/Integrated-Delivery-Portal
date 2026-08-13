<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class() extends Migration {
    public function up(): void
    {
        if (Schema::hasTable('drivers') && ! Schema::hasColumn('drivers', 'status')) {
            Schema::table('drivers', function (Blueprint $table) {
                $table->string('status')->default('active')->index()->after('notes');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('drivers') && Schema::hasColumn('drivers', 'status')) {
            Schema::table('drivers', function (Blueprint $table) {
                $table->dropColumn('status');
            });
        }
    }
};
