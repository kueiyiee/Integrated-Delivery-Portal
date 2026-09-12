<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('api_request_logs', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->uuid('request_id')->index();
            $table->unsignedBigInteger('api_key_id')->nullable()->index();
            $table->unsignedBigInteger('application_id')->nullable()->index();
            $table->unsignedBigInteger('company_id')->nullable()->index();
            $table->string('endpoint')->index();
            $table->string('method', 10)->index();
            $table->integer('status_code')->nullable()->index();
            $table->integer('response_time_ms')->nullable();
            $table->string('ip_address')->nullable()->index();
            $table->string('device')->nullable();
            $table->string('user_agent')->nullable();
            $table->json('request_headers')->nullable();
            $table->json('request_body')->nullable();
            $table->json('response_headers')->nullable();
            $table->json('response_body')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('api_request_logs');
    }
};
