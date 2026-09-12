<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Webhook extends Model
{
    use HasFactory;

    protected $fillable = ['company_id','name','url','secret','events','status','last_delivery_at','failure_count','created_by'];

    protected $casts = ['events' => 'array','last_delivery_at' => 'datetime'];

    public static function generateSecret(): string
    {
        return 'whsec_' . Str::random(36);
    }
}
