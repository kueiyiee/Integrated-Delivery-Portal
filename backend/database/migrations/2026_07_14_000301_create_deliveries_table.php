<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class() extends Migration {
    public function up(): void
    {
        if (Schema::hasTable('deliveries')) {
            return;
        }

        Schema::create('deliveries', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('company_id')->nullable()->index();
            $table->char('uuid', 36)->unique();
            $table->string('tracking_number')->unique();
            $table->string('external_reference')->nullable();
            $table->string('status')->default('pending')->index();
            $table->timestamps();

            $table->foreign('company_id')->references('id')->on('companies')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('deliveries');
    }
};
