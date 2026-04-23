<?php
// (c) 2026 Briefy contributors — AGPL-3.0
namespace App\Jobs;

use App\Models\ClientAiMemory;
use App\Models\ClientResearchSession;
use App\Services\Ai\ClientResearchAgent;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class PollClientResearchSessionJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries   = 3;
    public int $timeout = 120;

    // Maximum total wall time before giving up (40 min per D-36 + buffer).
    private const MAX_SESSION_MINUTES = 45;

    public function __construct(
        public ClientResearchSession $session,
        public ?string $cursor = null
    ) {}

    public function handle(ClientResearchAgent $agent): void
    {
        $this->session->refresh();

        // Stop polling terminal states.
        if (in_array($this->session->status, ['completed', 'failed', 'terminated'])) {
            return;
        }

        // Hard timeout — MA session must complete within 45 min of start (D-36 / T-03-114).
        if ($this->session->started_at
            && $this->session->started_at->diffInMinutes(now()) > self::MAX_SESSION_MINUTES
        ) {
            $this->session->update([
                'status'           => 'failed',
                'progress_summary' => 'Tempo excedido (sem resposta em 45 min).',
                'completed_at'     => now(),
            ]);
            return;
        }

        try {
            // Fetch events since last cursor.
            $batch  = $agent->fetchEvents($this->session, $this->cursor);
            $events = $batch['events'] ?? [];

            foreach ($events as $event) {
                $this->processEvent($event);
            }

            $nextCursor = $batch['next_cursor'] ?? $this->cursor;

            // Check the session status via API.
            $remote       = $agent->fetchSession($this->session);
            $remoteStatus = strtolower($remote['status'] ?? 'running');

            if (in_array($remoteStatus, ['completed', 'succeeded'])) {
                $this->session->update([
                    'status'           => 'completed',
                    'completed_at'     => now(),
                    'progress_summary' => 'Pesquisa concluída.',
                ]);
                return;
            }

            if (in_array($remoteStatus, ['failed', 'errored'])) {
                $this->session->update([
                    'status'           => 'failed',
                    'completed_at'     => now(),
                    'progress_summary' => 'Pesquisa falhou no servidor MA.',
                ]);
                return;
            }

            // Update progress_summary from the most recent event's digest, if any.
            if (! empty($events)) {
                $last = end($events);
                $this->session->update([
                    'status'           => 'running',
                    'progress_summary' => $this->summarizeEvent($last),
                ]);
            }

            // Re-dispatch in 30s (self-rescheduling pattern).
            self::dispatch($this->session->fresh(), $nextCursor)
                ->onQueue('ai')
                ->delay(now()->addSeconds(30));

        } catch (\Throwable $e) {
            Log::warning('ma.poll_failed', [
                'session_id'  => $this->session->id,
                'error_class' => class_basename($e),
            ]);
            // Retry with backoff — do NOT mark failed yet; transient network errors can recover.
            self::dispatch($this->session->fresh(), $this->cursor)
                ->onQueue('ai')
                ->delay(now()->addSeconds(60));
        }
    }

    /**
     * Process a single MA event. We care primarily about tool_use events
     * where name='record_insights' — these carry the insight payload (T-03-111).
     */
    private function processEvent(array $event): void
    {
        $type = $event['type'] ?? '';
        if ($type !== 'tool_use' && $type !== 'message.tool_use') {
            return;
        }

        $name = $event['name'] ?? $event['tool_name'] ?? '';
        if ($name !== 'record_insights') {
            return;
        }

        $input = $event['input'] ?? $event['arguments'] ?? [];
        if (is_string($input)) {
            $input = json_decode($input, true) ?? [];
        }
        $insights = $input['insights'] ?? [];

        // T-03-112: client_id always from session model — never from event payload.
        $client = $this->session->client;

        // PII scrub patterns (T-03-111): CPF, CNPJ, email, BR mobile phone.
        $piiPatterns = [
            '/\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/',                      // CPF
            '/\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/',               // CNPJ
            '/[\w.+-]+@[\w-]+\.[\w.-]+/',                              // email
            '/\b(?:\+?55\s?)?\(?\d{2}\)?\s?9?\d{4}-?\d{4}\b/',       // BR phone
        ];

        $written = 0;
        foreach ($insights as $i) {
            // Schema validation gate (T-03-111).
            if (empty($i['category']) || empty($i['insight']) || ! isset($i['confidence'])) {
                continue;
            }
            if (! in_array($i['category'], ['tone', 'patterns', 'preferences', 'avoid', 'terminology'], true)) {
                continue;
            }

            // PII scrub: skip insights containing personal data.
            $containsPii = false;
            foreach ($piiPatterns as $re) {
                if (preg_match($re, $i['insight'])) {
                    $containsPii = true;
                    break;
                }
            }
            if ($containsPii) {
                continue;
            }

            // D-38 (WARNING 7 revision): low-confidence insights persist with status='suggested'
            // (NOT dropped). High-confidence (>= 0.6) persist with status='active'.
            $status = ((float) $i['confidence'] >= 0.6) ? 'active' : 'suggested';

            ClientAiMemory::updateOrCreate(
                [
                    'client_id' => $client->id,
                    'category'  => $i['category'],
                    'insight'   => $i['insight'],
                ],
                [
                    'organization_id' => $client->organization_id,
                    'confidence'      => (float) $i['confidence'],
                    'source'          => 'managed_agent_onboarding',
                    'status'          => $status,
                ],
            );
            $written++;
        }

        Log::info('ma.insights_captured', [
            'session_id' => $this->session->id,
            'client_id'  => $client->id,
            'count'      => $written,
            'total_raw'  => count($insights),
        ]);
    }

    private function summarizeEvent(array $event): string
    {
        $type    = $event['type'] ?? 'event';
        $summary = match ($type) {
            'tool_use', 'message.tool_use'       => 'Coletando insights…',
            'tool_result', 'message.tool_result'  => 'Analisando página crawleada…',
            'message.text'                        => 'Analisando conteúdo…',
            default                               => "Processando ({$type})…",
        };
        return mb_substr($summary, 0, 120);
    }

    /**
     * Called by Laravel when all retries have been exhausted.
     * Marks the session as definitively failed (T-03-114).
     */
    public function failed(\Throwable $e): void
    {
        $this->session->update([
            'status'           => 'failed',
            'progress_summary' => 'Falha irrecuperável: ' . class_basename($e),
            'completed_at'     => now(),
        ]);
        Log::error('ma.poll_exhausted', [
            'session_id'   => $this->session->id,
            'error_class'  => class_basename($e),
            'error_message' => $e->getMessage(),
        ]);
    }
}
