<?php
// (c) 2026 Briefy contributors — AGPL-3.0
namespace App\Http\Controllers;

use App\Models\Client;
use App\Models\ClientResearchSession;
use App\Services\Ai\ClientResearchAgent;
use App\Services\Ai\CostEstimator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ClientResearchController extends Controller
{
    public function __construct(private ClientResearchAgent $agent) {}

    /**
     * POST /clients/{client}/research
     * Launch a Managed Agents research session for this client.
     */
    public function launch(Client $client): RedirectResponse
    {
        $this->authorizeClient($client);

        $org = auth()->user()->organization;
        if (! $org->hasAnthropicKey()) {
            return back()->with('error', __('app.ai_key_missing'));
        }

        // D-35: require at least one social handle or website (T-03-115).
        $handles = $client->social_handles ?? [];
        if (empty(array_filter($handles))) {
            return back()->with('error', __('app.ma_no_sources'));
        }

        // Reject if there is already an active session for this client.
        $existing = $client->researchSessions()->latest()->first();
        if ($existing && in_array($existing->status, ['queued', 'running', 'idle'])) {
            return back()->with('error', __('app.ma_already_running'));
        }

        try {
            $this->agent->launch($client);
            return back()->with('success', __('app.ma_started'));
        } catch (\Throwable $e) {
            report($e);
            return back()->with('error', __('app.ma_launch_failed'));
        }
    }

    /**
     * GET /clients/{client}/research/estimate-cost
     * Returns rough cost for the pre-launch confirmation modal (D-34).
     */
    public function estimateCost(Client $client, CostEstimator $estimator): JsonResponse
    {
        $this->authorizeClient($client);
        $cost = $estimator->clientResearchSession();
        return response()->json([
            'cost_usd'         => round($cost, 4),
            'model'            => 'opus',
            'duration_minutes' => '20-40',
            'confirm_required' => true, // always prompt for MA — expensive + long-running per D-34
        ]);
    }

    /**
     * GET /clients/{client}/research/{session}
     * Returns session status JSON (for polling by the timeline modal).
     */
    /** GET /clients/{client}/research — redirects to latest session */
    public function latest(Client $client): \Illuminate\Http\RedirectResponse
    {
        $this->authorizeClient($client);
        $session = $client->researchSessions()->latest()->firstOrFail();
        return redirect()->route('clients.research.show', [$client, $session]);
    }

    public function show(Client $client, ClientResearchSession $session): \Inertia\Response|JsonResponse
    {
        $this->authorizeClient($client);
        abort_if($session->client_id !== $client->id, 404);

        // JSON for API consumers (e.g. polling badge).
        if (request()->expectsJson()) {
            return response()->json([
                'id'                          => $session->id,
                'status'                      => $session->status,
                'started_at'                  => optional($session->started_at)->toIso8601String(),
                'completed_at'                => optional($session->completed_at)->toIso8601String(),
                'progress_summary'            => $session->progress_summary,
                'estimated_remaining_minutes' => $session->started_at
                    ? max(0, 30 - (int) $session->started_at->diffInMinutes(now()))
                    : 30,
            ]);
        }

        // Inertia page for browser navigation.
        $insights = \App\Models\ClientAiMemory::where('client_id', $client->id)
            ->where('source', 'managed_agent_onboarding')
            ->orderBy('category')->orderByDesc('confidence')
            ->get(['id', 'category', 'insight', 'confidence', 'status', 'created_at']);

        return \Inertia\Inertia::render('Clients/ResearchShow', [
            'client'  => ['id' => $client->id, 'name' => $client->name],
            'session' => [
                'id'             => $session->id,
                'status'         => $session->status,
                'started_at'     => optional($session->started_at)->toIso8601String(),
                'completed_at'   => optional($session->completed_at)->toIso8601String(),
                'progress_summary' => $session->progress_summary,
                'full_report'    => $session->full_report,
            ],
            'insights' => $insights,
        ]);
    }

    /**
     * GET /clients/{client}/research/{session}/events
     * Proxies a digest of session events to the browser as Server-Sent Events.
     * Does NOT forward raw MA events or any authentication credentials.
     *
     * NOTE: This is a server-side polling loop over our own DB, not a direct
     * proxy of the MA SSE stream. The browser gets status frames every ~5 s.
     * The PollClientResearchSessionJob runs in the background and keeps the
     * DB row up to date.
     */
    public function streamEvents(Client $client, ClientResearchSession $session): StreamedResponse
    {
        $this->authorizeClient($client);
        abort_if($session->client_id !== $client->id, 404);

        return response()->eventStream(function () use ($session) {
            @set_time_limit(0);

            $stopAt = now()->addMinutes(5); // browser stream capped at 5 min; poll job continues background

            while (now()->lt($stopAt)) {
                $fresh = $session->fresh();

                if (in_array($fresh->status, ['completed', 'failed', 'terminated'])) {
                    yield new \Illuminate\Http\StreamedEvent(
                        event: 'status',
                        data: json_encode([
                            'status'           => $fresh->status,
                            'progress_summary' => $fresh->progress_summary,
                        ]),
                    );
                    yield new \Illuminate\Http\StreamedEvent(
                        event: 'done',
                        data: json_encode(['ok' => true]),
                    );
                    return;
                }

                yield new \Illuminate\Http\StreamedEvent(
                    event: 'status',
                    data: json_encode([
                        'status'           => $fresh->status,
                        'progress_summary' => $fresh->progress_summary,
                    ]),
                );

                // Sleep 5s between emits (lightweight digest polling).
                usleep(5 * 1_000_000);
            }

            // 5-min cap reached: tell the browser the stream is closing.
            // The poll job keeps running in the background.
            yield new \Illuminate\Http\StreamedEvent(
                event: 'done',
                data: json_encode(['ok' => true, 'partial' => true]),
            );
        });
    }

    /** DELETE /clients/{client}/research/{session} */
    public function destroy(Client $client, ClientResearchSession $session): \Illuminate\Http\RedirectResponse
    {
        $this->authorizeClient($client);
        abort_if($session->client_id !== $client->id, 404);

        // If session is still running, cancel it on MA first.
        if (in_array($session->status, ['queued', 'running', 'idle'])) {
            $this->agent->cancel($session);
        }

        $session->delete();

        return redirect()->route('clients.show', $client)
            ->with('success', 'Pesquisa excluída.');
    }

    /** POST /clients/{client}/research/{session}/cancel */
    public function cancel(Client $client, ClientResearchSession $session): \Illuminate\Http\RedirectResponse
    {
        $this->authorizeClient($client);
        abort_if($session->client_id !== $client->id, 404);

        $this->agent->cancel($session);

        return redirect()->route('clients.research.show', [$client, $session])
            ->with('success', 'Pesquisa cancelada.');
    }

    /**
     * Org-scoping guard: ensure the client belongs to the authenticated user's org.
     * Cross-org access → 403 (T-03-112 boundary).
     */
    private function authorizeClient(Client $client): void
    {
        abort_if($client->organization_id !== auth()->user()->current_organization_id, 403);
    }
}
