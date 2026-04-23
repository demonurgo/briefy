<?php
// (c) 2026 Briefy contributors — AGPL-3.0
namespace App\Services\Ai;

use App\Models\AiConversation;
use App\Services\Ai\Telemetry\SpanEmitter;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

final class ConversationCompactor
{
    /** Number of recent turns to keep after compaction. */
    public const KEEP_RECENT_TURNS = 10;

    public function __construct(private SpanEmitter $emitter) {}

    /**
     * Compact older messages in a conversation into a single seed summary message.
     *
     * Algorithm (AI-SPEC §4 compaction):
     *  1. Load all messages ordered by id.
     *  2. If total ≤ KEEP_RECENT_TURNS — nothing to do, return early.
     *  3. Separate: [toCompact = messages 1..(N-10)] and [keep = last 10].
     *  4. Summarise toCompact via Haiku (model_cheap) → summary text.
     *  5. In a DB transaction (T-03-64 — atomic, no half-compaction):
     *     a. Insert seed message with role='user', marker prefix, created_at=oldest compacted msg.
     *     b. Delete toCompact messages by id.
     *     c. Set ai_conversations.compacted_at = now().
     *
     * On Haiku failure: log warning and return without throwing (compaction is an optimisation).
     *
     * @param  AiConversation       $conversation
     * @param  AnthropicClientInterface $anthropic
     */
    public function compact(AiConversation $conversation, AnthropicClientInterface $anthropic): void
    {
        $all   = $conversation->messages()->orderBy('id')->get();
        $total = $all->count();

        if ($total <= self::KEEP_RECENT_TURNS) {
            // Nothing to compact yet.
            return;
        }

        $toCompact = $all->take($total - self::KEEP_RECENT_TURNS);
        // $keep = $all->skip($total - self::KEEP_RECENT_TURNS); // kept implicitly

        $transcript = $toCompact
            ->map(fn ($m) => strtoupper($m->role) . ": {$m->content}")
            ->implode("\n---\n");

        $model = (string) config('services.anthropic.model_cheap');
        $orgId = (int) ($conversation->organization_id ?? 0);
        $attrs = ['conversation_id' => $conversation->id, 'model' => $model];

        try {
            $startedAt = microtime(true);
            $resp      = $this->emitter->emit(
                'compact',
                $orgId,
                $attrs,
                fn () => $anthropic->messages()->create(
                    maxTokens: 800,
                    messages: [['role' => 'user', 'content' => "Resuma a conversa abaixo em até 400 tokens, preservando fatos referenciados e decisões tomadas. Escreva em português do Brasil.\n\n{$transcript}"]],
                    model: $model,
                    system: 'You summarise conversations into compact seed-messages for context continuity. Preserve names, dates, client-specific preferences, and any decisions made.',
                ),
            );
            $durationMs = (microtime(true) - $startedAt) * 1000;

            $usage = $resp->usage ?? null;
            if ($usage) {
                $this->emitter->recordUsage(
                    'compact',
                    $orgId,
                    $attrs,
                    inputTokens:  (int) ($usage->inputTokens  ?? $usage->input_tokens  ?? 0),
                    outputTokens: (int) ($usage->outputTokens ?? $usage->output_tokens ?? 0),
                    durationMs:   $durationMs,
                );
            }

            $summary = $resp->content[0]->text ?? '(resumo indisponível)';

            DB::transaction(function () use ($conversation, $toCompact, $summary) {
                // Insert seed message FIRST — use created_at matching the oldest compacted row
                // so ordering remains consistent with the surviving recent messages.
                $oldestCreated = $toCompact->first()->created_at;

                $conversation->messages()->create([
                    'role'       => 'user', // 'system' role not accepted by the API — use 'user' with marker prefix
                    'content'    => '[Resumo da conversa anterior compactada em ' . now()->toIso8601String() . "]\n\n{$summary}",
                    'created_at' => $oldestCreated,
                    'updated_at' => $oldestCreated,
                ]);

                // Delete the compacted messages atomically.
                $conversation->messages()
                    ->whereIn('id', $toCompact->pluck('id'))
                    ->delete();

                // Mark conversation as compacted (T-03-64 — set inside transaction).
                $conversation->update(['compacted_at' => now()]);
            });

            Log::info('chat.compacted', [
                'conversation_id'   => $conversation->id,
                'messages_replaced' => $toCompact->count(),
                'kept'              => self::KEEP_RECENT_TURNS,
            ]);

        } catch (\Throwable $e) {
            Log::warning('chat.compaction_failed', [
                'conversation_id' => $conversation->id,
                'error_class'     => class_basename($e),
            ]);
            // Don't rethrow — compaction is an optional optimisation; the next dispatch will retry.
        }
    }
}
