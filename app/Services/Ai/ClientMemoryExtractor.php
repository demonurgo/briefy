<?php
// (c) 2026 Briefy contributors — AGPL-3.0
namespace App\Services\Ai;

use App\Models\AiConversation;
use App\Models\Client as ClientModel;
use App\Models\ClientAiMemory;
use App\Services\Ai\Schemas\MemoryInsightSchema;
use Illuminate\Support\Facades\Log;

class ClientMemoryExtractor
{
    // PII patterns for Brazil + generic email/phone. Applied before DB write (Dimension 10 / T-03-61).
    private const PII_PATTERNS = [
        '/\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/',              // CPF
        '/\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/',       // CNPJ
        '/[\w.+-]+@[\w-]+\.[\w.-]+/',                    // email
        '/\b(?:\+?55\s?)?\(?\d{2}\)?\s?9?\d{4}-?\d{4}\b/', // BR phone
    ];

    /**
     * Extract durable client insights from the last N turns of a conversation.
     *
     * Gates applied in order:
     *   1. Schema validation (required fields + category whitelist)
     *   2. Confidence gate  (≥ MIN_CONFIDENCE_AUTO_APPLY)
     *   3. PII scrub        (any PII match → discard entry, log warning)
     *   4. Idempotent upsert by (client_id, category, insight_hash)
     *
     * @param  AiConversation       $conversation
     * @param  AnthropicClientInterface $anthropic
     * @return array Accepted insights written to DB
     */
    public function extract(AiConversation $conversation, AnthropicClientInterface $anthropic): array
    {
        if ($conversation->context_type !== 'demand') {
            return []; // only demand-scoped chats populate client memory
        }

        /** @var \App\Models\Demand $demand */
        $demand = \App\Models\Demand::with('client')->find($conversation->context_id);
        if (! $demand || ! $demand->client) {
            return [];
        }

        /** @var ClientModel $client */
        $client = $demand->client;

        // Last 10 turns — enough signal without blowing token budget.
        $transcript = $conversation->messages()->orderBy('id')
            ->limit(10)
            ->get()
            ->reverse()
            ->map(fn ($m) => strtoupper($m->role) . ": {$m->content}")
            ->implode("\n---\n");

        if (empty($transcript)) {
            return [];
        }

        $system = <<<'SYS'
You extract durable insights about a marketing-agency client from a chat transcript.
Call record_insights EXACTLY once. Include only insights that are likely true for this client in general (tone, recurring patterns, preferences, things-to-avoid, terminology). Do NOT record ephemeral statements or one-off comments. Do NOT record personal data about individual people (no names of non-client individuals, no emails, no phone numbers, no CPF/CNPJ). Confidence 0-1; use <0.6 for weak signals (they will be filtered).
SYS;

        try {
            $response = $anthropic->messages()->create(
                maxTokens: 1024,
                messages: [['role' => 'user', 'content' => "Client: {$client->name}\n\nTranscript:\n\n{$transcript}"]],
                model: (string) config('services.anthropic.model_cheap'),
                system: $system,
                tools: [[
                    'name'         => 'record_insights',
                    'description'  => 'Record durable client-voice insights extracted from the conversation.',
                    'input_schema' => MemoryInsightSchema::toolSchema(),
                ]],
                tool_choice: ['type' => 'tool', 'name' => 'record_insights'],
                temperature: 0.2,
            );

            $toolUse = collect($response->content ?? [])->firstWhere('type', 'tool_use');
            if (! $toolUse) {
                Log::info('memory.no_tool_use', ['conversation_id' => $conversation->id]);
                return [];
            }

            $input    = is_array($toolUse->input) ? $toolUse->input : (array) $toolUse->input;
            $insights = $input['insights'] ?? [];

            $accepted = [];
            foreach ($insights as $i) {
                // Gate 1: Schema-level sanity
                if (empty($i['category']) || empty($i['insight']) || ! isset($i['confidence'])) {
                    continue;
                }

                // Gate 2: Confidence gate (Dimension 10 / T-03-61)
                if ((float) $i['confidence'] < MemoryInsightSchema::MIN_CONFIDENCE_AUTO_APPLY) {
                    continue;
                }

                // Gate 3a: Category whitelist (T-03-60)
                if (! in_array($i['category'], MemoryInsightSchema::CATEGORIES, true)) {
                    continue;
                }

                // Gate 3b: PII scrub (T-03-61) — if any PII pattern matches, discard the entry.
                foreach (self::PII_PATTERNS as $re) {
                    if (preg_match($re, $i['insight'])) {
                        Log::warning('memory.pii_rejected', [
                            'client_id' => $client->id,
                            'category'  => $i['category'],
                        ]);
                        continue 2;
                    }
                }

                // Gate 4: Idempotent upsert scoped to (client_id, category, insight_hash).
                // client_id is ALWAYS from $demand->client — NEVER from tool output (T-03-62).
                $hash = sha1(mb_strtolower(trim($i['insight'])));

                ClientAiMemory::updateOrCreate(
                    [
                        'client_id'    => $client->id,    // CRITICAL: scoped to THIS client — never write cross-client (T-03-62)
                        'category'     => $i['category'],
                        'insight_hash' => $hash,
                    ],
                    [
                        'organization_id' => $client->organization_id,
                        'insight'         => $i['insight'],
                        'confidence'      => (float) $i['confidence'],
                        'source'          => 'chat',
                        'status'          => 'active',
                    ],
                );

                $accepted[] = $i;
            }

            Log::info('memory.extracted', [
                'conversation_id' => $conversation->id,
                'client_id'       => $client->id,
                'candidates'      => count($insights),
                'accepted'        => count($accepted),
            ]);

            return $accepted;

        } catch (\Throwable $e) {
            Log::warning('memory.extraction_failed', [
                'conversation_id' => $conversation->id,
                'error_class'     => class_basename($e),
            ]);
            return [];
        }
    }
}
