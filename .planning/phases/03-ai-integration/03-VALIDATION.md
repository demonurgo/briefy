---
phase: 3
slug: ai-integration
status: approved
nyquist_compliant: true
wave_0_complete: false
created: 2026-04-22
source: Derived from 03-RESEARCH.md §Validation Architecture (16 REQ→test mappings, lines 1515-1530)
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Filled from RESEARCH.md §Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | PHPUnit ^12.5.12 (declared in composer.json require-dev) — project does NOT use Pest (no `pest.php`; `phpunit.xml` present at repo root) |
| **Config file** | `phpunit.xml` at repo root (pgsql test DB `briefy_test`, sync queue, array mail) |
| **Quick run command** | `php artisan test --filter={TestName}` |
| **Full suite command** | `php artisan test` (alias: `composer test`) |
| **Estimated runtime** | Quick (single class): < 30 s · Feature suite: ~3 min (based on Phase 2 Feature suite size) · Full (Unit+Feature): ~5 min |
| **Frontend tests** | None detected in repo — no vitest/jest config; Wave 0 decision deferred per RESEARCH Recommendation (add vitest for `useAiStream` parser coverage) |
| **Mocking** | `mockery/mockery ^1.6` already installed — use for Anthropic\Client fakes; `Http::fake()` for MA endpoints |

---

## Sampling Rate

- **After every task commit:** Run `php artisan test --filter={ClassName}` (< 30 s for a single class)
- **After every plan wave merge:** Run `php artisan test --testsuite=Feature` (< 3 min)
- **Before `/gsd-verify-work`:** `composer test` (full Unit + Feature) must be green
- **Max feedback latency:** 30 s per task; 3 min per wave

---

## Per-Task Verification Map

Test files for ALL 16 requirements below are MISSING — Wave 0 must create them before Wave 1 code lands. Until then, treat `<verify><automated>` blocks that reference these files as `MISSING — Wave 0 must create first` per the Nyquist rule.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 03-04-* | 04 | 1 | AI-01 | T-03-30 / T-03-33 | BYOK-gated brief generation; org without key → graceful 302 back with error flash | Feature (HTTP) | `php artisan test tests/Feature/AiBriefControllerTest.php` | ❌ W0 | ⬜ pending |
| 03-09-* | 09 | 2 | AI-02 | — | AiMarkdown component renders sanitized markdown (no raw HTML injection) | Unit (frontend) | N/A — no frontend test infra yet; **manual QA** OR Wave 0 adds vitest | ❌ W0 | ⬜ pending |
| 03-04-* | 04 | 1 | AI-03 | T-03-33 | Regenerate reuses endpoint; SSE cancellation on abort returns cleanly | Feature (HTTP) | `php artisan test --filter=regenerate_cancels_previous tests/Feature/AiBriefControllerTest.php` | ❌ W0 | ⬜ pending |
| 03-05-* | 05 | 1 | AI-04 | T-03-40 | POST /demands/{id}/chat/{conv}/stream persists user + assistant turns atomically | Feature (HTTP) | `php artisan test tests/Feature/AiChatControllerTest.php` | ❌ W0 | ⬜ pending |
| 03-05-* | 05 | 1 | AI-05 | T-03-41 | ChatPromptBuilder includes memory, demand, files, comments without cross-client leak | Unit | `php artisan test tests/Unit/Ai/ChatPromptBuilderTest.php` | ❌ W0 | ⬜ pending |
| 03-07-04 | 07 | 1 | AI-06 | T-03-60 / T-03-61 / T-03-62 | ExtractClientMemoryJob writes scoped, dedupe-keyed entries; confidence & PII gates filter; scoped to correct client_id | Feature (Job) | `php artisan test tests/Feature/Jobs/ExtractClientMemoryJobTest.php` | ❌ W0 | ⬜ pending |
| 03-04-* / 03-05-* | 04/05 | 1 | AI-07 | — | `response()->eventStream` emits SSE frames with correct Content-Type + X-Accel-Buffering headers | Feature (HTTP) | `php artisan test tests/Feature/SseHeadersTest.php` | ❌ W0 | ⬜ pending |
| 03-02-01 | 02 | 0 | MPLAN-01 | T-03-10 / T-03-11 | Clients migration adds monthly_posts, monthly_plan_notes, planning_day, social_handles | Feature (DB) | `php artisan test tests/Feature/ClientMonthlyPlanMigrationTest.php` | ❌ W0 | ⬜ pending |
| 03-02-02 | 02 | 0 | MPLAN-02 | T-03-10 / T-03-11 | StoreClientRequest + UpdateClientRequest validate new fields (min/max caps) | Feature (Validation) | `php artisan test tests/Feature/ClientFormValidationTest.php` | ❌ W0 | ⬜ pending |
| 03-06-01 | 06 | 1 | MPLAN-03 | T-03-50 | MonthlyPlanSchema enforces exact `monthly_posts` count via tool-use schema | Unit | `php artisan test tests/Unit/Ai/MonthlyPlanSchemaTest.php` | ❌ W0 | ⬜ pending |
| 03-06-02 | 06 | 1 | MPLAN-04 | T-03-50 | MonthlyPlanGenerator integration: fake Anthropic client returns plan; validator passes; retry/fail-fast on size mismatch | Feature (Service) | `php artisan test tests/Feature/Ai/MonthlyPlanGeneratorTest.php` | ❌ W0 | ⬜ pending |
| 03-06-04 | 06 | 1 | MPLAN-05 | T-03-51 / T-03-53 | POST /planning-suggestions/convert-bulk creates Demand per suggestion + updates status atomically; cross-org → 403 | Feature (HTTP) | `php artisan test tests/Feature/MonthlyPlanningControllerTest.php` | ❌ W0 | ⬜ pending |
| 03-04-* / 03-05-* / 03-06-* / 03-12-* | 04/05/06/12 | 1-3 | BYOK guard | T-03-05 | Org without key → 402/graceful on AI endpoints; with key → SDK call succeeds | Feature (HTTP) | `php artisan test tests/Feature/ByokGuardTest.php` | ❌ W0 | ⬜ pending |
| 03-01-01 | 01 | 1 | BYOK encryption | T-03-01 / T-03-02 | `anthropic_api_key_encrypted` round-trips via cast; `$hidden` blocks JSON leak; mask returns only sk-ant-...XXXX | Unit | `php artisan test tests/Unit/Models/OrganizationByokTest.php` | ❌ W0 | ⬜ pending |
| 03-12-02 / 03-12-03 | 12 | 3 | MA session lifecycle | T-03-110 / T-03-114 | ClientResearchAgent::launch hits MA with fake Http; persists session record; PollJob self-reschedules; 45-min kill switch | Feature (Service) | `php artisan test tests/Feature/Ai/ClientResearchAgentTest.php` | ❌ W0 | ⬜ pending |
| 03-03-02 | 03 | 0 | AGPL headers | T-03-20 | CI check — every PHP/TS file has AGPL header; script is idempotent | CI (shell) | `bash scripts/check-agpl-headers.sh` | ❌ W0 | ⬜ pending |

