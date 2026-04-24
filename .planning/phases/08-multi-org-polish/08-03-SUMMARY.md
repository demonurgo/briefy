---
phase: 08-multi-org-polish
plan: "03"
subsystem: ui, types
tags: [typescript, inertia, react, types, pageprops]

requires:
  - phase: 08-multi-org-polish
    plan: "01"
    provides: "Expanded global TypeScript types (User, AuthOrganization, PageProps) in index.d.ts"

provides:
  - "Zero TypeScript errors across entire codebase (npx tsc --noEmit exits 0)"
  - "AiIcon accepts size 11 and 14 in addition to existing sizes"
  - "All local PageProps redeclarations removed from 10 component/page files"
  - "Clients/Edit.tsx uses Inertia v3 compliant setData+post pattern for social_handles"
  - "Sidebar.tsx and Trash.tsx use usePage<PageProps>() without unsafe casts"
  - "AppLayout.tsx and Settings/Index.tsx migrated to global PageProps"

affects: [08-04, 08-05, 08-06, 08-07]

tech-stack:
  added: []
  patterns:
    - "auth.organization.has_anthropic_key replaces auth.user.organization.has_anthropic_key — AuthOrganization is on auth.organization, not user.organization"
    - "Inertia v3 submit: setData(key, value) then post(url) — data: option removed from UseFormSubmitOptions"
    - "Global PageProps extension via PageProps<{ auth: { organization: SettingsOrganization | null } }> for pages needing extra fields"
    - "Record<string, unknown> preferences accessed via bracket notation: preferences?.['locale'] as string"

key-files:
  created: []
  modified:
    - resources/js/Components/AiIcon.tsx
    - resources/js/Components/BriefTab.tsx
    - resources/js/Components/ChatTab.tsx
    - resources/js/Components/DemandDetailModal.tsx
    - resources/js/Components/FlashMessage.tsx
    - resources/js/Components/Sidebar.tsx
    - resources/js/hooks/useTheme.ts
    - resources/js/Layouts/AppLayout.tsx
    - resources/js/pages/Clients/Edit.tsx
    - resources/js/pages/Clients/Index.tsx
    - resources/js/pages/Clients/Show.tsx
    - resources/js/pages/Demands/Show.tsx
    - resources/js/pages/Demands/Trash.tsx
    - resources/js/pages/Planejamento/Index.tsx
    - resources/js/pages/Settings/Index.tsx

key-decisions:
  - "auth.organization (AuthOrganization) is the correct source for has_anthropic_key — not auth.user.organization which only has {id, name, slug, logo}"
  - "Settings/Index.tsx SettingsPageProps replaced with PageProps<{auth:{organization:SettingsOrganization|null}}> extension to add client_research_agent_id fields without breaking global constraint"
  - "AppLayout.tsx local PageProps deleted entirely — global type already has all needed fields (unread_notifications, auth.user.organizations, auth.user.organization)"
  - "useTheme and Settings preferences access via bracket notation (preferences?.['locale']) because global User.preferences is Record<string,unknown>"

patterns-established:
  - "usePage<PageProps>() pattern: import global PageProps from '@/types', never declare local interface PageProps"
  - "Inertia v3 form submit: setData(key, val) then post(url) — no data: option in submit"

requirements-completed:
  - POLISH-02

duration: 5min
completed: "2026-04-24"
---

# Phase 8 Plan 03: TypeScript Error Elimination Summary

**Removed all 15 TypeScript errors by deleting local PageProps overrides across 10 files, expanding AiIcon size enum to include 11 and 14, and fixing Inertia v3 form submit in Clients/Edit.tsx — npx tsc --noEmit now exits 0**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-04-24T17:12:09Z
- **Completed:** 2026-04-24T17:17:32Z
- **Tasks:** 2
- **Files modified:** 15

## Accomplishments

- Expanded `AiIcon` size enum from `12|16|20|24|32|48|64` to `11|12|14|16|20|24|32|48|64` — resolves TS2322 in PlanningItemModal, Clients/Index, Clients/Show, Planejamento/Index
- Removed local `PageProps` interfaces from BriefTab, ChatTab, DemandDetailModal, FlashMessage, useTheme, Demands/Show, AppLayout, Clients/Index, Clients/Show, Planejamento/Index, Demands/Trash, Sidebar — all now use global `PageProps` from `@/types`
- Fixed Inertia v3 form submit in Clients/Edit.tsx: `setData('social_handles', cleanedHandles)` before `post()` — the previous `data:` option was silently ignored, meaning cleaned handles were never sent
- Migrated Settings/Index.tsx from `SettingsPageProps` (missing global fields) to `PageProps<{auth:{organization:SettingsOrganization|null}}>` extension
- Corrected all `auth.user.organization.has_anthropic_key` accesses to `auth.organization.has_anthropic_key` (AuthOrganization is on `auth.organization`, not nested in `User.organization`)

## Task Commits

Each task was committed atomically:

1. **Task 1: AiIcon enum + BriefTab, DemandDetailModal, FlashMessage, useTheme, Demands/Show** - `87ad2d9` (fix)
2. **Task 2: ChatTab, Sidebar, Trash, Clients/Edit, Clients/Index, Clients/Show, Planejamento/Index, AppLayout, Settings/Index** - `cca856d` (fix)

## Files Created/Modified

