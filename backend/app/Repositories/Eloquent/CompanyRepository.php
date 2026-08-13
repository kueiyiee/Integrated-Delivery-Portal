<?php

namespace App\Repositories\Eloquent;

use App\Models\Company;
use App\Repositories\Contracts\CompanyRepositoryInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class CompanyRepository implements CompanyRepositoryInterface
{
    public function create(array $data): Company
    {
        // Enforce email ownership rules: do not allow creating a company with an email
        // that belongs to an active company or an existing user, unless the previous
        // company was auto-deleted.
        $email = $data['business_email'] ?? null;
        if ($email) {
            $normalizedEmail = \App\Models\User::normalizeEmail($email);

            // If a user account exists with this email, block creation (email ownership)
            if (\App\Models\User::where('email', $normalizedEmail)->exists()) {
                throw new \InvalidArgumentException('That email address is already registered.');
            }

            $existingCompany = Company::where('business_email', $normalizedEmail)->orderByDesc('id')->first();
            if ($existingCompany && $existingCompany->deletion_type !== Company::DELETION_TYPE_AUTO) {
                throw new \InvalidArgumentException('A company with this email already exists.');
            }
        }

        return Company::create($data);
    }

    public function findById(int $id): ?Company
    {
        return Company::find($id);
    }

    public function findByUuid(string $uuid): ?Company
    {
        return Company::where('uuid', $uuid)->first();
    }

    public function list(array $filters): LengthAwarePaginator
    {
        return Company::query()
            ->orderBy('created_at', 'desc')
            ->paginate($filters['per_page'] ?? 15);
    }
}
