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
 * Extracts client AI memory insights from a completed conversation turn.
 * Full implementation in Plan 07 — this stub enables dispatch() from Plan 05.
 */
class ExtractClientMemoryJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(public readonly AiConversation $conversation) {}

    public function handle(): void
    {
        // Implemented in Plan 07.
    }
}
