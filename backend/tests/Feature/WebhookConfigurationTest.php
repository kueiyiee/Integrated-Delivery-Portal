<?php

namespace Tests\Feature;

use App\Services\Webhook\WebhookValidator;
use PHPUnit\Framework\TestCase;

class WebhookConfigurationTest extends TestCase
{
    public function test_rejects_localhost_and_private_ips(): void
    {
        $v = new WebhookValidator();

        $this->expectException(\InvalidArgumentException::class);
        $v->validateUrl('http://127.0.0.1/webhook', 'sandbox');
    }

    public function test_rejects_private_ip_literal(): void
    {
        $v = new WebhookValidator();
        $this->expectException(\InvalidArgumentException::class);
        $v->validateUrl('https://192.168.1.10/hook', 'production');
    }

    public function test_requires_https_in_production(): void
    {
        $v = new WebhookValidator();
        $this->expectException(\InvalidArgumentException::class);
        $v->validateUrl('http://8.8.8.8/hook', 'production');
    }

    public function test_allows_https_public_ip(): void
    {
        $v = new WebhookValidator();
        // 8.8.8.8 is a public IP; should not throw for scheme
        $v->validateUrl('https://8.8.8.8/hook', 'production');
        $this->assertTrue(true);
    }
}
