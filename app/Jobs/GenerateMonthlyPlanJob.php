<?php
// (c) 2026 Briefy contributors — AGPL-3.0
namespace App\Jobs;

use App\Models\BriefyNotification;
use App\Models\Client;
use App\Models\Demand;
use App\Models\PlanningSuggestion;
use App\Services\Ai\AnthropicClientFactory;
use App\Services\Ai\MonthlyPlanGenerator;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\DB;

class GenerateMonthlyPlanJob implements ShouldQueue
{
    use Queueable;

    public int $tries   = 2;
    public int $timeout = 300; // 5 min — Opus pode ser lento para N posts

    public function __construct(
        public readonly int $demandId,
        public readonly int $clientId,
        public readonly int $year,
        public readonly int $month,
        public readonly int $userId,
        public readonly ?string $instructions = null,
    ) {
        $this->onQueue('ai');
    }

    public function handle(AnthropicClientFactory $factory, MonthlyPlanGenerator $generator): void
    {
        $demand = Demand::findOrFail($this->demandId);
        $client = Client::findOrFail($this->clientId);
        $org    = $client->organization;

        try {
            $anthropic = $factory->forOrganization($org);
            $plan      = $generator->generate($client, $this->year, $this->month, $anthropic, $this->instructions);

            DB::transaction(function () use ($demand, $plan) {
                foreach ($plan['items'] as $item) {
                    PlanningSuggestion::create([
                        'demand_id'   => $demand->id,
                        'date'        => $item['date'],
                        'title'       => $item['title'],
                        'description' => $item['description'],
                        'channel'     => $item['channel'] ?? null,
                        'status'      => 'pending',
                    ]);
                }

                $demand->update([
                    'ai_analysis' => array_merge($demand->ai_analysis ?? [], [
                        'status'        => 'done',
                        'items_count'   => count($plan['items']),
                        'generated_at'  => now()->toIso8601String(),
                        'target_year'   => $this->year,
                        'target_month'  => $this->month,
                    ]),
                ]);
            });

            $monthLabel = \Carbon\Carbon::create($this->year, $this->month, 1)
                ->locale('pt-BR')->isoFormat('MMMM YYYY');

            BriefyNotification::create([
                'organization_id' => $org->id,
                'user_id'         => $this->userId,
                'type'            => 'planning_ready',
                'title'           => "Planejamento de {$client->name} pronto",
                'body'            => count($plan['items']) . " sugestões geradas para {$monthLabel}.",
                'data'            => ['demand_id' => $demand->id, 'client_id' => $client->id],
            ]);
        } catch (\Throwable $e) {
            $demand->update([
                'ai_analysis' => array_merge($demand->ai_analysis ?? [], [
                    'status' => 'failed',
                    'error'  => $e->getMessage(),
                ]),
            ]);

            BriefyNotification::create([
                'organization_id' => $org->id,
                'user_id'         => $this->userId,
                'type'            => 'planning_failed',
                'title'           => "Erro ao gerar planejamento de {$client->name}",
                'body'            => 'Tente novamente ou verifique sua chave Anthropic.',
                'data'            => ['demand_id' => $demand->id],
            ]);

            throw $e;
        }
    }
}
