# Phase 9: Notifications System — Pattern Map

**Mapped:** 2026-04-24
**Files analyzed:** 4 (2 new, 2 modified)
**Analogs found:** 4 / 4

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `app/Events/DemandAssigned.php` | event | event-driven | `app/Events/DemandBoardUpdated.php` | exact |
| `app/Events/DemandStatusChanged.php` | event | event-driven | `app/Events/DemandCommentCreated.php` | exact |
| `app/Http/Controllers/DemandController.php` | controller | request-response | self (lines 194-223 `addComment`) | exact |
| `resources/js/layouts/AppLayout.tsx` | layout/provider | event-driven | `resources/js/pages/Demands/Index.tsx` (Echo pattern) + `resources/js/Components/DemandDetailModal.tsx` (stopListening) | role-match |

---

## Pattern Assignments

### `app/Events/DemandAssigned.php` (event, event-driven)

**Analog:** `app/Events/DemandBoardUpdated.php`

**Imports pattern** (lines 1-9 of analog):
```php
<?php
// (c) 2026 Briefy contributors — AGPL-3.0
namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
```

**Core event pattern** (lines 11-29 of analog `DemandBoardUpdated.php`):
```php
class DemandBoardUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets;

    public function __construct(
        public readonly int $organizationId,
        public readonly string $action, // created, updated, deleted, restored
    ) {}

    public function broadcastOn(): Channel
    {
        return new PrivateChannel("organization.{$this->organizationId}");
    }

    public function broadcastAs(): string
    {
        return 'demand.board.updated';
    }
}
```

**What to copy, what to change for `DemandAssigned`:**
- Copy the entire class structure verbatim
- Replace class name: `DemandBoardUpdated` → `DemandAssigned`
- Replace constructor properties — remove `$action`, add notification payload:
  ```php
  public readonly int    $organization_id,
  public readonly int    $user_id,
  public readonly string $title,
  public readonly string $body,
  public readonly array  $data,
  ```
  Use `snake_case` property names so Reverb broadcasts them as `user_id` (not `userId`), matching the `Notification` interface in AppLayout which already uses `read_at` snake_case. See Research Pitfall 6.
- Replace `broadcastAs()` return value: `'demand.board.updated'` → `'notification.created'`
- Channel string: keep `"organization.{$this->organization_id}"` (rename property from `$organizationId` to `$organization_id`)

---

### `app/Events/DemandStatusChanged.php` (event, event-driven)

**Analog:** `app/Events/DemandCommentCreated.php`

**Core event pattern** (lines 11-30 of analog `DemandCommentCreated.php`):
```php
class DemandCommentCreated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets;

    public function __construct(
        public readonly int   $organizationId,
        public readonly int   $demandId,
        public readonly array $comment,
    ) {}

    public function broadcastOn(): Channel
    {
        return new PrivateChannel("organization.{$this->organizationId}");
    }

    public function broadcastAs(): string
    {
        return 'demand.comment.created';
    }
}
```

**What to copy, what to change for `DemandStatusChanged`:**
- Same structure as `DemandAssigned` — identical class shape, same imports, same `broadcastAs()` value (`'notification.created'`)
- Constructor properties are identical to `DemandAssigned` (same payload shape for both notification events):
  ```php
  public readonly int    $organization_id,
  public readonly int    $user_id,
  public readonly string $title,
  public readonly string $body,
  public readonly array  $data,
  ```
- `broadcastAs()` returns `'notification.created'` — same as DemandAssigned so the frontend uses a single listener for both

**Key insight:** Both new events produce identical class structure. The difference is only the class name and the `data` array content passed at dispatch time (see dispatch pattern below).

---

### `app/Http/Controllers/DemandController.php` (controller, request-response)

**Analog:** Self — `addComment` method (lines 194-223) as the dispatch pattern reference.

**Existing imports block** (lines 1-17 — add two new use statements here):
```php
<?php
// (c) 2026 Briefy contributors — AGPL-3.0
namespace App\Http\Controllers;

use App\Events\DemandCommentCreated;           // existing
// ADD:
use App\Events\DemandAssigned;
use App\Events\DemandStatusChanged;
use App\Http\Requests\StoreDemandRequest;
use App\Http\Requests\UpdateDemandRequest;
use App\Models\Client;
use App\Models\Demand;
use App\Models\DemandComment;
use App\Models\DemandFile;
use App\Models\Organization;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
```

