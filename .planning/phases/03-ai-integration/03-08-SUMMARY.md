---
phase: 03-ai-integration
plan: 08
subsystem: ui
tags: [react, typescript, sse, typewriter, markdown, i18n, react-markdown, rehype-sanitize, remark-gfm]

requires:
  - phase: 03-ai-integration/03-01
    provides: AnthropicClientFactory + BriefStreamer SSE backend (delta/done/error frames)
  - phase: 03-ai-integration/03-03
    provides: react-markdown, rehype-sanitize, remark-gfm installed as npm deps
provides:
  - "useAiStream hook — fetch+ReadableStream POST SSE consumer with CSRF, AbortController, delta/done/error frame parsing"
  - "useTypewriter hook — rAF-batched char-by-char reveal with prefers-reduced-motion support"
  - "AiIcon component — dark/light SVG pair with size ladder 12-64, spinning + motion-reduce, aria-hidden, exported AiIconProps"
  - "AiMarkdown component — react-markdown 10 + rehype-sanitize + remark-gfm with full Briefy typography token mapping"
  - "Full i18n tree — ai, planning, clients.monthlyPlan, clients.badges, common.tryAgain/resend keys in pt-BR + en + es"
affects: [03-09, 03-10, 03-11, 03-12]

tech-stack:
  added: []
  patterns:
    - "useAiStream: fetch+ReadableStream (not EventSource) for POST SSE — CSRF-compatible; EventSource only for GET streams (ClientResearchTimelineModal pattern)"
    - "useTypewriter: requestAnimationFrame drain loop, not setInterval — 60fps aligned, reduced-motion aware"
    - "AiMarkdown: per-element className overrides on react-markdown components — no @tailwindcss/typography plugin"
    - "AiIcon: always import from @/Components/AiIcon — never inline chatbot SVGs directly (D-15)"

key-files:
  created:
    - resources/js/hooks/useAiStream.ts
    - resources/js/hooks/useTypewriter.ts
    - resources/js/Components/AiMarkdown.tsx
  modified:
    - resources/js/Components/AiIcon.tsx
    - resources/js/locales/pt-BR.json
    - resources/js/locales/en.json
    - resources/js/locales/es.json

key-decisions:
  - "useAiStream covers only POST delta-frame streams; GET custom-event SSE (ClientResearchTimelineModal) stays on native EventSource — v1.2 consolidation backlog per WARNING 8"
  - "AiIcon updated in-place (not duplicated) — Plan 06 had created it without motion-reduce, exported interface, or aria-hidden; updated to full spec"
  - "common.dismiss kept as 'Fechar' in pt-BR (existing value) — plan action said 'Dispensar' but overwriting would break existing UI; only tryAgain and resend were added"

patterns-established:
  - "Pattern: import AiIcon from '@/Components/AiIcon' — the only approved AI identity surface per D-15"
  - "Pattern: import useAiStream from '@/hooks/useAiStream' — for all POST SSE streams"
  - "Pattern: import AiMarkdown from '@/Components/AiMarkdown' — for all AI markdown rendering"

requirements-completed: [AI-07]

duration: 5min
completed: 2026-04-23
---

# Phase 03 Plan 08: Shared AI Frontend Hooks Summary

**fetch+ReadableStream SSE hook, rAF typewriter, dark/light AiIcon, react-markdown renderer, and complete 3-locale i18n tree for all AI surfaces**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-04-23T02:32:54Z
- **Completed:** 2026-04-23T02:37:52Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- `useAiStream`: POST SSE consumer using fetch+ReadableStream — parses `event: delta/done/error` frames, CSRF header, AbortController cancel, idle/streaming/done/error state machine (178 lines)
- `useTypewriter`: rAF-batched character drain (not setInterval), respects `prefers-reduced-motion`, handles target shrink/reset (60 lines)
- `AiIcon`: updated in-place with `motion-reduce:animate-none`, `aria-hidden`, exported `AiIconProps` interface, JSDoc (45 lines)
- `AiMarkdown`: react-markdown 10 + rehype-sanitize + remark-gfm, full typography token mapping h1-h3/strong/ul/ol/li/p/code/a/blockquote/hr/pre (54 lines)
- i18n: added `ai` (brief + chat namespaces), `planning` (full), `clients.monthlyPlan` + `clients.badges`, `common.tryAgain/resend` to all 3 locales — existing keys preserved

