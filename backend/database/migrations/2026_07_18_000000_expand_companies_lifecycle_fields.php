<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('companies', function (Blueprint $table): void {
            if (! Schema::hasColumn('companies', 'company_code')) {
                $table->string('company_code')->nullable()->after('slug');
            }
            if (! Schema::hasColumn('companies', 'business_email')) {
                $table->string('business_email')->nullable()->after('company_code');
            }
            if (! Schema::hasColumn('companies', 'business_registration_number')) {
                $table->string('business_registration_number')->nullable()->after('business_email');
            }
            if (! Schema::hasColumn('companies', 'tax_number')) {
                $table->string('tax_number')->nullable()->after('business_registration_number');
            }
            if (! Schema::hasColumn('companies', 'industry')) {
                $table->string('industry')->nullable()->after('tax_number');
            }
            if (! Schema::hasColumn('companies', 'country')) {
                $table->string('country')->nullable()->after('industry');
            }
            if (! Schema::hasColumn('companies', 'region')) {
                $table->string('region')->nullable()->after('country');
            }
            if (! Schema::hasColumn('companies', 'approval_status')) {
                $table->string('approval_status')->nullable()->after('region');
            }
            if (! Schema::hasColumn('companies', 'approval_stage')) {
                $table->string('approval_stage')->nullable()->after('approval_status');
            }
            if (! Schema::hasColumn('companies', 'approval_reference')) {
                $table->string('approval_reference')->nullable()->after('approval_stage');
            }
            if (! Schema::hasColumn('companies', 'risk_level')) {
                $table->string('risk_level')->default('low')->after('approval_reference');
            }
            if (! Schema::hasColumn('companies', 'risk_score')) {
                $table->unsignedInteger('risk_score')->default(0)->after('risk_level');
            }
            if (! Schema::hasColumn('companies', 'subscription_status')) {
                $table->string('subscription_status')->default('trial')->after('risk_score');
            }
            if (! Schema::hasColumn('companies', 'email_verified_at')) {
                $table->timestamp('email_verified_at')->nullable()->after('subscription_status');
            }
            if (! Schema::hasColumn('companies', 'verification_token')) {
                $table->string('verification_token')->nullable()->after('email_verified_at');
            }
            if (! Schema::hasColumn('companies', 'verification_token_expiry')) {
                $table->timestamp('verification_token_expiry')->nullable()->after('verification_token');
            }
            if (! Schema::hasColumn('companies', 'verification_attempts')) {
                $table->unsignedInteger('verification_attempts')->default(0)->after('verification_token_expiry');
            }
            if (! Schema::hasColumn('companies', 'last_verification_request')) {
                $table->timestamp('last_verification_request')->nullable()->after('verification_attempts');
            }
            if (! Schema::hasColumn('companies', 'verification_ip')) {
                $table->string('verification_ip')->nullable()->after('last_verification_request');
            }
            if (! Schema::hasColumn('companies', 'verification_device')) {
                $table->string('verification_device')->nullable()->after('verification_ip');
            }
            if (! Schema::hasColumn('companies', 'verification_browser')) {
                $table->string('verification_browser')->nullable()->after('verification_device');
            }
            if (! Schema::hasColumn('companies', 'verification_history')) {
                $table->json('verification_history')->nullable()->after('verification_browser');
            }
            if (! Schema::hasColumn('companies', 'review_started_at')) {
                $table->timestamp('review_started_at')->nullable()->after('verification_history');
            }
            if (! Schema::hasColumn('companies', 'approved_at')) {
                $table->timestamp('approved_at')->nullable()->after('review_started_at');
            }
            if (! Schema::hasColumn('companies', 'approved_by')) {
                $table->unsignedBigInteger('approved_by')->nullable()->after('approved_at');
            }
            if (! Schema::hasColumn('companies', 'suspended_at')) {
                $table->timestamp('suspended_at')->nullable()->after('approved_by');
            }
            if (! Schema::hasColumn('companies', 'archived_at')) {
                $table->timestamp('archived_at')->nullable()->after('suspended_at');
            }
            if (! Schema::hasColumn('companies', 'last_activity_at')) {
                $table->timestamp('last_activity_at')->nullable()->after('archived_at');
            }
        });
    }

    public function down(): void
    {
        Schema::table('companies', function (Blueprint $table): void {
            $table->dropColumn([
                'company_code',
                'business_email',
                'business_registration_number',
                'tax_number',
                'industry',
                'country',
                'region',
                'approval_status',
                'approval_stage',
                'approval_reference',
                'risk_level',
                'risk_score',
                'subscription_status',
                'email_verified_at',
                'verification_token',
                'verification_token_expiry',
                'verification_attempts',
                'last_verification_request',
                'verification_ip',
                'verification_device',
                'verification_browser',
                'verification_history',
                'review_started_at',
                'approved_at',
                'approved_by',
                'suspended_at',
                'archived_at',
                'last_activity_at',
            ]);
        });
    }
};
