# Phase 10: Automated Test Coverage — Pattern Map

**Mapped:** 2026-04-24
**Files analyzed:** 1 (new file to create)
**Analogs found:** 4 / 4

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `tests/Feature/DemandLifecycleTest.php` | test | request-response (CRUD + RBAC) | `tests/Feature/NotificationDeliveryTest.php` | exact |

---

## Pattern Assignments

### `tests/Feature/DemandLifecycleTest.php` (test, request-response + CRUD + RBAC)

**Primary analog:** `tests/Feature/NotificationDeliveryTest.php`
**Secondary analogs:** `tests/Feature/AiChatControllerTest.php`, `tests/Feature/InvitationControllerTest.php`, `tests/Feature/EnsureRoleTest.php`

---

### Imports pattern

Source: `tests/Feature/NotificationDeliveryTest.php` lines 1–13 + `tests/Feature/AiChatControllerTest.php` lines 1–17.

```php
<?php
// (c) 2026 Briefy contributors — AGPL-3.0
namespace Tests\Feature;

use App\Models\Client;
use App\Models\Demand;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;
```

Notes:
- `Event` import is only needed if the test suppresses broadcast events (e.g., `DemandAssigned`, `DemandStatusChanged`). Include if any method fires those events.
- Do NOT import `Queue` unless testing job dispatch.
- Namespace is always `Tests\Feature`.

---

### Class skeleton + setUp pattern

Two variants are used in the codebase:

**Variant A — flat setup per test** (used in `NotificationDeliveryTest`): Each test method creates its own fixtures inline. Best for tests with different org/user combos.

**Variant B — shared setUp()** (used in `AiChatControllerTest` lines 23–38): Creates `$this->org`, `$this->user`, `$this->client`, `$this->demand` once per class. Best when all happy-path tests share the same actor.

```php
// Variant B — copy from AiChatControllerTest lines 23-38
class DemandLifecycleTest extends TestCase
{
    use RefreshDatabase;

    private Organization $org;
    private User $user;        // owner/admin — the primary actor
    private Client $client;
    private Demand $demand;

    protected function setUp(): void
    {
        parent::setUp();
        $this->org    = Organization::factory()->create();
        $this->user   = User::factory()->create(['current_organization_id' => $this->org->id]);
        $this->client = Client::factory()->create(['organization_id' => $this->org->id]);
        $this->demand = Demand::factory()->create([
            'organization_id' => $this->org->id,
            'client_id'       => $this->client->id,
            'created_by'      => $this->user->id,
        ]);
        // Attach user as owner on pivot (required for isAdminOrOwner() to return true)
        $this->user->organizations()->attach($this->org->id, ['role' => 'owner', 'joined_at' => now()]);
    }
}
```

**Critical detail:** `isAdminOrOwner()` reads from the `organization_user` pivot table via `getCurrentRoleAttribute()`. A user created with `User::factory()` has NO pivot row by default. You MUST call `$user->organizations()->attach($org->id, ['role' => '...', 'joined_at' => now()])` for RBAC assertions to work correctly. See `InvitationControllerTest` lines 18–21 and `EnsureRoleTest` lines 16–18 for reference.

---

### Auth pattern — actingAs

Source: `tests/Feature/NotificationDeliveryTest.php` lines 28–30.

```php
$this->actingAs($actor)
    ->put(route('demands.inline.update', $demand), ['title' => $demand->title, 'assigned_to' => $assignee->id])
    ->assertRedirect();
```

- Always chain `actingAs()` directly on `$this` (not stored separately).
- Demand mutation endpoints return `back()` (redirect), so assert `->assertRedirect()` not `->assertOk()`.
- The one exception: JSON endpoints (e.g., `getJson`) return 200 — not relevant for DemandLifecycleTest.

---

### Happy-path: store (create demand)

**Route:** `POST /clients/{client}/demands` — name: `clients.demands.store`
**Controller:** `DemandController::store` (line 85)
**Required fields from `StoreDemandRequest`:** `title` (required), rest optional.

```php
public function test_owner_can_create_demand(): void
{
    $response = $this->actingAs($this->user)
        ->post(route('clients.demands.store', $this->client), [
            'title'  => 'Nova demanda de teste',
            'status' => 'todo',
        ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('demands', [
        'organization_id' => $this->org->id,
        'client_id'       => $this->client->id,
        'title'           => 'Nova demanda de teste',
        'created_by'      => $this->user->id,
    ]);
}
```

Source analog: `AiChatControllerTest::test_start_conversation_creates_row` (lines 44–57) for the `assertDatabaseHas` pattern.

---

### Happy-path: updateStatus

**Route:** `PATCH /demands/{demand}/status` — name: `demands.status.update`
**Controller:** `DemandController::updateStatus` (line 299)
**Payload:** `['status' => 'in_progress']`

```php
// Source: NotificationDeliveryTest lines 80-84
public function test_owner_can_update_status(): void
{
    $this->actingAs($this->user)
        ->patch(route('demands.status.update', $this->demand), ['status' => 'in_progress'])
        ->assertRedirect();

    $this->assertDatabaseHas('demands', [
        'id'     => $this->demand->id,
        'status' => 'in_progress',
    ]);
}
```

