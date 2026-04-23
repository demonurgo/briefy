---
phase: 03-ai-integration
plan: 01
subsystem: ai
tags: [anthropic, byok, encrypted-cast, inertia, settings, laravel]

# Dependency graph
requires:
  - phase: 03-ai-integration
    provides: "Wave 0 migrations (anthropic_api_key_encrypted, anthropic_key_valid, anthropic_managed_agents_ok, anthropic_key_checked_at columns) already applied to organizations table"

provides:
  - "Organization model: encrypted cast for anthropic_api_key_encrypted, M3 health columns (key_valid, managed_agents_ok, key_checked_at), $hidden protection, mask accessor (L1 derived), hasAnthropicKey(), getAnthropicApiKeyAttribute()"
  - "AnthropicClientInterface (H5): testable contract for messages() and beta() methods"
  - "AnthropicClient: concrete SDK delegator implementing the interface"
  - "AnthropicClientFactory: forOrganization() resolves per-org BYOK client (abort 402 if no key); forTesting() uses config fallback"
  - "AppServiceProvider: singleton binding for AnthropicClientFactory"
  - "Settings\\AiController: edit/update/testKey with isAdmin() gate (H2), MA probe, M3 health persist"
  - "TestAnthropicKeyRequest: starts_with:sk-ant- validation"
  - "routes/web.php: settings.ai.{edit,update,test} — test endpoint throttled 3/min (M4)"
  - "Settings/Ai.tsx: BYOK settings page with masked key display, test-key button, MA banner, M3 last-check timestamp"
  - "Inertia shared props: auth.user.organization extended with has_anthropic_key, anthropic_api_key_mask, key_valid, managed_agents_enabled, last_key_check_at (H3 fix)"
  - "bootstrap/app.php: dontFlash(['anthropic_api_key']) — M4"
  - "config/services.php: anthropic block with beta_ma, model_complex/chat/cheap"
  - "i18n: ai_key_saved/valid/valid_no_ma/invalid in pt-BR/en/es app.php; settings.ai.* namespace in locales JSON"

affects: [03-04-PLAN, 03-05-PLAN, 03-06-PLAN, 03-07-PLAN, 03-09-PLAN, 03-10-PLAN, 03-11-PLAN, 03-12-PLAN]

# Tech tracking
tech-stack:
  added: ["anthropic-ai/sdk ^0.16.0 (already in composer.json, vendor confirmed v0.16.0)"]
  patterns:
    - "BYOK per-org Anthropic client resolution via AnthropicClientFactory::forOrganization()"
    - "AnthropicClientInterface for test doubles (H5 — no subclassing of final SDK Client)"
    - "Laravel encrypted cast for sensitive credentials (anthropic_api_key_encrypted)"
    - "Mask accessor derived in PHP — never stored as a DB column (L1)"
    - "abort_unless($user->isAdmin(), 403) as role gate pattern for admin-only routes (H2)"
    - "bootstrap/app.php dontFlash() for Laravel 11+ (no Handler.php in this project)"
    - "Route-level throttle middleware (throttle:3,1) for rate-limited probe endpoints (M4)"
    - "MA beta probe via Http::withHeaders() GET /v1/agents?limit=0 — zero token cost"
    - "M3 health write only when tested key === stored key (prevents stale-write race)"

key-files:
  created:
    - app/Services/Ai/AnthropicClientInterface.php
    - app/Services/Ai/AnthropicClient.php
    - app/Services/Ai/AnthropicClientFactory.php
    - app/Http/Controllers/Settings/AiController.php
    - app/Http/Requests/TestAnthropicKeyRequest.php
    - resources/js/pages/Settings/Ai.tsx
  modified:
    - app/Models/Organization.php
    - app/Http/Middleware/HandleInertiaRequests.php
    - app/Providers/AppServiceProvider.php
    - config/services.php
    - bootstrap/app.php
    - routes/web.php
    - lang/pt-BR/app.php
    - lang/en/app.php
    - lang/es/app.php
    - resources/js/locales/pt-BR.json
    - resources/js/locales/en.json
    - resources/js/locales/es.json

key-decisions:
  - "dontFlash lives in bootstrap/app.php (Laravel 11+) — no Handler.php exists in this project"
  - "anthropic-ai/sdk ^0.16.0 was already in composer.json from Wave 0; no composer install needed"
  - "AnthropicClientFactory is NOT final (H5 fix) — allows decorator subclass for observability (Plan 13)"
  - "MA probe uses limit=0 GET /v1/agents — no tokens consumed, only checks HTTP status for beta access"
  - "testKey() M3 health write is conditional: only persists when tested key === currently stored key"
  - "Ai.tsx uses AppLayout from @/layouts/AppLayout (lowercase l — matches project file structure)"

patterns-established:
  - "BYOK pattern: org.hasAnthropicKey() gate → factory.forOrganization(org) → AnthropicClientInterface"
  - "Test double pattern: implement AnthropicClientInterface + $this->app->instance(..., $fake)"
  - "Inertia share extension: array_merge with explicit key list — never spread toArray() (security)"
  - "Admin-only controller methods: abort_unless($user->isAdmin(), 403) at top of every method"

requirements-completed: [AI-01, AI-02, AI-03, AI-04, AI-05, AI-06, AI-07, MPLAN-01, MPLAN-02, MPLAN-03, MPLAN-04, MPLAN-05]

# Metrics
duration: 6min
completed: 2026-04-23
---

# Phase 03 Plan 01: BYOK Infrastructure Summary

