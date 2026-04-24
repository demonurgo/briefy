---
phase: 10-automated-test-coverage
plan: "01"
subsystem: tests
tags: [testing, auth, organizations, team, rbac, postgresql]
dependency_graph:
  requires: []
  provides: [green-auth-tests, green-org-tests, green-team-tests]
  affects: [tests/Feature/Auth, tests/Feature]
tech_stack:
  added: []
  patterns: [RefreshDatabase, actingAs, from-referer-pattern, assertSessionHasErrors]
key_files:
  created: []
  modified:
    - tests/Feature/Auth/AuthenticationTest.php
    - tests/Feature/OrganizationCreationTest.php
    - tests/Feature/InvitationControllerTest.php
    - tests/Feature/TeamRoleTest.php
    - tests/Feature/TeamRosterTest.php
decisions:
  - "Use assertSessionHasErrors instead of assertJsonValidationErrors for web-form controller validation responses"
  - "Add from(route('settings.index')) before back()-redirecting actions to give Referer context in tests"
  - "Fixed factory column mismatch: organization_id -> current_organization_id (renamed in Phase 4 migration)"
metrics:
  duration: "6m"
  completed: "2026-04-24"
  tasks_completed: 2
  files_modified: 5
---

# Phase 10 Plan 01: Auth + Org/Team Test Suite Green Run — Summary

**One-liner:** Fixed 5 pre-existing test failures across 8 suites — column rename mismatch, back()-redirect Referer gap, and assertJsonValidationErrors vs session errors — resulting in 33 tests passing with zero failures.

## Tests Run and Results

| Suite | Tests | Result | Notes |
|-------|-------|--------|-------|
| AuthenticationTest | 5 | PASS | Fixed after column rename fix |
| RegistrationTest | 6 | PASS | Already passing |
| EmailVerificationTest | 3 | PASS | Already passing |
| PasswordConfirmationTest | 3 | PASS | Already passing |
| PasswordResetTest | 4 | PASS | Already passing |
| PasswordUpdateTest | 2 | PASS | Already passing |
| OrganizationCreationTest | 4 | PASS | Fixed assertion style |
| InvitationControllerTest | 5 | PASS | Fixed Referer for back() |
| InvitationAcceptTest | 4 | PASS | Already passing |
| TeamRoleTest | 3 | PASS | Fixed Referer for back() |
| TeamRosterTest | 3 | PASS | Fixed Referer for back() |
| EnsureRoleTest | 3 | PASS | Already passing |

**Total: 45 tests passing (Auth/ directory: 23, org/team suites: 22)**

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed organization_id column reference in AuthenticationTest**
- **Found during:** Task 1
- **Issue:** `AuthenticationTest` passed `'organization_id' => $org->id` and `'organization_id' => $org->id` to `User::factory()->create()`. Laravel Eloquent factories bypass `$fillable` protection and insert all attributes directly. The `users` table column was renamed `organization_id` → `current_organization_id` in migration `2026_04_23_300000`. This caused `SQLSTATE[42703]: Undefined column` errors on 3 of 5 tests.
- **Fix:** Changed all 3 occurrences of `'organization_id' => $org->id` to `'current_organization_id' => $org->id` in `AuthenticationTest.php`.
- **Files modified:** `tests/Feature/Auth/AuthenticationTest.php`
- **Commit:** 65f6723

**2. [Rule 1 - Bug] Fixed assertJsonValidationErrors in OrganizationCreationTest**
- **Found during:** Task 2
- **Issue:** Two tests (`test_store_rejects_duplicate_slug`, `test_store_requires_name`) used `assertStatus(422)->assertJsonValidationErrors(...)`. `OrganizationController::store()` uses `$request->validate()` on a standard web form request, which redirects back with session errors rather than returning JSON 422. The assertion style was wrong for the actual controller behavior.
- **Fix:** Replaced `assertStatus(422) + assertJsonValidationErrors(['slug'])` with `assertSessionHasErrors(['slug'])` and the same for `name`. This correctly tests that validation errors are present in the redirect session.
- **Files modified:** `tests/Feature/OrganizationCreationTest.php`
- **Commit:** 1ee3ec3

**3. [Rule 1 - Bug] Fixed back() redirect Referer gap in InvitationControllerTest, TeamRoleTest, TeamRosterTest**
- **Found during:** Task 2
- **Issue:** `TeamController::invite()`, `cancelInvitation()`, `updateRole()`, and `remove()` all use `return back()` which redirects to the HTTP `Referer` header. In test requests without a `Referer` header, Laravel's `back()` falls back to the application base URL (`http://localhost:8000`). The tests asserted `assertRedirectContains('/settings')` which failed because the redirect target was the base URL.
- **Fix:** Added `$this->from(route('settings.index'))` before the action calls in the 4 affected tests. This sets the `Referer` header so `back()` correctly redirects to `/settings`.
- **Files modified:** `tests/Feature/InvitationControllerTest.php`, `tests/Feature/TeamRoleTest.php`, `tests/Feature/TeamRosterTest.php`
- **Commit:** 1ee3ec3

## Environment Notes

**psql must be in PATH to run tests.** On this machine, PostgreSQL 17 is installed at `C:\Program Files\PostgreSQL\17\bin\` but the bin directory is not in the system PATH. All test runs require:

```bash
export PATH="$PATH:/c/Program Files/PostgreSQL/17/bin"
php artisan test ...
```

For CI: add `C:\Program Files\PostgreSQL\17\bin` to system PATH, or configure GitHub Actions with a PostgreSQL service container and `psql` available in the runner.

**Test database setup:** Run once to prepare:
```bash
createdb briefy_test
php artisan migrate --env=testing
```

## Known Stubs

None — plan executes existing tests only, no new code with stub placeholders was introduced.

## Threat Flags

None — no new network endpoints, auth paths, or schema changes introduced. All changes are test assertion corrections.

## Self-Check: PASSED

| Item | Status |
|------|--------|
| tests/Feature/Auth/AuthenticationTest.php | FOUND |
| tests/Feature/OrganizationCreationTest.php | FOUND |
| tests/Feature/InvitationControllerTest.php | FOUND |
| tests/Feature/TeamRoleTest.php | FOUND |
| tests/Feature/TeamRosterTest.php | FOUND |
| .planning/phases/10-automated-test-coverage/10-01-SUMMARY.md | FOUND |
| commit 65f6723 | FOUND |
| commit 1ee3ec3 | FOUND |
| No unexpected file deletions | CONFIRMED |
