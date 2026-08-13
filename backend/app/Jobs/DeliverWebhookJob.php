<?php

namespace App\Jobs;

use App\Models\WebhookEndpoint;
use App\Models\WebhookEndpointLog;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Crypt;

class DeliverWebhookJob implements ShouldQueue
{
    use InteractsWithQueue, Queueable, SerializesModels;

    public WebhookEndpoint $endpoint;
    public string $event;
    public array $payload;

    public $tries = 5;
    public $backoff = [60, 120, 300, 600];

    public function __construct(WebhookEndpoint $endpoint, string $event, array $payload = [])
    {
        $this->endpoint = $endpoint;
        $this->event = $event;
        $this->payload = $payload;
    }

    public function handle(): void
    {
        $attempt = $this->attempts();

        $body = json_encode(['event' => $this->event, 'data' => $this->payload, 'sent_at' => now()->toIso8601String()]);

        // write a pending log
        $log = WebhookEndpointLog::create([
            'webhook_endpoint_id' => $this->endpoint->id,
            'event' => $this->event,
            'payload' => $body,
            'attempts' => $attempt,
            'status' => 'pending',
        ]);

        $secret = $this->endpoint->getSecretPlain();

        $signature = $secret ? hash_hmac('sha256', $body, $secret) : null;

        try {
            $response = Http::timeout($this->endpoint->timeout_seconds ?? 10)
                ->withHeaders(array_filter([
                    'Content-Type' => 'application/json',
                    'X-Webhook-Event' => $this->event,
                    'X-Webhook-ID' => (string) $this->endpoint->id,
                    'X-Webhook-Timestamp' => now()->toIso8601String(),
                    'X-Webhook-Signature' => $signature ? 'sha256=' . $signature : null,
                ]))
                ->post($this->endpoint->target_url, json_decode($body, true));

            $log->response_code = $response->status();
            $log->response_body = (string) $response->body();
            $log->attempts = $attempt;

            if ($response->successful()) {
                $log->status = 'delivered';
                $log->delivered_at = now();
                $log->save();
                $this->endpoint->last_delivery_at = now();
                $this->endpoint->last_status = 'delivered';
                $this->endpoint->last_error = null;
                $this->endpoint->saveQuietly();
                return;
            }

            // non-successful response -> retry
            $log->status = 'failed';
            $log->save();

            // throw to allow queue to retry according to $tries/$backoff
            throw new \Exception('Webhook delivery failed with status ' . $response->status());
        } catch (\Exception $e) {
            Log::warning('DeliverWebhookJob failed', ['endpoint' => $this->endpoint->id, 'error' => $e->getMessage()]);

            $log->status = 'error';
            $log->response_body = $log->response_body ?? $e->getMessage();
            $log->attempts = $attempt;
            $log->save();

            // if exceeded tries, mark endpoint failure_count
            if ($this->attempts() >= $this->tries) {
                $this->endpoint->failure_count = ($this->endpoint->failure_count ?? 0) + 1;
                $this->endpoint->last_status = 'failed';
                $this->endpoint->last_error = $e->getMessage();
                $this->endpoint->saveQuietly();
            }

            throw $e;
        }
    }
}