**Per-org Anthropic API key stored encrypted via Laravel cast, AnthropicClientInterface+Factory for testable BYOK client resolution, /settings/ai page with test-key + MA probe + M3 health persist, all security mitigations applied (H2/H3/H5/M3/M4/L1)**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-04-23T01:33:53Z
- **Completed:** 2026-04-23T01:39:40Z
- **Tasks:** 3
- **Files modified:** 16 (6 created, 10 modified)

## Accomplishments

- Organization model extended with encrypted cast, M3 health columns (key_valid, managed_agents_ok, key_checked_at), $hidden protection, derived mask accessor (L1), hasAnthropicKey() and getAnthropicApiKeyAttribute() methods
- AnthropicClientInterface + AnthropicClient + AnthropicClientFactory created — tests bind fakes via interface without subclassing final SDK classes (H5 fix)
- Settings\\AiController with all three methods (edit/update/testKey), isAdmin() gate on each (H2 — enum admin|collaborator, no owner role), MA probe via Http facade, M3 health persist with key-match guard
- Inertia shared props extended at auth.user.organization subtree with BYOK health (H3 — NOT a new sibling auth.organization)
- bootstrap/app.php dontFlash(['anthropic_api_key']) — Laravel 11+ style M4 fix (no Handler.php exists)
- settings.ai.test route throttled 3/min via route-level middleware (M4)
- Settings/Ai.tsx: 181-line page with masked key display, test-key button with 429 handling, MA unavailable banner, M3 last-check timestamp display

## Task Commits

1. **Task 1: Organization model + config/services.php + Inertia share + dontFlash** — `ebd213f` (feat)
2. **Task 2: AnthropicClientInterface + AnthropicClient + Factory + ServiceProvider** — `1b2e409` (feat)
3. **Task 3: AiController + FormRequest + Settings/Ai.tsx + routes + i18n** — `28e573b` (feat)

## Files Created/Modified

- `app/Models/Organization.php` — encrypted cast, M3 health columns, $hidden, $appends mask, hasAnthropicKey(), mask accessor
- `app/Http/Middleware/HandleInertiaRequests.php` — extends auth.user.organization with 5 BYOK health props (H3)
- `config/services.php` — anthropic block: api_key_fallback, beta_ma, model_complex/chat/cheap
- `bootstrap/app.php` — dontFlash(['anthropic_api_key', ...]) M4 fix
- `app/Services/Ai/AnthropicClientInterface.php` — NEW: messages() + beta() contract
- `app/Services/Ai/AnthropicClient.php` — NEW: concrete SDK delegator
- `app/Services/Ai/AnthropicClientFactory.php` — NEW: forOrganization() (abort 402) + forTesting()
- `app/Providers/AppServiceProvider.php` — singleton(AnthropicClientFactory::class)
- `app/Http/Controllers/Settings/AiController.php` — NEW: edit/update/testKey (H2+M3)
- `app/Http/Requests/TestAnthropicKeyRequest.php` — NEW: starts_with:sk-ant- validation
- `resources/js/pages/Settings/Ai.tsx` — NEW: 181-line BYOK settings page
- `routes/web.php` — settings.ai.{edit,update,test} + throttle:3,1 on test (M4)
- `lang/pt-BR/app.php`, `lang/en/app.php`, `lang/es/app.php` — ai_key_* i18n keys
- `resources/js/locales/pt-BR.json`, `en.json`, `es.json` — settings.ai.* namespace

## Decisions Made

- **bootstrap/app.php for dontFlash (M4):** Laravel 11+ moved exception configuration to bootstrap/app.php — no app/Exceptions/Handler.php exists. The `$exceptions->dontFlash([...])` call is the correct location. Documented here as required by plan output spec.
- **anthropic-ai/sdk already installed:** Was present in composer.json ^0.16.0 and vendor/ confirmed at v0.16.0 (Wave 0 work). No `composer require` needed.
- **MA probe observed:** Cannot confirm dev key has MA beta access without a real key — the probe endpoint is wired correctly; actual MA beta access depends on the org's Anthropic account tier.
- **No 'owner' role anywhere:** Confirmed — all role checks use `isAdmin()` which tests `role === 'admin'` (enum: admin|collaborator).

## Deviations from Plan

None — plan executed exactly as written. All review fixes (H2, H3, H5, M3, M4, L1) were already baked into the plan text and applied as specified.

## Issues Encountered

None.

## User Setup Required

Each organization admin must:
1. Obtain an Anthropic API key from https://console.anthropic.com
2. Navigate to `/settings/ai` and paste the key (starts with `sk-ant-`)
3. Click "Testar chave" to validate and probe MA beta access
4. Click "Salvar" to persist the encrypted key

For dev/test: set `ANTHROPIC_API_KEY` in `.env` — used by `AnthropicClientFactory::forTesting()` only.

## Known Stubs

None — all BYOK props flow from real DB columns. The `has_anthropic_key`, `anthropic_api_key_mask`, `key_valid`, `managed_agents_enabled` props all read from the live Organization model.

## Threat Flags

No new security surface beyond what is documented in the plan's threat model (T-03-01 through T-03-09). All mitigations applied.

## Next Phase Readiness

- Plans 04 (BriefStreamer), 05 (ChatStreamer), 06 (CostConfirm), 07 (ClientMemory) can now use `AnthropicClientFactory::forOrganization($org)` returning `AnthropicClientInterface`
- Frontend consumers read `usePage().props.auth.user.organization.has_anthropic_key` and `key_valid` to gate AI buttons
- MA-dependent features (Plans 09/12) gate on `managed_agents_enabled`
- Test doubles: implement `AnthropicClientInterface` and bind via `$this->app->instance(AnthropicClientInterface::class, $fake)`

---
*Phase: 03-ai-integration*
*Completed: 2026-04-23*
