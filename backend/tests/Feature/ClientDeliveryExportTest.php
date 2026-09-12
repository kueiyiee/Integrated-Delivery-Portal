<?php

namespace Tests\Feature;

use App\Models\Company;
use App\Models\Delivery;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class ClientDeliveryExportTest extends TestCase
{
    use RefreshDatabase;

    public function test_client_can_download_own_delivery_document_as_pdf(): void
    {
        $company = Company::create([
            'uuid' => uniqid('co_'),
            'name' => 'Test Export Company',
            'slug' => 'export-company-' . uniqid(),
        ]);

        $user = User::create([
            'company_id' => $company->id,
            'name' => 'Export User',
            'email' => 'export+' . uniqid() . '@example.test',
            'password' => bcrypt('password'),
            'status' => 'active',
            'email_verified_at' => now(),
            'approved_at' => now(),
        ]);

        $role = Role::firstOrCreate(
            ['name' => 'Company Manager'],
            ['description' => 'Company manager', 'is_system' => false]
        );

        $permission = Permission::firstOrCreate(
            ['name' => 'client.access'],
            ['description' => 'Access client portal']
        );

        $role->permissions()->syncWithoutDetaching($permission->id);
        $user->assignRole($role);

        $delivery = Delivery::create([
            'company_id' => $company->id,
            'uuid' => uniqid('d_'),
            'tracking_number' => 'DPL-' . strtoupper(uniqid()),
            'status' => Delivery::STATUS_PENDING,
        ]);

        $response = $this->actingAs($user, 'sanctum')
            ->getJson("/api/v1/client/deliveries/{$delivery->id}/export?format=pdf");

        $response->assertStatus(200);
        $response->assertHeader('Content-Type', 'application/pdf');
        $contentDisposition = $response->headers->get('Content-Disposition') ?? '';
        $this->assertStringContainsString('.pdf', $contentDisposition);
        $this->assertStringContainsString(Str::slug($delivery->tracking_number, '-'), $contentDisposition);
    }

    public function test_client_cannot_export_delivery_belonging_to_other_company(): void
    {
        $companyA = Company::create([
            'uuid' => uniqid('co_'),
            'name' => 'Export Company A',
            'slug' => 'export-company-a-' . uniqid(),
        ]);

        $companyB = Company::create([
            'uuid' => uniqid('co_'),
            'name' => 'Export Company B',
            'slug' => 'export-company-b-' . uniqid(),
        ]);

        $userA = User::create([
            'company_id' => $companyA->id,
            'name' => 'Export User A',
            'email' => 'export-a+' . uniqid() . '@example.test',
            'password' => bcrypt('password'),
            'status' => 'active',
            'email_verified_at' => now(),
            'approved_at' => now(),
        ]);

        $role = Role::firstOrCreate(
            ['name' => 'Company Manager'],
            ['description' => 'Company manager', 'is_system' => false]
        );

        $permission = Permission::firstOrCreate(
            ['name' => 'client.access'],
            ['description' => 'Access client portal']
        );

        $role->permissions()->syncWithoutDetaching($permission->id);
        $userA->assignRole($role);

        $deliveryB = Delivery::create([
            'company_id' => $companyB->id,
            'uuid' => uniqid('d_'),
            'tracking_number' => 'DPL-' . strtoupper(uniqid()),
            'status' => Delivery::STATUS_PENDING,
        ]);

        $response = $this->actingAs($userA, 'sanctum')
            ->getJson("/api/v1/client/deliveries/{$deliveryB->id}/export?format=pdf");

        $this->assertTrue(in_array($response->status(), [403, 404], true), 'Expected forbidden or not found for cross-tenant export access');
    }
}
