---
phase: 03-ai-integration
plan: 02
subsystem: schema
tags: [migrations, models, postgresql, byok, client-memory]
key-files:
  created:
    - database/migrations/2026_04_22_200000_add_anthropic_api_key_to_organizations.php
    - database/migrations/2026_04_22_200100_add_monthly_plan_to_clients_table.php
    - database/migrations/2026_04_22_200200_create_client_research_sessions_table.php
    - database/migrations/2026_04_22_200300_add_compacted_at_to_ai_conversations.php
    - database/migrations/2026_04_22_200400_extend_client_ai_memory_for_phase3.php
    - database/migrations/2026_04_22_200500_add_channel_to_planning_suggestions_table.php
    - app/Models/ClientResearchSession.php
  modified:
    - app/Models/Client.php
    - app/Models/AiConversation.php
    - app/Models/ClientAiMemory.php
    - app/Http/Requests/StoreClientRequest.php
    - app/Http/Requests/UpdateClientRequest.php
metrics:
  migrations_created: 6
  models_modified: 3
  models_created: 1
  requests_modified: 2
---

## Plan 03-02: Schema Migrations + Model Extensions

### Objective
Apply all Phase 3 database schema changes and extend Eloquent models to match.

### M2 Decision: PostgreSQL (option-a)
DB_CONNECTION=pgsql confirmed in .env — PostgreSQL is the target for Phase 3. All 6 migrations ran cleanly against the live Postgres database. The H1 migration uses Postgres raw SQL paths for `RENAME COLUMN` and `DROP CONSTRAINT IF EXISTS`, avoiding doctrine/dbal dependency.

### Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 | d603dfc | 6 Phase 3 schema migrations |
| Task 2 | 38b27f9 | Models + FormRequests extended |

### Migrations Created (6 total)

| # | File | What it adds |
|---|------|-------------|
| 1 | 2026_04_22_200000_add_anthropic_api_key_to_organizations | anthropic_api_key_encrypted + 3 health cols (M3) + 2 MA cols; no mask col (L1) |
| 2 | 2026_04_22_200100_add_monthly_plan_to_clients_table | monthly_posts, monthly_plan_notes, planning_day, social_handles |
| 3 | 2026_04_22_200200_create_client_research_sessions_table | MA session lifecycle table with enum status |
| 4 | 2026_04_22_200300_add_compacted_at_to_ai_conversations | compacted_at timestamp for chat compaction |
| 5 | 2026_04_22_200400_extend_client_ai_memory_for_phase3 | H1: org_id FK+backfill, source, insight_hash, status (D-38), decimal confidence, 8-val category enum |
| 6 | 2026_04_22_200500_add_channel_to_planning_suggestions_table | channel column (confirmed missing via spot-check) |

### Blocking Migrate Gate: PASSED

All 6 migrations show "Ran" in `php artisan migrate:status`. Column verification:
- organizations.anthropic_api_key_encrypted: ok
- organizations.anthropic_key_valid: ok (M3)
- organizations.anthropic_managed_agents_ok: ok (M3)
- organizations.anthropic_key_checked_at: ok (M3)
- organizations.anthropic_api_key_mask: NOT present (L1 confirmed)
- clients.monthly_posts: ok
- client_research_sessions table: ok
- ai_conversations.compacted_at: ok
- client_ai_memory.status: ok (D-38)
- client_ai_memory.organization_id: ok (H1)
- client_ai_memory.insight_hash: ok (H1)
- planning_suggestions.channel: ok

### H1 Backfill Verification
- `ClientAiMemory::whereNull('organization_id')->count()` → 0 (all rows backfilled from client.organization_id)
- Confidence max: null (no pre-existing rows; migration ran cleanly with no data loss)

### Deviations
None — all tasks executed exactly per plan spec. 6 migrations created as specified (not 5, per user-confirmed spot-check that planning_suggestions.channel was missing).

### Self-Check: PASSED
- All 6 migration files pass `php -l`
- All model/request files pass `php -l`
- All acceptance criteria verified via grep
- `php artisan migrate` ran cleanly — 6 DONE
- H1 backfill: 0 null organization_id rows
- L1 confirmed: no mask column in schema
