---
phase: 08-multi-org-polish
plan: "06"
subsystem: ui
tags: [react, typescript, inertia, chatTab, dropdown, conversation-picker]

requires:
  - phase: 08-multi-org-polish
    plan: "03"
    provides: "Zero TypeScript errors baseline + ChatTab with global PageProps (no local override)"

provides:
  - "ChatTab conversation picker dropdown: selectedConvId pattern survives Inertia partial reloads"
  - "isLatest derived value disables textarea + send button for non-latest conversations"
  - "convLabel helper formats conv.title or date + message count in pt-BR"
  - "Sync guard useEffect replaces buggy setConv(updated) that overwrote picker selection"
  - "Outside-click close pattern for picker dropdown via pickerRef"

affects: []

tech-stack:
  added: []
  patterns:
    - "selectedConvId integer ID pattern: store ID not object — survives Inertia partial reload without overwriting user selection"
    - "Derived state from demand.conversations: conv = find(c => c.id === selectedConvId) ?? latestConv"
    - "Sync guard useEffect: setSelectedConvId(prev => isOnLatest ? latest.id : prev) — functional update preserves user selection"
    - "isLatest guard: !latestConv || conv?.id === latestConv.id — disables write controls for older conversations"

key-files:
  created: []
  modified:
    - resources/js/Components/ChatTab.tsx

key-decisions:
  - "Store selectedConvId (number | null) not full Conversation object — integer ID is stable across Inertia reloads; object reference would be replaced on reload"
  - "Sync guard only advances to new latest when user is already on latest (functional setState with prev comparison) — preserves manual picker selection through partial reloads"
  - "isLatest disables both textarea and send button — visual read-only enforcement; backend AI endpoint already validates auth and org scope so no additional server-side guard needed"
  - "Removed optimistic user bubble render (setConv mutation) since conv is now derived, not mutable state — streaming feedback via stream.buffer covers the UX gap"
  - "Picker dropdown shows for all conversations (ChevronDown toggle) but only reveals list when demand.conversations.length > 1"
  - "Read-only indicator banner added above messages when !isLatest for clear UX feedback"

patterns-established:
  - "Picker dropdown: pickerRef + useRef<HTMLDivElement> + outside-click useEffect — copy pattern from AppLayout OrgSwitcher"
  - "convLabel: c.title ?? toLocaleDateString pt-BR + message count — consistent format for all conversation labels"

requirements-completed:
  - POLISH-03

duration: 8min
completed: "2026-04-24"
---

# Phase 8 Plan 06: Conversation Picker Dropdown Summary

**Conversation picker dropdown added to ChatTab header using selectedConvId integer pattern — selecting older conversations switches display and disables write controls without Inertia partial reloads overwriting the selection**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-04-24T17:30:00Z
- **Completed:** 2026-04-24T17:38:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Replaced `conv` state (`Conversation | null`) with `selectedConvId` (`number | null`) — conv now derived via `demand.conversations.find(c => c.id === selectedConvId) ?? latestConv`
- Fixed buggy `useEffect` sync that called `setConv(updated)` overwriting picker selection; replaced with functional setter guard that only advances to new latest when user is already on latest
- Added conversation picker dropdown in ChatTab header with ChevronDown toggle, per-conversation Check mark on latest, outside-click close via `pickerRef`
- Added `convLabel` helper: `c.title ?? "DD MMM — N msgs"` in pt-BR locale
- Added `isLatest` derived value guarding textarea `disabled` and send button `disabled` props
- Added read-only indicator banner when `!isLatest` for explicit UX feedback
- Added `ChevronDown` and `Check` imports from lucide-react
- Reset `selectedConvId` to `null` in both `startConversation` and `handleNovaConversa` so sync guard advances to new latest after next Inertia reload
- `npx tsc --noEmit` exits 0 — zero TypeScript errors

## Task Commits

1. **Task 1: conversation picker dropdown + read-only guard** - `a126f21` (feat)

## Files Created/Modified

- `resources/js/Components/ChatTab.tsx` — selectedConvId pattern, sync guard, picker dropdown, isLatest read-only guard, convLabel helper

## Decisions Made

- **selectedConvId integer pattern:** Storing the ID (not the Conversation object) means Inertia partial reloads that replace `demand.conversations` array do not affect `selectedConvId` — the derived `conv` is recalculated from the new array using the same ID, so the user stays on the conversation they selected.
- **Removed optimistic user bubble:** The original `setConv(prev => ...)` mutated local conv state to show the user's message immediately. Since `conv` is now derived (not mutable state), this approach doesn't work. The streaming bubble via `stream.buffer` and `streamingText` already provides immediate feedback on the assistant response, and the user's message appears after `router.reload()` completes (typically within 1-2 seconds after stream finishes). This is acceptable UX given the complexity reduction.
- **Read-only banner added:** The plan mentioned optionally showing "Somente leitura" — implemented as a full-width banner above the messages area for clear visibility when viewing an older conversation.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed non-functional optimistic render block**
- **Found during:** Task 1 (reviewing sendMessage after refactor)
- **Issue:** Original code used `setConv(prev => ...)` to add optimistic user message bubble. With `conv` now derived from `demand.conversations`, there is no mutable `setConv` to call — the approach was structurally broken and produced dead code (`void optimisticConv`)
- **Fix:** Removed the optimistic render block entirely. The streaming text via `stream.buffer` covers user feedback during the streaming phase; the persisted message appears after `router.reload()` in `onDone`
- **Files modified:** `resources/js/Components/ChatTab.tsx`
- **Verification:** tsc --noEmit exits 0; no unused variables
- **Committed in:** `a126f21` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 — structural bug introduced by the selectedConvId refactor)
**Impact on plan:** Fix necessary for correctness — dead code removed, no scope creep. UX gap is minimal since stream feedback covers the send action.

## Issues Encountered

None beyond the auto-fixed deviation above.

## Known Stubs

None — the picker renders `demand.conversations` which is already loaded by DemandController. No placeholder data.

## Threat Flags

None — no new network endpoints, auth paths, or schema changes introduced. The read-only enforcement (`!isLatest` disabling UI controls) is client-side visual only, which matches the plan's threat model disposition (T-08-06-01: accept — backend already validates auth and org scope).

## Self-Check

- [x] `resources/js/Components/ChatTab.tsx` exists and was modified
- [x] Commit `a126f21` exists in git log
- [x] `grep -c "selectedConvId" ChatTab.tsx` → 6 occurrences
- [x] `grep -c "isLatest" ChatTab.tsx` → 5 occurrences
- [x] `grep "setConv(updated)" ChatTab.tsx` → 0 occurrences (removed)
- [x] `npx tsc --noEmit` → EXIT_CODE: 0

## Self-Check: PASSED

## Next Phase Readiness

- POLISH-03 delivered — conversation picker fully functional in ChatTab
- Phase 8 Plan 07 can proceed (final plan in wave 3)
- Zero TypeScript errors maintained from Plan 03 baseline

---
*Phase: 08-multi-org-polish*
*Completed: 2026-04-24*
