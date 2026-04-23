---
phase: 03-ai-integration
plan: 09
subsystem: ui
tags: [react, typescript, headlessui, sse, streaming, tabs, modal, brief, chat, i18n]

requires:
  - phase: 03-ai-integration/03-04
    provides: "BriefStreamer SSE — POST /demands/{demand}/brief/generate + PATCH demands.brief.edit"
  - phase: 03-ai-integration/03-05
    provides: "ChatStreamer SSE — POST demands.chat.start + POST demands.chat.stream"
  - phase: 03-ai-integration/03-08
    provides: "useAiStream, useTypewriter, AiIcon, AiMarkdown shared hooks + full i18n tree"

provides:
  - "BriefTab.tsx — 4-state Brief component (empty/streaming/ready/edit) consuming useAiStream + useTypewriter"
  - "ChatTab.tsx — multi-turn streaming Chat IA component with Nova Conversa + compaction banner"
  - "DemandDetailModal.tsx — refactored with Headlessui v2 TabGroup right panel (4 tabs) + Gerar Brief header button"
  - "Demand.aiConversations() HasMany relation on Demand model"
  - "DemandController.index() eager-loads aiConversations with messages on selectedDemand"
  - "demands.tabs.{comments,files,brief} i18n keys in all 3 locales"

affects: []

tech-stack:
  added: []
  patterns:
    - "Headlessui v2 TabGroup/TabList/Tab/TabPanels/TabPanel named exports (not v1 Tab.Group dot-notation)"
    - "generatingBrief state owned at DemandDetailModal level — shared between header button and BriefTab via props"
    - "DemandController aliases aiConversations → conversations for frontend clarity"
    - "Optimistic user message bubble via setConv() before stream.start() in ChatTab"
    - "Nova Conversa confirm-state: first click sets confirmingNew=true (3s timeout), second click executes"

key-files:
  created:
    - resources/js/Components/BriefTab.tsx
    - resources/js/Components/ChatTab.tsx
  modified:
    - resources/js/Components/DemandDetailModal.tsx
    - app/Http/Controllers/DemandController.php
    - app/Models/Demand.php
    - resources/js/types/index.d.ts
    - resources/js/locales/pt-BR.json
    - resources/js/locales/en.json
    - resources/js/locales/es.json

key-decisions:
  - "generatingBrief state owned at DemandDetailModal level so the header Gerar Brief button is always visible and functional regardless of which tab is active"
  - "Files block moved from left column to Arquivos tab (canonical UI-SPEC §1 — right panel owns all tabs)"
  - "Left column now contains only metadata + edit form (cleaner separation)"
  - "Headlessui v2 named exports used — package.json specifies ^2.0.0 (actually 2.2.10 installed); v1 Tab.Group dot-notation would be a runtime error"
  - "AiConversation aliased as conversations on selectedDemand — frontend clarity without renaming the DB relation"

requirements-completed: [AI-01, AI-02, AI-03, AI-04, AI-05, AI-07]

duration: ~6min
completed: 2026-04-23
---

# Phase 03 Plan 09: DemandDetailModal 4-Tab AI Refactor Summary

**DemandDetailModal refactored with Headlessui v2 4-tab right panel (Comentários | Arquivos | Brief | Chat IA), new BriefTab and ChatTab components consuming SSE hooks, and "Gerar Brief" header button — the full AI surface is now visible within the demand modal**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-04-23T02:41:59Z
- **Completed:** 2026-04-23T02:47:54Z
- **Tasks completed:** 3 / 4 (Task 4 is a checkpoint:human-verify — awaiting visual QA)
- **Files modified:** 9 (2 created, 7 modified)

## Accomplishments

### Task 1 — BriefTab.tsx (230 lines)
- **Empty state**: chatbot 64px centerpiece + `Nenhum brief gerado ainda` heading + `Gerar Brief com IA` CTA, disabled when `!has_anthropic_key` (D-33)
- **Streaming state**: `useAiStream` POST SSE → `useTypewriter` char-by-char reveal + blinking `▎` cursor; `aria-live="polite"` for screen readers
- **Ready state**: `AiMarkdown` rendered brief + sticky top Editar/Regenerar ghost action row
- **Edit state**: monospace textarea with `border-[#7c3aed]` + `Ctrl/Cmd+S` = save, `Esc` = cancel (with dirty-check confirm)
- Parent-controlled `generating` prop allows the header button to trigger generation from any active tab
- `PATCH demands.brief.edit` + Inertia partial reload `only: ['selectedDemand']` on save

