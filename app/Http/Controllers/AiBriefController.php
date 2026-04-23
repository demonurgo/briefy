<?php
// (c) 2026 Briefy contributors — AGPL-3.0
namespace App\Http\Controllers;

use App\Http\Requests\UpdateBriefRequest;
use App\Models\Demand;
use App\Services\Ai\AnthropicClientFactory;
use App\Services\Ai\BriefStreamer;
use Illuminate\Http\RedirectResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AiBriefController extends Controller
{
    public function __construct(
        private AnthropicClientFactory $clientFactory,
        private BriefStreamer $streamer,
    ) {}

    /**
     * POST /demands/{demand}/brief/generate — SSE streaming.
     */
    public function generate(Demand $demand): StreamedResponse|RedirectResponse
    {
        $this->authorizeDemand($demand);

        $org = auth()->user()->organization;
        // BYOK graceful degradation (D-33). UI already disables the button when
        // has_anthropic_key is false, but defend in depth.
        if (! $org->hasAnthropicKey()) {
            return back()->with('error', __('app.ai_key_missing'));
        }

        $anthropic = $this->clientFactory->forOrganization($org);

        return response()->eventStream(fn () => yield from $this->streamer->stream($demand, $anthropic));
    }

    /**
     * PATCH /demands/{demand}/brief — manual edit (D-05).
     */
    public function saveEdit(UpdateBriefRequest $request, Demand $demand): RedirectResponse
    {
        $this->authorizeDemand($demand);

        $demand->update([
            'ai_analysis' => array_merge(
                (array) ($demand->ai_analysis ?? []),
                [
                    'brief'                   => $request->validated('brief'),
                    'brief_edited_at'         => now()->toIso8601String(),
                    'brief_edited_by_user_id' => auth()->id(),
                ],
            ),
        ]);

        return back()->with('success', __('app.brief_updated'));
    }

    private function authorizeDemand(Demand $demand): void
    {
        abort_if($demand->organization_id !== auth()->user()->organization_id, 403);
    }
}