**Dispatch analog pattern** (lines 199-221, `addComment`):
```php
// Pattern: create model record first, then dispatch event with its data
$comment = DemandComment::create([...]);
$comment->load('user');

DemandCommentCreated::dispatch(
    $demand->organization_id,
    $demand->id,
    ['id' => $comment->id, 'body' => $comment->body, ...]
);
```

**Current `updateInline` method to be modified** (lines 254-260):
```php
public function updateInline(UpdateDemandRequest $request, Demand $demand): RedirectResponse
{
    $this->authorizeDemand($demand);
    $demand->update($request->validated());

    return back()->with('success', __('app.demand_updated'));
}
```

**Target pattern for `updateInline` — capture-before, compare-after:**
```php
public function updateInline(UpdateDemandRequest $request, Demand $demand): RedirectResponse
{
    $this->authorizeDemand($demand);

    // Capture old values BEFORE update (Eloquent update() overwrites in-memory)
    $oldAssignedTo = $demand->assigned_to;
    $oldStatus     = $demand->status;

    $demand->update($request->validated());

    // RT-03: assigned_to changed
    if ($demand->assigned_to && $demand->assigned_to !== $oldAssignedTo
        && $demand->assigned_to !== auth()->id()            // D-04: no self-notification
    ) {
        $notification = \App\Models\BriefyNotification::create([
            'organization_id' => $demand->organization_id,
            'user_id'         => $demand->assigned_to,
            'type'            => 'demand_assigned',
            'title'           => 'Demanda atribuída a você',
            'body'            => $demand->title,
            'data'            => ['demand_id' => $demand->id, 'demand_title' => $demand->title],
        ]);
        DemandAssigned::dispatch(
            $demand->organization_id,
            $demand->assigned_to,
            $notification->title,
            $notification->body,
            $notification->data,
        );
    }

    // RT-04: status changed — also possible in updateInline (status is in UpdateDemandRequest)
    if ($demand->status !== $oldStatus) {
        $this->dispatchStatusChangedNotifications($demand, $oldStatus);
    }

    return back()->with('success', __('app.demand_updated'));
}
```

**Current `updateStatus` method to be modified** (lines 262-269):
```php
public function updateStatus(Request $request, Demand $demand): RedirectResponse
{
    $this->authorizeDemand($demand);
    $request->validate(['status' => 'required|in:todo,in_progress,awaiting_feedback,in_review,approved']);
    $demand->update(['status' => $request->status]);

    return back();
}
```

**Target pattern for `updateStatus`:**
```php
public function updateStatus(Request $request, Demand $demand): RedirectResponse
{
    $this->authorizeDemand($demand);
    $request->validate(['status' => 'required|in:todo,in_progress,awaiting_feedback,in_review,approved']);

    $oldStatus = $demand->status;   // capture before update
    $demand->update(['status' => $request->status]);

    if ($demand->status !== $oldStatus) {
        $this->dispatchStatusChangedNotifications($demand, $oldStatus);
    }

    return back();
}
```

**Private helper to extract shared status-change notification logic** (add before `authorizeDemand`):
```php
private function dispatchStatusChangedNotifications(Demand $demand, string $oldStatus): void
{
    $actorId = auth()->id();

    // D-02: notify creator + assignee, D-04: exclude actor, D-03: exclude nulls, deduplicate
    $recipients = collect([$demand->created_by, $demand->assigned_to])
        ->filter()                                          // remove nulls (D-03)
        ->filter(fn($id) => $id !== $actorId)              // no self-notification (D-04)
        ->unique();                                         // creator === assignee → one notification

    foreach ($recipients as $userId) {
        $notification = \App\Models\BriefyNotification::create([
            'organization_id' => $demand->organization_id,
            'user_id'         => $userId,
            'type'            => 'demand_status_changed',
            'title'           => 'Status de demanda alterado',
            'body'            => $demand->title,
            'data'            => [
                'demand_id'    => $demand->id,
                'demand_title' => $demand->title,
                'old_status'   => $oldStatus,
                'new_status'   => $demand->status,
            ],
        ]);
        DemandStatusChanged::dispatch(
            $demand->organization_id,
            $userId,
            $notification->title,
            $notification->body,
            $notification->data,
        );
    }
}
```

---

### `resources/js/layouts/AppLayout.tsx` (layout/provider, event-driven)

**Analogs:**
- Echo subscription pattern: `resources/js/pages/Demands/Index.tsx` (lines 67-81 in research)
- Cleanup pattern: `resources/js/Components/DemandDetailModal.tsx` (`stopListening`, not `leave`)
- Self (existing file): lines 55-67 are replaced; lines 115-140 are updated in-place

