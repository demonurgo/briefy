# Phase 9: Notifications System — Research

**Researched:** 2026-04-24
**Domain:** Laravel broadcast events + Laravel Echo + in-app notifications
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Atribuição (RT-03) — notificar somente o usuário atribuído (assignee). Não notificar o criador nem outros membros.
- **D-02:** Mudança de status (RT-04) — notificar criador + assignee, excluindo quem fez a mudança (sem auto-notificação).
- **D-03:** Não notificar quando assignee é nulo (demand sem responsável).
- **D-04:** Não notificar quando o usuário que dispara a ação é o mesmo que seria notificado.
- **D-05:** Usar o canal existente `private-organization.{orgId}` — não criar canal por usuário.
- **D-06:** Evento dedicado: `notification.created` com payload `{ user_id, title, body, data }`.
- **D-07:** Frontend filtra pelo `user_id` do usuário logado — só processa notificações próprias.
- **D-08:** Echo escuta `notification.created` no canal da org; ao receber, incrementa o contador localmente sem round-trip ao servidor.
- **D-09:** Ao abrir o dropdown do bell, faz fetch das notificações (já implementado) para garantir consistência.
- **D-10:** Remover o `setInterval` de 30s do AppLayout — substituído pelo Echo subscription.
- **D-11:** Sem deduplicação por tempo — uma notificação por mudança de status.
- **D-12:** Criar dois eventos: `DemandAssigned` e `DemandStatusChanged`, seguindo o padrão de `DemandBoardUpdated`.
- **D-13:** Disparar `DemandAssigned` no `DemandController` quando `assigned_to` muda de valor.
- **D-14:** Disparar `DemandStatusChanged` no `DemandController` quando `status` muda de valor.

### Claude's Discretion

- Exact wording for notification titles/bodies (pt-BR)
- Navigation target when user clicks notification (currently `route('planejamento.index')` — could be improved to route directly to the demand)

### Deferred Ideas (OUT OF SCOPE)

- Canal privado por usuário (`private-user.{userId}`) — v1.3 usa canal da org
- Preferências de notificação por usuário (on/off por tipo) — v2
- Notificações por email/push nativa do OS — v2
- Deduplicação por janela de tempo — descartado

</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| RT-03 | User receives in-app notification when a demand is assigned to them | DemandController.updateInline + new DemandAssigned event; BriefyNotification.create for assignee |
| RT-04 | User receives in-app notification when the status of a demand they own changes | DemandController.updateStatus + new DemandStatusChanged event; BriefyNotification.create for creator + assignee minus actor |
| RT-05 | Notification bell shows unread badge count that updates in real-time via WebSocket | Echo subscription in AppLayout on `.notification.created`; local unread counter increment |
| RT-06 | User can open dropdown and see recent notifications with timestamp and demand context | Existing bell dropdown HTML; fetch `/notifications` on open (already implemented); add timestamp rendering |
| RT-07 | User can mark individual notifications or all notifications as read | Existing routes POST `/notifications/{id}/read` and POST `/notifications/read-all` already implemented |

</phase_requirements>

---

## Summary

Phase 9 is almost entirely additive — the infrastructure (Reverb, Echo, channel auth, notification routes, BriefyNotification model, and the bell dropdown UI) is already in place. The work is: (1) add two new broadcast events following the existing pattern, (2) dispatch them from the right places in DemandController with the right "who gets notified" logic, and (3) replace the 30s polling interval in AppLayout with an Echo subscription that increments the badge counter locally.

The most important constraint is that `assigned_to` and `status` changes both flow through two different controller methods. Assignment changes happen via `updateInline` (PUT `/demands/{id}/inline`) which uses `UpdateDemandRequest`. Status changes happen via `updateStatus` (PATCH `/demands/{id}/status`) which uses inline validation. Both methods must be patched to capture the old value before `update()`, compare after, and dispatch the event only when the value actually changed.

The frontend Echo subscription in AppLayout must use `stopListening` (not `channel.leave`) so it does not tear down the existing subscription that `Index.tsx` holds on the same `organization.{orgId}` channel.