---

### Happy-path: updateInline (assign)

**Route:** `PUT /demands/{demand}/inline` — name: `demands.inline.update`
**Controller:** `DemandController::updateInline` (line 257)
**Payload:** must include `title` (UpdateDemandRequest validates it) + `assigned_to`.

```php
// Source: NotificationDeliveryTest lines 28-30 (exact pattern to copy)
public function test_owner_can_assign_demand(): void
{
    $assignee = User::factory()->create(['current_organization_id' => $this->org->id]);

    $this->actingAs($this->user)
        ->put(route('demands.inline.update', $this->demand), [
            'title'       => $this->demand->title,
            'assigned_to' => $assignee->id,
        ])
        ->assertRedirect();

    $this->assertDatabaseHas('demands', [
        'id'          => $this->demand->id,
        'assigned_to' => $assignee->id,
    ]);
}
```

---

### Happy-path: archive / unarchive

**Routes:**
- `POST /demands/{demand}/archive` — name: `demands.archive`
- `POST /demands/{demand}/unarchive` — name: `demands.unarchive`

**Controller:** `ArchiveController` lines 46–59. Sets/clears `archived_at`.

```php
public function test_owner_can_archive_demand(): void
{
    $this->actingAs($this->user)
        ->post(route('demands.archive', $this->demand))
        ->assertRedirect();

    $this->assertNotNull($this->demand->fresh()->archived_at);
}

public function test_owner_can_unarchive_demand(): void
{
    $this->demand->update(['archived_at' => now()]);

    $this->actingAs($this->user)
        ->post(route('demands.unarchive', $this->demand))
        ->assertRedirect();

    $this->assertNull($this->demand->fresh()->archived_at);
}
```

---

### Happy-path: trash / restore

**Routes:**
- `POST /demands/{demand}/trash` — name: `demands.trash` (soft delete)
- `POST /lixeira/{id}/restore` — name: `trash.restore` (pass raw `$id`, not model)

**Controller:** `TrashController` lines 41–63.

```php
public function test_owner_can_trash_and_restore_demand(): void
{
    $this->actingAs($this->user)
        ->post(route('demands.trash', $this->demand))
        ->assertRedirect();

    $this->assertSoftDeleted('demands', ['id' => $this->demand->id]);

    $this->actingAs($this->user)
        ->post(route('trash.restore', $this->demand->id))
        ->assertRedirect();

    $this->assertNotSoftDeleted('demands', ['id' => $this->demand->id]);
}
```

Note: `restore` route uses `{id}` (integer), not a model-bound param (see `TrashController::restore` line 57). Pass `$this->demand->id`.

---

### RBAC pattern: unauthenticated redirect

Source: `tests/Feature/Auth/AuthenticationTest.php` implicit pattern. Unauthenticated requests to auth-protected routes redirect to `/login`.

```php
public function test_unauthenticated_cannot_access_demands(): void
{
    $this->get(route('demands.index'))->assertRedirect('/login');
}
```

No `actingAs()` call — just hit the route as guest and assert redirect.

---

### RBAC pattern: cross-org 403

Source: `tests/Feature/AiChatControllerTest.php` lines 200–215.

```php
// AiChatControllerTest lines 200-215 — exact pattern to copy
public function test_cross_org_user_cannot_access_demand(): void
{
    $otherOrg  = Organization::factory()->create();
    $otherUser = User::factory()->create(['current_organization_id' => $otherOrg->id]);
    $otherUser->organizations()->attach($otherOrg->id, ['role' => 'owner', 'joined_at' => now()]);

    // Try to update a demand that belongs to $this->org
    $this->actingAs($otherUser)
        ->patch(route('demands.status.update', $this->demand), ['status' => 'in_progress'])
        ->assertForbidden();
}
```

**Mechanism:** `DemandController::authorizeDemand()` (line 352) calls `abort_if($demand->organization_id !== auth()->user()->current_organization_id, 403)`.

---

### RBAC pattern: collaborator cannot delete other's demand

Source: `tests/Feature/InvitationControllerTest.php` lines 55–63 + `EnsureRoleTest.php` lines 14–23.

```php
// InvitationControllerTest lines 55-63 — collaborator forbidden pattern
public function test_collaborator_cannot_delete_others_demand(): void
{
    $collab = User::factory()->create(['current_organization_id' => $this->org->id]);
    $collab->organizations()->attach($this->org->id, ['role' => 'collaborator', 'joined_at' => now()]);

    // $this->demand was created by $this->user, not $collab
    $this->actingAs($collab)
        ->post(route('demands.trash', $this->demand))
        ->assertForbidden();
}
```

**Mechanism:** `TrashController::trash()` lines 47–49 — non-owner who didn't create the demand gets `abort(403)`.

---

### Event::fake() pattern (suppress broadcast)

Source: `tests/Feature/NotificationDeliveryTest.php` lines 22–23.

