<?php

namespace App\Services\Delivery;

use App\Models\Delivery;
use App\Services\Webhook\WebhookDispatcher;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class DeliveryService
{
    public const STATUS_PENDING = Delivery::STATUS_PENDING;
    public const STATUS_ASSIGNED = Delivery::STATUS_ASSIGNED;
    public const STATUS_IN_TRANSIT = Delivery::STATUS_IN_TRANSIT;
    public const STATUS_PICKED_UP = Delivery::STATUS_PICKED_UP;
    public const STATUS_DELIVERED = Delivery::STATUS_DELIVERED;
    public const STATUS_CANCELLED = Delivery::STATUS_CANCELLED;
    public const STATUS_FAILED = Delivery::STATUS_FAILED;

    public function list(array $filters, ?int $companyId = null): LengthAwarePaginator
    {
        $query = Delivery::query();

        if ($companyId) {
            $query->where('company_id', $companyId);
        }

        if (! empty($filters['search'])) {
            $search = trim((string) $filters['search']);
            $query->where(function ($q) use ($search): void {
                $q->where('tracking_number', 'like', "%{$search}%")
                    ->orWhere('external_reference', 'like', "%{$search}%")
                    ->orWhere('notes', 'like', "%{$search}%")
                    ->orWhere('uuid', 'like', "%{$search}%" );
            });
        }

        if (! empty($filters['status'])) {
            $query->where('status', (string) $filters['status']);
        }

        if (! empty($filters['from_date'])) {
            $query->whereDate('created_at', '>=', $filters['from_date']);
        }

        if (! empty($filters['to_date'])) {
            $query->whereDate('created_at', '<=', $filters['to_date']);
        }

        if (! empty($filters['sort_by'])) {
            $allowedSorts = ['created_at', 'updated_at', 'status', 'tracking_number'];
            $sortBy = in_array((string) $filters['sort_by'], $allowedSorts, true) ? (string) $filters['sort_by'] : 'created_at';
            $sortDirection = strtolower((string) ($filters['sort_direction'] ?? 'desc')) === 'asc' ? 'asc' : 'desc';
            $query->orderBy($sortBy, $sortDirection);
        } else {
            $query->orderBy('created_at', 'desc');
        }

        return $query->paginate($filters['per_page'] ?? 15);
    }

    public function show(int $id, ?int $companyId = null): Delivery
    {
        $query = Delivery::query()->whereKey($id);

        if ($companyId) {
            $query->where('company_id', $companyId);
        }

        return $query->firstOrFail();
    }

    public function create(array $data, ?int $companyId = null): Delivery
    {
        $status = isset($data['status']) ? (string) $data['status'] : self::STATUS_PENDING;

        if (! Delivery::isValidStatus($status)) {
            throw new \InvalidArgumentException(sprintf('Unknown delivery status: %s.', $status));
        }

        $deliveryPayload = [
            'company_id' => $companyId ?? $data['company_id'] ?? null,
            'uuid' => $data['uuid'] ?? Str::uuid()->toString(),
            'tracking_number' => $this->generateTrackingNumber(),
            'external_reference' => $data['external_reference'] ?? null,
            'pickup_address' => $data['pickup_address'] ?? null,
            'dropoff_address' => $data['dropoff_address'] ?? null,
            'package' => $data['package'] ?? null,
            'notes' => $data['notes'] ?? null,
            'scheduled_at' => $data['scheduled_at'] ?? null,
            'status' => $status,
            'status_history' => [[
                'status' => $status,
                'changed_at' => now()->toIso8601String(),
            ]],
        ];

        $delivery = null;
        $attempts = 0;

        while ($delivery === null) {
            try {
                $delivery = Delivery::create($deliveryPayload);
            } catch (QueryException $exception) {
                $attempts++;
                if ($attempts >= 5 || ! $this->isTrackingNumberCollision($exception)) {
                    throw $exception;
                }

                $deliveryPayload['tracking_number'] = $this->generateTrackingNumber();
            }
        }

        try {
            $dispatcher = new WebhookDispatcher();
            $dispatcher->dispatchForCompany('delivery.created', $delivery->company_id, ['delivery' => $delivery->toArray()]);
        } catch (\Throwable $e) {
            Log::warning('Failed to dispatch delivery.created webhooks', ['error' => $e->getMessage()]);
        }

        return $delivery;
    }

    public function update(int $id, array $data, ?int $companyId = null): Delivery
    {
        $delivery = $this->show($id, $companyId);

        $attributes = [];
        $statusChanged = false;
        $newStatus = null;

        if (array_key_exists('tracking_number', $data)) {
            throw new \InvalidArgumentException('Tracking number is immutable and cannot be updated.');
        }

        if (array_key_exists('external_reference', $data)) {
            $attributes['external_reference'] = $data['external_reference'];
        }

        if (array_key_exists('pickup_address', $data)) {
            $attributes['pickup_address'] = $data['pickup_address'];
        }

        if (array_key_exists('dropoff_address', $data)) {
            $attributes['dropoff_address'] = $data['dropoff_address'];
        }

        if (array_key_exists('package', $data)) {
            $this->assertPackageEditable($delivery);
            $attributes['package'] = $data['package'];
        }

        if (array_key_exists('notes', $data)) {
            $attributes['notes'] = $data['notes'];
        }

        if (array_key_exists('scheduled_at', $data)) {
            $attributes['scheduled_at'] = $data['scheduled_at'];
        }

        if (array_key_exists('status', $data)) {
            $status = (string) $data['status'];
            $this->validateTransition($delivery, $status);
            $attributes['status'] = $status;
            $statusChanged = $delivery->status !== $status;
            $newStatus = $status;
            $this->appendStatusEvent($delivery, $status);
        }

        $delivery->fill($attributes);
        $delivery->save();

        if ($statusChanged && $newStatus !== null) {
            try {
                $dispatcher = new WebhookDispatcher();
                $event = match ($newStatus) {
                    self::STATUS_ASSIGNED => 'delivery.assigned',
                    self::STATUS_IN_TRANSIT => null,
                    self::STATUS_PICKED_UP => 'delivery.picked_up',
                    self::STATUS_DELIVERED => 'delivery.delivered',
                    self::STATUS_CANCELLED => 'delivery.cancelled',
                    self::STATUS_FAILED => 'delivery.failed',
                    default => null,
                };

                if ($event !== null) {
                    $dispatcher->dispatchForCompany($event, $delivery->company_id, ['delivery' => $delivery->toArray()]);
                }
            } catch (\Throwable $e) {
                Log::warning('Failed to dispatch delivery status webhook', ['error' => $e->getMessage()]);
            }
        }

        return $delivery->fresh();
    }

    public function cancel(int $id, array $data, ?int $companyId = null): Delivery
    {
        $delivery = $this->show($id, $companyId);

        $this->validateTransition($delivery, self::STATUS_CANCELLED);

        $delivery->status = self::STATUS_CANCELLED;
        $delivery->cancelled_at = now();
        $delivery->cancel_reason = $data['cancel_reason'] ?? null;

        if (! empty($data['notes'])) {
            $delivery->notes = $data['notes'];
        }

        $this->appendStatusEvent($delivery, self::STATUS_CANCELLED);
        $delivery->save();

        try {
            $dispatcher = new WebhookDispatcher();
            $dispatcher->dispatchForCompany('delivery.cancelled', $delivery->company_id, ['delivery' => $delivery->toArray()]);
        } catch (\Throwable $e) {
            Log::warning('Failed to dispatch delivery.cancelled webhooks', ['error' => $e->getMessage()]);
        }

        return $delivery->fresh();
    }

    public function delete(int $id, ?int $companyId = null): void
    {
        $delivery = $this->show($id, $companyId);
        $delivery->delete();
    }

    private function validateTransition(Delivery $delivery, string $status): void
    {
        if (! Delivery::isValidStatus($status)) {
            throw new \InvalidArgumentException(sprintf('Unknown delivery status: %s.', $status));
        }

        if (! Delivery::canTransition($delivery->status, $status)) {
            throw new \InvalidArgumentException(sprintf('Invalid delivery status transition from %s to %s.', $delivery->status, $status));
        }
    }

    private function appendStatusEvent(Delivery $delivery, string $status): void
    {
        $history = is_array($delivery->status_history) ? $delivery->status_history : [];
        $last = $history[count($history) - 1] ?? null;

        if (($last['status'] ?? null) === $status) {
            return;
        }

        $history[] = [
            'status' => $status,
            'changed_at' => now()->toIso8601String(),
        ];

        $delivery->status_history = $history;
    }

    private function assertPackageEditable(Delivery $delivery): void
    {
        if (in_array($delivery->status, [self::STATUS_DELIVERED, self::STATUS_CANCELLED, self::STATUS_FAILED], true)) {
            throw new \InvalidArgumentException('Package information cannot be changed after the delivery is closed.');
        }
    }

    private function generateTrackingNumber(): string
    {
        return sprintf('DPL-%s-%s', now()->format('ymd'), strtoupper(Str::random(8)));
    }

    private function isTrackingNumberCollision(QueryException $exception): bool
    {
        $sqlState = $exception->errorInfo[0] ?? null;
        $errorCode = $exception->errorInfo[1] ?? null;

        if ($sqlState === '23000' && $errorCode === 1062) {
            return true;
        }

        $message = $exception->getMessage();
        return str_contains($message, 'Duplicate entry') && str_contains($message, 'tracking_number');
    }
}