**Primary recommendation:** Backend-first. Create events, update controller methods, then wire the frontend subscription.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Detect field change (assigned_to / status) | API / Backend (DemandController) | — | Only the controller has the authoritative pre-update state |
| Create BriefyNotification record | API / Backend (DemandController) | — | Must be synchronous to guarantee persistence before broadcast |
| Broadcast notification event | API / Backend (Events layer via ShouldBroadcastNow) | — | ShouldBroadcastNow = fires in same HTTP request, no queue needed |
| Channel authorization | API / Backend (routes/channels.php) | — | Existing rule covers this; no new rule needed |
| Real-time badge counter | Frontend (AppLayout.tsx) | — | Local state increment; avoids round-trip |
| Notification dropdown list | Frontend (AppLayout.tsx) | — | Fetch on open already implemented |
| Mark as read | API / Backend (web.php inline closures) | Frontend state update | REST routes already exist; frontend updates local state |

---

## Standard Stack

### Core (all already installed)

| Library | Version | Purpose | Notes |
|---------|---------|---------|-------|
| Laravel Reverb | ^1.0 (Laravel 13.6.0) | WebSocket server | Running; `php artisan reverb:start` |
| laravel-echo | installed (see app.tsx) | Frontend WebSocket client | `window.Echo` already initialized |
| pusher-js | installed (see app.tsx) | Pusher-compatible driver for Echo | `window.Pusher` assigned in app.tsx |
| BriefyNotification model | — | Notification persistence | `briefy_notifications` table already migrated |

**Version verification:** [VERIFIED: codebase — app.tsx imports, composer.json not read but Laravel 13.6.0 confirmed via artisan]

### No new packages required

All dependencies are already installed. This phase is pure code addition.

---

## Architecture Patterns

### System Architecture Diagram

```
User action (assign / status change)
         |
         v
DemandController (PATCH/PUT)
  [capture old value]
  demand.update(...)
  [compare old vs new]
         |
    changed? YES
         |
         +---> BriefyNotification::create(...)   [persist record]
         |
         +---> DemandAssigned::dispatch(...)      [ShouldBroadcastNow]
          or   DemandStatusChanged::dispatch(...) [ShouldBroadcastNow]
                         |
                         v
                   Laravel Reverb
                         |
                 private-organization.{orgId}
                         |
              +-----------+-----------+
              |                       |
        Index.tsx                AppLayout.tsx
    (ignores .notification.created)  |
                              window.Echo.private(orgId)
                              .listen('.notification.created')
                                       |
                                 filter: event.user_id === auth.user.id
                                       |
                             increment local unread counter
                             + playNotificationSound()
                                       |
                             Bell badge updates immediately
                                       |
                          User opens dropdown → fetch /notifications
```

### Recommended Project Structure

New files to create:
```
app/Events/
├── DemandAssigned.php          # new — ShouldBroadcastNow, PrivateChannel org
└── DemandStatusChanged.php     # new — ShouldBroadcastNow, PrivateChannel org
```

Files to modify:
```
app/Http/Controllers/DemandController.php   # updateInline + updateStatus
resources/js/layouts/AppLayout.tsx          # remove setInterval, add Echo subscription
```

No new migrations. No new routes. No new models.

### Pattern 1: Broadcast Event (copy of DemandBoardUpdated)

```php
// Source: app/Events/DemandBoardUpdated.php — verified [VERIFIED: codebase]
<?php
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
        public readonly int    $organizationId,
        public readonly int    $userId,    // recipient user_id
        public readonly string $title,
        public readonly string $body,
        public readonly array  $data,      // ['demand_id' => ..., 'demand_title' => ...]
    ) {}

    public function broadcastOn(): Channel
    {
        return new PrivateChannel("organization.{$this->organizationId}");
    }

    public function broadcastAs(): string
    {
        return 'notification.created';
    }
}
```

`DemandStatusChanged` has the same structure — only the constructor payload differs.

**Key: `broadcastAs()` returns `'notification.created'`** — same name for both events so frontend needs only one listener.

### Pattern 2: Dispatching from DemandController

```php
// Source: DemandController.php addComment method — verified pattern [VERIFIED: codebase]

// In updateInline() — detect assigned_to change:
$oldAssignee = $demand->assigned_to;
$demand->update($request->validated());
$newAssignee = $demand->fresh()->assigned_to;

if ($newAssignee && $newAssignee !== $oldAssignee && $newAssignee !== auth()->id()) {
    $notification = \App\Models\BriefyNotification::create([
        'organization_id' => $demand->organization_id,
        'user_id'         => $newAssignee,
        'type'            => 'demand_assigned',
        'title'           => 'Demanda atribuída a você',
        'body'            => $demand->title,
        'data'            => ['demand_id' => $demand->id, 'demand_title' => $demand->title],
    ]);
    DemandAssigned::dispatch(
        $demand->organization_id,
        $newAssignee,
        $notification->title,
        $notification->body,
        $notification->data,
    );
}
```

