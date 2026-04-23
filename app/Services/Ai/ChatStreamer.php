<?php
// (c) 2026 Briefy contributors — AGPL-3.0
namespace App\Services\Ai;

use App\Jobs\CompactConversationJob;
use App\Jobs\ExtractClientMemoryJob;
use App\Models\AiConversation;
use App\Services\Ai\Telemetry\SpanEmitter;
use Generator;
use Illuminate\Http\StreamedEvent;
use Illuminate\Support\Facades\Log;

class ChatStreamer
{
    public const COMPACTION_THRESHOLD = 30;

    public function __construct(
        private ChatPromptBuilder $prompts,
        private SpanEmitter $emitter,
    ) {}

    /**
     * Stream the assistant response. Caller is responsible for persisting the USER
     * message BEFORE calling this method (so the turn survives a client disconnect).
     * This method persists only the ASSISTANT message on message_stop.
     *
     * Uses AnthropicClientInterface (not \Anthropic\Client) to honour the BYOK
     * factory pattern and keep test doubles injectable without subclassing the SDK.
     */
    public function stream(AiConversation $conversation, string $userMessage, AnthropicClientInterface $anthropic): Generator
    {
        @set_time_limit(0);

        $demand = $conversation->context_type === 'demand'
            ? \App\Models\Demand::with(['client.aiMemory', 'files', 'comments.user'])->find($conversation->context_id)
            : null;

        abort_unless($demand, 422, 'Chat conversation has no associated demand');

        $system = $this->prompts->chatSystem($demand);

        // Build the turns array from existing history (the user message was already persisted by the controller).
        $history = $conversation->messages()
            ->orderBy('id')
            ->get()
            ->map(fn ($m) => ['role' => $m->role, 'content' => $m->content])
            ->all();

        $assistant       = '';
        $streamStartedAt = microtime(true);
        $model           = (string) config('services.anthropic.model_chat');
        $orgId           = (int) ($demand->organization_id ?? 0);
        $attrs           = ['demand_id' => $demand->id, 'model' => $model];

        try {
            $stream = $this->emitter->emit(
                'chat',
                $orgId,
                $attrs,
                fn () => $anthropic->messages()->createStream(
                    maxTokens: 2048,
                    messages: $history,
                    model: $model,
                    system: $system,
                ),
            );

            $lastUsage = null;

            foreach ($stream as $event) {
                if ($event->type === 'content_block_delta'
                    && ($event->delta->type ?? null) === 'text_delta') {
                    $chunk = $event->delta->text ?? '';
                    $assistant .= $chunk;
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
                    // Record token usage + cost on stream completion.
                    if ($lastUsage) {
                        $this->emitter->recordUsage(
                            'chat',
                            $orgId,
                            $attrs,
                            inputTokens:  (int) ($lastUsage->inputTokens  ?? $lastUsage->input_tokens  ?? 0),
                            outputTokens: (int) ($lastUsage->outputTokens ?? $lastUsage->output_tokens ?? 0),
                            durationMs:   (microtime(true) - $streamStartedAt) * 1000,
                        );
                    }

                    $msg = $conversation->messages()->create([
                        'role'    => 'assistant',
                        'content' => $assistant,
                    ]);

                    // Dispatch post-turn jobs — fire-and-forget, non-blocking.
                    // ExtractClientMemoryJob and CompactConversationJob are implemented in Plan 07.
                    ExtractClientMemoryJob::dispatch($conversation->fresh())->onQueue('ai');

                    if ($conversation->messages()->count() > self::COMPACTION_THRESHOLD) {
                        CompactConversationJob::dispatch($conversation->fresh())->onQueue('ai');
                    }

                    yield new StreamedEvent(
                        event: 'done',
                        data: json_encode([
                            'ok'                   => true,
                            'assistant_message_id' => $msg->id,
                            'compaction_triggered' => $conversation->messages()->count() > self::COMPACTION_THRESHOLD,
                        ], JSON_UNESCAPED_UNICODE),
                    );
                }
            }
        } catch (\Throwable $e) {
            Log::warning('chat.stream_failed', [
                'conversation_id' => $conversation->id,
                'error_class'     => class_basename($e),
                'partial_chars'   => strlen($assistant),
            ]);
            yield new StreamedEvent(
                event: 'error',
                data: json_encode(['message' => __('app.ai_chat_stream_failed')], JSON_UNESCAPED_UNICODE),
            );
        }
    }
}
