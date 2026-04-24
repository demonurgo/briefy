---
phase: 08-multi-org-polish
plan: "05"
subsystem: ui
tags: [sse, eventsource, react, typescript, hooks]

# Dependency graph
requires:
  - phase: 08-01
    provides: "POLISH-01 requirement — SSE consolidation target defined"
provides:
  - "useAiStream unified hook covering POST delta-frame and GET custom-event SSE streams"
  - "GET branch uses native EventSource with withCredentials and natural reconnect"
  - "ClientResearchTimelineModal migrated — no direct EventSource usage in components"
affects:
  - "Any future component that needs GET SSE streams (use useAiStream with method: 'GET')"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "useAiStream GET branch: method 'GET' + onEvent callback routes custom SSE event types"
    - "abortRef pattern extended: stores { abort: es.close } for GET, AbortController for POST"
    - "EventSource onerror gate: only fatal on readyState === CLOSED (allows native reconnect)"

key-files:
  created: []
  modified:
    - resources/js/hooks/useAiStream.ts
    - resources/js/Components/ClientResearchTimelineModal.tsx

key-decisions:
  - "GET branch uses new EventSource (not fetch) — EventSource provides native reconnect per POLISH-01/D-14"
  - "listenFor factory registers 'status', 'done', 'error' listeners — extensible for future GET SSE endpoints"
  - "abortRef stores synthetic { abort: es.close } so cancel() works uniformly across both branches"
  - "onerror only resolves as fatal when readyState === EventSource.CLOSED — avoids premature closure on transient drops"
  - "ARCH NOTE comment in ClientResearchTimelineModal removed — no longer needed after consolidation"

patterns-established:
  - "Single hook covers all SSE patterns: POST delta-frame (brief/chat) and GET custom-events (research timeline)"
  - "No component may directly instantiate EventSource — all SSE goes through useAiStream"

requirements-completed:
  - POLISH-01

# Metrics
duration: 15min
completed: 2026-04-24
---

# Phase 8 Plan 05: POLISH-01 SSE Consolidation Summary

**useAiStream extended with GET+EventSource branch and ClientResearchTimelineModal migrated — no direct EventSource usage remains in any component**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-04-24T12:30:00Z
- **Completed:** 2026-04-24T12:45:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Extended `useAiStream` with a GET branch using native `EventSource` (not fetch) for automatic reconnect on connection drops
- Added `onEvent?: (type: string, data: unknown) => void` to `UseAiStreamOptions` interface — backward compatible, all existing POST callers unaffected
- Migrated `ClientResearchTimelineModal.tsx` from direct `new EventSource(...)` to `useAiStream({ method: 'GET', onEvent })` pattern
- Removed ARCH NOTE backlog comment from `ClientResearchTimelineModal.tsx` — consolidation is now complete
- Zero TypeScript errors (confirmed by `npx tsc --noEmit`)
- `grep -rn "new EventSource" resources/js/` returns exactly one match: the hook itself (line 76 of useAiStream.ts)

## Task Commits

1. **Task 1: Extend useAiStream with GET+EventSource branch** - `9b2eee8` (feat)
2. **Task 2: Migrate ClientResearchTimelineModal to useAiStream GET** - `ec17922` (feat)

## Files Created/Modified

- `resources/js/hooks/useAiStream.ts` — Added `onEvent` option + full GET+EventSource branch inside `start()`; POST branch completely unchanged
- `resources/js/Components/ClientResearchTimelineModal.tsx` — Replaced native EventSource useEffect with `useAiStream` GET pattern; ARCH NOTE removed; import added

## Decisions Made

- **GET branch uses EventSource, not fetch** — mandatory per D-14/Pitfall 5: only EventSource provides native reconnect conforming to the SSE spec
- **listenFor factory pattern** — registers 'status', 'done', 'error' listeners; adding new event types for future GET SSE endpoints requires only one new `listenFor('type')` call
- **abortRef synthetic object** — `{ abort: () => es.close() } as unknown as AbortController` allows `cancel()` to remain method-agnostic; no new cancel logic needed
- **onerror gate: readyState === CLOSED** — transient drops trigger native EventSource reconnect; only a permanently closed connection (readyState 2) is treated as fatal error
- **setState('streaming') called twice** — once before the `return new Promise` (via `setState('streaming')` at line 71) and once inside the Promise callback; the inner call is a no-op since state is already 'streaming', but it documents intent clearly

## Deviations from Plan

None — plan executed exactly as written. The `setState('streaming')` duplication noted in Decisions Made is intentional per the plan's action block and harmless.

## Threat Surface Scan

All threats from the plan's `<threat_model>` are addressed:

| Threat | Mitigation | Status |
|--------|-----------|--------|
| T-08-05-01: EventSource auth | `withCredentials: true` set in GET branch | Mitigated |
| T-08-05-02: SSE stream data | Backend scopes to org; no cross-org risk | Accepted |
| T-08-05-03: JSON.parse tampering | All JSON.parse wrapped in try/catch in both hook and listenFor | Mitigated |
| T-08-05-04: EventSource reconnect DoS | onerror only fatal on CLOSED; browser exponential backoff handles rest | Accepted |

No new trust boundaries introduced beyond what the plan's threat model covers.

## Known Stubs

None — both files are fully wired. `ClientResearchTimelineModal` receives real SSE data via `useAiStream` and the `onEvent` callback routes `status` frames to component state.

## Issues Encountered

None.

## Next Phase Readiness

- POLISH-01 complete — SSE consolidation delivered
- Any future GET SSE endpoint in the codebase should use `useAiStream({ method: 'GET', onEvent })` — no more direct EventSource instantiation in components
- The `listenFor` factory in the GET branch can be extended with additional event type names without modifying component code

## Self-Check: PASSED

- FOUND: `resources/js/hooks/useAiStream.ts`
- FOUND: `resources/js/Components/ClientResearchTimelineModal.tsx`
- FOUND: `.planning/phases/08-multi-org-polish/08-05-SUMMARY.md`
- FOUND commit: `9b2eee8` (feat: useAiStream GET+EventSource branch)
- FOUND commit: `ec17922` (feat: ClientResearchTimelineModal migrated)
- `new EventSource` appears only in `useAiStream.ts:76` — zero component direct usage

---
*Phase: 08-multi-org-polish*
*Completed: 2026-04-24*