**IMPORTANT — `fresh()` vs direct access:** After `$demand->update(...)`, the in-memory `$demand` object already has the new values. Reading `$demand->assigned_to` after `update()` is sufficient — no need for `fresh()`. Capture old value BEFORE `update()`.

```php
// Simplified — capture before, read after from updated model:
$oldAssignedTo = $demand->assigned_to;
$oldStatus     = $demand->status;
$demand->update($request->validated());
// $demand->assigned_to and $demand->status now hold new values
```

### Pattern 3: Echo Subscription in AppLayout (replace setInterval)

```typescript
// Source: DemandDetailModal.tsx lines 114-135 — verified pattern [VERIFIED: codebase]
// Replace the existing setInterval block (lines 56-61 in AppLayout.tsx) with:

const [unreadCount, setUnreadCount] = useState(unread_notifications);

useEffect(() => {
  if (!orgId || !window.Echo) return;

  const channel = window.Echo.private(`organization.${orgId}`);

  channel.listen('.notification.created', (event: NotificationCreatedEvent) => {
    // D-07: only process notifications for the current user
    if (event.user_id !== auth.user.id) return;

    setUnreadCount(prev => prev + 1);
    playNotificationSound();
  });

  return () => {
    // CRITICAL: stopListening, NOT window.Echo.leave()
    // leave() would destroy the channel shared with Index.tsx (RT-01)
    channel.stopListening('.notification.created');
  };
}, [orgId]);
```

**Note:** `unread_notifications` from `usePage().props` is the server-side initial value. The local `unreadCount` state takes over after mount. When `markAllRead()` is called, set `unreadCount` to 0 locally instead of `router.reload({ only: ['unread_notifications'] })`.

### Pattern 4: Notification Click Navigation

Current code in AppLayout.tsx line 139:
```typescript
if (note.data?.demand_id) router.visit(route('planejamento.index'));
```

This navigates to the wrong page. The correct target is the demands page with the demand open:
```typescript
if (note.data?.demand_id) {
  router.visit(route('demands.index', { demand: note.data.demand_id }));
}
```
This matches the existing pattern used in `DemandController.store()` (line 93).

### Anti-Patterns to Avoid

- **`window.Echo.leave()`** in cleanup: tears down the entire channel, kills RT-01 subscription in Index.tsx. Always use `channel.stopListening('.event.name')`.
- **`router.reload({ only: ['unread_notifications'] })`** after Echo event: defeats the purpose of local increment. Only use `reload` in `markAllRead` and `handleNoteClick` if needed.
- **Dispatching events without creating BriefyNotification first**: the broadcast is ephemeral; the DB record is the source of truth for the dropdown fetch.
- **Comparing `assigned_to` after `$demand->update()`**: Eloquent `update()` sets values on the model in memory — reading `$demand->assigned_to` after update gives you the NEW value. Always snapshot old value before `update()`.
- **Using `ShouldBroadcast` (queued) instead of `ShouldBroadcastNow`**: queued broadcast requires a queue worker. Existing events use `ShouldBroadcastNow` — copy this.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Real-time delivery | Manual polling | Laravel Reverb + Echo (already installed) | Already working for RT-01/RT-02 |
| Notification persistence | Custom table | BriefyNotification model (already exists) | Table already migrated, routes already exist |
| Channel authorization | Custom middleware | `routes/channels.php` closure (already exists) | `organization.{orgId}` rule already authorizes |
| Unread count sharing | Extra API endpoint | Inertia shared prop `unread_notifications` (already in HandleInertiaRequests) | Already shared on every page load |

---

## Technical Findings Per Research Focus

### 1. DemandController — Assignment and Status Change Methods

**Assignment** flows through `updateInline()` at line 254 (PUT `/demands/{demand}/inline`).
- Uses `UpdateDemandRequest` which has `'assigned_to' => 'nullable|exists:users,id'` [VERIFIED: codebase]
- Also contains `title`, `description`, `status`, `deadline`, `channel`, `tone`, `priority` — so status can also change here

