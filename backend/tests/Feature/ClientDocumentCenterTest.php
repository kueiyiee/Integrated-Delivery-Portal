<?php

namespace Tests\Feature;

use App\Models\Company;
use App\Models\Permission;
use App\Models\ReportExport;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ClientDocumentCenterTest extends TestCase
{
    use RefreshDatabase;

    public function test_client_can_list_and_download_their_company_documents(): void
    {
        $company = Company::create([
            'uuid' => uniqid('co_'),
            'name' => 'Document Center Company',
            'slug' => 'document-center-company-' . uniqid(),
        ]);

        $otherCompany = Company::create([
            'uuid' => uniqid('co_'),
            'name' => 'Other Company',
            'slug' => 'other-company-' . uniqid(),
        ]);

        $user = User::create([
            'company_id' => $company->id,
            'name' => 'Doc Center Manager',
            'email' => 'docs+' . uniqid() . '@example.test',
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

        $ownExport = ReportExport::create([
            'report_id' => 'RPT-TEST-1',
            'reference_number' => 'REF-TEST-001',
            'verification_id' => 'VER-TEST-001',
            'verification_token_hash' => hash('sha256', 'token-1'),
            'document_version' => '1.0',
            'report_title' => 'Delivery summary',
            'report_category' => 'deliveries',
            'export_format' => 'PDF',
            'generated_by' => $user->id,
            'generated_by_role' => 'Company Manager',
            'company_id' => $company->id,
            'record_count' => 4,
            'checksum' => 'checksum',
            'file_path' => 'reports/test.pdf',
            'mime_type' => 'application/pdf',
            'storage_disk' => 'local',
        ]);

        ReportExport::create([
            'report_id' => 'RPT-TEST-2',
            'reference_number' => 'REF-TEST-002',
            'verification_id' => 'VER-TEST-002',
            'verification_token_hash' => hash('sha256', 'token-2'),
            'document_version' => '1.0',
            'report_title' => 'Other company export',
            'report_category' => 'deliveries',
            'export_format' => 'PDF',
            'generated_by' => $user->id,
            'generated_by_role' => 'Company Manager',
            'company_id' => $otherCompany->id,
            'record_count' => 2,
            'checksum' => 'checksum-2',
            'file_path' => 'reports/other.pdf',
            'mime_type' => 'application/pdf',
            'storage_disk' => 'local',
        ]);

        Storage::fake('local');
        Storage::disk('local')->put($ownExport->file_path, 'pdf-content');

        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/v1/client/documents');

        $response->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonFragment(['reference_number' => 'REF-TEST-001']);

        $downloadResponse = $this->actingAs($user, 'sanctum')
            ->get('/api/v1/client/documents/' . $ownExport->id . '/download');

        $downloadResponse->assertStatus(200);
        $downloadResponse->assertHeader('Content-Type', 'application/pdf');
    }
}
