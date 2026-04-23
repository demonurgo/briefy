<?php
// (c) 2026 Briefy contributors — AGPL-3.0
namespace App\Jobs;

use App\Models\AiConversation;
use App\Services\Ai\AnthropicClientFactory;
use App\Services\Ai\ClientMemoryExtractor;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class ExtractClientMemoryJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 2;
    public int $timeout = 300;   // 5 min — Haiku calls should be fast, but allow for retries
    public int $backoff = 30;

    public function __construct(public AiConversation $conversation) {}

    public function handle(AnthropicClientFactory $factory, ClientMemoryExtractor $extractor): void
    {
        $org = $this->conversation->organization;
        if (! $org || ! $org->hasAnthropicKey()) {
            Log::info('memory.skipped_no_key', ['conversation_id' => $this->conversation->id]);
            return;
        }

        $client = $factory->forOrganization($org);
        $extractor->extract($this->conversation, $client);
    }

    public function failed(\Throwable $e): void
    {
        Log::warning('ExtractClientMemoryJob.failed', [
            'conversation_id' => $this->conversation->id,
            'error_class'     => class_basename($e),
        ]);
    }
}
