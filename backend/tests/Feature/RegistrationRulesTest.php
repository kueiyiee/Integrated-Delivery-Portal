<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\Company;
use App\Models\User;

class RegistrationRulesTest extends TestCase
{
    use RefreshDatabase;

    public function test_same_name_and_same_email_is_rejected()
    {
        $email = 'owner@example.com';
        $companyName = 'Integration Logistics';

        $company = Company::create([
            'uuid' => \Illuminate\Support\Str::uuid()->toString(),
            'name' => $companyName,
            'slug' => \Illuminate\Support\Str::slug($companyName),
            'status' => Company::STATUS_PENDING_EMAIL_VERIFICATION,
            'company_code' => 'INLG-1000',
            'business_email' => User::normalizeEmail($email),
        ]);

        $password = \Illuminate\Support\Str::random(20) . 'A1!';

        $response = $this->postJson('/api/v1/auth/register', [
            'company_name' => $companyName,
            'name' => 'New Owner',
            'email' => $email,
            'password' => $password,
            'password_confirmation' => $password,
        ]);

        $response->assertStatus(422);
        $response->assertJsonPath('errors.company_name.0', 'A company with this name and email already exists.');
    }

    public function test_same_name_different_email_is_allowed()
    {
        $existingEmail = 'one@example.com';
        $newEmail = 'two@example.com';
        $companyName = 'Integration Logistics';

        Company::create([
            'uuid' => \Illuminate\Support\Str::uuid()->toString(),
            'name' => $companyName,
            'slug' => \Illuminate\Support\Str::slug($companyName),
            'status' => Company::STATUS_PENDING_EMAIL_VERIFICATION,
            'company_code' => 'INLG-1001',
            'business_email' => User::normalizeEmail($existingEmail),
        ]);

        $password = \Illuminate\Support\Str::random(20) . 'A1!';

        $response = $this->postJson('/api/v1/auth/register', [
            'company_name' => $companyName,
            'name' => 'New Owner',
            'email' => $newEmail,
            'password' => $password,
            'password_confirmation' => $password,
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('users', ['email' => User::normalizeEmail($newEmail)]);
    }

    public function test_different_name_same_email_is_rejected()
    {
        $email = 'owner2@example.com';

        Company::create([
            'uuid' => \Illuminate\Support\Str::uuid()->toString(),
            'name' => 'Existing Co',
            'slug' => 'existing-co',
            'status' => Company::STATUS_PENDING_EMAIL_VERIFICATION,
            'company_code' => 'EXST-1001',
            'business_email' => User::normalizeEmail($email),
        ]);

        $password = \Illuminate\Support\Str::random(20) . 'A1!';

        $response = $this->postJson('/api/v1/auth/register', [
            'company_name' => 'Different Name',
            'name' => 'Another Owner',
            'email' => $email,
            'password' => $password,
            'password_confirmation' => $password,
        ]);

        $response->assertStatus(422);
        $response->assertJsonPath('errors.email.0', 'A company with this email already exists.');
    }

    public function test_auto_deleted_company_allows_reuse()
    {
        $email = 'reusable@example.com';
        $companyName = 'Reusable Co';

        $company = Company::create([
            'uuid' => \Illuminate\Support\Str::uuid()->toString(),
            'name' => $companyName,
            'slug' => \Illuminate\Support\Str::slug($companyName),
            'status' => Company::STATUS_ARCHIVED,
            'company_code' => 'REUS-1001',
            'business_email' => User::normalizeEmail($email),
            'deletion_type' => Company::DELETION_TYPE_AUTO,
            'deletion_reason' => 'test-auto',
            'archived_at' => now(),
        ]);

        $password = \Illuminate\Support\Str::random(20) . 'A1!';

        $response = $this->postJson('/api/v1/auth/register', [
            'company_name' => $companyName,
            'name' => 'New Owner',
            'email' => $email,
            'password' => $password,
            'password_confirmation' => $password,
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('users', ['email' => User::normalizeEmail($email)]);
    }
}