**Status** flows through `updateStatus()` at line 262 (PATCH `/demands/{demand}/status`).
- Inline validation: `'status' => 'required|in:todo,in_progress,awaiting_feedback,in_review,approved'`
- Also triggered from DemandDetailModal's `InlineStatusPicker` (line 55 of DemandDetailModal.tsx) via `router.patch(route('demands.status.update', demand.id), { status })`

**Important:** `updateInline()` can also change `status` (field is present in `UpdateDemandRequest`). So `DemandStatusChanged` must be dispatched from BOTH `updateInline` and `updateStatus`.

**Demand fields relevant to notification logic:**
- `$demand->assigned_to` — int|null (FK to users.id)
- `$demand->status` — string (enum: todo, in_progress, awaiting_feedback, in_review, approved)
- `$demand->created_by` — int (FK to users.id) — used for RT-04 creator notification
- `$demand->organization_id` — int — used for channel name
- `$demand->title` — string — used for notification body

### 2. BriefyNotification Model — Exact Shape

```php
// app/Models/BriefyNotification.php — verified [VERIFIED: codebase]
protected $table = 'briefy_notifications';
protected $fillable = ['organization_id', 'user_id', 'type', 'title', 'body', 'data', 'read_at'];
protected $casts = ['data' => 'array', 'read_at' => 'datetime'];
```

**Database columns (from migration):**
- `id` — bigint, auto-increment
- `organization_id` — FK constrained, cascadeOnDelete
- `user_id` — FK nullable, nullOnDelete
- `type` — string
- `title` — string
- `body` — text
- `data` — json (default `{}`)
- `read_at` — timestamp nullable
- `created_at`, `updated_at` — timestamps

**Proposed `data` payload for demand notifications:**
```json
{
  "demand_id": 42,
  "demand_title": "Campanha de verão",
  "old_status": "todo",        // only for DemandStatusChanged
  "new_status": "in_progress"  // only for DemandStatusChanged
}
```

**Proposed `type` values:**
- `demand_assigned` — for RT-03
- `demand_status_changed` — for RT-04

### 3. Broadcast Event Pattern — DemandBoardUpdated