When a test exercises `updateStatus` or `updateInline`, the controller dispatches `DemandStatusChanged` / `DemandAssigned` broadcast events. Use `Event::fake()` to prevent actual broadcasting in tests that don't need to assert events.

```php
// Use when you want to suppress events but don't need to assert them:
Event::fake([DemandAssigned::class, DemandStatusChanged::class]);

// Use when you DO need to assert event was dispatched:
Event::assertDispatched(DemandAssigned::class, fn($e) => $e->user_id === $assignee->id);
// Use when asserting event was NOT dispatched:
Event::assertNotDispatched(DemandAssigned::class);
```

For lifecycle tests that focus on DB state (not notifications), call `Event::fake()` at the top of the test to keep output clean without asserting dispatch.

---

### assertDatabaseHas / assertSoftDeleted / assertNotNull pattern

Source: `tests/Feature/NotificationDeliveryTest.php` lines 32–36 + `tests/Feature/InvitationControllerTest.php` line 83.

```php
// assertDatabaseHas — check column values
$this->assertDatabaseHas('demands', [
    'id'          => $this->demand->id,
    'assigned_to' => $assignee->id,
]);

// assertDatabaseMissing — check record gone
$this->assertDatabaseMissing('invitations', ['id' => $invite->id]);

// assertSoftDeleted — verify soft delete (deleted_at set)
$this->assertSoftDeleted('demands', ['id' => $this->demand->id]);

// assertNotSoftDeleted — verify restore
$this->assertNotSoftDeleted('demands', ['id' => $this->demand->id]);

// assertNotNull — check timestamp field set (used in AuthenticationTest line 23)
$this->assertNotNull($demand->fresh()->archived_at);

// assertNull — check field cleared
$this->assertNull($demand->fresh()->archived_at);
```

---

## Shared Patterns

### RefreshDatabase — always included

**Source:** All four analog test files (line 17 in each).
**Apply to:** `DemandLifecycleTest` (and all feature tests).

```php
use Illuminate\Foundation\Testing\RefreshDatabase;

class DemandLifecycleTest extends TestCase
{
    use RefreshDatabase;
    // ...
}
```

The `phpunit.xml` environment sets `DB_CONNECTION=pgsql` and `DB_DATABASE=briefy_test`. `RefreshDatabase` wraps each test in a transaction and rolls back — no manual cleanup needed.

---

### Pivot attachment for RBAC correctness

**Source:** `tests/Feature/InvitationControllerTest.php` lines 18–21, `tests/Feature/EnsureRoleTest.php` lines 16–18.
**Apply to:** Any test that calls `$user->isAdminOrOwner()`, `$user->isAdmin()`, or routes protected by `EnsureRole` middleware.

```php
// After User::factory()->create([...]):
$user->organizations()->attach($org->id, ['role' => 'owner', 'joined_at' => now()]);
// Or for collaborator:
$collab->organizations()->attach($org->id, ['role' => 'collaborator', 'joined_at' => now()]);
```

Without this pivot row, `getCurrentRoleAttribute()` returns `null` and all role checks fail silently.

---

### Base class: Tests\TestCase

**Source:** `tests/TestCase.php` lines 1–14.
**Apply to:** All feature tests.

```php
use Tests\TestCase;

class DemandLifecycleTest extends TestCase
{
    // TestCase calls $this->withoutVite() in setUp automatically
}
```

The base `TestCase` calls `$this->withoutVite()` in `setUp()` — no need to call it again.

---

### Route name reference card (demand routes)

Source: `routes/web.php` lines 25–49.

| Action | HTTP | Route name | Controller method |
|---|---|---|---|
| List demands | GET | `demands.index` | `DemandController::index` |
| Create form | GET | `clients.demands.create` | `DemandController::create` |
| Store demand | POST | `clients.demands.store` | `DemandController::store` |
| Show demand | GET | `demands.show` | `DemandController::show` |
| Update status | PATCH | `demands.status.update` | `DemandController::updateStatus` |
| Inline update | PUT | `demands.inline.update` | `DemandController::updateInline` |
| Trash (soft delete) | POST | `demands.trash` | `TrashController::trash` |
| Restore from trash | POST | `trash.restore` | `TrashController::restore` |
| Force delete | DELETE | `trash.force-delete` | `TrashController::forceDelete` |
| Archive | POST | `demands.archive` | `ArchiveController::archive` |
| Unarchive | POST | `demands.unarchive` | `ArchiveController::unarchive` |

**Important:** `clients.demands.store` requires `$client` as the first route param: `route('clients.demands.store', $client)`.
**Important:** `trash.restore` and `trash.force-delete` bind `{id}` (integer), not an Eloquent model: `route('trash.restore', $demand->id)`.

---

## No Analog Found

None. All patterns have direct analogs in the existing test suite.

---

## Metadata

**Analog search scope:** `tests/Feature/`, `tests/Feature/Auth/`, `app/Http/Controllers/`, `app/Http/Middleware/`, `database/factories/`, `routes/web.php`
**Files scanned:** 10
**Pattern extraction date:** 2026-04-24
