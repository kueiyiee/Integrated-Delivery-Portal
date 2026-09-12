<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class() extends Migration {
    public function up(): void
    {
        if (! Schema::hasTable('deliveries')) {
            return;
        }

        Schema::table('deliveries', function (Blueprint $table): void {
            if (! Schema::hasColumn('deliveries', 'pickup_address')) {
                $table->json('pickup_address')->nullable()->after('status');
            }

            if (! Schema::hasColumn('deliveries', 'dropoff_address')) {
                $table->json('dropoff_address')->nullable()->after('pickup_address');
            }

            if (! Schema::hasColumn('deliveries', 'notes')) {
                $table->text('notes')->nullable()->after('dropoff_address');
            }

            if (! Schema::hasColumn('deliveries', 'scheduled_at')) {
                $table->timestamp('scheduled_at')->nullable()->after('notes');
            }

            if (! Schema::hasColumn('deliveries', 'status_history')) {
                $table->json('status_history')->nullable()->after('scheduled_at');
            }

            if (! Schema::hasColumn('deliveries', 'cancelled_at')) {
                $table->timestamp('cancelled_at')->nullable()->after('status_history');
            }

            if (! Schema::hasColumn('deliveries', 'cancel_reason')) {
                $table->string('cancel_reason')->nullable()->after('cancelled_at');
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('deliveries')) {
            return;
        }

        Schema::table('deliveries', function (Blueprint $table): void {
            if (Schema::hasColumn('deliveries', 'cancel_reason')) {
                $table->dropColumn('cancel_reason');
            }
            if (Schema::hasColumn('deliveries', 'cancelled_at')) {
                $table->dropColumn('cancelled_at');
            }
            if (Schema::hasColumn('deliveries', 'status_history')) {
                $table->dropColumn('status_history');
            }
            if (Schema::hasColumn('deliveries', 'scheduled_at')) {
                $table->dropColumn('scheduled_at');
            }
            if (Schema::hasColumn('deliveries', 'notes')) {
                $table->dropColumn('notes');
            }
            if (Schema::hasColumn('deliveries', 'dropoff_address')) {
                $table->dropColumn('dropoff_address');
            }
            if (Schema::hasColumn('deliveries', 'pickup_address')) {
                $table->dropColumn('pickup_address');
            }
        });
    }
};
