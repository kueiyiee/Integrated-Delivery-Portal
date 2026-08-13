<?php

namespace Tests\Feature;

use App\Models\Company;
use App\Services\CompanyMediaService;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Tests\TestCase;

class CompanyLogoUploadTest extends TestCase
{
    public function test_company_logo_service_returns_persistent_storage_reference(): void
    {
        Storage::fake('public');

        $company = Company::create([
            'uuid' => (string) Str::uuid(),
            'name' => 'Example Company',
            'slug' => 'example-company-'.Str::random(6),
            'status' => 'active',
            'metadata' => [],
        ]);

        $service = new CompanyMediaService();
        $result = $service->uploadLogo($company, UploadedFile::fake()->image('logo.png', 120, 120));

        $this->assertArrayHasKey('company_logo_path', $result);
        $this->assertArrayHasKey('company_logo_url', $result);
        $this->assertStringContainsString('company_logos/', $result['company_logo_path']);
        $this->assertStringNotContainsString('blob:', $result['company_logo_url']);
        $this->assertTrue(filter_var($result['company_logo_url'], FILTER_VALIDATE_URL) !== false || str_starts_with($result['company_logo_url'], '/'));
    }

    public function test_company_logo_service_can_store_direct_logo_url(): void
    {
        $company = Company::create([
            'uuid' => (string) Str::uuid(),
            'name' => 'Remote Logo Company',
            'slug' => 'remote-logo-company-'.Str::random(6),
            'status' => 'active',
            'metadata' => [],
        ]);

        $service = new CompanyMediaService();
        $result = $service->saveLogoUrl($company, 'https://cdn.example.com/assets/logo.png');

        $this->assertSame('https://cdn.example.com/assets/logo.png', $result['company_logo_url']);
        $this->assertArrayNotHasKey('company_logo_path', $result);
        $this->assertSame('https://cdn.example.com/assets/logo.png', $service->getLogoUrl($company));
    }
}
