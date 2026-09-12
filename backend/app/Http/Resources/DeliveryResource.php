<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class DeliveryResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'uuid' => $this->uuid,
            'tracking_number' => $this->tracking_number,
            'external_reference' => $this->external_reference,
            'status' => $this->status,
            'pickup_address' => $this->pickup_address ?? null,
            'dropoff_address' => $this->dropoff_address ?? null,
            'package' => $this->package ?? null,
            'notes' => $this->notes ?? null,
            'scheduled_at' => optional($this->scheduled_at)->toIso8601String(),
            'cancelled_at' => optional($this->cancelled_at)->toIso8601String(),
            'cancel_reason' => $this->cancel_reason ?? null,
            'status_history' => $this->status_history ?? [],
            'created_at' => optional($this->created_at)->toIso8601String(),
            'updated_at' => optional($this->updated_at)->toIso8601String(),
        ];
    }
}
