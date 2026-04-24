---
phase: "07-mobile-pwa"
plan: "07-02"
subsystem: "frontend/mobile"
tags: [mobile, modal, animation, gesture, swipe, responsive]
dependency_graph:
  requires: [07-01]
  provides: [modal-fullscreen-mobile, slide-animation, swipe-to-close, drag-handle]
  affects: [DemandDetailModal]
tech_stack:
  added: []
  patterns: [requestAnimationFrame enter animation, visible-state slide transition, onTouchMove swipe gesture, triggerClose delayed close]
key_files:
  created: []
  modified:
    - resources/js/Components/DemandDetailModal.tsx
decisions:
  - "Used requestAnimationFrame to trigger enter animation on mount — ensures the initial translate-y-full class is applied before the transition fires, giving a clean slide-up on first render"
  - "triggerClose() delays onClose by 200ms to allow exit animation (translate-y-full) to complete before the component unmounts"
  - "onTouchMove 80px threshold chosen to avoid accidental close on scroll — user must intentionally swipe down"
  - "Swipe handle uses absolute positioning (not relative/flex) so it overlays the header without shifting layout"
  - "md:translate-y-0 in the conditional class means desktop always shows at translate-y-0 regardless of visible state — desktop animation is a no-op"
metrics:
  duration: "~2 minutes"
  completed: "2026-04-24"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 1
---

# Phase 7 Plan 02: DemandDetailModal Mobile Summary

Full-screen mobile modal with slide-up entry animation (requestAnimationFrame + translate-y transition), swipe-down-to-close gesture (80px threshold via onTouchMove), triggerClose with 200ms exit delay, and a 32x4px pill drag handle centered at top-2 (md:hidden).

## What Was Built

Two coordinated sets of changes to `DemandDetailModal.tsx` that adapt the modal for full-screen mobile presentation while keeping the desktop layout entirely unchanged:

1. **Animation infrastructure (Task 1)** — Five coordinated changes:
   - `visible` state (starts `false`) and `touchStartY` ref added alongside existing state declarations
   - `requestAnimationFrame` useEffect triggers `setVisible(true)` on mount for the slide-up enter animation
   - `triggerClose()` function: calls `setVisible(false)` then `setTimeout(onClose, 200)` for exit animation
   - `handleClose`, `saveAndClose`, and `discardAndClose` all updated to call `triggerClose()` instead of `onClose()` directly
   - Outer wrapper: `p-4 md:p-6` → `p-0 md:p-6` (removes mobile padding so modal fills edge-to-edge)
   - Modal panel div: full responsive class set — `rounded-none md:rounded-[16px]`, `h-[100dvh] md:h-auto`, `max-h-[100dvh] md:max-h-[90vh]`, `md:max-w-6xl`, `transition-transform duration-[250ms] ease-out`, `${visible ? 'translate-y-0' : 'translate-y-full md:translate-y-0'}`
   - `onTouchStart` + `onTouchMove` handlers on the panel: tracks `touchStartY.current`, calls `triggerClose()` when delta > 80px

2. **Swipe handle pill (Task 2)** — Inserted as the first child of the modal panel div:
   - `md:hidden` — only visible on mobile
   - `absolute top-2 left-1/2 -translate-x-1/2` — centered at top, overlay positioning
   - `h-1 w-8 rounded-full` — 4×32px pill
   - `bg-[#374151] dark:bg-[#d1d5db]` — dark/light mode colors
   - `aria-label="Arrastar para fechar"`, `role="presentation"`

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add visible state, triggerClose, and slide animation infrastructure | c2abad2 | resources/js/Components/DemandDetailModal.tsx |
| 2 | Insert swipe handle pill | 3512c78 | resources/js/Components/DemandDetailModal.tsx |

## Verification Results

1. TypeScript build: 15 pre-existing errors (POLISH-02 — auth.organization shape mismatch, AiIcon size enum). **0 new errors** introduced by this plan. DemandDetailModal.tsx line 82 error (`auth` PageProps constraint) is pre-existing — confirmed by checking the error exists on the committed Task 1 state before Task 2 changes.
2. Swipe handle present: `grep -n "Arrastar para fechar"` — match at line 249.
3. Animation classes: `translate-y-full md:translate-y-0` at line 234; `h-[100dvh] md:h-auto` at line 230; `rounded-none md:rounded-[16px]` at line 229.
4. Touch handlers: `onTouchStart` at line 236; `onTouchMove` at line 237; `touchStartY` refs at lines 107, 238-241.
5. RT-02 Echo subscription unaffected: `channel.stopListening('.demand.comment.created')` still at line 134.
6. Body grid unchanged: `grid flex-1 grid-cols-1 gap-0 overflow-hidden md:grid-cols-2` still at line 320.

## Deviations from Plan

None — plan executed exactly as written. All five changes in Task 1 and the pill insertion in Task 2 applied verbatim from the plan spec.

## Known Stubs

None — all changes are complete implementations. The animation and gesture system is fully wired.

## Threat Flags

None — changes are CSS class changes, React state/ref additions, and touch event handlers. No new network endpoints, auth paths, file access patterns, or schema changes introduced. Touch event handlers are client-only O(1) operations as documented in the plan's threat register (T-07-02, T-07-03 both accepted).

## Self-Check: PASSED

- resources/js/Components/DemandDetailModal.tsx — FOUND (modified, committed c2abad2 + 3512c78)
- Commit c2abad2 — FOUND in git log
- Commit 3512c78 — FOUND in git log
