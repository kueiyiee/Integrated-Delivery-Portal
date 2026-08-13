<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('companies', function (Blueprint $table): void {
            if (! Schema::hasColumn('companies', 'phone')) {
                $table->string('phone', 32)->nullable()->after('business_email');
            }

            if (! Schema::hasColumn('companies', 'address')) {
                $table->text('address')->nullable()->after('phone');
            }

            if (! Schema::hasColumn('companies', 'about')) {
                $table->text('about')->nullable()->after('address');
            }

            if (! Schema::hasColumn('companies', 'business_hours')) {
                $table->json('business_hours')->nullable()->after('about');
            }

            if (! Schema::hasColumn('companies', 'social_links')) {
                $table->json('social_links')->nullable()->after('business_hours');
            }
        });
    }

    public function down(): void
    {
        Schema::table('companies', function (Blueprint $table): void {
            foreach (['phone', 'address', 'about', 'business_hours', 'social_links'] as $column) {
                if (Schema::hasColumn('companies', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
