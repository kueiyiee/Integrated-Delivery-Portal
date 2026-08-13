<?php

namespace App\Services\Webhook;

use App\Jobs\DispatchWebhook;
use App\Models\WebhookEndpoint;
use App\Models\WebhookEndpointLog;
use Illuminate\Support\Facades\Log;

class WebhookDispatcher
{
    public static array $supportedEvents = [
        'delivery.created',
        'delivery.assigned',
        'delivery.picked_up',
        'delivery.delivered',
        'delivery.cancelled',
        'delivery.failed',
    ];

    public function dispatchForCompany(string $event, int $companyId, array $payload = []): void
    {
        if (! in_array($event, self::$supportedEvents, true)) {
            Log::warning('Attempted to dispatch unsupported webhook event', ['event' => $event]);
            return;
        }

        $endpoints = WebhookEndpoint::query()
            ->where('company_id', $companyId)
            ->where('status', 'active')
            ->whereJsonContains('events', $event)
            ->get();

        foreach ($endpoints as $endpoint) {
            try {
                $log = WebhookEndpointLog::create([
                    'webhook_endpoint_id' => $endpoint->id,
                    'event' => $event,
                    'payload' => $payload,
                    'attempts' => 0,
                    'status' => 'pending',
                ]);

                DispatchWebhook::dispatch($log);
            } catch (\Throwable $e) {
                Log::warning('Failed to queue webhook dispatch', ['error' => $e->getMessage()]);
            }
        }
    }
}