**Existing state and refs to keep** (AppLayout.tsx lines 32-35):
```typescript
const [bellOpen, setBellOpen] = useState(false);
const [notes, setNotes] = useState<Notification[]>([]);
const bellRef = useRef<HTMLDivElement>(null);
const prevUnread = useRef(unread_notifications);
```

**New type interface to add** (after line 20, before Props interface):
```typescript
interface NotificationCreatedEvent {
  user_id: number;         // snake_case — matches snake_case constructor props on PHP side
  organization_id: number;
  title: string;
  body: string;
  data: Record<string, unknown>;
}
```

**New local state to add** (after line 28, alongside existing state):
```typescript
const { auth, unread_notifications } = usePage<PageProps>().props;
const [unreadCount, setUnreadCount] = useState(unread_notifications);
```

**Code to REMOVE** (AppLayout.tsx lines 55-61 — the 30s polling interval, decision D-10):
```typescript
// REMOVE THIS ENTIRE BLOCK:
useEffect(() => {
  const interval = setInterval(() => {
    router.reload({ only: ['unread_notifications'] });
  }, 30000);
  return () => clearInterval(interval);
}, []);
```

**Code to ADD** (replacement for the removed block — Echo subscription):
```typescript
// Echo subscription for real-time notification badge (replaces setInterval)
useEffect(() => {
  const orgId = auth.organization?.id;
  if (!orgId || !window.Echo) return;

  const channel = window.Echo.private(`organization.${orgId}`);

  channel.listen('.notification.created', (event: NotificationCreatedEvent) => {
    // D-07: only process notifications addressed to the current user
    if (event.user_id !== auth.user.id) return;

    setUnreadCount(prev => prev + 1);
    playNotificationSound();
  });

  return () => {
    // CRITICAL: stopListening, NOT window.Echo.leave()
    // leave() destroys the channel shared with Index.tsx (kills RT-01 Kanban updates)
    channel.stopListening('.notification.created');
  };
}, [auth.organization?.id]);
```

**Echo subscription analog** (from `resources/js/pages/Demands/Index.tsx` lines 67-81):
```typescript
// Pattern source — Index.tsx owns the channel lifecycle
useEffect(() => {
  if (!orgId || !window.Echo) return;

  const channel = window.Echo.private(`organization.${orgId}`);
  channel.listen('.demand.board.updated', () => {
    if (reloadTimeout.current) clearTimeout(reloadTimeout.current);
    reloadTimeout.current = setTimeout(() => {
      router.reload({ only: ['demands'] });
    }, 300);
  });

  return () => {
    window.Echo.leave(`organization.${orgId}`);  // Index.tsx calls leave (owns channel)
  };
}, [orgId]);
```

**stopListening analog** (from `DemandDetailModal.tsx` — does NOT own the channel):
```typescript
// AppLayout must use this pattern (stopListening), NOT the leave() pattern above
return () => {
  channel.stopListening('.notification.created');
};
```

**Code to UPDATE — `prevUnread` effect** (AppLayout.tsx lines 63-67 — change dependency):
```typescript
// BEFORE (references Inertia prop directly):
useEffect(() => {
  if (unread_notifications > prevUnread.current) playNotificationSound();
  prevUnread.current = unread_notifications;
}, [unread_notifications]);

// AFTER (references local state — sound now driven by Echo event directly in the
//        subscription callback; this effect can be REMOVED since playNotificationSound()
//        is called inline in the Echo listener above):
// DELETE this effect — sound is called inside the Echo listener callback
```

**Code to UPDATE — `markAllRead`** (AppLayout.tsx lines 125-130):
```typescript
// BEFORE:
const markAllRead = async () => {
  const csrf = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';
  await fetch(route('notifications.read-all'), { method: 'POST', headers: { 'X-CSRF-TOKEN': csrf } });
  setNotes(prev => prev.map(n => ({ ...n, read_at: new Date().toISOString() })));
  router.reload({ only: ['unread_notifications'] });   // REMOVE this line
};

// AFTER:
const markAllRead = async () => {
  const csrf = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';
  await fetch(route('notifications.read-all'), { method: 'POST', headers: { 'X-CSRF-TOKEN': csrf } });
  setNotes(prev => prev.map(n => ({ ...n, read_at: new Date().toISOString() })));
  setUnreadCount(0);   // local state update — no round-trip needed (D-08)
};
```

