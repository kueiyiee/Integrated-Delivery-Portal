<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'mfa_secret')) {
                $table->string('mfa_secret')->nullable()->after('webauthn_credentials');
            }

            if (!Schema::hasColumn('users', 'recovery_codes')) {
                $table->json('recovery_codes')->nullable()->after('mfa_secret');
            }
        });

        Schema::create('mfa_challenges', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('user_id')->index();
            $table->string('token', 64)->unique();
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();

            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mfa_challenges');

        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'mfa_secret')) {
                $table->dropColumn('mfa_secret');
            }

            if (Schema::hasColumn('users', 'recovery_codes')) {
                $table->dropColumn('recovery_codes');
            }
        });
    }
};
