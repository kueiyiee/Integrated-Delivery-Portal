<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ApiKeyLog extends Model
{
    use HasFactory;

    protected $fillable = ['api_key_id','company_id','endpoint','method','ip_address','user_agent','response_status','request_time'];
}
