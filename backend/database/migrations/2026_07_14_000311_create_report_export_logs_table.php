<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class() extends Migration {
    public function up(): void
    {
        if (Schema::hasTable('report_export_logs')) {
            return;
        }

        Schema::create('report_export_logs', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('report_export_id')->index();
            $table->string('action');
            $table->unsignedBigInteger('user_id')->nullable()->index();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->foreign('report_export_id')->references('id')->on('report_exports')->onDelete('cascade');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('report_export_logs');
    }
};
