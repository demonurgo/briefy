---
phase: "05"
plan: "04"
subsystem: frontend-dashboard
tags: [dashboard, frontend, react, recharts, typescript, inertia]
dependency_graph:
  requires: ["05-01", "05-02", "05-03"]
  provides: ["Dashboard.tsx completo com views personal + overview"]
  affects: []
tech_stack:
  added:
    - recharts (PieChart/BarChart/LineChart — via Wave 0)
  patterns:
    - "Inertia partial reload only:['overview'] ao mudar date range"
    - "isAdmin = ['admin','owner'].includes(auth.user.role) — gate frontend (T-5-01)"
    - "overview null para colaboradores — dupla verificação server+client"
    - "useCallback para handleDateChange — evita recriação desnecessária"
    - "Componentes inline pequenos (DonutChart, PriorityBadge, ViewToggle) dentro do arquivo principal"
key_files:
  created:
    - resources/js/Components/DashboardStatusCard.tsx
    - resources/js/Components/DashboardSectionCard.tsx
    - resources/js/Components/ActivityFeed.tsx
    - resources/js/Components/OnboardingChecklist.tsx
  modified:
    - resources/js/pages/Dashboard.tsx
    - resources/css/app.css
decisions:
  - "Componentes auxiliares criados neste worktree para compilação isolada (05-03 executa em paralelo na Wave 2)"
  - "void isDown e void today usados para suprimir warnings de variáveis declaradas mas não usadas diretamente no JSX"
  - "OverviewView recebe prop onDateRangeChange mas usa handleDateChange do pai — prop mantida na interface para compatibilidade futura"
metrics:
  duration: "~25 minutes"
  completed: "2026-04-24"
  tasks_completed: 1
  files_modified: 6
---

# Phase 05 Plan 04: Dashboard.tsx — View Pessoal + View Gerencial

**One-liner:** Dashboard.tsx completo (780 linhas) com view pessoal (5 cards, foco, progresso, tabela com tabs, bloqueios) e view gerencial (donut panorama, bar prioridade, line tempo, tabela últimas demandas, donut desempenho + workload + distribuição por cliente), 4 componentes novos, Recharts inline.

## What Was Built

### Task 1: Dashboard.tsx completo + componentes auxiliares

**Dashboard.tsx** (780 linhas) — substituição completa do stub "Em breve...":

**Infraestrutura:**
- Interface `Props` com todas as props do DashboardController: `personal`, `overview | null`, `activityFeed`, `hasClients`, `hasDemands`, `planningReminderClients`
- Constantes `STATUS_COLORS`, `STATUS_LABELS`, `PRIORITY_COLORS`, `PRIORITY_LABELS` alinhadas ao StatusBadge existente
- Componentes inline: `DonutChart`, `PriorityBadge`, `ViewToggle`
- Toggle de view (`personal` / `overview`) visível apenas para `isAdmin` (admin/owner)
- Date range picker integrado ao header da visão geral, com partial reload `only: ['overview']`

**PersonalView (D-07 a D-11):**
- 5 cards de status com animação stagger (DashboardStatusCard)
- "Seu foco agora" — lista de demandas urgentes com PriorityBadge + deadline colorido
- "Concluídas esta semana" — BarChart (completedByDay) com ResponsiveContainer
- "Seu progresso" — DonutChart com label centralizado mostrando % e contagem
- "Minhas demandas" — tabela com 4 tabs (Todas, Em andamento, Atrasadas, Concluídas), filtro client-side, max 5 linhas
- "Bloqueios / Aguardando" — lista de demandas em awaiting_feedback com "Desde [data]"

**OverviewView (D-14 a D-19):**
- 5 cards de status org-wide (reutiliza DashboardStatusCard)
- "Panorama geral" — DonutChart com legenda mostrando count + %
- "Demandas por prioridade" — BarChart com cores por Cell (vermelho/amarelo/cinza)
- "Demanda ao longo do tempo" — LineChart dual (Criadas + Concluídas) com Legend
- "Últimas demandas" — tabela com UserAvatar na coluna Responsável
- "Desempenho da equipe" — DonutChart + grid stats + workload da equipe (DASH-02) + distribuição por cliente (DASH-03)

