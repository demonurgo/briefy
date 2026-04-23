---
phase: 05-dashboard-onboarding
plan: "02"
subsystem: database
tags: [laravel, observer, eloquent, activity-log, postgresql]

# Dependency graph
requires:
  - phase: 05-00
    provides: "ActivityLog model + activity_logs migration"
provides:
  - "DemandObserver com hooks: created, updated (status_changed + assigned + archived_at), deleted (lixeira), restored"
  - "ClientObserver com hook: created"
  - "AppServiceProvider boot() registrando ambos os observers"
  - "Todos os action_types de D-22 cobertos via Observer/Event (D-25)"
affects:
  - "05-03 (DashboardController activityFeed — consome os logs gerados aqui)"
  - "05-04 (frontend ActivityFeed component — lê activity_logs populados pelos observers)"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Laravel Observer pattern para criação automática de activity logs"
    - "auth()->id() ?? $demand->created_by — fallback para user_id em contexto CLI"
    - "wasChanged('archived_at') em updated() para distinguir arquivamento manual de soft-delete"

key-files:
  created:
    - app/Observers/DemandObserver.php
    - app/Observers/ClientObserver.php
  modified:
    - app/Providers/AppServiceProvider.php

key-decisions:
  - "DemandObserver::deleted() usa action_type 'demand.archived' com metadata={via: 'trash'} — mesmo action_type do arquivamento manual mas distinguível pelo metadata (Pitfall 3 do RESEARCH.md)"
  - "ClientObserver não tem fallback created_by pois o model Client não tem esse campo — user_id nullable para contexto CLI"
  - "Observers registrados via Demand::observe() / Client::observe() no AppServiceProvider::boot() — padrão Laravel idiomático"

patterns-established:
  - "Observer pattern: um observer por model, registrado no AppServiceProvider::boot()"
  - "CLI fallback: auth()->id() ?? $model->created_by para user_id nullable"
  - "archived_at distinção: wasChanged('archived_at') em updated() NÃO em deleted()"

requirements-completed:
  - DASH-05

# Metrics
duration: 25min
completed: 2026-04-23
---

# Phase 5 Plan 02: Observers de Activity Log

**DemandObserver (4 hooks) + ClientObserver (1 hook) via Laravel Observer pattern — todos action_types de D-22 cobertos automaticamente sem lógica nos controllers**

## Performance

- **Duration:** 25 min
- **Started:** 2026-04-23T23:50:00Z
- **Completed:** 2026-04-23T23:55:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- DemandObserver com 4 hooks cobrindo todos os eventos de D-22: created, status_changed, assigned, archived (via archived_at), archived (via soft-delete/lixeira), restored
- ClientObserver com hook created registrando client.created
- AppServiceProvider expandido com Demand::observe() e Client::observe() no boot() sem remover singleton AnthropicClientFactory nem Vite::prefetch
- Pitfall 3 tratado corretamente: archived_at via wasChanged() em updated(); soft-delete via deleted() com metadata {via: 'trash'}
- user_id fallback auth()->id() ?? demand->created_by evita IntegrityConstraintViolation em contexto CLI (T-5-03)

## Task Commits

1. **Task 1: DemandObserver + ClientObserver** - `5e55ba2` (feat)
2. **Task 2: Registrar observers no AppServiceProvider** - `a3e5934` (feat)

## Files Created/Modified

- `app/Observers/DemandObserver.php` - Observer Eloquent para Demand com 4 métodos: created, updated, deleted, restored
- `app/Observers/ClientObserver.php` - Observer Eloquent para Client com método created
- `app/Providers/AppServiceProvider.php` - boot() expandido com registro dos dois observers

## Decisions Made

- Soft-delete (lixeira) usa o mesmo `action_type='demand.archived'` que o arquivamento manual via `archived_at`, diferenciados pelo `metadata.via='trash'` — mantém coerência com D-22 e permite distinguir a origem se necessário
- ClientObserver não tem fallback `created_by` porque o model Client não possui esse campo — user_id ficará null em contexto CLI (campo nullable na migration conforme decisão de Wave 0)

## Deviations from Plan

None — plano executado exatamente como especificado.

## Issues Encountered

**Ambiente de teste em worktree:**

O worktree não possui `vendor/` nem `.env` por padrão. Para executar os testes foi necessário:
1. Criar symlink `vendor -> /d/projetos/briefy/vendor`
2. Copiar `.env` do repositório principal

**Teste 3 (`test_collaborator_sees_only_own_events_in_feed`) falha no worktree isolado:**

Este teste verifica que a prop `activityFeed` existe no `DashboardController`. Como o plano 05-01 (DashboardController completo) roda em paralelo em outro worktree, a prop ainda não existe neste worktree. Os 2 testes diretamente relacionados aos observers passam:
- `test_demand_created_logs_activity` — PASSOU
- `test_demand_status_changed_logs_activity` — PASSOU
- `test_collaborator_sees_only_own_events_in_feed` — FALHA (dependência de 05-01, passa após merge da wave)

Este comportamento é esperado em execução paralela de wave. O teste 3 passará após merge de 05-01 + 05-02.

## Known Stubs

None — os observers geram dados reais no banco sem placeholders.

## Threat Flags

Nenhum — superfície de segurança conforme threat_model do plano. T-5-03 mitigado via fallback auth()->id() ?? created_by.

## Next Phase Readiness

- Os activity_logs serão populados automaticamente a partir do momento em que os observers estiverem ativos
- O plano 05-01 (DashboardController) pode consumir `ActivityLog::query()` para popular `activityFeed`
- O plano 05-04 (frontend ActivityFeed) pode ser implementado sabendo que os dados existem

---
*Phase: 05-dashboard-onboarding*
*Completed: 2026-04-23*
