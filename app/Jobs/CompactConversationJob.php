<?php
// (c) 2026 Briefy contributors — AGPL-3.0
namespace App\Jobs;

use App\Models\AiConversation;
use App\Services\Ai\AnthropicClientFactory;
use App\Services\Ai\ConversationCompactor;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class CompactConversationJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries   = 2;
    public int $timeout = 300;
    public int $backoff = 30;

    public function __construct(public AiConversation $conversation) {}

    public function handle(AnthropicClientFactory $factory, ConversationCompactor $compactor): void
    {
        // Re-check threshold — another job may have already compacted since dispatch.
        if ($this->conversation->messages()->count() <= ConversationCompactor::KEEP_RECENT_TURNS) {
            return;
        }

        $org = $this->conversation->organization;
        if (! $org || ! $org->hasAnthropicKey()) {
            return;
        }

        $client = $factory->forOrganization($org);
        $compactor->compact($this->conversation, $client);
    }

    public function failed(\Throwable $e): void
    {
        Log::warning('CompactConversationJob.failed', [
            'conversation_id' => $this->conversation->id,
            'error_class'     => class_basename($e),
        ]);
    }
}
