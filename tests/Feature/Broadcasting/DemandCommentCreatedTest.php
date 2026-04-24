<?php
// (c) 2026 Briefy contributors — AGPL-3.0
namespace Tests\Feature\Broadcasting;

use App\Events\DemandCommentCreated;
use App\Models\Client;
use App\Models\Demand;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;

class DemandCommentCreatedTest extends TestCase
{
    use RefreshDatabase;

    private Organization $org;
    private User $admin;
    private Client $client;
    private Demand $demand;

    protected function setUp(): void
    {
        parent::setUp();
        $this->org = Organization::factory()->create();
        $this->admin = User::factory()->create(['current_organization_id' => $this->org->id]);
        $this->org->users()->attach($this->admin->id, ['role' => 'admin']);
        $this->client = Client::factory()->create(['organization_id' => $this->org->id]);
        $this->demand = Demand::factory()->create([
            'organization_id' => $this->org->id,
            'client_id'       => $this->client->id,
            'created_by'      => $this->admin->id,
        ]);
    }

    public function test_dispatch_after_add_comment(): void
    {
        Event::fake([DemandCommentCreated::class]);

        $this->actingAs($this->admin)
            ->post(route('demands.comments.store', $this->demand), ['body' => 'Comentário teste'])
            ->assertRedirect();

        Event::assertDispatched(DemandCommentCreated::class, function ($event) {
            return $event->demandId === $this->demand->id
                && $event->organizationId === $this->org->id
                && $event->comment['body'] === 'Comentário teste'
                && isset($event->comment['id'])
                && isset($event->comment['user']['id'])
                && isset($event->comment['user']['name'])
                && is_string($event->comment['created_at']);
        });
    }

    public function test_broadcast_channel_is_private_organization(): void
    {
        $event = new DemandCommentCreated(
            organizationId: 42,
            demandId: 99,
            comment: ['id' => 1, 'body' => 'test', 'user' => ['id' => 1, 'name' => 'Test'], 'created_at' => now()->toJSON()]
        );

        $channel = $event->broadcastOn();

        $this->assertInstanceOf(PrivateChannel::class, $channel);
        $this->assertSame('private-organization.42', $channel->name);
    }

    public function test_broadcast_as_returns_correct_event_name(): void
    {
        $event = new DemandCommentCreated(
            organizationId: 1,
            demandId: 1,
            comment: ['id' => 1, 'body' => 'test', 'user' => ['id' => 1, 'name' => 'Test'], 'created_at' => now()->toJSON()]
        );

        $this->assertSame('demand.comment.created', $event->broadcastAs());
    }

    public function test_implements_should_broadcast_now(): void
    {
        $event = new DemandCommentCreated(1, 1, ['id' => 1, 'body' => 'test', 'user' => ['id' => 1, 'name' => 'Test'], 'created_at' => now()->toJSON()]);

        $this->assertInstanceOf(ShouldBroadcastNow::class, $event);
    }
}
