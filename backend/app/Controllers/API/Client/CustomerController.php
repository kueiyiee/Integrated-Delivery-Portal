<?php

namespace App\Controllers\API\Client;

use App\Controllers\Controller;
use App\Requests\Customer\CustomerRequest;
use App\Http\Resources\CustomerResource;
use App\Services\Customer\CustomerService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CustomerController extends Controller
{
    public function index(Request $request, CustomerService $service): JsonResponse
    {
        $customers = $service->list($request->query(), $request->user()?->company_id);
        $payload = CustomerResource::collection($customers)->response()->getData(true);

        return response()->json([
            'data' => $payload['data'] ?? [],
            'meta' => $payload['meta'] ?? [
                'current_page' => $customers->currentPage(),
                'last_page' => $customers->lastPage(),
                'per_page' => $customers->perPage(),
                'total' => $customers->total(),
            ],
        ]);
    }

    public function store(CustomerRequest $request, CustomerService $service): JsonResponse
    {
        $data = $request->validated();

        $customer = $service->create($data, $request->user()?->company_id);

        return response()->json(['data' => new CustomerResource($customer)], 201);
    }
}
