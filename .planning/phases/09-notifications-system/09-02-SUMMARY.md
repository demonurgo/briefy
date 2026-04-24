---
phase: 09-notifications-system
plan: "02"
subsystem: ui
tags: [echo, reverb, websocket, notifications, real-time, typescript, react]

requires:
  - phase: "09-01"
    provides: DemandAssigned and DemandStatusChanged broadcast events on private-organization.{orgId} channel with notification.created broadcastAs name

provides:
  - AppLayout.tsx Echo subscription replacing 30s polling interval
  - Local unreadCount state for bell badge (no round-trip on increment)
  - D-07 user_id filter in Echo callback
  - D-10 stopListening cleanup (not leave)
  - Fixed navigation on notification click to demands.index with demand ID

affects:
  - resources/js/layouts/AppLayout.tsx

tech-stack:
  added: []
  patterns:
    - "Echo subscription with stopListening cleanup (not leave) for components that do not own the channel"
    - "Local state initialized from Inertia prop, then managed independently after mount"
    - "Echo callback with user_id filter before incrementing local state"

key-files:
  created: []
  modified:
    - resources/js/layouts/AppLayout.tsx

key-decisions:
  - "Use channel.stopListening('.notification.created') in cleanup — not window.Echo.leave() — AppLayout does not own the channel; Index.tsx owns it"
  - "Local unreadCount state initialized from unread_notifications prop; badge never reads prop directly after mount"
  - "Sound triggered inline in Echo callback; removed separate sound-on-prop-change useEffect"
  - "Navigation on note click goes to route('demands.index', { demand: note.data.demand_id }) — not planejamento.index"

patterns-established:
  - "AppLayout Echo pattern: window.Echo.private(orgId).listen + stopListening cleanup (analogous to DemandDetailModal RT-02 pattern)"

requirements-completed:
  - RT-05
  - RT-06
  - RT-07

duration: 8min
completed: "2026-04-24"
---

# Phase 9 Plan 02: Frontend Echo Subscription (AppLayout.tsx) Summary

**AppLayout.tsx polling removed — Echo subscription on private-organization.{orgId} increments local unreadCount badge in real-time with stopListening cleanup and corrected mark-as-read navigation**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-04-24T19:00:00Z
- **Completed:** 2026-04-24T19:08:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Removed 30-second `setInterval` polling block and `prevUnread` ref from AppLayout.tsx
- Added `NotificationCreatedEvent` TypeScript interface with `user_id` snake_case (D-06)
- Added `unreadCount` local state initialized from `unread_notifications` Inertia prop; bell badge now reads local state
- Added Echo subscription useEffect: listens to `.notification.created`, filters `event.user_id !== auth.user.id` (D-07), increments unreadCount and plays sound inline
- Cleanup uses `channel.stopListening('.notification.created')` — not `window.Echo.leave()` (D-10 pitfall avoided)
- `markAllRead()` calls `setUnreadCount(0)` instead of `router.reload` (D-08)
- `handleNoteClick()` calls `setUnreadCount(prev => Math.max(0, prev - 1))` and navigates to `route('demands.index', { demand: note.data.demand_id })` (D-08 + navigation fix)
- TypeScript compiles clean (`npx tsc --noEmit` exits 0)
- All 12 NotificationDeliveryTest backend tests remain green

## Task Commits

1. **Task 1: Replace polling with Echo subscription and update local state management** - `c42151c` (feat)

## Files Created/Modified

- `resources/js/layouts/AppLayout.tsx` — Removed polling setInterval and prevUnread ref; added NotificationCreatedEvent interface, unreadCount local state, Echo subscription with stopListening cleanup; updated markAllRead/handleNoteClick/badge JSX

## Decisions Made

- Sound is now triggered inline in the Echo callback instead of a separate `useEffect([unreadCount])` — this removes the need for the `prevUnread` ref entirely and makes the trigger explicit
- `auth.organization?.id` used as Echo useEffect dependency — subscription re-subscribes if the user switches organizations, which is the correct behavior

## Deviations from Plan

None — plan executed exactly as written. All 8 changes applied verbatim per plan spec.

## Issues Encountered

- `psql` not in PATH in the bash environment causes `php artisan test` to fail with "psql is not recognized" — this is a pre-existing infrastructure issue documented in 09-01-SUMMARY.md. Tests pass when running with `export PATH="$PATH:/c/Program Files/PostgreSQL/17/bin"`. The AppLayout.tsx changes have no PHP code so this does not affect the TypeScript deliverable.

## Known Stubs

None — all state is wired to real data sources (Inertia prop for initial value, Echo events for increments, REST endpoints for mark-as-read).

## Threat Flags

No new network endpoints or auth paths introduced. The Echo subscription uses the existing `private-organization.{orgId}` channel (already covered by T-09-07/T-09-08 in the plan threat model). The `event.user_id !== auth.user.id` filter mitigates T-09-07. No additional threat surface.

## Self-Check: PASSED

- FOUND: resources/js/layouts/AppLayout.tsx
- FOUND commit: c42151c
- `grep "setInterval" AppLayout.tsx` = 0 matches (polling removed)
- `grep "Echo.leave" AppLayout.tsx` = 1 match in comment only, 0 in functional code
- `grep "channel.stopListening" AppLayout.tsx` = 1 functional match
- `grep "unreadCount\|setUnreadCount" AppLayout.tsx` = 6 matches (lines 37, 74, 145, 152, 181, 183)
- `npx tsc --noEmit` = exits 0, no TypeScript errors
- `php artisan test --filter NotificationDeliveryTest` (with PostgreSQL in PATH) = 12 passed, 0 failed

## Next Phase Readiness

- RT-05 real-time badge: Echo subscription ready — requires `php artisan reverb:start` at runtime for WebSocket delivery
- RT-06 notification dropdown: fetch-on-open already implemented in `openBell()`; renders `note.title` and `note.body`
- RT-07 mark as read: `markAllRead()` and `handleNoteClick()` wired to local state via `setUnreadCount`
- Manual UAT (checkpoint:human-verify) still pending: requires two browser windows + running Reverb to verify badge increments without page refresh

---
*Phase: 09-notifications-system*
*Completed: 2026-04-24*
