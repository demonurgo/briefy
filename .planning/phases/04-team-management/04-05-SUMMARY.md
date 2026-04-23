---
phase: 04-team-management
plan: "05"
subsystem: backend-middleware-authorization
tags: [php, laravel, middleware, rbac, authorization, collaborator-restrictions]

# Dependency graph
requires:
  - phase: 04-team-management
    plan: "02"
    provides: User model with isOwner/isAdminOrOwner helpers + getCurrentRoleAttribute() from pivot

provides:
  - EnsureRole middleware (checks pivot role, aborts 403 if insufficient)
  - 'role' middleware alias registered in bootstrap/app.php
  - Team routes protected by role:admin,owner middleware (invite, cancel, resend, updateRole, remove)
  - DemandController::destroy() ownership check for collaborators
  - ClientController::update() and destroy() require isAdminOrOwner()
  - TrashController::forceDelete() ownership check for collaborators
  - TeamController expanded with full team management methods

affects:
  - 04-06 (settings page: team routes now exist with correct names for frontend wiring)
  - 04-07 (settings unified: team management backend ready)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pattern: EnsureRole middleware uses string ...$roles variadic — usage: ->middleware('role:admin,owner')"
    - "Pattern: collaborator ownership check — if (!isAdminOrOwner() && $demand->created_by !== $user->id) abort(403)"
    - "Pattern: team routes outside settings. prefix group so route names are team.invite, team.remove (not settings.team.invite)"

key-files:
  created:
    - app/Http/Middleware/EnsureRole.php
  modified:
    - bootstrap/app.php
    - routes/web.php
    - app/Http/Controllers/TeamController.php
    - app/Http/Controllers/DemandController.php
    - app/Http/Controllers/ClientController.php
    - app/Http/Controllers/TrashController.php

key-decisions:
  - "Team routes placed outside the settings. Route prefix group to keep route names as team.invite/team.remove — matches EnsureRoleTest expectations"
  - "forceDelete() changed from isAdmin()-only gate to ownership-aware check: collaborators can force-delete own demands (D-14 aligns with soft-delete parity)"
  - "isAdmin() calls in DemandController::index/show updated to isAdminOrOwner() — owners are now correctly treated as admins for UI visibility"
  - "TeamController expanded from stub to full implementation: invite, cancelInvitation, resendInvitation, updateRole, remove"

requirements-completed:
  - TEAM-05

# Metrics
duration: 12min
completed: 2026-04-23
---

# Phase 04 Plan 05: EnsureRole Middleware & Collaborator Restrictions Summary

**EnsureRole middleware created with pivot-based role check; all team mutation routes protected by role:admin,owner; collaborator restrictions enforced server-side in DemandController, ClientController, and TrashController**

## Performance

- **Duration:** 12 min
- **Started:** 2026-04-23T19:30:00Z
- **Completed:** 2026-04-23T19:42:00Z
- **Tasks:** 2
- **Files modified:** 6 (1 created)

## Accomplishments

- **EnsureRole middleware** created at `app/Http/Middleware/EnsureRole.php`. Reads role from `$user->getCurrentRoleAttribute()` (pivot DB query — cannot be spoofed via request header). Aborts 403 if role not in allowed list. Supports variadic roles: `->middleware('role:admin,owner')`.
- **Alias registered** in `bootstrap/app.php`: `'role' => \App\Http\Middleware\EnsureRole::class` alongside `ai.meter`.
- **Team routes** added to `routes/web.php` with `role:admin,owner` middleware on: `team.invite`, `team.invitations.cancel`, `team.invitations.resend`, `team.role`, `team.remove`.
- **TeamController** expanded from stub to full implementation: `invite()`, `cancelInvitation()`, `resendInvitation()`, `updateRole()`, `remove()` — all with proper org-scoping and owner-demotion protection.
- **DemandController::destroy()**: collaborators can only soft-delete their own demands (`$demand->created_by !== $user->id` check). Admins/owners can delete any demand.
- **DemandController::index/show**: `isAdmin()` updated to `isAdminOrOwner()` so owners correctly see admin UI features.
- **ClientController::update() and destroy()**: `abort_unless(isAdminOrOwner(), 403)` added at method entry — collaborators cannot edit or delete clients (D-14).
- **TrashController::forceDelete()**: changed from flat `isAdmin()` gate to ownership-aware check — collaborators can force-delete their own demands, admins/owners can force-delete any.

