<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('api_key_logs')) {
            Schema::create('api_key_logs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('api_key_id')->nullable()->index();
            $table->unsignedBigInteger('company_id')->nullable()->index();
            $table->string('endpoint');
            $table->string('method', 16);
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->smallInteger('response_status')->nullable();
            $table->float('request_time')->nullable();
            $table->timestamps();

            $table->foreign('api_key_id')->references('id')->on('api_keys')->onDelete('set null');
            $table->foreign('company_id')->references('id')->on('companies')->onDelete('set null');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('api_key_logs');
    }
};
