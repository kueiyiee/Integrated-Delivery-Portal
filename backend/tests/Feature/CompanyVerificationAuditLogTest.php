<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\Company;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class CompanyVerificationAuditLogTest extends TestCase
{
    public function test_system_admin_can_view_company_audit_logs_for_specific_company(): void
    {
        $company = Company::create([
            'uuid' => 'company-' . uniqid(),
            'name' => 'Northwind Logistics',
            'slug' => 'northwind-logistics-' . uniqid(),
            'status' => 'pending',
            'company_code' => 'NORTH-1001',
            'business_email' => 'northwind@example.com',
            'approval_status' => 'registration_submitted',
            'approval_stage' => 'registration_submitted',
            'subscription_status' => 'trial',
        ]);

        AuditLog::create([
            'user_id' => null,
            'company_id' => $company->id,
            'action' => 'company.verification.approved',
            'metadata' => ['status' => 'approved'],
        ]);

        $role = Role::firstOrCreate(
            ['name' => 'System Administrator'],
            ['description' => 'System administrator', 'is_system' => true]
        );

        $permission = Permission::firstOrCreate(
            ['name' => 'view.audit_logs'],
            ['description' => 'View audit logs']
        );

        $role->permissions()->syncWithoutDetaching($permission);

        $user = User::create([
            'company_id' => null,
            'uuid' => 'user-' . uniqid(),
            'name' => 'System Admin',
            'email' => 'audit-admin-' . uniqid() . '@example.com',
            'password' => Hash::make('Secret123!'),
            'status' => 'active',
            'email_verified_at' => now(),
            'approved_at' => now(),
            'is_system_owner' => true,
        ]);

        $user->roles()->syncWithoutDetaching($role);

        $response = $this->actingAs($user, 'sanctum')->getJson('/api/v1/admin/audit-logs?company_id=' . $company->id);

        $response->assertOk();
        $response->assertJsonCount(1, 'data');
        $this->assertSame($company->id, $response->json('data.0.company_id'));
    }
}
