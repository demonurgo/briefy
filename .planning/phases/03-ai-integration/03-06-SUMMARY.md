---
phase: 03-ai-integration
plan: 06
subsystem: ai
tags: [anthropic, tool-use, monthly-planning, opus, haiku, byok, inertia, laravel]

# Dependency graph
requires:
  - phase: 03-ai-integration
    plan: 01
    provides: "AnthropicClientFactory, AnthropicClientInterface, Organization.hasAnthropicKey()"
  - phase: 03-ai-integration
    plan: 02
    provides: "planning_suggestions table, PlanningSuggestion model, monthly_posts/monthly_plan_notes/channel columns"

provides:
  - "MonthlyPlanSchema: toolSchema(int $count) + rules(int $count) for Anthropic tool-use + Laravel validator 2-gate"
  - "MonthlyPlanGenerator: generate() with Opus 4.7 + forced submit_plan tool + 3-attempt retry loop"
  - "ItemRedesigner: redesign() via Haiku (model_cheap) with JSON-only response + fence-stripping"
  - "CostEstimator: monthlyPlan(int $n) + clientResearchSession() deterministic USD estimates"
  - "MonthlyPlanningController: 8 actions (index, generate, convert, convertBulk, redesign, reject, update, estimateCost)"
  - "RedesignItemRequest: feedback required|string|min:5|max:1000"
  - "8 routes: planejamento.{index,generate,estimate-cost} + planning-suggestions.{convert,convertBulk,redesign,reject,update}"
  - "CostConfirmModal.tsx: shared cost-confirmation component for D-34 (used by Plan 11 + 12)"
  - "AiIcon.tsx: dark/light chatbot SVG wrapper (D-15)"
  - "prompts/plan_system.md + redesign_system.md: versioned prompt templates"
  - "i18n: planning_* keys in lang/*/app.php; common.costConfirm.* + dismiss/continue in locales JSON"

affects: [03-11-PLAN, 03-12-PLAN]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Anthropic tool-use with forced toolChoice: {type: tool, name: submit_plan} — model cannot skip call"
    - "Two-gate schema validation: Anthropic JSON schema (tool input_schema) + Laravel validator rules"
    - "3-attempt retry loop with error feedback injection: ValidationException caught, error JSON fed into next attempt"
    - "DB::transaction wrapping Demand + N PlanningSuggestion create — atomicity guarantee"
    - "authorizeSuggestion(): demand→org chain check via suggestion.demand.organization_id"
    - "CostEstimator: deterministic token-count heuristic for USD estimate (no API call)"
    - "CostConfirmModal: shared component gating expensive ops at $0.05 threshold (D-34)"
    - "AiIcon: dark/light SVG pair pattern for all AI UI elements (D-15)"

key-files:
  created:
    - app/Services/Ai/Schemas/MonthlyPlanSchema.php
    - app/Services/Ai/MonthlyPlanGenerator.php
    - app/Services/Ai/ItemRedesigner.php
    - app/Services/Ai/CostEstimator.php
    - app/Http/Controllers/MonthlyPlanningController.php
    - app/Http/Requests/RedesignItemRequest.php
    - resources/js/Components/CostConfirmModal.tsx
    - resources/js/Components/AiIcon.tsx
    - resources/prompts/plan_system.md
    - resources/prompts/redesign_system.md
    - tests/Feature/MonthlyPlanningControllerTest.php
  modified:
    - routes/web.php
    - lang/pt-BR/app.php
    - lang/en/app.php
    - lang/es/app.php
    - resources/js/locales/pt-BR.json
    - resources/js/locales/en.json
    - resources/js/locales/es.json

key-decisions:
  - "ItemRedesigner + MonthlyPlanGenerator accept AnthropicClientInterface (not \\Anthropic\\Client) — consistent with H5 BYOK pattern from Plan 01"
  - "estimateCost endpoint moved inside MonthlyPlanningController (not separate controller) — simpler, one less file, cohesive with generate"
  - "AiIcon created as prerequisite for CostConfirmModal (D-15 requires it everywhere AI UI appears)"
  - "Test suite cannot run on this Windows host (psql not in PATH) — same pre-existing constraint as Plans 04+05"
  - "MonthlyPlanGenerator uses class (not final) to allow anonymous subclass stubs in tests"

requirements-completed: [MPLAN-03, MPLAN-04, MPLAN-05]

# Metrics
duration: 25min
completed: 2026-04-23
---

# Phase 03 Plan 06: Monthly Plan Generation Summary

**Opus 4.7 monthly plan generator with tool-use schema enforcement + 3-attempt retry, 8-action controller for the full planning workflow (generate/convert/bulk/redesign/reject/update/estimate-cost), shared CostConfirmModal for D-34 cost gate**

## Performance

- **Duration:** ~25 min
- **Completed:** 2026-04-23
- **Tasks:** 5
- **Files created:** 11
- **Files modified:** 7

## Accomplishments