```php
// Exact structure [VERIFIED: codebase — app/Events/DemandBoardUpdated.php]
class DemandBoardUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets;

    public function __construct(
        public readonly int $organizationId,
        public readonly string $action,
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

New events must follow this exactly, replacing `broadcastAs()` return value with `'notification.created'`.

**What Reverb broadcasts as the event payload:** Reverb broadcasts all `public readonly` constructor properties automatically as the event payload. No `broadcastWith()` needed unless you want to customize. So:
- `DemandAssigned` with `public readonly int $userId` etc. → broadcast payload is `{ organizationId, userId, title, body, data }`

**Note on `broadcastAs`:** When `broadcastAs()` returns `'notification.created'`, Echo listens with the leading dot: `.notification.created` (the dot prefix is how Echo handles custom event names). This is consistent with how `DemandDetailModal.tsx` listens to `.demand.comment.created` [VERIFIED: codebase line 119].

### 4. Echo Subscription Pattern — Index.tsx

```typescript
// Exact pattern [VERIFIED: codebase — Index.tsx lines 67-81]
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
    window.Echo.leave(`organization.${orgId}`);  // NOTE: Index.tsx uses leave(), not stopListening
  };
}, [orgId]);
```

**CRITICAL DIFFERENCE:** Index.tsx uses `window.Echo.leave()` in its cleanup (owns the channel), while `DemandDetailModal.tsx` uses `channel.stopListening()` (does not own the channel). For AppLayout, the correct approach is:
- AppLayout subscribes to `.notification.created` on the same channel
- In cleanup, use `channel.stopListening('.notification.created')`
- Index.tsx owns the channel lifecycle (calls `leave` when orgId changes)

However, there is a potential ordering issue: if AppLayout unmounts before Index.tsx, calling `leave` from Index.tsx will also kill AppLayout's listeners. But since AppLayout is the outer layout and Index.tsx is a page, AppLayout outlives Index.tsx — so AppLayout's subscription persists across page navigations. This means AppLayout should NOT call `leave` in its cleanup for the org channel.

### 5. AppLayout Bell Dropdown — Existing State and Code to Remove/Keep

**State vars to keep:**
```typescript
const [bellOpen, setBellOpen] = useState(false);
const [notes, setNotes] = useState<Notification[]>([]);
const bellRef = useRef<HTMLDivElement>(null);
const prevUnread = useRef(unread_notifications);
```

**Code to REMOVE (lines 55-61):**
```typescript
// Poll for new notifications every 30s — REMOVE THIS
useEffect(() => {
  const interval = setInterval(() => {
    router.reload({ only: ['unread_notifications'] });
  }, 30000);
  return () => clearInterval(interval);
}, []);
```

**Code to KEEP (lines 63-67):**
```typescript
// Play sound when unread count increases — KEEP, but adapt to local state
useEffect(() => {
  if (unread_notifications > prevUnread.current) playNotificationSound();
  prevUnread.current = unread_notifications;
}, [unread_notifications]);
```
When migrating to local state, this effect's dep should change to `[unreadCount]`.

**`openBell` (lines 115-123) — keep as-is.** The fetch-on-open is decision D-09.

**`markAllRead` (lines 125-130) — update:**
Replace `router.reload({ only: ['unread_notifications'] })` with `setUnreadCount(0)`.

**`handleNoteClick` (lines 132-140) — update:**
Replace `router.reload({ only: ['unread_notifications'] })` with `setUnreadCount(prev => Math.max(0, prev - 1))`.
Fix navigation from `route('planejamento.index')` to `route('demands.index', { demand: note.data.demand_id })`.

**Bell badge rendering (lines 162-165):**
Change `unread_notifications` reference to local `unreadCount` state.

### 6. Notification Routes — Existing Endpoints

```
GET  /notifications              → returns last 20 BriefyNotification for current user (JSON)
POST /notifications/{id}/read    → marks single notification as read (403 if not owner)
POST /notifications/read-all     → marks all unread for current user as read
```
[VERIFIED: codebase — routes/web.php lines 162-176]

All routes already exist. No new routes needed. All are inside `auth` + `verified` middleware group.

**Note on route ordering:** `POST /notifications/read-all` is defined AFTER `POST /notifications/{id}/read`. Laravel resolves `read-all` as a literal before trying to bind it as `{notification}` model. This is fine — routes are already in the correct order. No change needed.

### 7. TypeScript Type Definitions

**`PageProps` (index.d.ts) — current:**
```typescript
export type PageProps<T extends Record<string, unknown> = Record<string, unknown>> = T & {
    auth: { user: User; organization: AuthOrganization | null; };
    archive_count: number;
    trash_count: number;
    locale: string;
    flash?: { success?: string; error?: string };
    unread_notifications: number;
};
```
[VERIFIED: codebase — resources/js/types/index.d.ts]

`unread_notifications` is already typed. No change needed to PageProps.

**`Notification` interface (AppLayout.tsx, local):**
```typescript
interface Notification {
  id: number;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}
```
[VERIFIED: codebase — AppLayout.tsx lines 12-19]

This matches the BriefyNotification model fields. No change needed.

**New type needed in AppLayout.tsx:**
```typescript
interface NotificationCreatedEvent {
  user_id: number;
  title: string;
  body: string;
  data: Record<string, unknown>;
  organizationId: number;
}
```
This must match the `public readonly` constructor properties of the broadcast events.

**`global.d.ts` — does NOT declare `window.Echo`.**
The `app.tsx` file has a local `declare global { interface Window { Echo: Echo<'reverb'> } }`.
AppLayout.tsx references `window.Echo` as `any` implicitly. This works at runtime but the type declaration is scoped to `app.tsx`. The planner may optionally move the `window.Echo` declaration to `global.d.ts` for correctness, but it is not blocking.

### 8. Channel Authorization — channels.php

```php
// [VERIFIED: codebase — routes/channels.php]
Broadcast::channel('organization.{orgId}', function ($user, $orgId) {
    return (int) $user->current_organization_id === (int) $orgId;
});
```

This rule already exists and is sufficient. The new notification events use the same `private-organization.{orgId}` channel. No new channel rule needed.

### 9. Reverb/Echo Configuration — app.tsx

```typescript
// [VERIFIED: codebase — resources/js/app.tsx lines 8-24]
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

