---
phase: 05-dashboard-onboarding
plan: "00"
subsystem: database-schema
tags: [migrations, models, tdd-red, recharts, activity-logs, priority]
dependency_graph:
  requires: []
  provides:
    - activity_logs table schema with 8-value action_type enum and compound indexes
    - priority column on demands table (enum high/medium/low, default medium)
    - ActivityLog model with timestamps=false, fillable, casts, relations
    - recharts npm package installed
    - RED test scaffolds for DASH-01 to DASH-05, ONBRD-01, ONBRD-02
  affects:
    - app/Models/Demand.php
    - app/Http/Requests/StoreDemandRequest.php
    - app/Http/Requests/UpdateDemandRequest.php
    - database/schema/pgsql-schema.sql
tech_stack:
  added:
    - recharts ^3.8.1
  patterns:
    - Laravel migration with compound indexes
    - Immutable event log model (timestamps=false, only created_at)
    - TDD RED state scaffolding (test first, implement later)
key_files:
  created:
    - database/migrations/2026_04_23_200000_create_activity_logs_table.php
    - database/migrations/2026_04_23_200001_add_priority_to_demands_table.php
    - app/Models/ActivityLog.php
    - tests/Feature/DashboardControllerTest.php
    - tests/Feature/ActivityLogTest.php
    - tests/Feature/PreferencesTest.php
  modified:
    - app/Models/Demand.php (priority added to fillable + casts)
    - app/Http/Requests/StoreDemandRequest.php (priority validation)
    - app/Http/Requests/UpdateDemandRequest.php (priority validation)
    - package.json (recharts dependency)
    - database/schema/pgsql-schema.sql (regenerated with new tables)
decisions:
  - ActivityLog model placed in Wave 0 (not Wave 1) per Codex review — downstream plans 05-01 and 05-02 depend on it
  - timestamps=false on ActivityLog — event log is immutable, only created_at needed
  - user_id nullable with nullOnDelete — prevents integrity constraint violation in CLI/job contexts without auth
  - compound indexes on (organization_id, created_at) and (subject_type, subject_id) — feed queries hit these constantly
  - Test scaffolds in RED state — waves 1 and 2 must make them pass (Nyquist Rule)
metrics:
  duration: ~8 minutes
  completed_date: "2026-04-23"
  tasks_completed: 2
  tasks_total: 2
  files_created: 6
  files_modified: 5
---

# Phase 05 Plan 00: Wave 0 Setup (Migrations + Models + TDD RED) Summary

**One-liner:** Activity logs schema + demands priority column + recharts installed + 10 RED test cases covering DASH-01 to DASH-05 and ONBRD-01/02.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Migrations + ActivityLog model + Demand priority | abdcaeb | 6 created/modified |
| 2 | recharts install + RED test scaffolds | a274804 | 6 created/modified |

## What Was Built

### Task 1: Database Foundations

Two migrations created and executed:

1. `create_activity_logs_table` — schema with 8-value enum for `action_type`, compound indexes on `(organization_id, created_at)` and `(subject_type, subject_id)`, immutable log pattern (no `updated_at`, only `created_at` with `useCurrent()`).

2. `add_priority_to_demands_table` — `priority enum('high','medium','low') DEFAULT 'medium'` added after `status` column.

Model and requests updated:
- `ActivityLog` model: `timestamps=false`, full fillable, JSON cast for `metadata`, `BelongsTo` relations to `Organization` and `User`
- `Demand.$fillable`: `'priority'` added; `$casts`: `'priority' => 'string'`
- `StoreDemandRequest` and `UpdateDemandRequest`: `'priority' => 'nullable|in:high,medium,low'`

### Task 2: recharts + RED Tests

- recharts `^3.8.1` installed via npm, present in `package.json` dependencies and `node_modules/`
- 3 test files created in RED state (fail with assertion failures, not syntax errors):
  - `DashboardControllerTest.php` — 6 tests: overview props for admin, null overview for collaborator, personal props, teamWorkload, clientDistribution, onboarding hasClients/hasDemands
  - `ActivityLogTest.php` — 3 tests: demand.created log, demand.status_changed log, collaborator feed scoping
  - `PreferencesTest.php` — 1 test: onboarding_dismissed persists via PATCH /settings/preferences

## Deviations from Plan

None — plan executed exactly as written. ActivityLog model placement in Wave 0 was already specified in the plan (per Codex review note).

## Known Stubs

None — this plan creates schema and tests only; no UI or controller stubs.

## Threat Surface Scan

No new network endpoints or auth paths introduced. Migrations only affect local database schema. Threat register items T-W0-01 and T-W0-02 addressed:
- T-W0-01 (Tampering): `priority` validation `nullable|in:high,medium,low` enforced in both Store and Update requests
- T-W0-02 (EoP): Test roles (admin vs member) correctly set up in setUp() methods

## Self-Check: PASSED

- `database/migrations/2026_04_23_200000_create_activity_logs_table.php`: FOUND
- `database/migrations/2026_04_23_200001_add_priority_to_demands_table.php`: FOUND
- `app/Models/ActivityLog.php`: FOUND
- `tests/Feature/DashboardControllerTest.php`: FOUND
- `tests/Feature/ActivityLogTest.php`: FOUND
- `tests/Feature/PreferencesTest.php`: FOUND
- Both migrations status: Ran
- recharts in package.json: FOUND
- Tests in RED state: CONFIRMED (6 failed assertions, 60 assertions total)
- Commit abdcaeb: FOUND
- Commit a274804: FOUND
