<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('webhook_endpoints')) {
            return;
        }

        Schema::table('webhook_endpoints', function (Blueprint $table) {
            if (! Schema::hasColumn('webhook_endpoints', 'provider')) {
                $table->string('provider')->nullable()->after('company_id');
            }

            if (! Schema::hasIndex('webhook_endpoints', 'webhook_endpoints_provider_unique')) {
                $table->unique('provider', 'webhook_endpoints_provider_unique');
            }
        });

        if (! Schema::hasTable('webhook_events')) {
            Schema::create('webhook_events', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('webhook_endpoint_id');
                $table->string('provider')->nullable();
                $table->string('event_type');
                $table->string('event_id');
                $table->string('delivery_reference')->nullable();
                $table->json('payload')->nullable();
                $table->boolean('signature_valid')->default(false);
                $table->string('status')->default('received');
                $table->timestamp('received_at')->nullable();
                $table->timestamp('processed_at')->nullable();
                $table->text('error_message')->nullable();
                $table->unsignedInteger('attempts')->default(0);
                $table->integer('response_code')->nullable();
                $table->string('request_ip')->nullable();
                $table->timestamps();

                $table->unique(['webhook_endpoint_id', 'event_id'], 'webhook_endpoint_event_unique');
                $table->index(['webhook_endpoint_id', 'event_type']);
                $table->foreign('webhook_endpoint_id')->references('id')->on('webhook_endpoints')->onDelete('cascade');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('webhook_events')) {
            Schema::dropIfExists('webhook_events');
        }

        if (Schema::hasTable('webhook_endpoints')) {
            Schema::table('webhook_endpoints', function (Blueprint $table) {
                if (Schema::hasIndex('webhook_endpoints', 'webhook_endpoints_provider_unique')) {
                    $table->dropUnique('webhook_endpoints_provider_unique');
                }

                if (Schema::hasColumn('webhook_endpoints', 'provider')) {
                    $table->dropColumn('provider');
                }
            });
        }
    }
};
