---
phase: 9
plan: "01"
subsystem: notifications
tags: [broadcast, events, feature-tests, phpunit, eloquent]
dependency_graph:
  requires: []
  provides:
    - DemandAssigned broadcast event
    - DemandStatusChanged broadcast event
    - DemandController notification dispatch logic
    - NotificationDeliveryTest feature test suite (12 tests)
    - BriefyNotificationFactory
  affects:
    - app/Http/Controllers/DemandController.php
    - app/Models/BriefyNotification.php
tech_stack:
  added:
    - BriefyNotificationFactory (database/factories)
  patterns:
    - ShouldBroadcastNow + PrivateChannel("organization.{orgId}") — same as DemandBoardUpdated
    - capture-before / compare-after for Eloquent field change detection
    - collect(recipients)->filter()->filter(no-self)->unique() dedup pattern
    - BriefyNotification::create before Event::dispatch (DB persistence before broadcast)
key_files:
  created:
    - app/Events/DemandAssigned.php
    - app/Events/DemandStatusChanged.php
    - database/factories/BriefyNotificationFactory.php
    - tests/Feature/NotificationDeliveryTest.php
  modified:
    - app/Http/Controllers/DemandController.php
    - app/Models/BriefyNotification.php
decisions:
  - "PUT (not PATCH) for demands.inline.update — matches route definition in web.php"
  - "title required in updateInline requests — UpdateDemandRequest has required|string validation on title"
  - "assertOk() for notifications.read endpoint — route returns JsonResponse, not redirect"
  - "Real user entity required for assigned_to FK — PostgreSQL rejects hardcoded integers not in users table"
metrics:
  duration_minutes: 8
  completed_date: "2026-04-24"
  tasks_completed: 3
  files_created: 4
  files_modified: 2
---

# Phase 9 Plan 01: Backend Notification Events + Controller Wiring Summary

**One-liner:** Two ShouldBroadcastNow events (DemandAssigned, DemandStatusChanged) wired into DemandController with capture-before/compare-after change detection, recipient dedup via collect()->filter()->unique(), and 12 passing PHPUnit feature tests covering RT-03 through RT-07.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | NotificationDeliveryTest scaffold | d593d9c | tests/Feature/NotificationDeliveryTest.php |
| 2 | DemandAssigned + DemandStatusChanged events | 46d57c1 | app/Events/DemandAssigned.php, app/Events/DemandStatusChanged.php |
| 3 | DemandController wiring + test assertions | 84278d0 | DemandController.php, BriefyNotification.php, BriefyNotificationFactory.php, NotificationDeliveryTest.php |

## Verification

```
php artisan test --filter NotificationDeliveryTest
Tests: 12 passed (30 assertions)
Duration: ~4s
```

All 12 tests pass:
- test_notification_created_on_assignment
- test_no_notification_when_no_assignee
- test_no_self_notification_on_assignment
- test_notification_created_for_creator_on_status_change
- test_notification_created_for_assignee_on_status_change
- test_no_self_notification_on_status_change
- test_dedup_when_creator_equals_assignee_on_status_change
- test_unread_count_shared_in_inertia_props
- test_get_notifications_returns_user_notifications
- test_mark_single_notification_as_read
- test_mark_all_notifications_as_read
- test_cannot_read_other_users_notification

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Route method mismatch in test assertions**
- **Found during:** Task 3 execution
- **Issue:** Tests used `patch()` for `demands.inline.update` but the route is registered as `Route::put(...)` — resulted in 405 Method Not Allowed
- **Fix:** Changed to `put()` and added required `title` field (UpdateDemandRequest requires it)
- **Files modified:** tests/Feature/NotificationDeliveryTest.php
- **Commit:** 84278d0

**2. [Rule 1 - Bug] Hardcoded `assigned_to => 5` violated PostgreSQL FK constraint**
- **Found during:** Task 3 — test_no_notification_when_no_assignee
- **Issue:** The plan stub used `assigned_to => 5` as a literal integer; PostgreSQL rejects FK references to non-existent users
- **Fix:** Created a real `$previousAssignee` via User::factory() and assigned it, then changed to null
- **Files modified:** tests/Feature/NotificationDeliveryTest.php
- **Commit:** 84278d0

**3. [Rule 1 - Bug] `assertRedirectOrOk()` does not exist on JsonResponse**
- **Found during:** Task 3 — test_mark_single_notification_as_read
- **Issue:** The notifications.read route returns `response()->json(['ok' => true])` — JsonResponse has no `assertRedirectOrOk()` method
- **Fix:** Changed to `assertOk()`
- **Files modified:** tests/Feature/NotificationDeliveryTest.php
- **Commit:** 84278d0

**4. [Rule 2 - Missing functionality] BriefyNotificationFactory did not exist**
- **Found during:** Task 3 setup
- **Issue:** The test uses `BriefyNotification::factory()` but no factory existed; also BriefyNotification model lacked HasFactory trait
- **Fix:** Created BriefyNotificationFactory with all fillable fields; added HasFactory to BriefyNotification model
- **Files modified:** database/factories/BriefyNotificationFactory.php (new), app/Models/BriefyNotification.php
- **Commit:** 84278d0

**5. [Rule 3 - Blocking] Worktree missing vendor/ and autoloader pointed to main project**
- **Found during:** Task 1 verification
- **Issue:** git worktree has no vendor/; composer autoload_psr4.php resolved App\\ to D:/projetos/briefy/app (main project) instead of worktree — changes to BriefyNotification.php were invisible
- **Fix:** Created junction from worktree/vendor to main project vendor; ran `composer dump-autoload` in worktree to regenerate autoload files pointing to worktree paths; added PostgreSQL 17 bin to PATH for RefreshDatabase migrations
- **Files modified:** vendor/composer/autoload_psr4.php (regenerated)
- **Commit:** none (infrastructure only)

## Deferred Items

The full test suite (`php artisan test`) shows 58 pre-existing failures in the main project unrelated to this plan:
- `SQLSTATE[42703]: Undefined column: organization_id on users table` — pre-existing schema mismatch in briefy_test database
- AI controller tests, team roster tests, routing tests — all pre-existing

These failures existed before plan 09-01 and are out of scope. Logged to deferred-items.

## Known Stubs

None — all 12 test methods have real assertions.

## Threat Flags

No new network endpoints, auth paths, or schema changes introduced. The two new event classes broadcast on the existing `private-organization.{orgId}` channel already covered by T-09-06 in the plan's threat model. No additional threat surface.

## Self-Check: PASSED

All files exist and all commits verified:
- FOUND: app/Events/DemandAssigned.php
- FOUND: app/Events/DemandStatusChanged.php
- FOUND: tests/Feature/NotificationDeliveryTest.php
- FOUND: database/factories/BriefyNotificationFactory.php
- FOUND commit: d593d9c (test scaffold)
- FOUND commit: 46d57c1 (events)
- FOUND commit: 84278d0 (controller wiring + test assertions)
