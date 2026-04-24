---
phase: 05-dashboard-onboarding
verified: 2026-04-23T20:00:00Z
status: human_needed
score: 18/18
overrides_applied: 0
human_verification:
  - test: "Abrir /dashboard como admin e confirmar que PieChart, BarChart e LineChart renderizam visualmente na view gerencial"
    expected: "Três tipos de gráfico Recharts aparecem com dados de cor correta (STATUS_COLORS, PRIORITY_COLORS)"
    why_human: "TypeScript e build passam, mas renderização visual de SVG via Recharts não é verificável sem browser"
  - test: "Abrir /dashboard como colaborador, verificar que o toggle 'Visão pessoal / Visão geral' NÃO aparece"
    expected: "Colaborador vê apenas a view pessoal sem toggle visível"
    why_human: "Lógica isAdmin depende de auth.user.role vindo do server — precisa de sessão real para confirmar"
  - test: "Abrir /dashboard como novo usuário sem clientes e sem demandas, verificar que OnboardingChecklist aparece"
    expected: "Card 'Primeiros passos' exibido no topo com 2 passos incompletos e botão X de dismiss"
    why_human: "Condição hasClients=false && hasDemands=false depende do estado real do banco"
  - test: "Clicar no botão X do OnboardingChecklist e recarregar a página"
    expected: "Checklist não reaparece após reload (onboarding_dismissed persistido nas preferences)"
    why_human: "Requer interação real com o browser para testar o PATCH + refresh"
  - test: "Criar uma demand e verificar que o ActivityFeed exibe o evento 'demand.created'"
    expected: "Feed mostra entrada com ícone verde e texto '[usuário] criou [título]'"
    why_human: "Requer ambiente rodando com Observer ativo e refresh do feed"
---

# Phase 5: Dashboard + Onboarding — Verification Report

**Phase Goal:** Admins have clear visibility into team workload and client activity through charts and an activity feed; new users are guided to their first productive action.
**Verified:** 2026-04-23T20:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths (Success Criteria do ROADMAP)

| #  | Truth | Status | Evidence |
|----|-------|--------|----------|
| 1  | Admin navega ao dashboard e vê gráfico de demandas por status | VERIFIED | DashboardController retorna `overview.statusBreakdown`; Dashboard.tsx renderiza PieChart com STATUS_COLORS; DashboardControllerTest test_admin_sees_overview_props PASS |
| 2  | Admin vê distribuição por membro (workload) e por cliente na mesma tela | VERIFIED | `overview.teamWorkload` e `overview.clientDistribution` presentes no controller e renderizados em OverviewView |
| 3  | Qualquer usuário vê resumo pessoal com contagens por status | VERIFIED | `personal.statusCounts` retornado para todos; PersonalView renderiza 5 DashboardStatusCards; test_collaborator_sees_personal_props PASS |
| 4  | Dashboard exibe feed de atividade recente (últimas 10–15 ações) | VERIFIED | ActivityLog::where(orgId)->limit(15) em DashboardController; ActivityFeed.tsx renderiza com 8 action_types mapeados; 3 testes ActivityLogTest PASS |
| 5  | Novo usuário sem clientes/demandas vê checklist guiado; pode dispensar | VERIFIED | OnboardingChecklist.tsx com 2 passos + dismiss via PATCH; hasClients/hasDemands props em DashboardController; PreferencesTest PASS |

**Score:** 5/5 truths verificadas

---

### Must-Haves Verificados por Plano

#### Plano 05-01 — Backend DashboardController

| Must-Have | Status | Evidence |
|-----------|--------|----------|
| `isAdminOrOwner()` gate — overview null para colaboradores | VERIFIED | Linha 137: `if ($user->isAdminOrOwner())` + `$overview = null` na linha 135 |
| personal props: statusCounts, focusDemands, myDemands, blockers, weekProgress, completedByDay | VERIFIED | Linhas 122-130: todos os 7 sub-props presentes em `$personal` |
| overview props: statusBreakdown, priorityBreakdown, demandsOverTime, teamWorkload, clientDistribution | VERIFIED | Linhas 272-286: todos os 10 sub-props presentes em `$overview` |
| routes/web.php com 'onboarding_dismissed' no allowlist | VERIFIED | Linha 142: `$r->only(['locale', 'theme', 'onboarding_dismissed'])` |

