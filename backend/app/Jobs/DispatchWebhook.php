<?php

namespace App\Jobs;

use App\Models\WebhookEndpointLog;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class DispatchWebhook implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(public WebhookEndpointLog $log)
    {
        $this->onQueue('webhooks');
        $this->tries = 5;
        $this->backoff = [60, 120, 300, 600];
    }

    public function handle(): void
    {
        $endpoint = $this->log->endpoint()->first();
        if (! $endpoint) {
            $this->log->status = 'failed';
            $this->log->response_body = 'endpoint not found';
            $this->log->save();
            return;
        }

        $payload = is_array($this->log->payload) ? $this->log->payload : json_decode($this->log->payload, true);
        $body = json_encode($payload);
        $secret = $endpoint->getSecretPlain() ?? '';
        $signature = hash_hmac('sha256', $body, $secret);

        try {
            $response = Http::timeout($endpoint->timeout_seconds ?? 10)
                ->withHeaders([
                    'Content-Type' => 'application/json',
                    'X-Webhook-Event' => $this->log->event,
                    'X-Webhook-Signature' => 'sha256=' . $signature,
                    'X-Webhook-Event-Id' => $this->log->id,
                ])
                ->send(strtoupper($endpoint->http_method ?? 'POST'), $endpoint->target_url, ['body' => $body]);

            $this->log->attempts = ($this->log->attempts ?? 0) + 1;
            $this->log->response_code = $response->status();
            $this->log->response_body = $response->body();
            $this->log->status = $response->successful() ? 'delivered' : 'failed';
            if ($response->successful()) {
                $this->log->delivered_at = now();
            }
            $this->log->save();

            if (! $response->successful() && ($this->log->attempts ?? 0) < ($endpoint->retry_count ?? 3)) {
                $delay = (int) pow(2, $this->log->attempts) * 60;
                dispatch(new self($this->log))->delay(now()->addSeconds($delay));
            }
        } catch (\Throwable $e) {
            Log::warning('Webhook dispatch failed', ['error' => $e->getMessage()]);
            $this->log->attempts = ($this->log->attempts ?? 0) + 1;
            $this->log->response_body = $e->getMessage();
            $this->log->status = 'failed';
            $this->log->save();

            if (($this->log->attempts ?? 0) < ($endpoint->retry_count ?? 3)) {
                $delay = (int) pow(2, $this->log->attempts) * 60;
                dispatch(new self($this->log))->delay(now()->addSeconds($delay));
            }
        }
    }
}
