<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Company;
use Illuminate\Support\Facades\DB;

class AutoPruneCompanies extends Command
{
    protected $signature = 'companies:prune {--days=30 : Number of days of inactivity before pruning}';
    protected $description = 'Auto-prune inactive or unverified companies and mark them as auto_deleted';

    public function handle(): int
    {
        $days = (int) $this->option('days');
        $threshold = now()->subDays($days);

        $this->info("Finding companies created before {$threshold->toDateTimeString()} and not active...");

        $candidates = Company::where('created_at', '<=', $threshold)
            ->whereNotIn('status', [Company::STATUS_ACTIVE, Company::STATUS_ARCHIVED])
            ->whereNull('deletion_type')
            ->get();

        $this->info('Candidates: ' . $candidates->count());

        foreach ($candidates as $company) {
            DB::transaction(function () use ($company) {
                $company->deletion_type = Company::DELETION_TYPE_AUTO;
                $company->deletion_reason = 'auto-pruned-inactivity';
                $company->status = Company::STATUS_ARCHIVED;
                $company->archived_at = now();
                $company->save();

                // Optionally write a lightweight audit row if table exists
                if (DB::getSchemaBuilder()->hasTable('audit_logs')) {
                    DB::table('audit_logs')->insert([
                        'action' => 'company.auto_pruned',
                        'actor_type' => 'system',
                        'actor_id' => null,
                        'target_type' => 'company',
                        'target_id' => $company->id,
                        'metadata' => json_encode(['reason' => 'auto_prune', 'days' => $days ?? 30]),
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            });

            $this->info("Pruned company: {$company->id} ({$company->name})");
        }

        $this->info('Auto-prune complete.');

        return self::SUCCESS;
    }
}