### Task 2 — ChatTab.tsx (332 lines)
- Loads latest `AiConversation` from `demand.conversations` prop (v1.1 constraint, see Known UX Constraint below)
- Optimistic user message bubble rendered immediately before SSE starts
- Streaming assistant bubble: `useAiStream` + `useTypewriter` + trailing `▎` cursor + `aria-live="polite"`
- **Nova Conversa**: first click enters 3s confirm state (`confirmingNew=true`), second click calls `POST demands.chat.start` + `router.reload`
- **Auto-compaction banner**: shown when `conv.compacted_at` is set; "Iniciar nova conversa" link re-invokes Nova Conversa flow (D-13)
- `has_anthropic_key` gate disables textarea + send button (D-33)
- Auto-scroll only when within 40px of bottom — does not hijack manual scroll-up
- Inline error banner (not toast) with `text-red-500` per UI-SPEC

### Task 3 — DemandDetailModal.tsx refactor + backend
- **Right panel**: Headlessui v2 `TabGroup` / `TabList` / `Tab` / `TabPanels` / `TabPanel` named exports
- **Tab bar** (44px): active tab gets `border-b-2 border-[#7c3aed] -mb-px text-[#7c3aed]`; Chat IA tab uses `AiIcon size={20}` (D-15 — no lucide substitute)
- **Header button**: `✨ Gerar Brief` → `Gerando…` (with spinning AiIcon) → `✨ Regenerar`; disabled with opacity-60 when `!hasKey`
- **Files block moved** from left column → Arquivos tab (UI-SPEC §1 canonical)
- **Left column**: metadata + edit form only (cleaner layout)
- **`Demand.aiConversations()`** HasMany relation added to `app/Models/Demand.php` (context_type=demand)
- **`DemandController.index()`** eager-loads `aiConversations` + `aiConversations.messages`, aliases to `conversations` on the `$selectedDemand` object
- **`types/index.d.ts`**: added `AuthOrganization`, `ChatMessage`, `AiConversation` interfaces; extended `PageProps.auth` with `organization`
- **i18n**: `demands.tabs.comments`, `demands.tabs.files`, `demands.tabs.brief` added to pt-BR / en / es

## Task Commits

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | BriefTab component | `af22131` | `resources/js/Components/BriefTab.tsx` |
| 2 | ChatTab component | `c547138` | `resources/js/Components/ChatTab.tsx` |
| 3 | DemandDetailModal refactor + backend | `4d294e1` | `DemandDetailModal.tsx`, `DemandController.php`, `Demand.php`, `index.d.ts`, `*.json` |

## Known UX Constraint (FLAG 11)

**ChatTab shows only the latest `ai_conversation` in v1.1.**

- Older conversations for the same demand persist in the `ai_conversations` database table and are accessible to backend code (jobs, memory extraction, compaction).
- The frontend in v1.1 loads only `demand.conversations[last]` — the most recently created conversation for that demand.
- A conversation picker dropdown (allowing the user to browse historical conversations) is **deferred to the v1.2 backlog** per the explicit project decision captured in `03-CONTEXT.md` (Deferred §v1.2) and `03-09-PLAN.md` frontmatter `must_haves.truths[ChatTab UX constraint]`.
- Users can still start a fresh conversation at any time via "Nova conversa". The old conversation remains in DB but is not navigable from the UI.

**Impact**: Low. Most users will have 0–1 conversations per demand in v1.1. The constraint only matters once a user has created multiple conversations for the same demand.

## Files Block Migration (Left Column → Arquivos Tab)

- **Before (Phase 2)**: Files list was in the left column of `DemandDetailModal`, below the metadata card.
- **After (Plan 09)**: Files list moved to the **Arquivos** right-panel tab. The left column now contains only the metadata view / edit form.
- This is the **canonical** behavior per UI-SPEC §1: "Arquivos becomes a right-panel tab containing the existing files list + Add file form. Remove files block from left column."
- No data loss: all existing file CRUD routes (`demands.files.store`, `demands.files.update`, `demands.files.destroy`) continue to work identically; only the rendering location changed.

