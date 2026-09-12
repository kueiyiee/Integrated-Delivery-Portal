<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class() extends Migration {
    public function up(): void
    {
        if (Schema::hasTable('webhook_endpoints')) {
            return;
        }

        Schema::create('webhook_endpoints', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('company_id')->nullable()->index();
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('target_url');
            $table->string('http_method')->default('POST');
            $table->unsignedInteger('retry_count')->default(3);
            $table->unsignedInteger('timeout_seconds')->default(10);
            $table->string('secret_cipher', 1024)->nullable();
            $table->string('status')->default('active')->index();
            $table->json('events')->nullable();
            $table->timestamp('last_delivery_at')->nullable();
            $table->string('last_status')->nullable();
            $table->text('last_error')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->softDeletes();
            $table->timestamps();

            $table->foreign('company_id')->references('id')->on('companies')->onDelete('set null');
            $table->foreign('created_by')->references('id')->on('users')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('webhook_endpoints');
    }
};
