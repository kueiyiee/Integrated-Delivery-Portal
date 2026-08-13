<?php

namespace App\Repositories\Contracts;

use App\Models\Company;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

interface CompanyRepositoryInterface
{
    public function create(array $data): Company;
    public function findById(int $id): ?Company;
    public function findByUuid(string $uuid): ?Company;
    public function list(array $filters): LengthAwarePaginator;
}
