<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class InspectAdminUser extends Command
{
    protected $signature = 'debug:inspect-admin {email} {--password=}';
    protected $description = 'Inspect a user record and optionally verify a plaintext password';

    public function handle(): int
    {
        $email = $this->argument('email');
        $password = $this->option('password');

        $normalized = User::normalizeEmail($email);
        $user = User::where('email', $normalized)->with('roles')->first();

        if (! $user) {
            $this->error("User not found: {$email}");
            return self::FAILURE;
        }

        $this->line('User ID: ' . $user->id);
        $this->line('Email: ' . $user->email);
        $this->line('Name: ' . $user->name);
        $this->line('Status: ' . ($user->status ?? 'null'));
        $this->line('Email verified at: ' . ($user->email_verified_at ? $user->email_verified_at->toDateTimeString() : 'null'));
        $this->line('Company ID: ' . ($user->company_id ?? 'null'));
        $this->line('Roles: ' . $user->roles->pluck('name')->join(', '));

        if ($password !== null) {
            $this->line('Checking provided password...');
            $ok = Hash::check($password, $user->password);
            $this->line('Password match: ' . ($ok ? 'YES' : 'NO'));
        }

        return self::SUCCESS;
    }
}