window.Pusher = Pusher;
window.Echo = new Echo({
  broadcaster: 'reverb',
  key: import.meta.env.VITE_REVERB_APP_KEY,
  wsHost: import.meta.env.VITE_REVERB_HOST,
  wsPort: import.meta.env.VITE_REVERB_PORT ?? 8080,
  wssPort: import.meta.env.VITE_REVERB_PORT ?? 443,
  forceTLS: (import.meta.env.VITE_REVERB_SCHEME ?? 'http') === 'https',
  enabledTransports: ['ws', 'wss'],
});
```

Echo is initialized at app startup, before any React component mounts. `window.Echo` is globally available. No bootstrap.js file exists — configuration is in `app.tsx` directly.

Laravel Reverb is confirmed running (two channels listed via `php artisan channel:list`). [VERIFIED: runtime]

### 10. BriefyNotification `data` JSON Field — Proposed Shape

For **demand_assigned** (RT-03):
```json
{
  "demand_id": 42,
  "demand_title": "Campanha de verão"
}
```

For **demand_status_changed** (RT-04):
```json
{
  "demand_id": 42,
  "demand_title": "Campanha de verão",
  "old_status": "todo",
  "new_status": "in_progress"
}
```

The `demand_id` field is already used by `handleNoteClick` in AppLayout.tsx (line 139: `note.data?.demand_id`). Including it enables direct navigation to the demand. [ASSUMED: old_status/new_status are Claude's discretion — not mandated by user]

---

## Common Pitfalls

### Pitfall 1: Firing Notification on Non-Change

**What goes wrong:** `updateInline()` accepts many fields. If `assigned_to` is included in the payload but hasn't changed (same value), a spurious notification fires.

**Why it happens:** Eloquent `update()` sets the value even if identical. Without comparing old vs new, any PATCH triggers the event.

**How to avoid:** Capture `$demand->assigned_to` and `$demand->status` BEFORE calling `update()`. After update, compare using strict inequality (`!==`). Only dispatch if value changed AND new value is not null (D-03) AND actor is not the recipient (D-04).

**Warning signs:** User gets notified when they click "save" on a demand they already own.

### Pitfall 2: Auto-Notification (Actor Notified of Own Action)

**What goes wrong:** User changes status of their own demand. They are `created_by`. `DemandStatusChanged` is dispatched with a notification for the creator. But the creator IS the actor. Decision D-04 says to exclude this.

**How to avoid:**
```php
$actorId = auth()->id();
// Only notify creator if they're not the actor
if ($demand->created_by && $demand->created_by !== $actorId) {
    // create BriefyNotification for creator
}
// Only notify assignee if they're not the actor
if ($demand->assigned_to && $demand->assigned_to !== $actorId) {
    // create BriefyNotification for assignee
}
```

**Warning signs:** Bell badge increments when the current user is the one who made the change.

### Pitfall 3: Multiple Notifications Per Status Change (Two Recipients)

**What goes wrong:** For `DemandStatusChanged`, both creator and assignee should receive notifications. If creator === assignee, that user gets two notifications.

**How to avoid:** Collect recipient IDs, deduplicate before iterating:
```php
$recipients = collect([$demand->created_by, $demand->assigned_to])
    ->filter()                       // remove nulls
    ->filter(fn($id) => $id !== auth()->id())  // D-04: no self-notification
    ->unique();                      // deduplicate if creator === assignee