*Status legend: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Wave 0 must create ALL of the following before Wave 1 code lands. This is per-the RESEARCH.md §Validation Architecture "Wave 0 Gaps" section (lines 1542-1552).

- [ ] `tests/Feature/Ai/` subdirectory (container for `MonthlyPlanGeneratorTest.php`, `ClientResearchAgentTest.php`)
- [ ] `tests/Unit/Ai/` subdirectory (container for `ChatPromptBuilderTest.php`, `MonthlyPlanSchemaTest.php`)
- [ ] `tests/Feature/Jobs/` subdirectory (container for `ExtractClientMemoryJobTest.php`)
- [ ] `tests/Unit/Models/` subdirectory (container for `OrganizationByokTest.php`)
- [ ] `tests/Feature/AiBriefControllerTest.php` — stubs for AI-01, AI-03
- [ ] `tests/Feature/AiChatControllerTest.php` — stubs for AI-04
- [ ] `tests/Unit/Ai/ChatPromptBuilderTest.php` — stub for AI-05
- [ ] `tests/Feature/Jobs/ExtractClientMemoryJobTest.php` — stub for AI-06 (Plan 07 Task 4 fills this)
- [ ] `tests/Feature/SseHeadersTest.php` — stub for AI-07
- [ ] `tests/Feature/ClientMonthlyPlanMigrationTest.php` — stub for MPLAN-01
- [ ] `tests/Feature/ClientFormValidationTest.php` — stub for MPLAN-02
- [ ] `tests/Unit/Ai/MonthlyPlanSchemaTest.php` — stub for MPLAN-03
- [ ] `tests/Feature/Ai/MonthlyPlanGeneratorTest.php` — stub for MPLAN-04
- [ ] `tests/Feature/MonthlyPlanningControllerTest.php` — stub for MPLAN-05 (Plan 06 Task 4 fills this)
- [ ] `tests/Feature/ByokGuardTest.php` — stub for BYOK guard
- [ ] `tests/Unit/Models/OrganizationByokTest.php` — stub for BYOK encryption
- [ ] `tests/Feature/Ai/ClientResearchAgentTest.php` — stub for MA session lifecycle
- [ ] `scripts/check-agpl-headers.sh` — create + add to CI (Plan 03 Task 2 owns this)
- [ ] `tests/TestCase.php` enhancement: add `fakeAnthropic(): MockInterface` helper
- [ ] `tests/TestCase.php` enhancement: document `Http::fake()` patterns for MA endpoints
- [ ] Frontend test framework decision: **ADD vitest** (`npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom`) per RESEARCH Recommendation — a single `useAiStream` unit test prevents the SSE-parser regression-of-death

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| AiMarkdown sanitization + typewriter render | AI-02 | No frontend test infra in repo (until vitest added in Wave 0) | Open DemandDetailModal → generate brief → verify markdown renders with lists/headings, no `<script>` tags in DOM, typewriter animation visible |
| SSE chunk delivery on real Apache/nginx | AI-07 | Requires real proxy layer; PHPUnit can test headers but not buffering behavior | Deploy to staging → trigger brief generation → verify streaming (not all-at-once); confirm `X-Accel-Buffering: no` present in network tab |
| Managed Agents end-to-end session | MA session lifecycle | Requires live Anthropic MA beta access + 20-40 min runtime | Plan 12 Task 6 (human-verify checkpoint) covers this |
| OTEL spans visible in Arize Phoenix | Phase 3 observability | Requires Phoenix running locally + OTEL SDK installed | Plan 13 Task 4 (human-verify checkpoint) covers this |
| AGPL header on arbitrary new file | AGPL headers | CI check covers bulk — spot-check a newly created file shows header | Run `bash scripts/add-agpl-header.sh` then `bash scripts/check-agpl-headers.sh` |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies documented
- [x] Sampling continuity: no 3 consecutive tasks without automated verify (verified against the 16 REQ map above)
- [x] Wave 0 covers all MISSING references (16 REQ → 14 test files + 2 infra items + frontend decision)
- [x] No watch-mode flags (commands use `php artisan test` without `--watch`)
- [x] Feedback latency < 30 s for per-task, < 3 min for per-wave
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-04-22