#### Plano 05-02 — Observers

| Must-Have | Status | Evidence |
|-----------|--------|----------|
| DemandObserver.php com created, updated, deleted, restored | VERIFIED | 4 métodos implementados; 6 action_types cobertos (created, status_changed, assigned, archived x2, restored) |
| ClientObserver.php com created hook | VERIFIED | client.created em ClientObserver.php linha 15 |
| DemandCommentObserver.php com created hook | VERIFIED | demand.comment_added em DemandCommentObserver.php linha 20 |
| AppServiceProvider registra os 3 observers | VERIFIED | Linhas 35-37: Demand::observe, DemandComment::observe, Client::observe |

#### Plano 05-03 — Componentes React

| Must-Have | Status | Evidence |
|-----------|--------|----------|
| DashboardStatusCard.tsx com deltaInverted e animate-fadeInUp | VERIFIED | Props interface com `deltaInverted?` linha 8; classe `animate-fadeInUp` linha 45 |
| ActivityFeed.tsx com role="feed" e 8 action_types | VERIFIED | `role="feed"` linha 98; ACTION_CONFIG com 8 tipos (linhas 32-81) |
| OnboardingChecklist.tsx com PATCH onboarding_dismissed | VERIFIED | `router.patch(route('settings.preferences'), { onboarding_dismissed: true })` linhas 22-26 |
| @keyframes fadeInUp em resources/css/app.css | VERIFIED | Linha 28: `@keyframes fadeInUp`; linha 38-40: `.animate-fadeInUp` |

#### Plano 05-04 — Dashboard.tsx

| Must-Have | Status | Evidence |
|-----------|--------|----------|
| ViewToggle admin-only | VERIFIED | `{isAdmin && <ViewToggle ... />}` linha 774 |
| DateRangePicker (visão geral) com partial reload only:['overview'] | VERIFIED | `only: ['overview']` linha 749 |
| OnboardingChecklist integrado | VERIFIED | `<OnboardingChecklist hasClients={...} hasDemands={...} ...>` linha 809 |
| ActivityFeed integrado | VERIFIED | `<ActivityFeed events={activityFeed} />` linha 833 |
| Recharts importado (PieChart, BarChart, LineChart) | VERIFIED | Linhas 6-9 do Dashboard.tsx |
| DashboardPlanningWidget preservado | VERIFIED | Linha 817: `<DashboardPlanningWidget clients={planningReminderClients} />` condicional |

---

### Required Artifacts

