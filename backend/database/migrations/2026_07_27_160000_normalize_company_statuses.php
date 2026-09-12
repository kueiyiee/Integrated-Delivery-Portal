<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

class NormalizeCompanyStatuses extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('companies')) {
            return;
        }

        // If the admin_verification_status column exists, use it to identify unapproved companies.
        if (Schema::hasColumn('companies', 'email_verified_at')) {
            if (Schema::hasColumn('companies', 'admin_verification_status')) {
                DB::table('companies')
                    ->whereNotNull('email_verified_at')
                    ->where('admin_verification_status', '!=', 'Verified')
                    ->where('status', '!=', 'pending_approval')
                    ->update(['status' => 'pending_approval', 'updated_at' => now()]);
            } elseif (Schema::hasColumn('companies', 'approval_status')) {
                // Fallback: use approval_status semantics when admin_verification_status is not present.
                DB::table('companies')
                    ->whereNotNull('email_verified_at')
                    ->whereNotIn('approval_status', ['approved', 'email_verified', 'active'])
                    ->where('status', '!=', 'pending_approval')
                    ->update(['status' => 'pending_approval', 'updated_at' => now()]);
            } else {
                // Generic fallback: if email is verified but status is active, conservatively set to pending_approval
                DB::table('companies')
                    ->whereNotNull('email_verified_at')
                    ->where('status', 'active')
                    ->update(['status' => 'pending_approval', 'updated_at' => now()]);
            }
        }
    }

    public function down(): void
    {
        // irreversible: status normalization intended to be a one-way hardening step
    }
}
