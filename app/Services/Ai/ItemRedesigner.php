<?php
// (c) 2026 Briefy contributors — AGPL-3.0
namespace App\Services\Ai;

use App\Models\PlanningSuggestion;
use App\Services\Ai\AnthropicClientInterface;
use App\Services\Ai\Telemetry\SpanEmitter;

class ItemRedesigner
{
    public function __construct(private SpanEmitter $emitter) {}

    public function redesign(PlanningSuggestion $suggestion, string $feedback, AnthropicClientInterface $anthropic): array
    {
        $demand = $suggestion->demand; // planning-type demand
        $client = $demand?->client;

        $memory = $client
            ? $client->aiMemory()->take(10)->get()->map(fn ($m) => "- [{$m->category}] {$m->insight}")->implode("\n")
            : '_(sem memória)_';

        $template = file_get_contents(resource_path('prompts/redesign_system.md'));
        $system = strtr($template, [
            '{{current_title}}'       => (string) $suggestion->title,
            '{{current_description}}' => (string) $suggestion->description,
            '{{current_channel}}'     => (string) ($suggestion->channel ?? 'other'),
            '{{current_date}}'        => $suggestion->date?->toDateString() ?? '',
            '{{feedback}}'            => $feedback,
            '{{client_memory_short}}' => $memory,
        ]);
        $system = LanguageInstruction::append($system);

        $model  = (string) config('services.anthropic.model_cheap');
        $orgId  = (int) ($client?->organization_id ?? 0);
        $attrs  = ['suggestion_id' => $suggestion->id, 'model' => $model];

        $startedAt = microtime(true);
        $response  = $this->emitter->emit(
            'redesign',
            $orgId,
            $attrs,
            fn () => $anthropic->messages()->create(
                maxTokens: 512,
                messages: [['role' => 'user', 'content' => 'Rewrite the item per feedback. Output JSON only.']],
                model: $model,  // Haiku 4.5
                system: $system,
            ),
        );
        $durationMs = (microtime(true) - $startedAt) * 1000;

        $usage = $response->usage ?? null;
        if ($usage) {
            $this->emitter->recordUsage(
                'redesign',
                $orgId,
                $attrs,
                inputTokens:  (int) ($usage->inputTokens  ?? $usage->input_tokens  ?? 0),
                outputTokens: (int) ($usage->outputTokens ?? $usage->output_tokens ?? 0),
                durationMs:   $durationMs,
            );
        }

        $text = $response->content[0]->text ?? '';
        // Strip code fences if the model ignored the "no fences" rule.
        $text = preg_replace('/^```(?:json)?\s*|\s*```$/m', '', $text);
        $decoded = json_decode(trim($text), true);

        if (! is_array($decoded) || ! isset($decoded['title'], $decoded['description'])) {
            throw new \RuntimeException('Redesign model returned malformed JSON.');
        }

        return [
            'title'       => (string) $decoded['title'],
            'description' => (string) $decoded['description'],
            'channel'     => (string) ($decoded['channel'] ?? $suggestion->channel ?? 'other'),
            'date'        => (string) ($decoded['date'] ?? $suggestion->date?->toDateString()),
        ];
    }
}