**Code to UPDATE — `handleNoteClick`** (AppLayout.tsx lines 132-140):
```typescript
// BEFORE:
const handleNoteClick = async (note: Notification) => {
  if (!note.read_at) {
    const csrf = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';
    await fetch(route('notifications.read', note.id), { method: 'POST', headers: { 'X-CSRF-TOKEN': csrf } });
    router.reload({ only: ['unread_notifications'] });   // REMOVE
  }
  setBellOpen(false);
  if (note.data?.demand_id) router.visit(route('planejamento.index'));   // FIX navigation
};

// AFTER:
const handleNoteClick = async (note: Notification) => {
  if (!note.read_at) {
    const csrf = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';
    await fetch(route('notifications.read', note.id), { method: 'POST', headers: { 'X-CSRF-TOKEN': csrf } });
    setUnreadCount(prev => Math.max(0, prev - 1));   // local decrement
  }
  setBellOpen(false);
  if (note.data?.demand_id) {
    router.visit(route('demands.index', { demand: note.data.demand_id }));  // navigate to demand
  }
};
```

**Code to UPDATE — bell badge JSX** (AppLayout.tsx lines 163-166):
```typescript
// BEFORE — reads from Inertia prop:
{unread_notifications > 0 && (
  <span ...>
    {unread_notifications > 9 ? '9+' : unread_notifications}
  </span>
)}

// AFTER — reads from local state:
{unreadCount > 0 && (
  <span ...>
    {unreadCount > 9 ? '9+' : unreadCount}
  </span>
)}
```

---

## Shared Patterns

### ShouldBroadcastNow + PrivateChannel (org channel)
**Source:** `app/Events/DemandBoardUpdated.php` lines 1-29
**Apply to:** `DemandAssigned.php`, `DemandStatusChanged.php`

Both new events must implement `ShouldBroadcastNow` (not `ShouldBroadcast`) — no queue worker required, fires synchronously in the same HTTP request. Both broadcast on `PrivateChannel("organization.{$this->organization_id}")` — the channel that is already authorized in `routes/channels.php`.

### Capture-Before / Compare-After (Eloquent field change detection)
**Source:** Research finding — DemandController `addComment` establishes the create-then-dispatch pattern (lines 199-221); the capture pattern is new but follows Eloquent semantics.
**Apply to:** `DemandController::updateInline()`, `DemandController::updateStatus()`

Always snapshot mutable fields from `$demand` BEFORE calling `$demand->update(...)`. After update, `$demand->assigned_to` and `$demand->status` hold the new values in memory.

### Create BriefyNotification before dispatching event
**Source:** `DemandController::addComment` (lines 199-221) — creates `DemandComment` model, then dispatches event with the persisted data.
**Apply to:** All notification dispatch points in `DemandController`

BriefyNotification must be created (DB write) before the broadcast event is dispatched. The event payload should carry the persisted notification's `title`, `body`, and `data` — not re-compute them — so the frontend and the DB are guaranteed to show the same content.

### Echo `stopListening` cleanup (non-channel-owner)
**Source:** `resources/js/Components/DemandDetailModal.tsx`
**Apply to:** `AppLayout.tsx` Echo subscription cleanup

AppLayout subscribes to `.notification.created` on the same channel that `Index.tsx` owns (Index.tsx calls `window.Echo.leave()` on unmount). AppLayout must use `channel.stopListening('.notification.created')` — not `window.Echo.leave()` — to avoid destroying the shared channel.

### `window.Echo.private()` subscription useEffect
**Source:** `resources/js/pages/Demands/Index.tsx` (lines 67-81 per research)
**Apply to:** `AppLayout.tsx` new Echo subscription block

Pattern: `const channel = window.Echo.private(...)` → `channel.listen('.event.name', handler)` → cleanup in return → dependency array `[orgId]`.

---

## No Analog Found

All four files have strong analogs in the codebase. No files require falling back to RESEARCH.md external patterns.

---

## Metadata

**Analog search scope:** `app/Events/`, `app/Http/Controllers/`, `resources/js/layouts/`, `resources/js/pages/Demands/`, `resources/js/Components/`
**Files scanned:** 6 source files read (DemandBoardUpdated.php, DemandCommentCreated.php, DemandController.php, AppLayout.tsx, plus research excerpts from Index.tsx and DemandDetailModal.tsx)
**Pattern extraction date:** 2026-04-24