- `resources/js/Components/AiIcon.tsx` — size enum expanded: added 11 and 14
- `resources/js/Components/BriefTab.tsx` — removed local PageProps; changed `auth.user.organization.has_anthropic_key` → `auth.organization.has_anthropic_key`
- `resources/js/Components/ChatTab.tsx` — removed local PageProps; same auth.organization fix (Plan 05 chat logic untouched)
- `resources/js/Components/DemandDetailModal.tsx` — removed inline usePage cast; uses global PageProps; `auth.organization.has_anthropic_key`; `auth.user.current_organization_id`
- `resources/js/Components/FlashMessage.tsx` — removed inline cast; uses global PageProps (flash? is present)
- `resources/js/Components/Sidebar.tsx` — replaced `usePage().props as {archive_count...}` with `usePage<PageProps>().props`
- `resources/js/hooks/useTheme.ts` — removed local PageProps; access preferences via bracket notation
- `resources/js/Layouts/AppLayout.tsx` — removed local PageProps (28-line interface); uses global PageProps
- `resources/js/pages/Clients/Edit.tsx` — Inertia v3 fix: `setData('social_handles', cleanedHandles); post(url)`
- `resources/js/pages/Clients/Index.tsx` — removed `usePage().props as any`; uses global PageProps
- `resources/js/pages/Clients/Show.tsx` — removed `usePage().props as any`; uses global PageProps
- `resources/js/pages/Demands/Show.tsx` — removed inline usePage cast; uses global PageProps
- `resources/js/pages/Demands/Trash.tsx` — replaced `usePage().props as {auth:{user:{role:string}}...}` with `usePage<PageProps>().props`
- `resources/js/pages/Planejamento/Index.tsx` — removed `usePage().props as any`; uses global PageProps
- `resources/js/pages/Settings/Index.tsx` — replaced SettingsPageProps with PageProps extension; `userOrg = auth.organization as SettingsOrganization`; preferences cast via bracket notation

## Decisions Made

- `auth.organization.has_anthropic_key` is the correct access path — `auth.user.organization` is the narrower nested shape `{id, name, slug, logo}` without AI settings; `auth.organization` (AuthOrganization) carries the full settings shape including `has_anthropic_key`, `key_valid`, etc.
- Settings/Index keeps a `SettingsOrganization` interface extending AuthOrganization with `client_research_agent_id` and `client_research_environment_id` — these fields are only sent by SettingsController and are not in the global AuthOrganization type
- `user.preferences` is `Record<string, unknown> | null` in the global type — bracket notation `preferences?.['locale'] as string` is required to avoid `unknown` inference breaking `useForm`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] AppLayout.tsx local PageProps was missing global fields and needed migration**
- **Found during:** Task 2 (running tsc after initial fixes)
- **Issue:** AppLayout had a local 28-line `interface PageProps` missing `archive_count`, `trash_count`, `locale` — causing TS2344 after Plan 01 expanded the global type
- **Fix:** Deleted the local interface, imported global `PageProps` from `@/types`
- **Files modified:** `resources/js/Layouts/AppLayout.tsx`
- **Verification:** tsc --noEmit passes; AppLayout renders correctly (auth.user.organizations, unread_notifications all present in global type)
- **Committed in:** `cca856d` (Task 2 commit)

**2. [Rule 1 - Bug] Settings/Index.tsx SettingsPageProps missing global constraint fields**
- **Found during:** Task 2 (running tsc after initial fixes)
- **Issue:** `SettingsPageProps` didn't extend global `PageProps` so it was missing `archive_count`, `trash_count`, `locale`, `unread_notifications` — TS2344
- **Fix:** Replaced with `type SettingsPageProps = PageProps<{ auth: { organization: SettingsOrganization | null } }>` extension; migrated `userOrg` from `user.organization` to `auth.organization`; fixed preferences bracket notation
- **Files modified:** `resources/js/pages/Settings/Index.tsx`
- **Verification:** tsc --noEmit passes; Settings page accesses userOrg.has_anthropic_key, userOrg.key_valid, etc. correctly
- **Committed in:** `cca856d` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (Rule 1 — bugs that surfaced after Plan 01 expanded global PageProps; both files not in original plan scope but required for tsc exit 0)
**Impact on plan:** Both fixes necessary to achieve the plan's stated success criterion (tsc --noEmit exits 0). No scope creep.

## Final tsc --noEmit Output

```
(no output — exit code 0)
```

Zero TypeScript errors. All 15 original errors resolved.

## Verification Results

```
grep "interface PageProps" BriefTab ChatTab DemandDetailModal FlashMessage Demands/Show → no matches
grep "11 | 12 | 14" AiIcon.tsx → line 6: size?: 11 | 12 | 14 | 16 | 20 | 24 | 32 | 48 | 64
grep "setData('social_handles'" Clients/Edit.tsx → line 49: setData('social_handles', cleanedHandles)
grep "usePage<PageProps>" Sidebar.tsx → line 153
grep "usePage<PageProps>" Demands/Trash.tsx → line 34
```

## Known Stubs

None — this plan is purely TypeScript type fixes. No runtime data stubs introduced.

## Threat Flags

None — changes are compile-time type fixes only. The Inertia v3 form fix (T-08-03-01 from threat model) was applied correctly: `setData('social_handles', cleanedHandles)` ensures cleaned handles are the actual data submitted, restoring the intended security behavior where empty handles are stripped before sending.

## Issues Encountered

None beyond the two auto-fixed deviations above.

## Next Phase Readiness

- TypeScript baseline is clean — Plans 04-07 can now add new features without fighting existing type errors
- `auth.organization.has_anthropic_key` access pattern is now consistent across all components
- Plan 05 (ChatTab conversation picker) can modify ChatTab safely — local PageProps is already removed, only chat logic additions needed

---
*Phase: 08-multi-org-polish*
*Completed: 2026-04-24*
