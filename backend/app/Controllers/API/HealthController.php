<?php

namespace App\Controllers\API;

use Illuminate\Http\JsonResponse;
use Illuminate\Routing\Controller;

class HealthController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'status' => 'ok',
            'uptime' => now()->toIso8601String(),
        ]);
    }
}
