<?php
// (c) 2026 Briefy contributors — AGPL-3.0
namespace App\Services\Ai;

use App\Models\Client as ClientModel;
use App\Services\Ai\AnthropicClientInterface;
use App\Services\Ai\Schemas\MonthlyPlanSchema;
use App\Services\Ai\Telemetry\SpanEmitter;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class MonthlyPlanGenerator
{
    public function __construct(private SpanEmitter $emitter) {}

    public function generate(ClientModel $client, int $year, int $month, AnthropicClientInterface $anthropic, ?string $instructions = null): array
    {
        $expectedCount = (int) $client->monthly_posts;
        abort_if($expectedCount <= 0, 422, 'Cliente sem quota mensal configurada.');

        $template = file_get_contents(resource_path('prompts/plan_system.md'));
        $memory = $client->aiMemory()->orderBy('category')->get()
            ->map(fn ($m) => "- [{$m->category}] (confidence={$m->confidence}) {$m->insight}")
            ->implode("\n") ?: '_(sem memória)_';

        $system = strtr($template, [
            '{{client_name}}'        => (string) $client->name,
            '{{client_segment}}'     => (string) ($client->segment ?? 'não informado'),
            '{{monthly_posts}}'      => (string) $expectedCount,
            '{{monthly_plan_notes}}' => (string) ($client->monthly_plan_notes ?? '(sem breakdown específico — use 3-5 pillars e distribuição natural)'),
            '{{client_memory}}'      => $memory,
            '{{year}}'               => (string) $year,
            '{{month:02d}}'          => sprintf('%02d', $month),
        ]);
        $system = LanguageInstruction::append($system);

        $model   = (string) config('services.anthropic.model_complex');
        $orgId   = (int) $client->organization_id;
        $attrs   = ['client_id' => $client->id, 'model' => $model];
        $attempts  = 0;
        $lastError = null;

        while ($attempts < 3) {
            $attempts++;
            try {
                $userMsg = "Gere {$expectedCount} itens para {$year}-" . sprintf('%02d', $month) . ".";

                // Inject important dates that fall in the target month
                $importantDates = collect($client->important_dates ?? [])
                    ->filter(fn ($d) => isset($d['month']) && (int) $d['month'] === $month)
                    ->values();
                if ($importantDates->isNotEmpty()) {
                    $dateLines = $importantDates->map(fn ($d) =>
                        sprintf('- Dia %02d/%02d: %s', $d['day'], $d['month'], $d['label'])
                    )->implode("\n");
                    $userMsg .= "\n\nDATAS IMPORTANTES DESTE MÊS (obrigatório incluir um post específico para cada uma):\n" . $dateLines;
                }

                if ($instructions) {
                    $userMsg .= "\n\nINSTRUÇÕES ADICIONAIS DO USUÁRIO (seguir com prioridade):\n" . $instructions;
                }
                if ($lastError) {
                    $userMsg .= "\n\nTENTATIVA ANTERIOR FALHOU a validação do schema: " . json_encode($lastError);
                }

                $startedAt = microtime(true);
                $response  = $this->emitter->emit(
                    'monthly_plan',
                    $orgId,
                    $attrs,
                    fn () => $anthropic->messages()->create(
                        maxTokens: 4096,
                        messages: [['role' => 'user', 'content' => $userMsg]],
                        model: $model,  // Opus 4.7
                        system: $system,
                        tools: [[
                            'name'         => 'submit_plan',
                            'description'  => "Submit exactly {$expectedCount} items for the month.",
                            'input_schema' => MonthlyPlanSchema::toolSchema($expectedCount),
                        ]],
                        toolChoice: ['type' => 'tool', 'name' => 'submit_plan'],
                    ),
                );
                $durationMs = (microtime(true) - $startedAt) * 1000;

                // Record token usage if available.
                $usage = $response->usage ?? null;
                if ($usage) {
                    $this->emitter->recordUsage(
                        'monthly_plan',
                        $orgId,
                        $attrs,
                        inputTokens:  (int) ($usage->inputTokens  ?? $usage->input_tokens  ?? 0),
                        outputTokens: (int) ($usage->outputTokens ?? $usage->output_tokens ?? 0),
                        durationMs:   $durationMs,
                    );
                }

                $toolUse = collect($response->content ?? [])->firstWhere('type', 'tool_use');
                if (! $toolUse) {
                    $lastError = ['model' => 'did not call submit_plan'];
                    continue;
                }

                $input = is_array($toolUse->input) ? $toolUse->input : (array) $toolUse->input;

                $validated = validator($input, MonthlyPlanSchema::rules($expectedCount))->validate();

                Log::info('monthly_plan.generated', [
                    'client_id' => $client->id,
                    'year' => $year,
                    'month' => $month,
                    'attempts' => $attempts,
                    'items' => count($validated['items']),
                ]);

                return $validated;

            } catch (ValidationException $e) {
                $lastError = $e->errors();
                Log::warning('monthly_plan.validation_failed', [
                    'client_id' => $client->id, 'attempt' => $attempts, 'errors' => $lastError,
                ]);
            }
        }

        Log::error('monthly_plan.max_retries_exceeded', [
            'client_id' => $client->id, 'last_error' => $lastError,
        ]);
        throw new \RuntimeException('Monthly plan generation failed schema validation 3×.');
    }
}