## Task Commits

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | EnsureRole middleware + role-protected team routes | `303808a` | EnsureRole.php, bootstrap/app.php, routes/web.php, TeamController.php |
| 2 | Collaborator restrictions in Demand/Client/TrashController | `784a821` | DemandController.php, ClientController.php, TrashController.php |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical] TeamController expanded from stub to full implementation**
- **Found during:** Task 1 (adding team routes that reference TeamController methods)
- **Issue:** TeamController was a stub with only `index()` returning empty members. The routes `team.invite`, `team.remove` etc. reference methods (`invite`, `remove`, `updateRole`, `cancelInvitation`, `resendInvitation`) that didn't exist. Without these methods, the routes would throw `BadMethodCallException` at runtime.
- **Fix:** Implemented all five team management methods with org-scoping, validation, owner-demotion protection, and proper pivot manipulation.
- **Files modified:** `app/Http/Controllers/TeamController.php`
- **Commit:** `303808a`

**2. [Rule 1 - Bug] Team routes moved outside settings. prefix group**
- **Found during:** Task 1 (analyzing test expectations)
- **Issue:** The plan instructed adding team routes inside `Route::prefix('settings')->name('settings.')`. This would generate route names `settings.team.invite`, `settings.team.remove` etc. But `EnsureRoleTest.php` calls `route('team.invite')` and `route('team.remove')` — these would throw `RouteNotFoundException` at test runtime.
- **Fix:** Team routes placed outside the `settings.` prefix group with explicit names (`team.invite`, `team.remove`, etc.). The GET `/settings/team` index route explicitly registered as `settings.team`.
- **Files modified:** `routes/web.php`
- **Commit:** `303808a`

**3. [Rule 1 - Bug] forceDelete() ownership-aware instead of flat isAdmin() gate**
- **Found during:** Task 2 (reading plan spec for TrashController)
- **Issue:** Plan spec says "collaborators cannot permanently delete demands that are not theirs" — implying collaborators CAN permanently delete their own demands. The original code used `abort_unless(isAdmin(), 403)` which would block collaborators from force-deleting even their own demands. This contradicts D-14 which only restricts deletion of *other users'* demands.
- **Fix:** Changed to ownership-aware check: `if (!isAdminOrOwner() && $demand->created_by !== $user->id) abort(403)`. This allows collaborators to force-delete own demands while blocking cross-user deletions.
- **Files modified:** `app/Http/Controllers/TrashController.php`
- **Commit:** `784a821`

## Known Stubs

None — all implemented methods are fully wired. TeamController methods perform real DB operations via Eloquent pivot.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: elevation_of_privilege | EnsureRole.php | Role read from `getCurrentRoleAttribute()` (pivot DB query) — T-04-14 mitigated: cannot be spoofed via request header |
| threat_flag: elevation_of_privilege | DemandController.php | `$demand->created_by !== $user->id` check blocks cross-user deletions — T-04-15 mitigated |
| threat_flag: elevation_of_privilege | ClientController.php | `abort_unless(isAdminOrOwner())` at method entry for update/destroy — T-04-16 mitigated |

## Self-Check

**Created files:**
- `app/Http/Middleware/EnsureRole.php` — FOUND

**Modified files verified:**
- `bootstrap/app.php` — `grep "EnsureRole"` shows alias registration ✓
- `routes/web.php` — team routes with `role:admin,owner` middleware ✓
- `app/Http/Controllers/DemandController.php` — `isAdminOrOwner` present ✓
- `app/Http/Controllers/ClientController.php` — 2x `isAdminOrOwner` (update + destroy) ✓
- `app/Http/Controllers/TrashController.php` — ownership-aware forceDelete ✓

**Commits:**
- `303808a` — FOUND (feat(04-05): EnsureRole middleware + role-protected team routes)
- `784a821` — FOUND (feat(04-05): enforce collaborator restrictions in Demand/Client/TrashController)

## Self-Check: PASSED

---

*Phase: 04-team-management*
*Completed: 2026-04-23*
