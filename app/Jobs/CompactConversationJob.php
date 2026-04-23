<?php
// (c) 2026 Briefy contributors — AGPL-3.0
namespace App\Jobs;

use App\Models\AiConversation;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

/**
 * Compacts older messages in a conversation into a summary when > 30 messages.
 * Full implementation in Plan 07 — this stub enables dispatch() from Plan 05.
 */
class CompactConversationJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(public readonly AiConversation $conversation) {}

    public function handle(): void
    {
        // Implemented in Plan 07.
    }
}
