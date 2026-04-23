<?php
// (c) 2026 Briefy contributors — AGPL-3.0
namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\TestAnthropicKeyRequest;
use Anthropic\Client;
use Anthropic\RequestOptions;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Inertia\Inertia;
use Inertia\Response;

class AiController extends Controller
{
    public function edit(): Response
    {
        $user = auth()->user();
        abort_unless($user->isAdmin(), 403);  // H2 — admin role only (enum: admin|collaborator)

        return Inertia::render('Settings/Ai', [
            'organization' => [
                'id'                           => $user->organization->id,
                'name'                         => $user->organization->name,
                'has_anthropic_key'            => $user->organization->hasAnthropicKey(),
                'anthropic_api_key_mask'       => $user->organization->anthropic_api_key_mask,
                'key_valid'                    => (bool) ($user->organization->anthropic_key_valid ?? false),
                'managed_agents_enabled'       => (bool) ($user->organization->anthropic_managed_agents_ok ?? false),
                'last_key_check_at'            => optional($user->organization->anthropic_key_checked_at)->toIso8601String(),
                'client_research_agent_id'     => $user->organization->client_research_agent_id,
                'client_research_environment_id' => $user->organization->client_research_environment_id,
            ],
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $user = auth()->user();
        abort_unless($user->isAdmin(), 403);  // H2

        $request->validate([
            'anthropic_api_key'              => ['nullable', 'string', 'starts_with:sk-ant-', 'min:30', 'max:200'],
            'client_research_agent_id'       => ['nullable', 'string', 'max:100'],
            'client_research_environment_id' => ['nullable', 'string', 'max:100'],
        ]);

        $newKey   = $request->input('anthropic_api_key') ?: null;
        $agentId  = $request->input('client_research_agent_id') ?: null;
        $envId    = $request->input('client_research_environment_id') ?: null;

        $update = [
            'client_research_agent_id'       => $agentId,
            'client_research_environment_id' => $envId,
        ];

        if ($newKey !== null) {
            // Key changed — invalidate health flags until next testKey.
            $update['anthropic_api_key_encrypted'] = $newKey;
            $update['anthropic_key_valid']         = false;
            $update['anthropic_managed_agents_ok'] = (bool) $agentId; // trust manual agent ID
            $update['anthropic_key_checked_at']    = null;
        } elseif ($agentId !== null) {
            // No key change but agent ID set — enable MA flag.
            $update['anthropic_managed_agents_ok'] = true;
        } elseif ($agentId === null && $request->has('client_research_agent_id')) {
            // Agent ID explicitly cleared — disable MA flag.
            $update['anthropic_managed_agents_ok'] = false;
        }

        $user->organization->update($update);

        return back()->with('success', __('app.ai_key_saved'));
    }

    /**
     * Throttled to 3/min via route-level middleware (see routes/web.php).
     * Persists key health for downstream gate logic (M3).
     */
    public function testKey(TestAnthropicKeyRequest $request): \Illuminate\Http\JsonResponse
    {
        $user = auth()->user();
        abort_unless($user->isAdmin(), 403);  // H2

        $key = (string) $request->input('anthropic_api_key');
        $chatOk = false;
        $maOk = false;
        $errorClass = null;

        // Primary probe: minimal chat call. Confirms key authenticates against core API.
        try {
            $client = new Client(
                apiKey: $key,
                requestOptions: RequestOptions::with(maxRetries: 0, timeout: 15),
            );
            $client->messages->create(
                maxTokens: 1,
                messages: [['role' => 'user', 'content' => 'ping']],
                model: (string) config('services.anthropic.model_cheap'),
            );
            $chatOk = true;
        } catch (\Throwable $e) {
            $errorClass = class_basename($e);
        }

        // Secondary probe: Managed Agents beta access.
        // If the org already has a manually-configured agent ID, trust it — the API probe
        // endpoint may not be accessible even for accounts with MA console access.
        $hasManualAgentId = (bool) $user->organization->client_research_agent_id;
        if ($chatOk) {
            if ($hasManualAgentId) {
                $maOk = true;
            } else {
                try {
                    $resp = Http::withHeaders([
                        'authorization'     => "Bearer {$key}",
                        'anthropic-beta'    => (string) config('services.anthropic.beta_ma'),
                        'anthropic-version' => '2023-06-01',
                    ])->timeout(10)->get('https://api.anthropic.com/v1/agents', ['limit' => 0]);
                    $maOk = in_array($resp->status(), [200, 204], true);
                } catch (\Throwable $e) {
                    $maOk = false;
                }
            }
        }

        $ok = $chatOk;

        // M3 — persist health to the authenticated user's organization. This is what downstream
        // gates (Plan 04/05/07/12) check via Inertia shared props (key_valid, managed_agents_enabled).
        // Only update if the tested key matches the one currently stored — prevents writing stale
        // health for a different key that might be in the form but not yet saved.
        if ($user->organization->anthropic_api_key === $key) {
            $user->organization->update([
                'anthropic_key_valid'         => $chatOk,
                'anthropic_managed_agents_ok' => $maOk,
                'anthropic_key_checked_at'    => now(),
            ]);
        }

        return response()->json([
            'ok'               => $ok,
            'chat_ok'          => $chatOk,
            'managed_agents_ok' => $maOk,
            'message'          => $ok
                ? ($maOk ? __('app.ai_key_valid') : __('app.ai_key_valid_no_ma'))
                : __('app.ai_key_invalid'),
            'error_class'      => $errorClass,
        ], $ok ? 200 : 422);
    }
}
