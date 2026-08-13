<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('developer_applications', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->uuid('uuid')->unique();
            $table->string('client_id')->unique()->nullable(false);
            $table->string('name');
            $table->text('description')->nullable();
            $table->unsignedBigInteger('company_id')->nullable()->index();
            $table->unsignedBigInteger('owner_id')->nullable()->index();
            $table->enum('environment', ['sandbox','production'])->default('sandbox');
            $table->json('redirect_urls')->nullable();
            $table->json('allowed_ips')->nullable();
            $table->string('contact_email')->nullable();
            $table->enum('status', ['pending','active','suspended','revoked'])->default('pending');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('developer_applications');
    }
};
