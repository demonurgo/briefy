---
phase: 04-team-management
plan: "06"
subsystem: frontend-invitation-accept
tags: [react, typescript, inertia, invitation, guest-page, standalone-layout, role-badge]

# Dependency graph
requires:
  - phase: 04-team-management
    plan: "04"
    provides: InvitationController::show() + InvitationController::store() + invitations.show + invitations.store routes

provides:
  - Invite/Accept.tsx — standalone guest invitation acceptance page (3 states: new user, existing user, expired)

affects:
  - No downstream frontend plans in Phase 4 depend directly on this component

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pattern: standalone centered card layout (no AppLayout) for guest-accessible pages"
    - "Pattern: token extraction from window.location.pathname for Inertia guest pages without route param props"
    - "Pattern: useForm with conditional payload (new user vs existing user) via same form.post() call"
    - "Pattern: role badge with 3-variant color mapping (owner/admin/collaborator) per UI-SPEC"

key-files:
  created:
    - resources/js/pages/Invite/Accept.tsx
  modified: []

key-decisions:
  - "Token extracted from window.location.pathname (split on /invite/ and /accept) — controller does not pass token as Inertia prop, consistent with security (T-04-17: client receives only email+role+org name)"
  - "Same form.post() call handles both branches (new user and existing user) — payload difference handled server-side by InvitationController::store() which checks User::where('email',...)"
  - "No AppLayout — standalone full-page centered layout matching GuestLayout pattern but without the GuestLayout component wrapper (direct div composition per UI-SPEC spec)"

requirements-completed:
  - TEAM-01

# Metrics
duration: 10min
completed: 2026-04-23T19:50:57Z
---

# Phase 04 Plan 06: Invitation Accept Page Summary

**Standalone guest-accessible invitation acceptance page with three-state rendering (new user registration form, existing user confirmation, expired/invalid token) — no AppLayout, centered card, full pt-BR copywriting per UI-SPEC**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-04-23T19:40:00Z
- **Completed:** 2026-04-23T19:50:57Z
- **Tasks:** 1
- **Files modified:** 1 (1 created, 0 modified)

## Accomplishments

- **Invite/Accept.tsx** (new): Guest-accessible invitation acceptance page. Three-state rendering:
  - **Expired/invalid state**: Shows "Este convite expirou ou já foi utilizado." with a note to request a new invite
  - **Branch A (new user, has_account=false)**: Name + password + confirm password fields with "Criar conta e entrar" submit button
  - **Branch B (existing user, has_account=true)**: Info message "Esta conta já existe no Briefy. Clique abaixo para entrar na organização." with "Entrar na organização" submit button
  - **Role badge**: Color-coded badge (owner=purple, admin=blue, collaborator=gray) with pt-BR labels ("Proprietário", "Admin", "Colaborador")
  - **Token extraction**: `window.location.pathname.split('/invite/')[1]?.split('/accept')[0]` — clean URL extraction without exposing token as Inertia prop
  - **Submission**: `form.post(route('invitations.store', token))` — same route for both branches; server differentiates via email lookup

## Task Commits

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Create Invite/Accept.tsx — guest invitation acceptance page | `b54f6f0` | resources/js/pages/Invite/Accept.tsx |

## Deviations from Plan

None — plan executed exactly as written. The token extraction approach using `window.location.pathname` was used as specified in the plan's Notes section. The `form.post()` call is identical for both branches as the server-side `InvitationController::store()` handles the user differentiation via email lookup (existing `User::where('email', $invitation->email)->first()`).

## Known Stubs

None — the page is fully implemented with real data from Inertia props. All three states render correctly based on the `expired`, `invitation`, `organization`, and `has_account` props passed by `InvitationController::show()`.

## Threat Flags

All threat model entries mitigated inline:

| Threat ID | Mitigation Location |
|-----------|---------------------|
| T-04-17 | Props interface includes only `email`, `role`, and `organization.name` — no token, no internal IDs, no `invited_by` |
| T-04-18 | Token extracted client-side from URL but validated server-side in `InvitationController::store()` via `whereNull('accepted_at')->where('expires_at','>', now())->firstOrFail()` |

## Self-Check

**Created files:**
- `resources/js/pages/Invite/Accept.tsx` — FOUND

**Commits:**
- `b54f6f0` — feat(04-06): create Invite/Accept.tsx — guest invitation acceptance page

**Acceptance criteria verified:**
- `test -f resources/js/pages/Invite/Accept.tsx` → 0 (PASS)
- `npx tsc --noEmit 2>&1 | grep "Invite/Accept"` → 0 errors (PASS)
- Component exports default function named `InviteAccept` (PASS)
- `grep "invitations.store"` → found on line 38 (PASS)
- All 3 copy strings present: "Criar conta e entrar" (line 145), "Entrar na organização" (line 144), "Este convite expirou" (line 59) (PASS)
- `grep "AppLayout"` → 0 lines (PASS)

## Self-Check: PASSED

---

*Phase: 04-team-management*
*Completed: 2026-04-23*