## Partial Reload Strategy (Inertia)

`selectedDemand` Inertia prop carries the full demand with all tabs' data:
- After brief generate: `router.reload({ only: ['selectedDemand'] })` — persisted brief appears in Brief tab
- After brief PATCH edit: `only: ['selectedDemand']`, `preserveScroll: true`
- After chat stream done: `router.reload({ only: ['selectedDemand'] })` — persisted messages appear in Comentários list of the conversation
- After Nova Conversa: `router.reload({ only: ['selectedDemand'] })` — new empty conversation loaded

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Headlessui v1 API (`Tab.Group` dot-notation) used in plan — runtime error on v2**
- **Found during:** Task 3 pre-implementation analysis
- **Issue:** Package has `@headlessui/react@2.2.10` installed; v2 exports named `TabGroup`, `TabList`, `Tab`, `TabPanels`, `TabPanel` as separate named exports — not the v1 `Tab.Group` dot-notation sub-components
- **Fix:** Used `import { TabGroup, TabList, Tab, TabPanels, TabPanel } from '@headlessui/react'` with Headlessui v2 named API throughout
- **Files modified:** `resources/js/Components/DemandDetailModal.tsx`
- **Committed in:** `4d294e1` (Task 3)

**2. [Rule 2 - Missing functionality] `demands.tabs` i18n keys were not in any locale file**
- **Found during:** Task 3 — tab labels `t('demands.tabs.comments')` etc. had no backing keys
- **Fix:** Added `demands.tabs.{comments, files, brief}` to all 3 locale files (pt-BR, en, es)
- **Files modified:** `resources/js/locales/pt-BR.json`, `en.json`, `es.json`
- **Committed in:** `4d294e1` (Task 3)

**3. [Rule 2 - Missing functionality] `Demand.aiConversations()` relation missing from Demand model**
- **Found during:** Task 3 — DemandController eager-loads `aiConversations` but the relation did not exist on the model
- **Fix:** Added `aiConversations(): HasMany` to `app/Models/Demand.php` scoped to `context_type = 'demand'`
- **Files modified:** `app/Models/Demand.php`
- **Committed in:** `4d294e1` (Task 3)

**Total deviations:** 3 auto-fixed (1 Rule 1 API mismatch, 2 Rule 2 missing critical functionality)

## Known Stubs

None. All BriefTab and ChatTab states are fully wired to real endpoints from Plans 04 and 05.

## Threat Flags

No new security surface introduced beyond the plan's threat model.
- T-03-80 (XSS in AiMarkdown): mitigated by rehype-sanitize from Plan 08 — both BriefTab and ChatTab use `<AiMarkdown>` for all AI content rendering
- T-03-81 (conversation ownership): frontend only displays what the API returns; backend (Plan 05) triple-checks org+context scoping
- T-03-82 (typed messages): per-org scoping at API level; frontend is display-only

## Self-Check: PASSED

Files verified on disk:
- `resources/js/Components/BriefTab.tsx` — FOUND (230 lines, ≥ 160)
- `resources/js/Components/ChatTab.tsx` — FOUND (332 lines, ≥ 220)
- `resources/js/Components/DemandDetailModal.tsx` — FOUND (485 lines, refactored)

Commits verified in git log:
- `af22131` (feat: BriefTab) — FOUND
- `c547138` (feat: ChatTab) — FOUND
- `4d294e1` (feat: DemandDetailModal + backend) — FOUND

## Checkpoint Pending

Task 4 (`checkpoint:human-verify`) requires manual visual QA of the full AI surface:
- 4 tabs visible in DemandDetailModal right panel
- "✨ Gerar Brief" header button streams + persists
- Brief tab edit flow (Ctrl+S, Esc)
- Chat IA empty state → send message → streaming → persist
- Nova Conversa confirm-to-reset
- Comments and Files tabs unaffected (regression check)

---
*Phase: 03-ai-integration*
*Completed tasks: 3/4 (Task 4 awaiting human-verify)*
*Completed: 2026-04-23*
