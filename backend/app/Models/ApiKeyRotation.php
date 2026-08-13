<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ApiKeyRotation extends Model
{
    use HasFactory;

    protected $fillable = [
        'api_key_id',
        'old_key_id',
        'new_key_id',
        'rotation_reason',
        'rotated_by',
    ];

    public function apiKey(): BelongsTo
    {
        return $this->belongsTo(ApiKey::class);
    }

    public function rotatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'rotated_by');
    }
}
