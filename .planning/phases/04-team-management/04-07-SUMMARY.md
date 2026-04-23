---
phase: 04-team-management
plan: "07"
subsystem: frontend-avatar-orgswitcher
tags: [react, typescript, useravatar, gradient, orgswitcher, applayout, header, inertia]

# Dependency graph
requires:
  - phase: 04-team-management
    plan: "04"
    provides: SettingsController::switchOrg() — PATCH /settings/current-org route + HandleInertiaRequests shared props (avatar, role, current_organization_id, organization, organizations)

provides:
  - UserAvatar component with deterministic 2-color HSL gradient fallback (nameToGradient via djb2 hash)
  - AppLayout header OrgSwitcher replacing plain text username

affects:
  - 04-08 (Settings/Index page — will import UserAvatar for profile section)
  - 04-09 (Team roster — will use UserAvatar for member list)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pattern: nameToGradient() — djb2 hash → hue1 = hash%360, hue2 = (hue1+130)%360 → linear-gradient(135deg, hsl, hsl)"
    - "Pattern: UserAvatar named export matching ClientAvatar API (name/avatar/size props)"
    - "Pattern: OrgSwitcher with useRef + useEffect outside-click handler (same pattern as bell dropdown)"
    - "Pattern: router.patch(route('settings.current-org'), { organization_id }) for org switching"
    - "Pattern: AppLayout PageProps includes auth.organization (AuthOrganization shape) for Inertia constraint compatibility"

key-files:
  created:
    - resources/js/Components/UserAvatar.tsx
  modified:
    - resources/js/Layouts/AppLayout.tsx

key-decisions:
  - "UserAvatar uses djb2 hash (multiply-by-31 variant) not djb2 XOR — consistent with plan spec"
  - "Hue spacing is 130 degrees (not 120) per plan must_haves truths"
  - "AppLayout local PageProps includes auth.organization field to satisfy Inertia global constraint (AuthOrganization shape with logo?: string, not string|null)"
  - "Pre-existing TS errors in BriefTab, ChatTab, FlashMessage, useTheme, Sidebar, Clients, Demands, Planejamento are out-of-scope — not introduced by this plan"

requirements-completed:
  - TEAM-02
  - TEAM-04

# Metrics
duration: 20min
completed: 2026-04-23
---

# Phase 04 Plan 07: UserAvatar + OrgSwitcher Header Summary

**UserAvatar component with deterministic HSL gradient fallback (djb2 hash, 130° hue spacing) + OrgSwitcher dropdown in AppLayout header replacing plain text username, wired to PATCH /settings/current-org**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-04-23T21:00:00Z
- **Completed:** 2026-04-23T21:20:00Z
- **Tasks:** 2
- **Files modified:** 2 (1 created, 1 modified)

## Accomplishments

- **UserAvatar.tsx** (new): Named export `UserAvatar` with same API as `ClientAvatar` (`name`, `avatar`, `size` props). Shows `<img src=/storage/{avatar}>` when avatar set; falls back to `<div>` with deterministic 2-color HSL gradient + initials. `nameToGradient()` uses djb2 multiply-by-31 hash → `hue1 = hash % 360`, `hue2 = (hue1 + 130) % 360`. Gradient angle `135deg`. Accessibility: `role="img"` + `aria-label={name}` on fallback div, `alt={name}` on img.

- **AppLayout.tsx** (modified): Extended `PageProps` interface to include Phase 4 user fields (`avatar`, `role`, `current_organization_id`, `organization`, `organizations`) plus `auth.organization` (for Inertia constraint compatibility). Added `orgSwitcherOpen` state + `orgSwitcherRef` with `useEffect` outside-click handler (same pattern as bell). Replaced `<span>` username with OrgSwitcher trigger button showing `UserAvatar(sm)` + org name + `ChevronDown`. Dropdown lists all user organizations with active checkmark (`Check` icon, `text-[#7c3aed]`). Clicking non-active org fires `router.patch(route('settings.current-org'), { organization_id: org.id })`. Disabled "Criar nova organização" button with `title="Em breve"`.

## Task Commits

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Create UserAvatar with deterministic gradient fallback | `a6d948f` | resources/js/Components/UserAvatar.tsx |
| 2 | Add OrgSwitcher to AppLayout header | `3fe6fd5` | resources/js/Layouts/AppLayout.tsx |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed AppLayout PageProps incompatibility with Inertia global constraint**
- **Found during:** Task 2 verification (npm run build)
- **Issue:** AppLayout local `PageProps` interface had `auth.organization.logo?: string | null` but the global `AuthOrganization` type defines `logo?: string` (no null). TypeScript error TS2344 was raised.
- **Fix:** Changed `logo?: string | null` to `logo?: string` in the local `auth.organization` shape. Also added `auth.organization` field to the local `PageProps` (required by Inertia's global PageProps constraint) — it was missing from the initial implementation.
- **Files modified:** `resources/js/Layouts/AppLayout.tsx`
- **Commit:** `3fe6fd5`

### Pre-existing Errors (Out of Scope)

The following pre-existing TypeScript errors exist in files not modified by this plan and are outside the scope of this task (logged to deferred tracking):

- `BriefTab.tsx`, `ChatTab.tsx`, `DemandDetailModal.tsx`, `FlashMessage.tsx`: Local `PageProps` missing `auth.organization` — present before this plan
- `useTheme.ts`: Local `PageProps` missing `auth.organization`
- `Sidebar.tsx`: Type cast incompatibility with `archive_count`
- `Demands/Show.tsx`, `Demands/Trash.tsx`: Local auth type missing `organization`
- `Clients/Edit.tsx`, `Clients/Index.tsx`, `Clients/Show.tsx`, `Planejamento/Index.tsx`: Icon size and form type issues

These are tracked as deferred items for a future TS cleanup plan.

## Known Stubs

None — both components are fully implemented and wired. OrgSwitcher reads from `auth.user.organizations` (provided by `HandleInertiaRequests` from Plan 02).

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: client-side-org-switch | resources/js/Layouts/AppLayout.tsx | organization_id sent from client via PATCH — server validates pivot membership in SettingsController::switchOrg() (T-04-19, mitigated in Plan 04) |

## Self-Check

**Created files:**
- `resources/js/Components/UserAvatar.tsx` — FOUND

**Modified files:**
- `resources/js/Layouts/AppLayout.tsx` — FOUND (modified)

**Commits:**
- `a6d948f` — FOUND (feat(04-07): create UserAvatar component with deterministic gradient fallback)
- `3fe6fd5` — FOUND (feat(04-07): add OrgSwitcher to AppLayout header with UserAvatar)

## Self-Check: PASSED

---

*Phase: 04-team-management*
*Completed: 2026-04-23*
