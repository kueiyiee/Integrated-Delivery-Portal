<?php

namespace App\Console\Commands;

use App\Models\WebhookEndpoint;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Http;

class TestWebhook extends Command
{
    protected $signature = 'webhook:test {id} {event?}';

    protected $description = 'Test a webhook endpoint by sending a sample payload';

    public function handle()
    {
        $id = $this->argument('id');
        $event = $this->argument('event') ?? 'delivery.created';

        $webhook = WebhookEndpoint::find($id);

        if (!$webhook) {
            $this->error("Webhook with ID {$id} not found.");
            return 1;
        }

        $this->info("Testing webhook: {$webhook->name}");
        $this->info("Target URL: {$webhook->target_url}");
        $this->info("Event: {$event}");

        // Sample delivery payload
        $payload = [
            'event' => $event,
            'timestamp' => now()->toIso8601String(),
            'data' => [
                'id' => 123,
                'order_id' => 'ORD-2026-' . rand(100, 999),
                'driver_id' => 1,
                'customer_name' => 'John Doe',
                'customer_phone' => '+1-234-567-8900',
                'pickup_location' => 'Warehouse A',
                'delivery_location' => '123 Main St, City, State',
                'status' => 'pending',
                'created_at' => now()->toIso8601String(),
                'updated_at' => now()->toIso8601String(),
            ],
        ];

        $this->info("\nSending payload:");
        $this->line(json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));

        try {
            $response = Http::timeout($webhook->timeout_seconds)
                ->{strtolower($webhook->http_method)}(
                    $webhook->target_url,
                    $payload
                );

            $this->info("\n✅ Success!");
            $this->info("Status: {$response->status()}");
            $this->info("Response:");
            $this->line($response->body());

            return 0;
        } catch (\Exception $e) {
            $this->error("\n❌ Failed!");
            $this->error("Error: {$e->getMessage()}");
            return 1;
        }
    }
}
