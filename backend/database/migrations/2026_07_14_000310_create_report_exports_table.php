<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class() extends Migration {
    public function up(): void
    {
        if (Schema::hasTable('report_exports')) {
            return;
        }

        Schema::create('report_exports', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->string('report_id')->unique();
            $table->string('reference_number')->unique();
            $table->string('verification_id')->unique();
            $table->string('verification_token_hash')->index();
            $table->string('document_version')->default('1.0');
            $table->string('report_title');
            $table->string('report_category');
            $table->string('export_format', 16);
            $table->unsignedBigInteger('generated_by')->nullable();
            $table->string('generated_by_role')->nullable();
            $table->unsignedBigInteger('company_id')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->json('applied_filters')->nullable();
            $table->unsignedInteger('record_count')->default(0);
            $table->string('checksum', 128);
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();

            $table->foreign('generated_by')->references('id')->on('users')->onDelete('set null');
            $table->foreign('company_id')->references('id')->on('companies')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('report_exports');
    }
};