```

### Pitfall 4: `channel.leave()` vs `channel.stopListening()` in AppLayout

**What goes wrong:** AppLayout uses `window.Echo.leave('organization.X')` in cleanup. When AppLayout re-renders (e.g., locale change), it leaves the channel entirely, killing the subscription that `Index.tsx` relies on for RT-01 Kanban updates.

**Why it happens:** AppLayout and Index.tsx share the same channel. `leave()` is destructive for all listeners on that channel.

**How to avoid:** Always use `channel.stopListening('.notification.created')` in AppLayout's cleanup. Index.tsx is the "owner" of the channel and is responsible for calling `leave()`.

**Warning signs:** Kanban board stops receiving live updates after the bell subscription is set up.

### Pitfall 5: `unread_notifications` Prop vs Local State

**What goes wrong:** The badge reads `unread_notifications` from `usePage().props`. This value only updates on full page loads or `router.reload`. After replacing setInterval, the badge stays stale.

**How to avoid:** Initialize local `unreadCount` state from `unread_notifications`, then manage it locally:
```typescript
const { unread_notifications } = usePage<PageProps>().props;
const [unreadCount, setUnreadCount] = useState(unread_notifications);
```
Use `unreadCount` everywhere in the JSX. Update via `setUnreadCount` in the Echo callback and in `markAllRead`/`handleNoteClick`.

### Pitfall 6: Broadcast Payload Casing (camelCase vs snake_case)

**What goes wrong:** Eloquent and PHP use `snake_case` (`user_id`, `organization_id`). Laravel's JSON serialization of broadcast events converts `public readonly int $userId` to `userId` (camelCase) in the broadcast payload.

**How to avoid:** Use `snake_case` property names in the event constructor:
```php
public readonly int $user_id,     // broadcasts as "user_id"
public readonly int $organization_id,
```
Or use `broadcastWith()` to explicitly control the payload shape. Consistent with existing events — `DemandCommentCreated` uses `$organizationId` (camelCase) but the payload key is `organizationId`. In `DemandDetailModal.tsx` the event interface uses camelCase: `event.demandId`, `event.organizationId`. [VERIFIED: codebase — DemandDetailModal.tsx lines 19-28]

**Decision for Phase 9:** Use snake_case for the new notification event properties (`user_id`) to match the `Notification` interface in AppLayout which already uses `read_at` snake_case. Then the event interface in TypeScript will use `event.user_id` (matching the `Notification` type pattern).

### Pitfall 7: `updateStatus` Does Not Load Demand Relations

**What goes wrong:** `updateStatus()` only receives `$demand` via route model binding. `$demand->created_by` is a scalar field on the model — it IS loaded. But `$demand->assignee` (the relation) is NOT loaded. Accessing `$demand->assigned_to` (the foreign key scalar) is fine; accessing `$demand->assignee->name` would trigger a lazy load.

**How to avoid:** Use `$demand->assigned_to` (scalar FK) not `$demand->assignee->name` when building notifications. The notification body uses `$demand->title`, not any related model fields. No eager loading needed.

---

## Implementation Sequence

### Wave 1 — Backend (09-01-PLAN.md)

1. Create `app/Events/DemandAssigned.php` — copy DemandBoardUpdated, add `user_id`, `title`, `body`, `data` constructor params, `broadcastAs()` returns `'notification.created'`
2. Create `app/Events/DemandStatusChanged.php` — same structure
3. Modify `DemandController::updateStatus()`:
   - Capture `$oldStatus = $demand->status` before update
   - After update: if status changed, build recipient list (creator + assignee minus actor, deduped), create BriefyNotification for each, dispatch `DemandStatusChanged` for each
4. Modify `DemandController::updateInline()`:
   - Capture `$oldAssignedTo = $demand->assigned_to` and `$oldStatus = $demand->status` before update
   - After update: check if `assigned_to` changed → dispatch `DemandAssigned`
   - After update: check if `status` changed → dispatch `DemandStatusChanged` (same logic as updateStatus)
5. Add `use App\Events\DemandAssigned;` and `use App\Events\DemandStatusChanged;` to DemandController imports

### Wave 2 — Frontend (09-02-PLAN.md)

1. In `AppLayout.tsx`:
   - Add `NotificationCreatedEvent` interface
   - Add local `unreadCount` state initialized from `unread_notifications` prop
   - Remove the 30s `setInterval` block (lines 55-61)
   - Add Echo subscription `useEffect` for `.notification.created` with `stopListening` cleanup
   - Update bell badge JSX to use `unreadCount`
   - Update `markAllRead()` to call `setUnreadCount(0)` instead of `router.reload`
   - Update `handleNoteClick()` to `setUnreadCount(prev => Math.max(0, prev - 1))` and fix navigation to `route('demands.index', { demand: note.data.demand_id })`
   - Update "play sound when unread increases" useEffect to depend on `unreadCount`

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | PHPUnit (Laravel 13 built-in) |
| Config file | phpunit.xml |
| Quick run command | `php artisan test --filter NotificationTest` |
| Full suite command | `php artisan test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command |
|--------|----------|-----------|-------------------|
| RT-03 | BriefyNotification created when assigned_to changes | Feature (PHPUnit) | `php artisan test --filter NotificationDeliveryTest::test_notification_created_on_assignment` |
| RT-03 | No notification when assignee is null | Feature | `php artisan test --filter NotificationDeliveryTest::test_no_notification_when_no_assignee` |
| RT-03 | No self-notification on assignment | Feature | `php artisan test --filter NotificationDeliveryTest::test_no_self_notification_on_assignment` |
| RT-04 | BriefyNotification created for creator on status change | Feature | `php artisan test --filter NotificationDeliveryTest::test_notification_created_for_creator_on_status_change` |
| RT-04 | BriefyNotification created for assignee on status change | Feature | `php artisan test --filter NotificationDeliveryTest::test_notification_created_for_assignee_on_status_change` |
| RT-04 | No self-notification on status change | Feature | `php artisan test --filter NotificationDeliveryTest::test_no_self_notification_on_status_change` |
| RT-05 | `unread_notifications` prop count is accurate | Feature | `php artisan test --filter NotificationDeliveryTest::test_unread_count_shared_in_inertia_props` |
| RT-06 | GET /notifications returns last 20 notifications for user | Feature | `php artisan test --filter NotificationDeliveryTest::test_get_notifications_returns_user_notifications` |
| RT-07 | POST /notifications/{id}/read marks as read | Feature | `php artisan test --filter NotificationDeliveryTest::test_mark_single_notification_as_read` |
| RT-07 | POST /notifications/read-all marks all as read | Feature | `php artisan test --filter NotificationDeliveryTest::test_mark_all_notifications_as_read` |
| RT-07 | POST /notifications/{id}/read returns 403 for other user's notification | Feature | `php artisan test --filter NotificationDeliveryTest::test_cannot_read_other_users_notification` |

