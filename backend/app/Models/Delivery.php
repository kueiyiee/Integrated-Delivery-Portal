<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Delivery extends Model
{
    use HasFactory;

    public const STATUS_PENDING = 'pending';
    public const STATUS_ASSIGNED = 'assigned';
    public const STATUS_IN_TRANSIT = 'in_transit';
    public const STATUS_PICKED_UP = 'picked_up';
    public const STATUS_DELIVERED = 'delivered';
    public const STATUS_CANCELLED = 'cancelled';
    public const STATUS_FAILED = 'failed';

    public static function allowedStatusTransitions(): array
    {
        return [
            self::STATUS_PENDING => [
                self::STATUS_ASSIGNED,
                self::STATUS_IN_TRANSIT,
                self::STATUS_CANCELLED,
            ],
            self::STATUS_ASSIGNED => [
                self::STATUS_IN_TRANSIT,
                self::STATUS_PICKED_UP,
                self::STATUS_CANCELLED,
            ],
            self::STATUS_IN_TRANSIT => [
                self::STATUS_PICKED_UP,
                self::STATUS_DELIVERED,
                self::STATUS_CANCELLED,
                self::STATUS_FAILED,
            ],
            self::STATUS_PICKED_UP => [
                self::STATUS_DELIVERED,
                self::STATUS_FAILED,
            ],
            self::STATUS_DELIVERED => [],
            self::STATUS_CANCELLED => [],
            self::STATUS_FAILED => [],
        ];
    }

    public static function isValidStatus(string $status): bool
    {
        return array_key_exists($status, self::allowedStatusTransitions());
    }

    public static function canTransition(string $currentStatus, string $nextStatus): bool
    {
        if ($currentStatus === $nextStatus) {
            return true;
        }

        return in_array($nextStatus, self::allowedStatusTransitions()[$currentStatus] ?? [], true);
    }

    protected $fillable = [
        'company_id',
        'uuid',
        'tracking_number',
        'external_reference',
        'status',
        'pickup_address',
        'dropoff_address',
        'package',
        'status_history',
        'scheduled_at',
        'cancelled_at',
        'cancel_reason',
        'notes',
    ];

    protected $casts = [
        'pickup_address' => 'array',
        'dropoff_address' => 'array',
        'package' => 'array',
        'status_history' => 'array',
        'scheduled_at' => 'datetime',
        'cancelled_at' => 'datetime',
    ];

    public function company()
    {
        return $this->belongsTo(Company::class);
    }
}
