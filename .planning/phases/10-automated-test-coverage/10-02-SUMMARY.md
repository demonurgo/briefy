---
phase: 10-automated-test-coverage
plan: 02
subsystem: testing
tags: [phpunit, feature-tests, rbac, demands, ai-chat, eloquent, refresdb]

requires:
  - phase: 09-notifications-system
    provides: DemandAssigned + DemandStatusChanged events, DemandController wired with notifications

provides:
  - DemandLifecycleTest with 9 passing test cases covering full demand lifecycle + RBAC (TEST-03)
  - AiChatControllerTest verified at 7/7 passing with organization_id bug fixed (TEST-04)
  - archived_at added to Demand.$fillable (production bug fix — was silently ignored by mass assignment)
  - tests/bootstrap-worktree.php: Composer classmap patcher for parallel-executor worktree test runs

affects:
  - 10-01-PLAN (shares DemandLifecycleTest patterns with NotificationDeliveryTest)
  - Future phases touching Demand model (fillable change affects mass assignment)

tech-stack:
  added: []
  patterns:
    - "setUp() Variant B: Organization + User (with pivot attach) + Client + Demand fixtures shared across all test methods"
    - "Pivot attach mandatory: $user->organizations()->attach($org->id, ['role' => 'owner', 'joined_at' => now()]) before any test that calls isAdminOrOwner()"
    - "Event::fake([SpecificEvent::class]) per test method — suppresses Reverb broadcast in test env"
    - "trash.restore uses int $id (not model binding) — route: POST /lixeira/{id}/restore"
    - "Worktree classmap bootstrap: patches Composer ClassLoader to load App\\ classes from worktree's app/ via reflection + addClassMap()"

key-files:
  created:
    - tests/Feature/DemandLifecycleTest.php
    - tests/bootstrap-worktree.php
  modified:
    - app/Models/Demand.php
    - tests/Feature/AiChatControllerTest.php
    - phpunit.xml

key-decisions:
  - "archived_at added to Demand.$fillable — bug fix: ArchiveController::archive() calls update(['archived_at' => now()]) but Eloquent silently ignored it due to mass-assignment guard"
  - "AiChatControllerTest setUp() used 'organization_id' (non-existent column) — corrected to 'current_organization_id' (actual FK)"
  - "tests/bootstrap-worktree.php created to enable parallel-executor worktrees to test their own app/ changes without a local vendor/ install"
  - "7 AiChatController tests pass (plan referenced 6 — test_compaction_job_dispatched_when_messages_exceed_threshold is the 7th, already present in file)"

patterns-established:
  - "Pattern: Demand lifecycle test setUp with pivot attach to guarantee isAdminOrOwner() returns true for the primary actor"
  - "Pattern: RBAC assertions — assertForbidden() for cross-org + collaborator forbidden, assertRedirect('/login') for unauthenticated"
  - "Pattern: Worktree bootstrap classmap patcher for PHP projects with vendor junction"

requirements-completed: [TEST-03, TEST-04]

duration: 9min
completed: 2026-04-24
---

# Phase 10 Plan 02: DemandLifecycleTest + AiChatControllerTest Verification Summary

**DemandLifecycleTest (9 tests, TEST-03) created from scratch + AiChatControllerTest (7 tests, TEST-04) fixed and verified green — plus production bug fix: `archived_at` missing from `Demand.$fillable` silently broke archiving**

## Performance

- **Duration:** 9 min
- **Started:** 2026-04-24T20:14:39Z
- **Completed:** 2026-04-24T20:24:31Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Created `tests/Feature/DemandLifecycleTest.php` with 9 test methods covering the full demand lifecycle using setUp() Variant B (shared fixtures + mandatory pivot attach)
- All 9 lifecycle scenarios pass: create, updateStatus, updateInline/assign, archive, unarchive, trash+restore, unauthenticated redirect, cross-org 403, collaborator forbidden
- Fixed `AiChatControllerTest` — `'organization_id'` attribute in setUp() caused a `SQLSTATE[42703]: Undefined column` error on all 7 tests; corrected to `'current_organization_id'`
- Fixed `app/Models/Demand.php` — `archived_at` was missing from `$fillable`, causing `ArchiveController::archive()` updates to be silently discarded
- Created `tests/bootstrap-worktree.php` to allow parallel-executor worktree tests to use their own `app/` files via Composer ClassLoader classmap patching

## Test Method Inventory

### DemandLifecycleTest (9 tests — all passing)

| # | Test Method | What It Tests |
|---|-------------|---------------|
| 1 | test_owner_can_create_demand | POST clients.demands.store → assertRedirect + assertDatabaseHas |
| 2 | test_owner_can_update_status | PATCH demands.status.update → assertRedirect + DB status='in_progress' |
| 3 | test_owner_can_assign_demand | PUT demands.inline.update → assertRedirect + DB assigned_to |
| 4 | test_owner_can_archive_demand | POST demands.archive → assertRedirect + archived_at not null |
| 5 | test_owner_can_unarchive_demand | POST demands.unarchive → assertRedirect + archived_at null |
| 6 | test_owner_can_trash_and_restore_demand | POST demands.trash + POST trash.restore → assertSoftDeleted + assertNotSoftDeleted |
| 7 | test_unauthenticated_cannot_access_demands | GET demands.index (no auth) → assertRedirect('/login') |
| 8 | test_cross_org_user_cannot_access_demand | PATCH demands.status.update from other org → assertForbidden |
| 9 | test_collaborator_cannot_trash_others_demand | POST demands.trash by collaborator on others' demand → assertForbidden |