Frontend Echo subscription behavior is manual-only (requires running Reverb + browser).

### Wave 0 Gaps

- [ ] `tests/Feature/NotificationDeliveryTest.php` — covers RT-03 through RT-07
- Use `Event::fake([DemandAssigned::class, DemandStatusChanged::class])` to assert dispatch without needing Reverb
- Use `BriefyNotification::assertCreated()` or direct DB assertion

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Laravel Reverb | WebSocket broadcast | ✓ | ^1.0 (Laravel 13.6.0) | — |
| laravel-echo (npm) | Frontend WebSocket | ✓ | installed | — |
| pusher-js (npm) | Echo Reverb driver | ✓ | installed | — |
| BriefyNotification table | Notification persistence | ✓ | migrated | — |
| `private-organization.{orgId}` channel | Broadcast auth | ✓ | channels.php | — |

No missing dependencies. All required infrastructure is in place. [VERIFIED: artisan channel:list, app.tsx, BriefyNotification migration]

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `broadcastAs('notification.created')` with snake_case constructor props broadcasts as `{ user_id, ... }` in the JSON payload | Pitfall 6 / Code Examples | Frontend TypeScript interface would use wrong property names; easily fixed at runtime |
| A2 | `old_status`/`new_status` in notification `data` JSON is useful/expected | Technical Finding #10 | Minor — data shape can be changed without schema migration since it's a JSON field |
| A3 | Navigation fix `route('demands.index', { demand: note.data.demand_id })` opens the correct demand modal | Implementation Sequence Wave 2 | Would still navigate to demands page but might not open modal; depends on Index.tsx URL param handling |

---

## Sources

### Primary (HIGH confidence)
- `app/Events/DemandBoardUpdated.php` — broadcast event pattern
- `app/Events/DemandCommentCreated.php` — second broadcast event pattern
- `app/Models/BriefyNotification.php` — model fillable/casts
- `database/migrations/2026_04_22_015647_create_briefy_notifications_table.php` — schema
- `app/Http/Controllers/DemandController.php` — controller methods, dispatch pattern
- `resources/js/layouts/AppLayout.tsx` — bell dropdown, setInterval, state
- `resources/js/pages/Demands/Index.tsx` — Echo subscription pattern
- `resources/js/Components/DemandDetailModal.tsx` — stopListening pattern
- `resources/js/app.tsx` — Echo initialization
- `resources/js/types/index.d.ts` — PageProps, unread_notifications
- `routes/channels.php` — channel authorization
- `routes/web.php` — notification routes
- `app/Http/Middleware/HandleInertiaRequests.php` — unread_notifications shared prop
- `app/Http/Requests/UpdateDemandRequest.php` — assigned_to/status validation

### Secondary (MEDIUM confidence)
- Laravel 13.6.0 confirmed via `php artisan --version` + `artisan channel:list`

---

## Metadata

**Confidence breakdown:**
- Backend event pattern: HIGH — direct code inspection of two existing identical events
- DemandController dispatch points: HIGH — all methods read and understood
- Frontend Echo pattern: HIGH — direct code inspection of two existing subscriptions
- Notification routing: HIGH — routes verified in web.php
- Broadcast payload casing: MEDIUM — inferred from existing DemandDetailModal event interface; A1 in assumptions log

**Research date:** 2026-04-24
**Valid until:** 2026-06-01 (stable Laravel + Echo versions; no version bumps expected)
