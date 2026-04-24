---
phase: 5
slug: dashboard-onboarding
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-23
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | PHPUnit (via Laravel) |
| **Config file** | `phpunit.xml` |
| **Quick run command** | `php artisan test --filter DashboardControllerTest` |
| **Full suite command** | `php artisan test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `php artisan test --filter DashboardControllerTest`
- **After every plan wave:** Run `php artisan test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 5-W0-01 | W0 | 0 | DASH-01–04, ONBRD-01 | — | N/A | scaffold | `php artisan test --filter DashboardControllerTest` | ❌ W0 | ⬜ pending |
| 5-W0-02 | W0 | 0 | DASH-05 | — | N/A | scaffold | `php artisan test --filter ActivityLogTest` | ❌ W0 | ⬜ pending |
| 5-W0-03 | W0 | 0 | ONBRD-02 | — | N/A | scaffold | `php artisan test --filter PreferencesTest` | ❌ W0 | ⬜ pending |
| 5-01-01 | 01 | 1 | DASH-01 | T-5-01 | overview props only returned if isAdminOrOwner() | Feature (HTTP) | `php artisan test --filter DashboardControllerTest::test_admin_sees_overview_props` | ❌ W0 | ⬜ pending |
| 5-01-02 | 01 | 1 | DASH-04 | T-5-01 | collaborator sees only own statusCounts | Feature (HTTP) | `php artisan test --filter DashboardControllerTest::test_collaborator_sees_personal_props` | ❌ W0 | ⬜ pending |
| 5-01-03 | 01 | 1 | DASH-02 | — | N/A | Feature (HTTP) | `php artisan test --filter DashboardControllerTest::test_admin_sees_team_workload` | ❌ W0 | ⬜ pending |
| 5-01-04 | 01 | 1 | DASH-03 | — | N/A | Feature (HTTP) | `php artisan test --filter DashboardControllerTest::test_admin_sees_client_distribution` | ❌ W0 | ⬜ pending |
| 5-01-05 | 01 | 1 | ONBRD-01 | — | N/A | Feature (HTTP) | `php artisan test --filter DashboardControllerTest::test_onboarding_props` | ❌ W0 | ⬜ pending |
| 5-02-01 | 02 | 2 | DASH-05 | T-5-03 | collaborator sees only own events | Feature (Observer) | `php artisan test --filter ActivityLogTest::test_demand_created_logs_activity` | ❌ W0 | ⬜ pending |
| 5-02-02 | 02 | 2 | DASH-05 | T-5-03 | admin sees all org events | Feature (Observer) | `php artisan test --filter ActivityLogTest::test_admin_sees_all_activity` | ❌ W0 | ⬜ pending |
| 5-03-01 | 03 | 3 | ONBRD-02 | T-5-02 | onboarding_dismissed persisted, not filtered out | Feature (HTTP) | `php artisan test --filter PreferencesTest::test_onboarding_dismissed_persists` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/Feature/DashboardControllerTest.php` — cobre DASH-01, DASH-02, DASH-03, DASH-04, ONBRD-01 (RED state)
- [ ] `tests/Feature/ActivityLogTest.php` — cobre DASH-05 (RED state)
- [ ] `tests/Feature/PreferencesTest.php` — cobre ONBRD-02 (RED state, ou adicionar ao SettingsControllerTest existente)
- [ ] `database/migrations/XXXX_create_activity_logs_table.php` — nova tabela activity_logs
- [ ] `database/migrations/XXXX_add_priority_to_demands_table.php` — BLOCKER: campo priority ausente
- [ ] `npm install recharts` — pacote não instalado (VERIFIED: package.json)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Recharts donut/bar/line renderizam corretamente em dark mode | DASH-01 | Renderização visual — não testável via HTTP assertions | Abrir /dashboard, alternar dark mode, verificar contraste dos gráficos |
| DashboardViewToggle alterna views sem reload de página | DASH-01/DASH-04 | Comportamento de estado React — não testável via PHPUnit | Abrir /dashboard como admin, clicar toggle, verificar que URL não muda |
| OnboardingChecklist desaparece automaticamente após criar cliente e demanda | ONBRD-01 | Requer navegação e state visual | Criar conta nova, verificar checklist, criar cliente, verificar check automático, criar demanda, verificar desaparecimento |
| Animação stagger dos status cards (fadeInUp 50ms delay por card) | DASH-04 | CSS animation — não testável via PHPUnit | Abrir /dashboard, inspecionar se cards aparecem com atraso escalonado |

---

## Threat Model

| Threat ID | Vector | STRIDE | Mitigation | Plan |
|-----------|--------|--------|------------|------|
| T-5-01 | Colaborador acessa overview via `?view=overview` ou manipulação de props | Elevation of Privilege | DashboardController retorna overview props SOMENTE se `isAdminOrOwner()` — verificado em teste | Plan 01 |
| T-5-02 | `onboarding_dismissed` injetado via PATCH preferences route bypass | Tampering | Rota `settings.preferences` deve aceitar explicitamente `onboarding_dismissed` no allowlist | Plan 03 |
| T-5-03 | Colaborador vê eventos de outros usuários no ActivityFeed via IDOR | Information Disclosure | ActivityLog query filtrada por `assigned_to/created_by` para colaboradores | Plan 02 |
| T-5-04 | Injeção via date range params `?start=...&end=...` | Tampering | Validação `date` rule + Carbon::parse() com try/catch; Eloquent parameterized bindings | Plan 01 |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
