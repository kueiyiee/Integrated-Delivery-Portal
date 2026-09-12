<?php

namespace App\Services\Customer;

use App\Models\Customer;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class CustomerService
{
    public function list(array $filters, ?int $companyId = null): LengthAwarePaginator
    {
        $query = Customer::query();

        if ($companyId) {
            $query->where('company_id', $companyId);
        }

        return $query
            ->orderBy('created_at', 'desc')
            ->paginate($filters['per_page'] ?? 15);
    }

    public function create(array $data, ?int $companyId = null): Customer
    {
        $data['company_id'] = $companyId ?? $data['company_id'] ?? null;

        return Customer::create($data);
    }
}
