<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('users')) {
            if (Schema::hasColumn('users', 'mfa_secret')) {
                $driver = DB::getDriverName();
                if ($driver === 'mysql') {
                    DB::statement('ALTER TABLE users MODIFY mfa_secret TEXT NULL');
                } elseif ($driver === 'pgsql') {
                    DB::statement('ALTER TABLE users ALTER COLUMN mfa_secret TYPE TEXT');
                }
            }

            DB::table('users')->select(['id', 'mfa_secret', 'recovery_codes'])->orderBy('id')->eachById(function (object $user): void {
                $updates = [];

                if (is_string($user->mfa_secret) && $user->mfa_secret !== '') {
                    try {
                        Crypt::decryptString($user->mfa_secret);
                    } catch (\Throwable) {
                        $updates['mfa_secret'] = Crypt::encryptString($user->mfa_secret);
                    }
                }

                $codes = is_string($user->recovery_codes)
                    ? json_decode($user->recovery_codes, true)
                    : $user->recovery_codes;

                if (is_array($codes)) {
                    $hashedCodes = array_values(array_filter(array_map(
                        fn ($code) => is_string($code) && $code !== '' && ! str_starts_with($code, '$2y$')
                            ? Hash::make($code)
                            : (is_string($code) ? $code : null),
                        $codes
                    )));
                    $updates['recovery_codes'] = json_encode($hashedCodes);
                }

                if ($updates !== []) {
                    DB::table('users')->where('id', $user->id)->update($updates);
                }
            });
        }

        if (Schema::hasTable('mfa_challenges') && Schema::hasColumn('mfa_challenges', 'token')) {
            DB::table('mfa_challenges')->select(['id', 'token'])->orderBy('id')->eachById(function (object $challenge): void {
                if (is_string($challenge->token) && strlen($challenge->token) !== 64) {
                    DB::table('mfa_challenges')
                        ->where('id', $challenge->id)
                        ->update(['token' => hash('sha256', $challenge->token)]);
                }
            });
        }
    }

    public function down(): void
    {
        // Encrypted secrets and one-way recovery-code hashes cannot be safely reverted.
    }
};
