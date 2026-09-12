<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DeveloperApplication extends Model
{
    use HasFactory;

    protected $fillable = [
        'uuid',
        'client_id',
        'name',
        'description',
        'company_id',
        'owner_id',
        'environment',
        'redirect_urls',
        'allowed_ips',
        'contact_email',
        'status',
    ];

    protected $casts = [
        'redirect_urls' => 'array',
        'allowed_ips' => 'array',
    ];

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function apiKeys(): HasMany
    {
        return $this->hasMany(ApiKey::class, 'application_id');
    }
}
