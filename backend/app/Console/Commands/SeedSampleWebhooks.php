<?php

namespace App\Console\Commands;

use App\Models\WebhookEndpoint;
use Illuminate\Console\Command;

class SeedSampleWebhooks extends Command
{
    protected $signature = 'webhook:seed-samples';

    protected $description = 'Seed sample webhook endpoints for testing';

    public function handle()
    {
        $this->info('Creating sample webhooks for testing...');

        $webhooks = [
            [
                'name' => 'E-Commerce Platform Integration',
                'description' => 'Sends delivery updates to Shopify/WooCommerce stores',
                'target_url' => 'https://webhook.site/unique-id-here',
                'http_method' => 'POST',
                'retry_count' => 5,
                'timeout_seconds' => 30,
                'events' => ['delivery.created', 'delivery.updated', 'delivery.completed'],
                'status' => 'active',
            ],
            [
                'name' => 'ERP System - ABC Logistics',
                'description' => 'Syncs delivery records with ABC ERP',
                'target_url' => 'https://webhook.site/erp-endpoint-here',
                'http_method' => 'POST',
                'retry_count' => 3,
                'timeout_seconds' => 10,
                'events' => ['delivery.created', 'delivery.completed'],
                'status' => 'active',
            ],
            [
                'name' => 'Analytics Dashboard',
                'description' => 'Tracks all delivery events for reporting',
                'target_url' => 'https://webhook.site/analytics-endpoint-here',
                'http_method' => 'POST',
                'retry_count' => 3,
                'timeout_seconds' => 15,
                'events' => ['delivery.created', 'delivery.updated', 'delivery.completed', 'delivery.failed'],
                'status' => 'active',
            ],
            [
                'name' => 'Customer Notification Service',
                'description' => 'Sends SMS/Email for delivery status',
                'target_url' => 'https://webhook.site/notifications-endpoint-here',
                'http_method' => 'POST',
                'retry_count' => 2,
                'timeout_seconds' => 20,
                'events' => ['delivery.completed', 'delivery.failed'],
                'status' => 'active',
            ],
        ];

        $company = \App\Models\Company::first();
        if (!$company) {
            $this->error('No company found. Please seed companies first.');
            return 1;
        }

        $user = \App\Models\User::whereHas('roles', function ($q) {
            $q->where('name', 'admin');
        })->first();

        if (!$user) {
            $this->error('No admin user found. Please create an admin user first.');
            return 1;
        }

        foreach ($webhooks as $webhookData) {
            $webhookData['company_id'] = $company->id;
            $webhookData['created_by'] = $user->id;
            $webhookData['secret_cipher'] = \Illuminate\Support\Facades\Crypt::encryptString(
                WebhookEndpoint::generateSecret()
            );

            $webhook = WebhookEndpoint::create($webhookData);
            $this->info("✓ Created webhook: {$webhook->name}");
        }

        $this->info("\n✅ Sample webhooks created successfully!");
        $this->info("Visit /admin/webhooks to view and test them.");

        return 0;
    }
}
