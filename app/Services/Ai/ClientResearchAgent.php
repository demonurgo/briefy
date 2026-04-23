<?php
// (c) 2026 Briefy contributors — AGPL-3.0
namespace App\Services\Ai;

use App\Models\Client as ClientModel;
use App\Models\ClientResearchSession;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Wrapper around the Managed Agents HTTP API. No dedicated PHP SDK exists
 * for MA in 0.16 of anthropic-ai/sdk — we use raw HTTP via Laravel's Http facade.
 *
 * BYOK: every call authenticates with the organization's own API key
 * (decrypted from organizations.anthropic_api_key_encrypted).
 *
 * Graceful fallback (per plan interfaces note):
 * (a) All MA calls are inside try/catch with detailed logging.
 * (b) On 404 / beta header rejection: session is marked failed; controller shows
 *     "Pesquisa automática indisponível; preencha a memória do cliente manualmente via Chat IA".
 * (c) Session status=failed with progress_summary capturing the error class.
 */
final class ClientResearchAgent
{
    private const API_BASE   = 'https://api.anthropic.com/v1';
    private const MAX_PAGES  = 30;

    public function __construct(private ClientResearchPromptBuilder $prompts) {}

    /**
     * Create a new research session for this client. Creates (or reuses) the per-org
     * agent, then creates a session attached to the agent.
     *
     * @throws \RuntimeException on API failure (caller should mark session as failed)
     */
    public function launch(ClientModel $client): ClientResearchSession
    {
        $org = $client->organization;
        abort_if(! $org || ! $org->hasAnthropicKey(), 402, 'Organization has no Anthropic API key.');

        // Create the DB row first so we have an ID regardless of what the API returns.
        $session = ClientResearchSession::create([
            'client_id' => $client->id,
            'status'    => 'queued',
        ]);

        try {
            $agentId = $this->ensureAgent($org, $client);

            $envId = $org->client_research_environment_id;
            abort_if(empty($envId), 422, 'Organization has no MA environment ID configured in /settings/ai.');

            // Step 1: Create the session (idle state).
            $resp = $this->httpFor($org)->post(self::API_BASE . '/sessions', [
                'agent'          => $agentId,
                'environment_id' => $envId,
            ]);

            if (! $resp->ok()) {
                throw new \RuntimeException("MA session create failed: HTTP {$resp->status()} {$resp->body()}");
            }

            $body      = $resp->json();
            $sessionId = $body['id'] ?? $body['session_id'] ?? null;
            $eventsUrl = self::API_BASE . "/sessions/{$sessionId}/events";

            // Step 2: Send the initial user message to kick the agent out of idle.
            // The session starts in idle state and only begins working after receiving a user.message event.
            $evResp = $this->httpFor($org)->post(self::API_BASE . "/sessions/{$sessionId}/events", [
                'events' => [
                    [
                        'type'    => 'user.message',
                        'content' => [
                            ['type' => 'text', 'text' => $this->prompts->userMessage($client)],
                        ],
                    ],
                ],
            ]);

            if (! $evResp->ok()) {
                throw new \RuntimeException("MA send initial message failed: HTTP {$evResp->status()} {$evResp->body()}");
            }

            $session->update([
                'managed_agent_session_id' => $sessionId,
                'status'                   => 'running',
                'started_at'               => now(),
                'events_url'               => $eventsUrl,
                'progress_summary'         => 'Pesquisa iniciada.',
            ]);

            // Schedule the poll job.
            \App\Jobs\PollClientResearchSessionJob::dispatch($session->fresh())
                ->onQueue('ai')
                ->delay(now()->addSeconds(30));

            return $session->fresh();

        } catch (\Throwable $e) {
            $session->update([
                'status'           => 'failed',
                'progress_summary' => 'Falha ao iniciar: ' . class_basename($e),
            ]);
            Log::error('ma.launch_failed', [
                'client_id'    => $client->id,
                'session_id'   => $session->id,
                'error_class'  => class_basename($e),
                'error_message' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    /**
     * Ensure the per-org MA agent exists. Creates on first use; reuses ID on subsequent calls.
     */
    private function ensureAgent($org, ClientModel $client): string
    {
        if (! empty($org->client_research_agent_id)) {
            return $org->client_research_agent_id;
        }

        $resp = $this->httpFor($org)->post(self::API_BASE . '/agents', [
            'name'   => "Briefy Client Research — {$org->name}",
            'model'  => (string) config('services.anthropic.model_complex'),
            'system' => $this->prompts->system(),
            'tools'  => [
                ['type' => 'web_search'],
                ['type' => 'web_fetch'],
            ],
            'metadata' => ['briefy_organization_id' => $org->id],
        ]);

        if (! $resp->ok()) {
            throw new \RuntimeException("MA agent create failed: HTTP {$resp->status()} {$resp->body()}");
        }

        $body = $resp->json();
        $id   = $body['id'] ?? $body['agent_id'] ?? null;
        abort_if(empty($id), 502, 'MA agent response missing id');

        $org->update(['client_research_agent_id' => $id]);
        return $id;
    }

    /**
     * Fetch the current MA session state (for polling).
     *
     * @return array MA session JSON
     * @throws \RuntimeException on non-OK response
     */
    public function fetchSession(ClientResearchSession $session): array
    {
        $org  = $session->client->organization;
        $resp = $this->httpFor($org)->get(self::API_BASE . "/sessions/{$session->managed_agent_session_id}");
        if (! $resp->ok()) {
            throw new \RuntimeException("MA session fetch failed: HTTP {$resp->status()}");
        }
        return $resp->json();
    }

    /**
     * Fetch a batch of events since an optional cursor. Used by the poll job.
     * Returns ['events' => [...], 'next_cursor' => string|null].
     *
     * On non-OK response returns empty batch (non-fatal — poll job will retry).
     */
    public function fetchEvents(ClientResearchSession $session, ?string $cursor = null): array
    {
        $org = $session->client->organization;
        $url = self::API_BASE . "/sessions/{$session->managed_agent_session_id}/events";
        if ($cursor) {
            $url .= '?after=' . urlencode($cursor);
        }

        $resp = $this->httpFor($org)->get($url);
        if (! $resp->ok()) {
            // Non-fatal: return empty batch; poll job will retry after 30s.
            Log::warning('ma.events_fetch_failed', [
                'session_id'  => $session->id,
                'http_status' => $resp->status(),
            ]);
            return ['events' => [], 'next_cursor' => $cursor];
        }
        $body = $resp->json();
        return [
            'events'      => $body['events'] ?? $body['data'] ?? [],
            'next_cursor' => $body['next_cursor'] ?? $body['cursor'] ?? null,
        ];
    }

    /**
     * Cancel a running MA session: send interrupt event then delete the session.
     * Best-effort — errors are caught so the local DB row is always updated.
     */
    public function cancel(ClientResearchSession $session): void
    {
        $org = $session->client->organization;
        $maId = $session->managed_agent_session_id;

        if ($maId) {
            // 1. Send interrupt event to stop the agent gracefully.
            try {
                $this->httpFor($org)->post(self::API_BASE . "/sessions/{$maId}/events", [
                    'events' => [['type' => 'user.interrupt']],
                ]);
            } catch (\Throwable) { /* best-effort */ }

            // 2. Delete the MA session to free resources.
            try {
                $this->httpFor($org)->delete(self::API_BASE . "/sessions/{$maId}");
            } catch (\Throwable) { /* best-effort */ }
        }

        $session->update([
            'status'           => 'terminated',
            'completed_at'     => now(),
            'progress_summary' => 'Pesquisa cancelada pelo usuário.',
        ]);
    }

    /**
     * Build an authenticated HTTP client for the given organization (BYOK).
     * Uses the beta_ma header from config/services.php (managed-agents-2026-04-01).
     */
    private function httpFor($org): \Illuminate\Http\Client\PendingRequest
    {
        return Http::withHeaders([
            'x-api-key'         => $org->anthropic_api_key,
            'anthropic-beta'    => (string) config('services.anthropic.beta_ma'),
            'anthropic-version' => '2023-06-01',
            'content-type'      => 'application/json',
        ])->timeout(60)->retry(2, 1000);
    }
}