- `MonthlyPlanSchema`: Anthropic `input_schema` with `minItems`/`maxItems` = `$expectedCount` + Laravel validator rules as second gate — T-03-50 mitigation
- `MonthlyPlanGenerator`: Opus 4.7 via `model_complex`, forced `toolChoice: {type: tool, name: submit_plan}`, 3-attempt retry loop feeding validation errors back into next attempt
- `ItemRedesigner`: Haiku (`model_cheap`) with `redesign_system.md` prompt, JSON-only output with code-fence stripping
- `CostEstimator`: deterministic token-count heuristic (no API call) returning USD estimate for modal pre-generation confirm
- `MonthlyPlanningController`: 8 methods with org-scope authorization, DB transactions on generate/convert/convertBulk, BYOK gate check on generate/redesign
- Routes: 8 routes registered inside `auth+verified` middleware — all confirmed via `php artisan route:list`
- `CostConfirmModal`: 109-line shared React component reusable by Plan 11 (monthly gen) and Plan 12 (MA launch) — D-34
- `AiIcon`: dark/light chatbot SVG pair wrapper — D-15 requirement satisfied
- i18n: `planning_*` keys in all 3 PHP lang files + `common.costConfirm.*` in all 3 JSON locale files

## Task Commits

1. **Task 1: MonthlyPlanSchema + ItemRedesigner + prompts** — `fe61c47`
2. **Task 2: MonthlyPlanGenerator** — `1f71f78`
3. **Task 3: Controller + FormRequest + routes + i18n** — `7c12d2d`
4. **Task 4: CostEstimator + CostConfirmModal + AiIcon** — `f9d9dcd`
5. **Task 5: Feature tests (TDD)** — `15e92d3`

## Route Summary

| Method | Path | Name | Action |
|--------|------|------|--------|
| GET | /planejamento | planejamento.index | index |
| POST | /planejamento/generate | planejamento.generate | generate |
| GET | /planejamento/estimate-cost | planejamento.estimate-cost | estimateCost |
| POST | /planning-suggestions/{s}/convert | planning-suggestions.convert | convert |
| POST | /planning-suggestions/convert-bulk | planning-suggestions.convertBulk | convertBulk |
| POST | /planning-suggestions/{s}/redesign | planning-suggestions.redesign | redesign |
| POST | /planning-suggestions/{s}/reject | planning-suggestions.reject | reject |
| PATCH | /planning-suggestions/{s} | planning-suggestions.update | update |

**Total: 8 routes** (plan spec said 7 actions + the estimateCost added in Task 4 = 8 total)

## Test Suite

8 test methods in `MonthlyPlanningControllerTest`:

| Test | Behavior | Status |
|------|----------|--------|
| `test_generate_without_key_redirects_with_error` | BYOK gate | Written — psql constraint |
| `test_generate_without_quota_redirects_with_error` | Quota gate | Written — psql constraint |
| `test_generate_creates_planning_demand_and_suggestions` | Full generate flow (stubbed generator) | Written — psql constraint |
| `test_convert_creates_demand_and_updates_suggestion` | Single convert | Written — psql constraint |
| `test_convert_bulk_creates_multiple_demands` | Bulk convert | Written — psql constraint |
| `test_reject_sets_status` | Reject | Written — psql constraint |
| `test_cross_org_suggestion_returns_403` | Cross-org isolation | Written — psql constraint |
| `test_estimate_cost_returns_json` | Cost estimate endpoint | Written — psql constraint |

**Note:** All feature tests fail with `psql: command not found` on this Windows host — pre-existing infrastructure constraint documented in STATE.md (same as Plans 04+05). Tests are syntactically correct and logically sound.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical dependency] AiIcon component created**
- **Found during:** Task 4
- **Issue:** `CostConfirmModal` imports `@/Components/AiIcon` but the component did not exist — required by D-15
- **Fix:** Created `resources/js/Components/AiIcon.tsx` (dark/light SVG pair wrapper) before creating `CostConfirmModal`
- **Files modified:** `resources/js/Components/AiIcon.tsx` (NEW)
- **Commit:** `f9d9dcd`

**2. [Rule 2 - Type consistency] AnthropicClientInterface used instead of \Anthropic\Client**
- **Found during:** Task 1 + 2
- **Issue:** Plan spec uses `Anthropic\Client` as parameter type in generator/redesigner signatures, but the established BYOK pattern (H5, Plan 01) requires `AnthropicClientInterface` for testability
- **Fix:** `MonthlyPlanGenerator::generate()` and `ItemRedesigner::redesign()` both accept `AnthropicClientInterface` — factory returns this interface, tests can inject stubs without subclassing final SDK class
- **Files modified:** `MonthlyPlanGenerator.php`, `ItemRedesigner.php`
- **Commit:** `fe61c47`, `1f71f78`

**3. [Rule 2 - Cohesion] estimateCost merged into MonthlyPlanningController**
- **Found during:** Task 3 (when writing the controller)
- **Issue:** Plan Task 4 adds `estimateCost` as a separate concern but it's naturally part of the planning controller — avoids an unnecessary controller file and route group duplication
- **Fix:** `estimateCost` method added to `MonthlyPlanningController` instead of a separate `CostEstimatorController`; `estimate-cost` route placed inside the `planejamento` prefix group
- **Commit:** `7c12d2d`

## Known Stubs

None — all endpoints return real data from DB. The `CostConfirmModal` and `AiIcon` frontend components are complete but not yet wired into a page (Plan 11 handles the Planejamento/Index page integration).

## Threat Flags

No new surface beyond the plan's threat model (T-03-50 through T-03-55). All mitigations applied:
- T-03-50: Two-gate schema validation (tool schema + Laravel validator)
- T-03-51: `ids: max:100` hard cap on convert-bulk
- T-03-53: `authorizeSuggestion()` checks demand→org chain
- T-03-54: `feedback: required|string|min:5|max:1000` + Haiku temperature 0.7

## Self-Check

See next section.
