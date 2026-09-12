<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\Traits\ConditionalSoftDeletes;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Str;

class WebhookEndpoint extends Model
{
    use HasFactory, ConditionalSoftDeletes;

    protected $fillable = [
        'company_id',
        'name',
        'description',
        'target_url',
        'environment',
        'http_method',
        'retry_count',
        'timeout_seconds',
        'secret_cipher',
        'status',
        'events',
        'last_delivery_at',
        'last_status',
        'last_error',
        'created_by',
    ];

    protected $hidden = [
        'secret_cipher',
    ];

    protected $casts = [
        'events' => 'array',
        'last_delivery_at' => 'datetime',
    ];

    public static function generateSecret(): string
    {
        return 'wh_' . Str::random(48);
    }

    public function getSecretPlain(): ?string
    {
        if (! $this->secret_cipher) return null;
        try {
            return Crypt::decryptString($this->secret_cipher);
        } catch (\Exception $e) {
            return null;
        }
    }

    public function company()
    {
        return $this->belongsTo(Company::class);
    }
}
