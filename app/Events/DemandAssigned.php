<?php
// (c) 2026 Briefy contributors — AGPL-3.0
namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;

class DemandAssigned implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets;

    public function __construct(
        public readonly int    $organization_id,
        public readonly int    $user_id,
        public readonly string $title,
        public readonly string $body,
        public readonly array  $data,
    ) {}

    public function broadcastOn(): Channel
    {
        return new PrivateChannel("organization.{$this->organization_id}");
    }

    public function broadcastAs(): string
    {
        return 'notification.created';
    }
}
