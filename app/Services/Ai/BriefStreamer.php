<?php
// (c) 2026 Briefy contributors — AGPL-3.0
namespace App\Services\Ai;

use App\Models\Demand;
use App\Services\Ai\Telemetry\SpanEmitter;
use Generator;
use Illuminate\Http\StreamedEvent;
use Illuminate\Support\Facades\Log;

class BriefStreamer
{
    public function __construct(
        private BriefPromptBuilder $prompts,
        private SpanEmitter $emitter,
    ) {}

    /**
     * Run the streaming generation. Yields StreamedEvent instances and persists
     * ai_analysis.brief on message_stop. Caller (controller) wraps this in
     * response()->eventStream(fn () => yield from $this->stream(...)).
     */
    public function stream(Demand $demand, AnthropicClientInterface $anthropic): Generator
    {
        // Long streams — disable PHP's max_execution_time (AI-SPEC Common Pitfall #3).
        @set_time_limit(0);

        [$system, $userMessage] = $this->prompts->build($demand);

        $buffer          = '';
        $streamStartedAt = microtime(true);
        $model           = (string) config('services.anthropic.model_chat');
        $orgId           = (int) $demand->organization_id;
        $attrs           = ['demand_id' => $demand->id, 'model' => $model];

        try {
            $stream = $this->emitter->emit(
                'brief',
                $orgId,
                $attrs,
                fn () => $anthropic->messages()->createStream(
                    maxTokens: 2048,
                    messages: [['role' => 'user', 'content' => $userMessage]],
                    model: $model,
                    system: $system,
                ),
            );

            $lastUsage = null;

            foreach ($stream as $event) {
                if ($event->type === 'content_block_delta'
                    && ($event->delta->type ?? null) === 'text_delta') {
                    $chunk = $event->delta->text ?? '';
                    $buffer .= $chunk;
                    yield new StreamedEvent(
                        event: 'delta',
                        data: json_encode(['text' => $chunk], JSON_UNESCAPED_UNICODE),
                    );
                }

                // Capture cumulative usage as it arrives.
                if (isset($event->usage)) {
                    $lastUsage = $event->usage;
                }

                if ($event->type === 'message_stop') {
                    // Record token usage + cost now that we have the final counts.
                    if ($lastUsage) {
                        $this->emitter->recordUsage(
                            'brief',
                            $orgId,
                            $attrs,
                            inputTokens:  (int) ($lastUsage->inputTokens  ?? $lastUsage->input_tokens  ?? 0),
                            outputTokens: (int) ($lastUsage->outputTokens ?? $lastUsage->output_tokens ?? 0),
                            durationMs:   (microtime(true) - $streamStartedAt) * 1000,
                        );
                    }

                    // Persist inside the stream so DB is authoritative even if the
                    // client disconnected before receiving the final event.
                    $demand->update([
                        'ai_analysis' => array_merge(
                            (array) ($demand->ai_analysis ?? []),
                            [
                                'brief'               => $buffer,
                                'brief_generated_at'  => now()->toIso8601String(),
                                'brief_model'         => $model,
                            ]
                        ),
                    ]);

                    yield new StreamedEvent(
                        event: 'done',
                        data: json_encode(['ok' => true], JSON_UNESCAPED_UNICODE),
                    );
                }
            }
        } catch (\Throwable $e) {
            Log::warning('brief.stream_failed', [
                'demand_id'     => $demand->id,
                'error_class'   => class_basename($e),
                'partial_chars' => strlen($buffer),
            ]);
            yield new StreamedEvent(
                event: 'error',
                data: json_encode([
                    'message' => __('app.ai_stream_failed'),
                ], JSON_UNESCAPED_UNICODE),
            );
        }
    }
}
