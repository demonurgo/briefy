<?php
// (c) 2026 Briefy contributors — AGPL-3.0
namespace App\Services\Ai;

use App\Models\Demand;
use Generator;
use Illuminate\Http\StreamedEvent;
use Illuminate\Support\Facades\Log;

class BriefStreamer
{
    public function __construct(private BriefPromptBuilder $prompts) {}

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

        $buffer = '';

        try {
            $stream = $anthropic->messages()->createStream(
                maxTokens: 2048,
                messages: [['role' => 'user', 'content' => $userMessage]],
                model: (string) config('services.anthropic.model_chat'),  // Sonnet 4.6
                system: $system,
                temperature: 0.7,
            );

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

                if ($event->type === 'message_stop') {
                    // Persist inside the stream so DB is authoritative even if the
                    // client disconnected before receiving the final event.
                    $demand->update([
                        'ai_analysis' => array_merge(
                            (array) ($demand->ai_analysis ?? []),
                            [
                                'brief'               => $buffer,
                                'brief_generated_at'  => now()->toIso8601String(),
                                'brief_model'         => (string) config('services.anthropic.model_chat'),
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
                'demand_id' => $demand->id,
                'error_class' => class_basename($e),
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
