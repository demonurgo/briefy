---
phase: 04-team-management
plan: "01"
subsystem: database
tags: [postgresql, migration, intervention-image, organization-user, pivot, invitations, avatar, role-enum]

# Dependency graph
requires:
  - phase: 03-ai-integration
    provides: existing users.organization_id column and users.role enum

provides:
  - organization_user pivot table (user_id, organization_id, role, joined_at)
  - users.current_organization_id column (renamed from organization_id)
  - invitations table with token, expires_at, accepted_at
  - users.avatar nullable string column
  - role enum expanded to owner|admin|collaborator
  - intervention/image:^3 installed with GD driver
  - public/storage symlink for avatar serving
affects:
  - 04-02 (update User model + controller references to current_organization_id)
  - 04-03 (invitation flow relies on invitations table)
  - 04-04 (avatar upload relies on users.avatar + intervention/image)
  - 04-05 (role gates rely on expanded enum + organization_user pivot)

# Tech tracking
tech-stack:
  added:
    - intervention/image:^3.11.7 (GD driver, avatar resize)
    - intervention/image-laravel:^1.5.9 (service provider)
    - intervention/gif:^4.2.4 (transitive dep)
  patterns:
    - Three-step atomic migration: create pivot → backfill → rename column
    - PostgreSQL CHECK constraint modification via DB::statement (not ->change())
    - Owner backfill heuristic: MIN(user_id) per organization_id in pivot

key-files:
  created:
    - database/migrations/2026_04_23_300000_create_organization_user_table_and_rename_column.php
    - database/migrations/2026_04_23_300100_create_invitations_table.php
    - database/migrations/2026_04_23_300200_add_avatar_to_users_table.php
    - database/migrations/2026_04_23_300300_expand_role_enum_on_users_table.php
    - config/image.php
  modified:
    - composer.json (added intervention/image + intervention/image-laravel)
    - composer.lock (resolved merge conflict + updated with new packages)

key-decisions:
  - "Three steps in one atomic migration (create pivot, backfill, rename) — avoids data loss window"
  - "PostgreSQL CHECK constraint modified via DB::statement — ->change() does not work for enum in pgsql"
  - "Owner backfill: MIN(user_id) per org in organization_user — fallback for orgs without created_by field"
  - "users.role kept in sync with organization_user.role via write-through (sync step in migration)"
  - "intervention/image pinned to ^3 (not ^4) — API changed in v4"

patterns-established:
  - "Pattern: Multi-step migration with data backfill before column rename"
  - "Pattern: PostgreSQL enum expansion via DROP CONSTRAINT + ADD CONSTRAINT"
  - "Pattern: Intervention Image v3 — ImageManager(Driver::class)->read()->cover(256,256)->toJpeg(90)"

requirements-completed:
  - TEAM-01
  - TEAM-02
  - TEAM-03
  - TEAM-04
  - TEAM-05

# Metrics
duration: 7min
completed: 2026-04-23
---

# Phase 04 Plan 01: Schema Foundation Summary

**Four migrations creating organization_user pivot, invitations table, users.avatar column, and owner role expansion — with intervention/image:^3 installed for Phase 4 avatar upload**

## Performance

- **Duration:** 7 min
- **Started:** 2026-04-23T19:01:48Z
- **Completed:** 2026-04-23T19:08:13Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments

- `organization_user` pivot table created and backfilled from existing `users.organization_id` data; `users.organization_id` renamed to `users.current_organization_id` atomically in one migration
- `invitations` table created with UUID token, `expires_at`, `accepted_at`, and double-index on token + email/org (D-01)
- `users.avatar` nullable string column added; `users.role` CHECK constraint expanded to `owner|admin|collaborator`; existing org founder promoted to `owner` via MIN(user_id) heuristic (D-12)
- `intervention/image:^3` (GD driver) installed and functional; `public/storage` symlink created

## Task Commits

Each task was committed atomically:

0. **Pre-task: Resolve merge conflict in composer.lock** - `0a3d5e9` (fix)
1. **Task 1: Install intervention/image + storage:link** - `b926661` (chore)
2. **Task 2: organization_user pivot + backfill + column rename** - `ad9dcab` (feat)
3. **Task 3: invitations table + avatar column + role enum** - `ece82e7` (feat)

## Files Created/Modified

- `database/migrations/2026_04_23_300000_create_organization_user_table_and_rename_column.php` — Three-step atomic migration: create pivot, backfill from users, rename column
- `database/migrations/2026_04_23_300100_create_invitations_table.php` — Invitation table with UUID token, expiry, acceptance tracking
- `database/migrations/2026_04_23_300200_add_avatar_to_users_table.php` — users.avatar nullable string after email
- `database/migrations/2026_04_23_300300_expand_role_enum_on_users_table.php` — Expands role CHECK constraint; promotes owners; syncs users.role from pivot
- `config/image.php` — Published Intervention Image config (GD driver default)
- `composer.json` — Added intervention/image:^3 and intervention/image-laravel:^1

## Decisions Made

- Used MIN(user_id) per organization as owner heuristic (D-12) — `organizations` table has no `created_by` column
- Kept `users.role` in sync with `organization_user.role` via write-through (Open Question 2 resolved: sync during Phase 4, deprecate in Phase 5+)
- Used `DB::statement` for PostgreSQL CHECK constraint modification (not `->change()`) per Pitfall 6 — verified working

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Resolved merge conflict in composer.lock before installing intervention/image**
- **Found during:** Task 1 (Install intervention/image)
- **Issue:** `composer.lock` had two `<<<<<<< Updated upstream / >>>>>>> Stashed changes` conflict markers at lines 7 and 3845, preventing Composer from reading the lock file
- **Fix:** Resolved both conflicts by taking the "Updated upstream" side (content-hash `164d3f0a2c6f53bedb6ba8516f557d32`); validated as valid JSON with 111 packages
- **Files modified:** `composer.lock`
- **Verification:** `python3 -c "import json; json.load(open('composer.lock','r',encoding='utf-8'))"` returned no error
- **Committed in:** `0a3d5e9`

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** The composer.lock conflict was a pre-existing issue in the worktree unrelated to the plan's intent. Fixing it was required to run `composer require`. No scope creep.

## Issues Encountered

- Worktree had no `.env` file — first `php artisan migrate` attempt hit SQLite instead of PostgreSQL. Resolved by copying `.env` from the main project directory. This is expected worktree behavior (`.env` is gitignored).

## User Setup Required

- Run `composer require intervention/image:^3 intervention/image-laravel:^1` if deploying fresh (already done in dev)
- Run `php artisan storage:link` in production environment (already done in dev)
- `.env` must include PostgreSQL credentials (`DB_CONNECTION=pgsql`, etc.)

## Next Phase Readiness

- All four migrations applied and verified against live PostgreSQL database
- `organization_user` pivot ready for Plan 02 (User model + controller updates)
- `invitations` table ready for Plan 03 (InvitationController + AcceptInvitationController)
- `users.avatar` column ready for Plan 04 (ProfileController + avatar upload)
- Role enum with `owner` ready for Plan 05 (EnsureRole middleware + gates)
- `intervention/image:^3` installed and functional for Plan 04 avatar resize

---

*Phase: 04-team-management*
*Completed: 2026-04-23*