## Task Commits

1. **Task 1: AiIcon + useAiStream + useTypewriter** — `3bfb16c` (feat)
2. **Task 2: AiMarkdown + i18n locales** — `d7e3f59` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `resources/js/hooks/useAiStream.ts` — fetch+ReadableStream SSE hook for POST streams (178 lines)
- `resources/js/hooks/useTypewriter.ts` — rAF typewriter with prefers-reduced-motion (60 lines)
- `resources/js/Components/AiIcon.tsx` — dark/light SVG pair, size 12-64, spinning, aria-hidden (45 lines)
- `resources/js/Components/AiMarkdown.tsx` — react-markdown renderer with Briefy typography tokens (54 lines)
- `resources/js/locales/pt-BR.json` — added ai, planning, clients.monthlyPlan/badges, common.tryAgain/resend
- `resources/js/locales/en.json` — mirrored all new keys in English
- `resources/js/locales/es.json` — mirrored all new keys in Spanish

## Decisions Made

- `useAiStream` covers only POST delta-frame streams; GET custom-event SSE (ClientResearchTimelineModal) stays on native EventSource — documented in JSDoc per WARNING 8 (v1.2 consolidation backlog)
- `AiIcon` was updated in-place (Plan 06 had created it without `motion-reduce`, exported interface, or `aria-hidden`); full spec now met
- `common.dismiss` kept as "Fechar" in pt-BR — plan action said "Dispensar" but overwriting an existing UI string mid-phase would silently break Phase 1-2 surfaces; only the genuinely new keys (`tryAgain`, `resend`) were added

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] AiIcon updated instead of created (already existed from Plan 06)**
- **Found during:** Task 1 pre-check
- **Issue:** Plan said "AiIcon.tsx (NEW)" but Plan 06 had already created it — missing `motion-reduce:animate-none`, exported `AiIconProps` interface, `aria-hidden` prop, and JSDoc block
- **Fix:** Updated existing file to full spec rather than skipping or duplicating
- **Files modified:** `resources/js/Components/AiIcon.tsx`
- **Verification:** All acceptance criteria greps pass; line count ≥ 25
- **Committed in:** `3bfb16c` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 — existing file updated to spec)
**Impact on plan:** Correct outcome — AiIcon now fully spec-compliant. No scope creep.

## Issues Encountered

- Pre-existing TypeScript error in `Settings/Ai.tsx` (casing conflict `@/layouts/AppLayout` vs `@/Layouts/AppLayout`) — pre-dates this plan, out of scope per deviation rules. New files (useAiStream, useTypewriter, AiIcon, AiMarkdown) have zero TypeScript errors.

## User Setup Required

None — no external service configuration required for frontend hooks.

## Next Phase Readiness

Plans 09 (BriefTab), 10 (ChatTab), 11 (PlanningPage), 12 (ClientResearch) can now import:
- `import { useAiStream } from '@/hooks/useAiStream'`
- `import { useTypewriter } from '@/hooks/useTypewriter'`
- `import { AiIcon } from '@/Components/AiIcon'`
- `import { AiMarkdown } from '@/Components/AiMarkdown'`
- All i18n keys from `ai.*`, `planning.*`, `clients.monthlyPlan.*`, `clients.badges.*` ready

## Threat Flags

No new network endpoints, auth paths, or schema changes introduced. All XSS mitigation (rehype-sanitize in AiMarkdown) and CSRF protection (X-CSRF-TOKEN in useAiStream) specified in the plan's threat model are implemented.

---
*Phase: 03-ai-integration*
*Completed: 2026-04-23*
