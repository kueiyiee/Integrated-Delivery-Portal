<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ReportExportLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'report_export_id',
        'action',
        'user_id',
        'ip_address',
        'user_agent',
        'metadata',
    ];

    protected $casts = [
        'metadata' => 'array',
    ];

    public function export()
    {
        return $this->belongsTo(ReportExport::class, 'report_export_id');
    }
}
