<?php
// (c) 2026 Briefy contributors — AGPL-3.0
namespace Tests\Unit\Events;

use App\Events\DemandBoardUpdated;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Tests\TestCase;

class DemandBoardUpdatedTest extends TestCase
{
    public function test_broadcast_on_returns_private_channel(): void
    {
        $event = new DemandBoardUpdated(organizationId: 5, action: 'updated');
        $channel = $event->broadcastOn();

        $this->assertInstanceOf(PrivateChannel::class, $channel);
        $this->assertSame('private-organization.5', $channel->name);
    }

    public function test_broadcast_as_returns_correct_name(): void
    {
        $event = new DemandBoardUpdated(organizationId: 1, action: 'created');

        $this->assertSame('demand.board.updated', $event->broadcastAs());
    }

    public function test_implements_should_broadcast_now(): void
    {
        $event = new DemandBoardUpdated(organizationId: 1, action: 'deleted');

        $this->assertInstanceOf(ShouldBroadcastNow::class, $event);
    }
}