| Artifact | Status | Details |
|----------|--------|---------|
| `app/Http/Controllers/DashboardController.php` | VERIFIED | 354 linhas; queries completas; isAdminOrOwner gate |
| `app/Models/ActivityLog.php` | VERIFIED | Model com fillable, casts, timestamps=false |
| `app/Observers/DemandObserver.php` | VERIFIED | 99 linhas; 4 hooks; 6 action_types |
| `app/Observers/ClientObserver.php` | VERIFIED | client.created hook |
| `app/Observers/DemandCommentObserver.php` | VERIFIED | demand.comment_added hook |
| `app/Providers/AppServiceProvider.php` | VERIFIED | 3 observers registrados; AnthropicClientFactory preservado |
| `resources/js/Components/DashboardStatusCard.tsx` | VERIFIED | 68 linhas; deltaInverted; animate-fadeInUp |
| `resources/js/Components/DashboardSectionCard.tsx` | VERIFIED | Wrapper genérico com title, children, action |
| `resources/js/Components/ActivityFeed.tsx` | VERIFIED | 140 linhas; 8 action_types; role="feed" |
| `resources/js/Components/OnboardingChecklist.tsx` | VERIFIED | 97 linhas; PATCH dismiss; auto-hide |
| `resources/js/pages/Dashboard.tsx` | VERIFIED | 837 linhas (acima do mínimo 350); view pessoal + gerencial |
| `resources/css/app.css` | VERIFIED | @keyframes fadeInUp + .animate-fadeInUp |
| `database/migrations/2026_04_23_200000_create_activity_logs_table.php` | VERIFIED | Ran (migrate:status confirmado) |
| `database/migrations/2026_04_23_200001_add_priority_to_demands_table.php` | VERIFIED | Ran (migrate:status confirmado) |
| `tests/Feature/DashboardControllerTest.php` | VERIFIED | 6 métodos de teste |
| `tests/Feature/ActivityLogTest.php` | VERIFIED | 3 métodos de teste |
| `tests/Feature/PreferencesTest.php` | VERIFIED | 1 método de teste |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| DashboardController | ActivityLog | `ActivityLog::where('organization_id', $orgId)` | WIRED | Linha 292 do controller |
| DashboardController | Demand | `Demand::where(...)->whereNull('archived_at')` | WIRED | Linhas 28, 146, 226, 247, 329 |
| routes/web.php | User.preferences | `$r->only([..., 'onboarding_dismissed'])` | WIRED | Linha 142 do web.php |
| AppServiceProvider | DemandObserver | `Demand::observe(DemandObserver::class)` | WIRED | Linha 35 do AppServiceProvider |
| AppServiceProvider | DemandCommentObserver | `DemandComment::observe(DemandCommentObserver::class)` | WIRED | Linha 36 do AppServiceProvider |
| AppServiceProvider | ClientObserver | `Client::observe(ClientObserver::class)` | WIRED | Linha 37 do AppServiceProvider |
| OnboardingChecklist | settings.preferences route | `router.patch(route('settings.preferences'), ...)` | WIRED | Linha 23 do OnboardingChecklist; rota nomeada `settings.preferences` confirmada em routes/web.php linha 124+146 |
| Dashboard.tsx | DashboardStatusCard | import + renderização em PersonalView e OverviewView | WIRED | Linhas 16, 325, 531 do Dashboard.tsx |
| Dashboard.tsx | ActivityFeed | import + `<ActivityFeed events={activityFeed} />` | WIRED | Linhas 18, 833 |
| Dashboard.tsx | OnboardingChecklist | import + `<OnboardingChecklist ...>` | WIRED | Linhas 19, 809 |
| Dashboard.tsx | DashboardPlanningWidget | import + renderização condicional | WIRED | Linhas 15, 817 |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produz dados reais | Status |
|----------|---------------|--------|-------------------|--------|
| Dashboard.tsx `PersonalView` | `personal.statusCounts` | `Demand::where(org)->where(assigned_to)->selectRaw(...)` | Sim (query real) | FLOWING |
| Dashboard.tsx `OverviewView` | `overview.statusBreakdown` | `Demand::where(org)->selectRaw('status, COUNT(*)')` | Sim (query real) | FLOWING |
| Dashboard.tsx `ActivityFeed` | `activityFeed` | `ActivityLog::where(orgId)->limit(15)` | Sim (query real, observers populam) | FLOWING |
| Dashboard.tsx `OnboardingChecklist` | `hasClients`, `hasDemands` | `Client::where(org)->exists()` + `Demand::where(org)->exists()` | Sim (query real) | FLOWING |
| Dashboard.tsx `overview.teamWorkload` | `teamWorkload` | JOIN users + demands com COUNT/SUM | Sim (query real) | FLOWING |
| Dashboard.tsx `overview.clientDistribution` | `clientDistribution` | JOIN clients + demands com COUNT | Sim (query real) | FLOWING |

---

### Behavioral Spot-Checks

| Comportamento | Verificação | Resultado | Status |
|--------------|-------------|-----------|--------|
| DashboardControllerTest (6 testes) | `php artisan test --filter DashboardControllerTest` | 6 passed, 65 assertions | PASS |
| ActivityLogTest (3 testes) | `php artisan test --filter ActivityLogTest` | 3 passed | PASS |
| PreferencesTest (1 teste) | `php artisan test --filter PreferencesTest` | 1 passed | PASS |
| Migrations executadas | `php artisan migrate:status` | Ambas como "Ran" | PASS |
| recharts instalado | `grep "recharts" package.json` | `"recharts": "^3.8.1"` | PASS |

