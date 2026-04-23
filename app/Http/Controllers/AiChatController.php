<?php
// (c) 2026 Briefy contributors — AGPL-3.0
namespace App\Http\Controllers;

use App\Http\Requests\ChatMessageRequest;
use App\Models\AiConversation;
use App\Models\Demand;
use App\Services\Ai\AnthropicClientFactory;
use App\Services\Ai\ChatStreamer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AiChatController extends Controller
{
    public function __construct(
        private AnthropicClientFactory $clientFactory,
        private ChatStreamer $streamer,
    ) {}

    /**
     * POST /demands/{demand}/chat/conversations — create a new empty conversation.
     */
    public function startConversation(Demand $demand): JsonResponse
    {
        $this->authorizeDemand($demand);

        $conversation = AiConversation::create([
            'organization_id' => auth()->user()->current_organization_id,
            'user_id'         => auth()->id(),
            'context_type'    => 'demand',
            'context_id'      => $demand->id,
            'title'           => "Chat — {$demand->title}",
        ]);

        return response()->json([
            'id'         => $conversation->id,
            'created_at' => $conversation->created_at->toIso8601String(),
        ]);
    }

    /**
     * POST /demands/{demand}/chat/{conversation}/stream — SSE reply.
     *
     * Persist user message BEFORE opening the stream so the turn survives a client disconnect.
     * BYOK gate (D-33): if no key, back()->with('error', ...) — no 402 abort.
     */
    public function stream(
        ChatMessageRequest $request,
        Demand $demand,
        AiConversation $conversation,
    ): StreamedResponse|RedirectResponse {
        $this->authorizeDemand($demand);

        // T-03-40: triple-check demand + conversation scoping before any write.
        abort_if(
            $conversation->organization_id !== auth()->user()->current_organization_id
            || $conversation->context_type !== 'demand'
            || $conversation->context_id !== $demand->id,
            403,
        );

        $org = auth()->user()->organization;
        if (! $org->hasAnthropicKey()) {
            return back()->with('error', __('app.ai_key_missing'));
        }

        // Persist user message BEFORE opening the stream — survives client disconnect (AI-SPEC pattern b).
        $conversation->messages()->create([
            'role'    => 'user',
            'content' => $request->validated('message'),
        ]);

        $anthropic = $this->clientFactory->forOrganization($org);

        return response()->eventStream(
            fn () => yield from $this->streamer->stream($conversation->fresh(), $request->validated('message'), $anthropic),
        );
    }

    private function authorizeDemand(Demand $demand): void
    {
        abort_if($demand->organization_id !== auth()->user()->current_organization_id, 403);
    }
}