### AiChatControllerTest (7 tests — all passing)

| # | Test Method | Status |
|---|-------------|--------|
| 1 | test_start_conversation_creates_row | PASS |
| 2 | test_stream_without_key_redirects_with_error | PASS |
| 3 | test_stream_with_valid_key_returns_event_stream_response | PASS |
| 4 | test_stream_persists_user_and_assistant_messages | PASS |
| 5 | test_stream_rejects_oversize_message | PASS |
| 6 | test_cross_org_conversation_returns_403 | PASS |
| 7 | test_compaction_job_dispatched_when_messages_exceed_threshold | PASS |

**Total: 16 tests passing (9 + 7)**

## Routes Confirmed via php artisan route:list

| Route Name | HTTP | Path |
|------------|------|------|
| clients.demands.store | POST | /clients/{client}/demands |
| demands.status.update | PATCH | /demands/{demand}/status |
| demands.inline.update | PUT | /demands/{demand}/inline |
| demands.archive | POST | /demands/{demand}/archive |
| demands.unarchive | POST | /demands/{demand}/unarchive |
| demands.trash | POST | /demands/{demand}/trash |
| trash.restore | POST | /lixeira/{id}/restore (int — NOT model binding) |
| demands.index | GET | /demands |

## Files Created/Modified

- `tests/Feature/DemandLifecycleTest.php` — new, 181 lines, 9 test cases (TEST-03)
- `tests/bootstrap-worktree.php` — new, worktree classmap patcher for test isolation
- `app/Models/Demand.php` — `archived_at` added to `$fillable` (production bug fix)
- `tests/Feature/AiChatControllerTest.php` — 2 lines changed: `organization_id` → `current_organization_id`
- `phpunit.xml` — bootstrap changed to `tests/bootstrap-worktree.php`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Missing `archived_at` in `Demand.$fillable` broke ArchiveController silently**
- **Found during:** Task 1 — test_owner_can_archive_demand failed with `assertNotNull(null)`
- **Issue:** `ArchiveController::archive()` calls `$demand->update(['archived_at' => now()])`. Laravel's mass-assignment guard silently discarded this update because `archived_at` was not listed in `$fillable`. The controller returned `back()` (redirect), hiding the failure entirely from production users.
- **Fix:** Added `'archived_at'` to `$fillable` in `app/Models/Demand.php`
- **Files modified:** `app/Models/Demand.php`
- **Commit:** 83b2420 (Task 1 commit)

**2. [Rule 1 - Bug] `organization_id` column does not exist in `users` table (AiChatControllerTest)**
- **Found during:** Task 2 — all 7 AiChatControllerTest tests failed with `SQLSTATE[42703]: Undefined column`
- **Issue:** setUp() line 32 and test_cross_org_conversation_returns_403 line 203 used `'organization_id'` as a User factory attribute. The column was renamed to `current_organization_id` in Phase 4. The User `$fillable` accepts `current_organization_id` and the DB schema has no `organization_id` column on users.
- **Fix:** Changed both occurrences to `'current_organization_id'`
- **Files modified:** `tests/Feature/AiChatControllerTest.php`
- **Commit:** 13123fb (Task 2 commit)

**3. [Rule 3 - Blocking] Worktree vendor junction resolves Composer classmap to main project**
- **Found during:** Task 1 — `archived_at` fix applied to worktree's `Demand.php` had no effect because `vendor/` is a junction to main project's vendor; PHP's `realpath()` on `__DIR__` inside autoload files resolves the junction, making `$baseDir` point to the main project's `app/`.
- **Fix:** Created `tests/bootstrap-worktree.php` that uses `ReflectionClass` to read the Composer ClassLoader's classmap and calls `addClassMap()` with overrides pointing all `App\` classes to the worktree's `app/` directory.
- **Files modified:** `tests/bootstrap-worktree.php` (new), `phpunit.xml` (bootstrap override)
- **Commit:** 83b2420 (Task 1 commit)

---

**Total deviations:** 3 auto-fixed (2 Rule 1 bugs, 1 Rule 3 blocking)
**Impact on plan:** Bug #1 is a genuine production issue — archiving was silently broken. Bug #2 was a pre-existing test file error. Deviation #3 is a worktree infrastructure issue with no user-facing impact.

## Known Stubs

None — all tests make real assertions against the database; no stubs or mocks for domain logic.

## Threat Surface Scan

No new network endpoints, auth paths, file access patterns, or schema changes introduced. The `archived_at` fillable fix adds no new trust boundary — it corrects a mass-assignment omission.

## Self-Check: PASSED

All created files exist on disk. Both commits (83b2420, 13123fb) confirmed in git log. SUMMARY.md written.
