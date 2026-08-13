<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('webhook_logs')) {
            Schema::create('webhook_logs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('webhook_id')->nullable()->index();
            $table->string('event');
            $table->longText('payload')->nullable();
            $table->smallInteger('response_code')->nullable();
            $table->longText('response_body')->nullable();
            $table->unsignedSmallInteger('attempts')->default(0);
            $table->string('status')->default('pending');
            $table->timestamp('delivered_at')->nullable();
            $table->timestamps();

            $table->foreign('webhook_id')->references('id')->on('webhooks')->onDelete('cascade');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('webhook_logs');
    }
};
