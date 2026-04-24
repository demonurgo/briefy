# Phase 6: Real-time Infrastructure - Context

**Gathered:** 2026-04-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver live Kanban status updates (RT-01) and live demand comments (RT-02) via Laravel Reverb WebSocket — no page refresh required for either event. Both flow through the existing `private-organization.{org_id}` channel.

**Out of scope for this phase:** in-app notifications (Phase 7), multi-org, polish (Phase 8), presence/cursor features (deferred v2).

</domain>

<decisions>
## Implementation Decisions

### Kanban Live Updates (RT-01)

- **D-01:** Frontend strategy — **partial reload**. When `demand.board.updated` arrives, KanbanBoard calls `router.reload({ only: ['demands'] })`. Server-authoritative, Inertia-idiomatic, consistent with the `useEffect` sync pattern already in KanbanBoard. No need to enrich the broadcast payload with demand-level data.
- **D-02:** Self-update — **no filtering**. User A who triggered the drag-and-drop also receives the broadcast and reloads. The DnD optimistic update already moved the card; the reload confirms server state. Zero extra logic required.
- **D-03:** Channel subscription lives in `KanbanBoard.tsx` — it's the component that manages local demand state. Subscribe on mount, unsubscribe on unmount. The `orgId` comes from Inertia auth props.

### Comments Live Updates (RT-02)

- **D-04:** New dedicated event `DemandCommentCreated` (separate from `DemandBoardUpdated`). Payload includes `organizationId`, `demandId`, and the full `comment` object `{id, body, user: {id, name}, created_at}`.
- **D-05:** Frontend strategy — **payload-driven local state append**. `DemandDetailModal` subscribes to `demand.comment.created` while open, filters by `demandId`, and appends the comment directly to local `comments` state. No round-trip, no risk of resetting open form fields in the modal.
- **D-06:** Self-update for comments — **no filtering**. Author's modal also receives the broadcast (consistent with D-02). The append is idempotent if the comment already appears from the optimistic UI after submission (the planner should check if the modal does optimistic comment append; if yes, guard with an id check).
- **D-07:** Channel subscription lives inside `DemandDetailModal` — subscribe on mount, unsubscribe on unmount. Same `private-organization.{orgId}` channel, different event name.

### Observer Granularity

- **D-08:** Keep `DemandObserver` **coarse-grained** — no changes. `DemandBoardUpdated` continues to fire on all demand mutations (title, description, status, etc.). Extra reloads on text edits are harmless for small agency teams in v1.2. Can be filtered in Phase 8 (Polish) if needed.

### Claude's Discretion

- Debouncing: if rapid successive broadcasts arrive (e.g., user drags cards quickly), Claude may add a debounce to `router.reload` to avoid request stampede — treat as implementation detail.
- Error handling for Echo channel failures (connection drop, reconnect) — standard Reverb retry behavior; no custom UI needed for v1.2.
- Where exactly in `DemandDetailModal` to manage Echo subscription state (useEffect, useRef for channel reference) — standard React cleanup pattern.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing Infrastructure
- `app/Events/DemandBoardUpdated.php` — existing broadcast event; dispatched by Observer on all demand mutations; broadcasts on `private-organization.{orgId}` channel as `demand.board.updated`
- `app/Observers/DemandObserver.php` — dispatches DemandBoardUpdated on created/updated/deleted/restored; keep coarse-grained (D-08)
- `routes/channels.php` — channel authorization; `organization.{orgId}` already auth'd against `current_organization_id`
- `resources/js/app.tsx` — `window.Echo` already configured with Reverb broadcaster; `window.Pusher` set globally

### Frontend Components (integration points)
- `resources/js/Components/KanbanBoard.tsx` — manages local demand state via `useEffect` sync; add Echo subscription here (D-03)
- `resources/js/Components/DemandDetailModal.tsx` — manages local comment state; add Echo subscription here (D-07)
- `resources/js/pages/Demands/Index.tsx` — parent page; passes `demands` and `selectedDemand` as props; `orgId` accessible via `auth.user.current_organization_id` or similar Inertia prop

### Requirements
- `.planning/REQUIREMENTS.md` — RT-01, RT-02 acceptance criteria
- `.planning/ROADMAP.md` — Phase 6 success criteria (4 items)

### No external specs — requirements fully captured in decisions above

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `window.Echo` (global, `app.tsx`): already instantiated Echo client with Reverb config — use directly via `window.Echo.private(...)` in components
- `DemandBoardUpdated` event class: already complete; no changes needed for RT-01
- `routes/channels.php` authorization: already covers `organization.{orgId}` — no new auth rules needed

### Established Patterns
- **Inertia partial reload** (`only: [...]`): used throughout modal actions — `router.reload({only: ['demands']})` is the natural extension for RT-01
- **`useEffect` sync in KanbanBoard**: existing pattern that syncs `initialDemands` prop into local state — Echo subscription should follow the same cleanup structure (`return () => channel.stopListening(...)`)
- **`only: ['selectedDemand']`**: used by all modal actions (status change, file ops, comments) — the planner can check if comment submission already does optimistic append before implementing D-06 guard

### Integration Points
- `KanbanBoard.tsx` — needs `orgId` prop (or from `usePage().props.auth`) to subscribe to the correct private channel
- `DemandDetailModal.tsx` — needs `demand.id` (already in props) and `orgId` to filter `demand.comment.created` events
- `CommentController` (or `DemandController`) — needs to dispatch `DemandCommentCreated` after comment is stored; check which controller handles `POST /demands/{demand}/comments`

</code_context>

<specifics>
## Specific Ideas

- The broadcast event for comments should use the Eloquent model's `toArray()` or a dedicated resource to ensure the comment payload matches the `Comment` TypeScript interface in `DemandDetailModal.tsx` (fields: `id`, `body`, `user: {id, name, email}`, `created_at`).
- `ShouldBroadcastNow` (synchronous broadcast, no queue) — keep consistent with `DemandBoardUpdated` for v1.2. Only consider queued broadcast if Reverb latency becomes an issue.

</specifics>

<deferred>
## Deferred Ideas

- Live cursor / presence on Kanban — already deferred to v2 (confirmed in REQUIREMENTS.md)
- Demand locking during edit — already deferred to v2
- Observer filtering (only board-relevant fields trigger broadcast) — deferred to Phase 8 Polish (D-08)
- Debounce/throttle for rapid broadcast events — Claude discretion at implementation time

</deferred>

---

*Phase: 06-real-time-infrastructure*
*Context gathered: 2026-04-24*
