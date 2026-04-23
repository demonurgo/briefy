---
phase: "05"
plan: "01"
subsystem: backend-dashboard
tags: [dashboard, backend, controller, preferences, activity-log, security]
dependency_graph:
  requires: ["05-00"]
  provides: ["DashboardController.index()", "preferences-onboarding_dismissed", "ActivityLog-model"]
  affects: ["05-02", "05-03"]
tech_stack:
  added: []
  patterns:
    - "Eloquent clone() pattern for reusing base query builders"
    - "isAdminOrOwner() gate for overview props (T-5-01)"
    - "isValidDate() before Carbon::parse for date range inputs (T-5-04)"
    - "activityFeed scoped by role via whereIn(subject_id, myDemandIds)"
    - "APP_BASE_PATH in phpunit.xml to fix worktree vendor symlink issue"
key_files:
  created: []
  modified:
    - app/Http/Controllers/DashboardController.php
    - routes/web.php
    - phpunit.xml
    - database/schema/pgsql-schema.sql
decisions:
  - "APP_BASE_PATH added to phpunit.xml — required for worktrees with symlinked vendor/ to load correct routes and controllers"
  - "Activity feed collaborator scope uses whereIn(subject_id, myDemandIds) + orWhere(user_id) — covers both assigned and created demands"
  - "isValidDate() uses strtotime() + regex — validates YYYY-MM-DD before Carbon::parse to prevent injection"
metrics:
  duration: "~90 minutes"
  completed: "2026-04-23"
  tasks_completed: 2
  files_modified: 4
---

# Phase 05 Plan 01: Backend Dashboard — DashboardController completo

**One-liner:** DashboardController com queries personal/overview/activityFeed/onboarding, mais fix do BLOCKER-02 (preferences route) e correção do worktree vendor symlink para testes.

## What Was Built

### Task 1: ActivityLog model + preferences route fix (BLOCKER-02)

O modelo `ActivityLog` foi verificado como já existente do Wave 0 (05-00). A modificação principal foi:

- `routes/web.php`: adicionado `onboarding_dismissed` ao `$r->only([...])` da rota `settings.preferences` (T-5-02)
- `phpunit.xml`: adicionado `APP_BASE_PATH` para corrigir problema de worktree com vendor/ symlink (ver Deviations)
- `database/schema/pgsql-schema.sql`: regenerado via `php artisan schema:dump` para incluir `activity_logs` e coluna `priority`

### Task 2: DashboardController.index() completo

Substituição completa do stub por implementação com ~200 linhas:

**Props `personal` (todos os usuários, scoped a `assigned_to = $user`):**
- `statusCounts` + `overdue` — contagens por status + deadline vencido
- `deltaVsYesterday` — delta vs dia anterior
- `focusDemands` — demandas urgentes (atrasadas ou deadline hoje/amanhã), max 5
- `myDemands` — todas as demandas do usuário, max 20
- `blockers` — demandas em `awaiting_feedback`
- `weekProgress` — concluídas / total na semana
- `completedByDay` — bar chart de concluídas por dia da semana

**Props `overview` (admin/owner apenas — `null` para colaboradores):**
- `statusBreakdown` — donut por status (org inteira)
- `priorityBreakdown` — bar chart por prioridade
- `demandsOverTime` — line chart criadas vs concluídas por dia no range
- `latestDemands` — 5 demandas mais recentes com responsável
- `teamWorkload` — workload por membro (total/completed/overdue/active)
- `clientDistribution` — demandas por cliente, top 10
- `teamPerformance` — rate de conclusão da org
- `dateRange` — range efetivo aplicado

**`activityFeed`:** 15 entradas mais recentes, scoped por role (T-5-03).

**Props de onboarding:** `hasClients`, `hasDemands` (booleanos para ONBRD-01).

**Segurança implementada (threat model):**
- T-5-01: `overview: null` para colaboradores (elevation of privilege)
- T-5-02: `only(['locale', 'theme', 'onboarding_dismissed'])` — allowlist na rota preferences
- T-5-03: activityFeed colaborador: `whereIn(subject_id, myDemandIds)->where(subject_type, demand)`
- T-5-04: `isValidDate()` valida YYYY-MM-DD antes de `Carbon::parse()`

## Verification Results

```
DashboardControllerTest: 6/6 PASS
  ✓ admin sees overview props
  ✓ collaborator cannot see overview props
  ✓ collaborator sees personal props
  ✓ admin sees team workload
  ✓ admin sees client distribution
  ✓ onboarding props

PreferencesTest: 1/1 PASS
  ✓ onboarding dismissed persists
```

Total: 7 testes, 67 assertions, todos passando.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Worktree vendor symlink causa autoload errado em testes**

- **Found during:** Task 1 verification
- **Issue:** O worktree usa um `vendor/` como junction point (symlink) para o vendor do projeto principal. O `Application::inferBasePath()` do Laravel usa `ClassLoader::getRegisteredLoaders()` para inferir o basePath, que apontava para `D:\Projetos\Briefy\` (projeto principal) ao invés do worktree. Isso causava o carregamento de `routes/web.php` e classes PHP do projeto principal, fazendo os testes usarem código sem as modificações do worktree.
- **Fix aplicado (duas partes):**
  1. `phpunit.xml`: adicionado `<env name="APP_BASE_PATH" value="D:\projetos\briefy\.claude\worktrees\agent-ad938ee4"/>` para forçar o basePath correto.
  2. Removido o junction link e instalado `composer install --no-scripts` no worktree para gerar um `vendor/composer/autoload_psr4.php` local apontando para `D:\Projetos\Briefy\.claude\worktrees\agent-ad938ee4\app\`.
- **Impacto:** Sem esta correção, todos os testes do worktree passam ou falham com base no código do projeto principal, tornando o teste de worktrees paralelas completamente ineficaz.
- **Files modified:** `phpunit.xml`, `vendor/` (regenerado)
- **Commit:** `3956221`

### Deferred Items

**`Tests\Feature\Settings\PreferencesTest`** (4 testes) — falha pré-existente com `organization_id` na factory de User (`organization_id` foi renomeado para `current_organization_id` em fase anterior, mas o factory neste arquivo de teste não foi atualizado). Não é escopo do plano 05-01. Registrado em deferred-items.

## Known Stubs

Nenhum. O DashboardController retorna dados reais do banco — sem hardcoded empty values ou placeholders.

## Threat Flags

Nenhuma nova superfície de segurança além das cobertas pelo threat model do plano.

## Self-Check

Verificações pós-summary:

- [x] `app/Http/Controllers/DashboardController.php` existe e tem >200 linhas
- [x] `routes/web.php` contém `onboarding_dismissed`
- [x] `app/Models/ActivityLog.php` existe com `$timestamps = false`
- [x] Commit `3956221` existe (Task 1)
- [x] Commit `a6bb728` existe (Task 2)
- [x] 7 testes passam: DashboardControllerTest (6) + PreferencesTest (1)

## Self-Check: PASSED
