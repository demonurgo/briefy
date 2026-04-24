<?php
// (c) 2026 Briefy contributors — AGPL-3.0
namespace Tests\Feature;

use App\Events\DemandAssigned;
use App\Events\DemandStatusChanged;
use App\Models\BriefyNotification;
use App\Models\Demand;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;

class NotificationDeliveryTest extends TestCase
{
    use RefreshDatabase;

    // RT-03: assignment notification created
    public function test_notification_created_on_assignment(): void
    {
        Event::fake([DemandAssigned::class]);
        $org = Organization::factory()->create();
        $actor = User::factory()->create(['current_organization_id' => $org->id]);
        $assignee = User::factory()->create(['current_organization_id' => $org->id]);
        $demand = Demand::factory()->create(['organization_id' => $org->id, 'created_by' => $actor->id, 'assigned_to' => null]);

        $this->actingAs($actor)
            ->put(route('demands.inline.update', $demand), ['title' => $demand->title, 'assigned_to' => $assignee->id])
            ->assertRedirect();

        $this->assertDatabaseHas('briefy_notifications', [
            'organization_id' => $org->id,
            'user_id' => $assignee->id,
            'type' => 'demand_assigned',
        ]);
        Event::assertDispatched(DemandAssigned::class, fn($e) => $e->user_id === $assignee->id);
    }

    // RT-03: no notification when assignee is null
    public function test_no_notification_when_no_assignee(): void
    {
        Event::fake([DemandAssigned::class]);
        $org = Organization::factory()->create();
        $actor = User::factory()->create(['current_organization_id' => $org->id]);
        $previousAssignee = User::factory()->create(['current_organization_id' => $org->id]);
        $demand = Demand::factory()->create(['organization_id' => $org->id, 'created_by' => $actor->id, 'assigned_to' => $previousAssignee->id]);

        $this->actingAs($actor)
            ->put(route('demands.inline.update', $demand), ['title' => $demand->title, 'assigned_to' => null]);

        $this->assertDatabaseMissing('briefy_notifications', ['type' => 'demand_assigned']);
        Event::assertNotDispatched(DemandAssigned::class);
    }

    // RT-03 / D-04: no self-notification on assignment
    public function test_no_self_notification_on_assignment(): void
    {
        Event::fake([DemandAssigned::class]);
        $org = Organization::factory()->create();
        $actor = User::factory()->create(['current_organization_id' => $org->id]);
        $demand = Demand::factory()->create(['organization_id' => $org->id, 'created_by' => $actor->id, 'assigned_to' => null]);

        $this->actingAs($actor)
            ->put(route('demands.inline.update', $demand), ['title' => $demand->title, 'assigned_to' => $actor->id]);

        $this->assertDatabaseMissing('briefy_notifications', ['type' => 'demand_assigned']);
        Event::assertNotDispatched(DemandAssigned::class);
    }

    // RT-04: notification for creator on status change
    public function test_notification_created_for_creator_on_status_change(): void
    {
        Event::fake([DemandStatusChanged::class]);
        $org = Organization::factory()->create();
        $creator = User::factory()->create(['current_organization_id' => $org->id]);
        $actor = User::factory()->create(['current_organization_id' => $org->id]);
        $demand = Demand::factory()->create(['organization_id' => $org->id, 'created_by' => $creator->id, 'assigned_to' => null, 'status' => 'todo']);

        $this->actingAs($actor)
            ->patch(route('demands.status.update', $demand), ['status' => 'in_progress']);

        $this->assertDatabaseHas('briefy_notifications', ['user_id' => $creator->id, 'type' => 'demand_status_changed']);
        Event::assertDispatched(DemandStatusChanged::class, fn($e) => $e->user_id === $creator->id);
    }

    // RT-04: notification for assignee on status change
    public function test_notification_created_for_assignee_on_status_change(): void
    {
        Event::fake([DemandStatusChanged::class]);
        $org = Organization::factory()->create();
        $creator = User::factory()->create(['current_organization_id' => $org->id]);
        $assignee = User::factory()->create(['current_organization_id' => $org->id]);
        $actor = User::factory()->create(['current_organization_id' => $org->id]);
        $demand = Demand::factory()->create(['organization_id' => $org->id, 'created_by' => $creator->id, 'assigned_to' => $assignee->id, 'status' => 'todo']);

        $this->actingAs($actor)
            ->patch(route('demands.status.update', $demand), ['status' => 'in_progress']);

        $this->assertDatabaseHas('briefy_notifications', ['user_id' => $assignee->id, 'type' => 'demand_status_changed']);
        Event::assertDispatched(DemandStatusChanged::class, fn($e) => $e->user_id === $assignee->id);
    }

