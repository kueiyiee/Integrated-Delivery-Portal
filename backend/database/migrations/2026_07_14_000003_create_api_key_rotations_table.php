<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('api_key_rotations', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('api_key_id')->index();
            $table->string('old_key_id')->nullable();
            $table->string('new_key_id')->nullable();
            $table->string('rotation_reason')->nullable();
            $table->unsignedBigInteger('rotated_by')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('api_key_rotations');
    }
};
