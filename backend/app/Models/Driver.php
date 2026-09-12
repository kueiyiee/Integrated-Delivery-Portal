<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\Traits\ConditionalSoftDeletes;
use Illuminate\Support\Str;

class Driver extends Model
{
    use HasFactory, ConditionalSoftDeletes;

    protected $fillable = [
        'company_id',
        'name',
        'email',
        'phone',
        'vehicle_type',
        'vehicle_number',
        'license_number',
        'notes',
        'status',
        'last_seen_at',
    ];

    protected $casts = [
        'last_seen_at' => 'datetime',
    ];

    public function company()
    {
        return $this->belongsTo(Company::class);
    }
}