    // RT-04 / D-04: no self-notification on status change
    public function test_no_self_notification_on_status_change(): void
    {
        Event::fake([DemandStatusChanged::class]);
        $org = Organization::factory()->create();
        $creator = User::factory()->create(['current_organization_id' => $org->id]);
        $demand = Demand::factory()->create(['organization_id' => $org->id, 'created_by' => $creator->id, 'assigned_to' => null, 'status' => 'todo']);

        $this->actingAs($creator) // actor IS the creator
            ->patch(route('demands.status.update', $demand), ['status' => 'in_progress']);

        $this->assertDatabaseMissing('briefy_notifications', ['user_id' => $creator->id, 'type' => 'demand_status_changed']);
    }

    // RT-04 / dedup: creator === assignee → one notification, not two
    public function test_dedup_when_creator_equals_assignee_on_status_change(): void
    {
        Event::fake([DemandStatusChanged::class]);
        $org = Organization::factory()->create();
        $actor = User::factory()->create(['current_organization_id' => $org->id]);
        $creatorAssignee = User::factory()->create(['current_organization_id' => $org->id]);
        $demand = Demand::factory()->create([
            'organization_id' => $org->id,
            'created_by' => $creatorAssignee->id,
            'assigned_to' => $creatorAssignee->id,
            'status' => 'todo',
        ]);

        $this->actingAs($actor)
            ->patch(route('demands.status.update', $demand), ['status' => 'in_progress']);

        $this->assertSame(1, BriefyNotification::where('user_id', $creatorAssignee->id)->count());
        Event::assertDispatchedTimes(DemandStatusChanged::class, 1);
    }

    // RT-05: unread_notifications shared prop is accurate
    public function test_unread_count_shared_in_inertia_props(): void
    {
        $org = Organization::factory()->create();
        $user = User::factory()->create(['current_organization_id' => $org->id]);
        BriefyNotification::factory()->count(3)->create(['organization_id' => $org->id, 'user_id' => $user->id, 'read_at' => null]);
        BriefyNotification::factory()->create(['organization_id' => $org->id, 'user_id' => $user->id, 'read_at' => now()]); // one read

        $response = $this->actingAs($user)->get(route('demands.index'));
        $response->assertInertia(fn($page) => $page->where('unread_notifications', 3));
    }

    // RT-06: GET /notifications returns user's own last 20
    public function test_get_notifications_returns_user_notifications(): void
    {
        $org = Organization::factory()->create();
        $user = User::factory()->create(['current_organization_id' => $org->id]);
        $other = User::factory()->create(['current_organization_id' => $org->id]);
        BriefyNotification::factory()->count(3)->create(['organization_id' => $org->id, 'user_id' => $user->id]);
        BriefyNotification::factory()->count(2)->create(['organization_id' => $org->id, 'user_id' => $other->id]);

        $response = $this->actingAs($user)->getJson(route('notifications.index'));
        $response->assertOk()->assertJsonCount(3);
    }

    // RT-07: POST /notifications/{id}/read
    public function test_mark_single_notification_as_read(): void
    {
        $org = Organization::factory()->create();
        $user = User::factory()->create(['current_organization_id' => $org->id]);
        $note = BriefyNotification::factory()->create(['organization_id' => $org->id, 'user_id' => $user->id, 'read_at' => null]);

        $this->actingAs($user)->post(route('notifications.read', $note))->assertOk();
        $this->assertNotNull($note->fresh()->read_at);
    }

    // RT-07: POST /notifications/read-all
    public function test_mark_all_notifications_as_read(): void
    {
        $org = Organization::factory()->create();
        $user = User::factory()->create(['current_organization_id' => $org->id]);
        BriefyNotification::factory()->count(3)->create(['organization_id' => $org->id, 'user_id' => $user->id, 'read_at' => null]);

        $this->actingAs($user)->post(route('notifications.read-all'));
        $this->assertSame(0, BriefyNotification::where('user_id', $user->id)->whereNull('read_at')->count());
    }

    // RT-07: 403 on other user's notification
    public function test_cannot_read_other_users_notification(): void
    {
        $org = Organization::factory()->create();
        $owner = User::factory()->create(['current_organization_id' => $org->id]);
        $other = User::factory()->create(['current_organization_id' => $org->id]);
        $note = BriefyNotification::factory()->create(['organization_id' => $org->id, 'user_id' => $owner->id]);

        $this->actingAs($other)->post(route('notifications.read', $note))->assertForbidden();
    }
}
