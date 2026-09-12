<?php

namespace Tests\Feature;

use App\Services\ReportDocumentGenerator;
use Illuminate\Foundation\Testing\TestCase;
use ReflectionClass;

class ReportDocumentGeneratorEnterpriseTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
    }

    public function test_pdf_html_includes_enterprise_security_markers_and_verification_metadata(): void
    {
        $generator = new ReportDocumentGenerator();
        $report = [
            'title' => 'Audit Logs',
            'description' => 'Security audit events and metadata details.',
            'category' => 'audit_logs',
        ];
        $rows = [
            ['id' => 1, 'action' => 'login'],
        ];
        $metadata = [
            'generated_by_name' => 'System Auditor',
            'generated_by_role' => 'System Administrator',
            'reference_number' => 'REF-20260724-ABC123',
            'document_version' => '2.1',
            'verification_url' => 'https://portal.example.com/api/v1/reports/verify/abc123',
            'verification_id' => 'VID-20260724-001',
            'checksum' => 'sha256:abc123',
            'company_name' => 'Logistics Integration Portal',
            'company_id' => 'COMP-001',
            'generated_at' => '2026-07-24 12:00:00',
            'time_zone' => 'UTC',
        ];
        $branding = [
            'platform_name' => 'Logistics Integration Portal',
            'platform_logo_url' => '',
            'company_logo_url' => '',
            'company_registration_number' => 'REG-001',
            'company_address' => '1 Security Avenue, Enterprise District',
            'company_website' => 'https://portal.example.com',
            'support_email' => 'support@example.com',
        ];

        $reflection = new ReflectionClass($generator);
        $method = $reflection->getMethod('buildPdfHtml');
        $method->setAccessible(true);

        $html = $method->invoke($generator, $report, $rows, $metadata, $branding, 'data:image/png;base64,abc', 'data:image/png;base64,xyz');

        $this->assertStringContainsString('CONFIDENTIAL', $html);
        $this->assertStringContainsString('OFFICIAL COPY', $html);
        $this->assertStringContainsString('SYSTEM GENERATED', $html);
        $this->assertStringContainsString('Verification URL', $html);
        $this->assertStringContainsString('REF-20260724-ABC123', $html);
    }
}