**Nota sobre testes:** `psql` não está no PATH do shell bash usado pelo verificador. Adicionando manualmente ao PATH (`/c/Program Files/PostgreSQL/17/bin`), os 10 testes da fase 5 passam. Os 4 testes que falham pertencem a `Tests\Feature\Settings\PreferencesTest` — arquivo pré-existente (commit `233f9f5`) com bug anterior à fase 5 (`organization_id` em vez de pivot table). Não é regressão introduzida por esta fase.

---

### Requirements Coverage

| Requirement | Descrição | Status | Evidence |
|-------------|-----------|--------|----------|
| DASH-01 | Admin vê gráfico de demandas por status | SATISFIED | `overview.statusBreakdown` + PieChart no Dashboard.tsx |
| DASH-02 | Admin vê workload por membro | SATISFIED | `overview.teamWorkload` com JOIN users; renderizado em OverviewView |
| DASH-03 | Admin vê demandas por cliente | SATISFIED | `overview.clientDistribution` com JOIN clients; renderizado em OverviewView |
| DASH-04 | Usuário vê resumo das próprias demandas | SATISFIED | `personal.statusCounts` + 5 DashboardStatusCards; PersonalView |
| DASH-05 | Feed de atividade recente (10-15 ações) | SATISFIED | ActivityLog com limit(15); 3 observers registrados; ActivityFeed renderiza |
| ONBRD-01 | Checklist guiado para novos usuários | SATISFIED | OnboardingChecklist com 2 passos; hasClients/hasDemands props |
| ONBRD-02 | Usuário pode dispensar onboarding | SATISFIED | PATCH preferences com onboarding_dismissed; PreferencesTest PASS |

---

### Anti-Patterns Found

Nenhum anti-pattern encontrado. Zero ocorrências de TODO/FIXME/placeholder/coming soon/not implemented nos arquivos da fase.

---

### Human Verification Required

#### 1. Gráficos Recharts renderizam corretamente

**Test:** Abrir `/dashboard` como admin com dados, alternar para "Visão geral"
**Expected:** PieChart (Panorama geral), BarChart (Demandas por prioridade), LineChart (Demanda ao longo do tempo) visíveis com cores corretas
**Why human:** SVG rendering via Recharts não é verificável sem browser

#### 2. Toggle de view é exclusivo para admin

**Test:** Logar como colaborador e acessar `/dashboard`
**Expected:** Header mostra apenas o botão "Nova demanda" — sem toggle "Visão pessoal / Visão geral"
**Why human:** Condição `isAdmin` depende de `auth.user.role` vindo do servidor; requer sessão real

#### 3. OnboardingChecklist aparece para novos usuários

**Test:** Logar com usuário sem clientes e sem demandas, acessar `/dashboard`
**Expected:** Card "Primeiros passos" visível no topo com 2 passos incompletos
**Why human:** Depende do estado real do banco (hasClients=false, hasDemands=false)

#### 4. Dismiss do onboarding persiste após reload

**Test:** Clicar no X do OnboardingChecklist, recarregar a página
**Expected:** Checklist não reaparece após F5
**Why human:** Requer interação de browser + PATCH sendo processado pelo servidor

#### 5. ActivityFeed exibe eventos criados pelos observers

**Test:** Criar uma nova demand e verificar o feed na página do dashboard
**Expected:** Entrada "X criou [título]" aparece no ActivityFeed com ícone verde
**Why human:** Requer Observer disparando em ambiente real com servidor rodando

---

## Gaps Summary

Nenhum gap encontrado. Todos os 18 must-haves verificados com sucesso. Os 10 testes da fase 5 passam. O status `human_needed` é devido às 5 verificações visuais/interativas listadas acima — comportamentos que requerem browser real para confirmar.

---

_Verified: 2026-04-23T20:00:00Z_
_Verifier: Claude (gsd-verifier)_