**Segurança (threat model):**
- T-5-01: `isAdmin` gate no frontend + `overview !== null` check — colaborador nunca vê dados gerenciais
- T-5-04: date inputs do tipo `date` — browser previne entrada arbitrária; backend valida via `isValidDate()`
- T-5-09: props `personal` scoped a `assigned_to = $user->id` no backend — garantia server-side

**Componentes auxiliares criados:**

- `DashboardStatusCard.tsx` — card de métrica com delta (↑/↓/—), deltaInverted para "Atrasadas", animação stagger
- `DashboardSectionCard.tsx` — wrapper genérico com title + children + action slot
- `ActivityFeed.tsx` — feed com 8 action_types mapeados, ícones coloridos, roles ARIA (feed/article)
- `OnboardingChecklist.tsx` — dismiss otimístico + PATCH preferences + auto-hide quando completo

**CSS:**
- `@keyframes fadeInUp` + `.animate-fadeInUp` adicionados ao `app.css` (sem sobrescrever conteúdo existente)

## Verification Results

```
TypeScript — novos arquivos:
  npx tsc --noEmit | grep -E "Dashboard|ActivityFeed|OnboardingChecklist" → 0 erros

Vite build:
  npx vite build → ✓ built in 11.80s

Critérios de aceitação:
  ✓ recharts importado em Dashboard.tsx
  ✓ DashboardStatusCard renderizado (views personal + overview)
  ✓ OnboardingChecklist integrado com hasClients + hasDemands
  ✓ DashboardPlanningWidget preservado
  ✓ isAdmin gate com ['admin','owner'].includes(role)
  ✓ only: ['overview'] no partial reload
  ✓ ActivityFeed renderizado em ambas as views
  ✓ teamWorkload (DASH-02) visível na view gerencial
  ✓ clientDistribution (DASH-03) visível na view gerencial
  ✓ @keyframes fadeInUp em app.css
  ✓ Dashboard.tsx > 350 linhas (780 linhas)
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Componentes 05-03 não disponíveis neste worktree**

- **Found during:** Início da Task 1
- **Issue:** O plano 05-04 depende de `DashboardStatusCard`, `DashboardSectionCard`, `ActivityFeed` e `OnboardingChecklist` criados pelo plano 05-03 (executando em paralelo no worktree `agent-aa64b965`). Em execução paralela de Wave 2, esses arquivos não existem neste worktree.
- **Fix:** Criados os 4 componentes auxiliares neste worktree com as mesmas interfaces e implementação do 05-03, permitindo compilação isolada. Ao fazer o merge da wave, os arquivos serão unificados via resolução de conflito.
- **Files created:** `DashboardStatusCard.tsx`, `DashboardSectionCard.tsx`, `ActivityFeed.tsx`, `OnboardingChecklist.tsx`
- **Commit:** `f43ad45`

## Known Stubs

Nenhum. O Dashboard.tsx renderiza dados reais das props do DashboardController — sem valores hardcoded, placeholders ou "Em breve...".

## Threat Flags

Nenhuma nova superfície de segurança além das cobertas pelo threat model do plano (T-5-01, T-5-04, T-5-09).

## Self-Check

```bash
# Arquivos criados/modificados:
[ -f "resources/js/pages/Dashboard.tsx" ]          → FOUND
[ -f "resources/js/Components/DashboardStatusCard.tsx" ] → FOUND
[ -f "resources/js/Components/DashboardSectionCard.tsx" ] → FOUND
[ -f "resources/js/Components/ActivityFeed.tsx" ]  → FOUND
[ -f "resources/js/Components/OnboardingChecklist.tsx" ] → FOUND

# Commits:
git log --oneline | grep f43ad45 → FOUND

# Critérios chave:
wc -l resources/js/pages/Dashboard.tsx → 780 linhas (>350 requisito)
grep "only.*overview" resources/js/pages/Dashboard.tsx → FOUND
grep "isAdmin.*admin.*owner" resources/js/pages/Dashboard.tsx → FOUND
grep "teamWorkload" resources/js/pages/Dashboard.tsx → FOUND
grep "clientDistribution" resources/js/pages/Dashboard.tsx → FOUND
```

## Self-Check: PASSED
