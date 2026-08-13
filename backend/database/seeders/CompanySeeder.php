<?php

namespace Database\Seeders;

use App\Models\Company;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class CompanySeeder extends Seeder
{
    public function run(): void
    {
        if (Company::count() > 0) {
            return;
        }

        $managerRole = Role::firstOrCreate(
            ['name' => 'Company Manager'],
            ['description' => 'Manager for a tenant company']
        );

        $managerPermissions = [
            'client.access' => 'Access client features',
            'manage.deliveries' => 'Manage deliveries',
            'manage.customers' => 'Manage customers',
            'manage.drivers' => 'Manage drivers',
        ];

        foreach ($managerPermissions as $name => $description) {
            $permission = Permission::firstOrCreate(['name' => $name], ['description' => $description]);
            $managerRole->permissions()->syncWithoutDetaching($permission);
        }

        $companies = [
            [
                'name' => 'Acme Express Logistics',
                'slug' => 'acme-express-logistics',
                'business_email' => 'contact@acmeexpress.com',
                'phone' => '+1 (555) 234-5678',
                'address' => '100 Supply Chain Way, Suite 400, Chicago, IL 60607',
                'company_code' => 'ACME-8839',
                'business_registration_number' => 'BRN-ACME-2026-001',
                'status' => Company::STATUS_ACTIVE,
                'approval_status' => 'approved',
                'admin_verification_status' => 'Verified',
                'admin_verification_note' => 'Fully verified and operational enterprise delivery partner.',
                'email_verified_at' => now(),
                'admin_verified_at' => now(),
            ],
            [
                'name' => 'Swift Courier & Parcel Services',
                'slug' => 'swift-courier-parcel-services',
                'business_email' => 'admin@swiftcourier.io',
                'phone' => '+1 (555) 876-5432',
                'address' => '450 Freight Blvd, Atlanta, GA 30309',
                'company_code' => 'SWIFT-9402',
                'business_registration_number' => 'BRN-SWIFT-2026-002',
                'status' => Company::STATUS_ACTIVE,
                'approval_status' => 'pending_approval',
                'admin_verification_status' => 'Pending',
                'admin_verification_note' => 'Registration complete. Pending final compliance review by system admin.',
                'email_verified_at' => now(),
                'admin_verified_at' => null,
            ],
            [
                'name' => 'Apex Global Transport',
                'slug' => 'apex-global-transport',
                'business_email' => 'ops@apextransport.com',
                'phone' => '+1 (555) 345-6789',
                'address' => '88 Terminal Road, Dallas, TX 75201',
                'company_code' => 'APEX-1204',
                'business_registration_number' => 'BRN-APEX-2026-003',
                'status' => Company::STATUS_ACTIVE,
                'approval_status' => 'pending_approval',
                'admin_verification_status' => 'Pending',
                'admin_verification_note' => 'Awaiting administrator verification for API key generation privileges.',
                'email_verified_at' => now(),
                'admin_verified_at' => null,
            ],
            [
                'name' => 'Velocity Express Cargo',
                'slug' => 'velocity-express-cargo',
                'business_email' => 'info@velocityexpress.net',
                'phone' => '+1 (555) 901-2345',
                'address' => '12 Logistics Parkway, Seattle, WA 98101',
                'company_code' => 'VEL-7712',
                'business_registration_number' => 'BRN-VEL-2026-004',
                'status' => Company::STATUS_SUSPENDED,
                'approval_status' => 'pending_approval',
                'admin_verification_status' => 'Pending',
                'admin_verification_note' => 'Account temporarily suspended pending documentation update.',
                'email_verified_at' => now(),
                'admin_verified_at' => null,
            ],
        ];

        foreach ($companies as $data) {
            $company = Company::create($data);

            $user = User::create([
                'company_id' => $company->id,
                'uuid' => Str::uuid()->toString(),
                'name' => $company->name . ' Manager',
                'email' => $company->business_email,
                'password' => Hash::make('CompanyPassword123!'),
                'status' => 'active',
                'email_verified_at' => now(),
                'approved_at' => now(),
            ]);

            $user->roles()->syncWithoutDetaching($managerRole);
        }
    }
}
