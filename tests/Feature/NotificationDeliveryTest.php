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
        $this->markTestIncomplete('Implement after Task 2 — events and controller wired');
    }

    // RT-03: no notification when assignee is null
    public function test_no_notification_when_no_assignee(): void
    {
        $this->markTestIncomplete('Implement after Task 2');
    }

    // RT-03 / D-04: no self-notification on assignment
    public function test_no_self_notification_on_assignment(): void
    {
        $this->markTestIncomplete('Implement after Task 2');
    }

    // RT-04: notification for creator on status change
    public function test_notification_created_for_creator_on_status_change(): void
    {
        $this->markTestIncomplete('Implement after Task 2');
    }

    // RT-04: notification for assignee on status change
    public function test_notification_created_for_assignee_on_status_change(): void
    {
        $this->markTestIncomplete('Implement after Task 2');
    }

    // RT-04 / D-04: no self-notification on status change
    public function test_no_self_notification_on_status_change(): void
    {
        $this->markTestIncomplete('Implement after Task 2');
    }

    // RT-04 / dedup: creator === assignee → one notification, not two
    public function test_dedup_when_creator_equals_assignee_on_status_change(): void
    {
        $this->markTestIncomplete('Implement after Task 2');
    }

    // RT-05: unread_notifications shared prop is accurate
    public function test_unread_count_shared_in_inertia_props(): void
    {
        $this->markTestIncomplete('Implement after Task 2');
    }

    // RT-06: GET /notifications returns user's own last 20
    public function test_get_notifications_returns_user_notifications(): void
    {
        $this->markTestIncomplete('Implement after Task 2');
    }

    // RT-07: POST /notifications/{id}/read
    public function test_mark_single_notification_as_read(): void
    {
        $this->markTestIncomplete('Implement after Task 2');
    }

    // RT-07: POST /notifications/read-all
    public function test_mark_all_notifications_as_read(): void
    {
        $this->markTestIncomplete('Implement after Task 2');
    }

    // RT-07: 403 on other user's notification
    public function test_cannot_read_other_users_notification(): void
    {
        $this->markTestIncomplete('Implement after Task 2');
    }
}
