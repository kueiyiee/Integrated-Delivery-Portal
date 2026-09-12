<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('webhook_endpoint_logs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('webhook_endpoint_id')->index();
            $table->string('event');
            $table->longText('payload')->nullable();
            $table->unsignedSmallInteger('attempts')->default(0);
            $table->smallInteger('response_code')->nullable();
            $table->longText('response_body')->nullable();
            $table->string('status')->default('pending');
            $table->timestamp('delivered_at')->nullable();
            $table->timestamps();

            $table->foreign('webhook_endpoint_id')->references('id')->on('webhook_endpoints')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('webhook_endpoint_logs');
    }
};
