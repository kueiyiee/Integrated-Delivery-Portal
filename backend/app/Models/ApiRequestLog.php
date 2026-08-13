<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ApiRequestLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'request_id',
        'api_key_id',
        'application_id',
        'company_id',
        'endpoint',
        'method',
        'status_code',
        'response_time_ms',
        'ip_address',
        'device',
        'user_agent',
        'request_headers',
        'request_body',
        'response_headers',
        'response_body',
    ];

    protected $casts = [
        'request_headers' => 'array',
        'request_body' => 'array',
        'response_headers' => 'array',
        'response_body' => 'array',
    ];
}
