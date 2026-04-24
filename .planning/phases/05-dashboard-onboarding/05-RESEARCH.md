# Phase 5: Dashboard + Onboarding — Research

**Researched:** 2026-04-23
**Domain:** Laravel data aggregation, Recharts visualization, Laravel Observer pattern, Inertia partial reloads
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Biblioteca de gráficos: **Recharts** — donut, bar e line chart
- **D-02:** Tipos de gráfico: Donut/Pie (panorama, desempenho), Bar (prioridade, concluídas/dia), Line (criadas vs concluídas ao longo do tempo, tempo médio entrega)
- **D-03:** Cores dos status nos gráficos = mesmo padrão do StatusBadge existente
- **D-04:** Uma URL `/dashboard` com toggle "Visão pessoal / Visão geral" — colaborador vê só visão pessoal
- **D-05:** Greeting "Olá, [nome]! 👋" + subtítulo contextual
- **D-06:** Botão "+ Nova demanda" no header direito
- **D-07:** 5 cards de status com delta vs dia anterior (Atrasadas, Em andamento, Aguardando retorno, Em revisão, Concluídas esta semana)
- **D-08:** "Seu foco agora" — lista 3–5 demandas mais urgentes (atrasadas ou deadline hoje/amanhã)
- **D-09:** "Minhas demandas" — tabela com tabs (Todas, Em andamento, Atrasadas, Concluídas) — max 5 linhas
- **D-10:** "Bloqueios / Aguardando" — card com demandas `awaiting_feedback` e "Desde [data]"
- **D-11:** "Seu progresso" — donut % concluídas esta semana vs total atribuídas
- **D-12:** Toggle visão (admin/owner only), ao lado do greeting
- **D-13:** Date range picker na visão geral — padrão: semana atual
- **D-14:** 5 cards na visão geral = contagens da org inteira
- **D-15:** "Panorama geral" — donut por status com legenda (count + %)
- **D-16:** "Demandas por prioridade" — bar chart Alta/Média/Baixa
- **D-17:** "Demanda ao longo do tempo" — line chart dual (Criadas vs Concluídas)
- **D-18:** "Últimas demandas" — tabela 5 linhas com UserAvatar (Responsável)
- **D-19:** "Desempenho da equipe" — donut completion rate da org
- **D-20:** Dados gerenciais scoped para `current_organization_id`
- **D-21:** Nova tabela `activity_logs` (organization_id, user_id, action_type enum, subject_type, subject_id, subject_name, metadata JSON, created_at)
- **D-22:** 8 tipos de evento registrados (demand.status_changed, demand.created, demand.comment_added, demand.assigned, demand.archived, demand.restored, client.created, member.invited)
- **D-23:** Scoping por role — colaborador: só eventos de demandas suas; admin: todos os eventos da org
- **D-24:** Feed = últimos 10–15 eventos como card no dashboard (ambas as views)
- **D-25:** Registro via **Observer/Event do Laravel** — NÃO adicionar lógica de log direto nos controllers
- **D-26:** Onboarding = card dismissível — mesmo padrão do DashboardPlanningWidget
- **D-27:** Trigger onboarding: sem nenhum cliente OU sem nenhuma demanda na org
- **D-28:** 2 passos: "Adicionar um cliente" (`/clients/create`) e "Criar primeira demanda" (`/demands?create=1`)
- **D-29:** Dismiss permanente via `preferences.onboarding_dismissed = true` (PATCH `/settings/preferences`)
- **D-30:** Card some quando ambos os passos completos OU usuário clica dispensar

### Claude's Discretion
- Animação de entrada dos cards de status (fade in leve ou contagem animada)
- Skeleton loading state dos gráficos
- Tooltip nos gráficos Recharts (formato exato)
- Ícone e cor de cada `action_type` no feed de atividade
- Breakpoints responsivos para o grid do dashboard

### Deferred Ideas (OUT OF SCOPE)
- "Filtros rápidos" avançados no dashboard
- "Tempo médio de entrega" como KPI separado
- Meta semanal configurável
- Notificações push/email ao registrar no activity_logs
- Workload por membro como gráfico de barras horizontal (DASH-02 pode ser simplificado em tabela)
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DASH-01 | Admin/owner vê dashboard com demandas por status (gráfico) | Recharts PieChart/Pie/Cell verificado; DashboardController expandido com queries por status |
| DASH-02 | Admin vê demandas por membro da equipe (workload) | Query GROUP BY assigned_to com JOIN users; pode ser tabela simples em vez de gráfico separado |
| DASH-03 | Admin vê demandas por cliente (visão geral) | Query GROUP BY client_id com JOIN clients; incluído em "Últimas demandas" ou card adicional |
| DASH-04 | Qualquer usuário vê resumo de suas próprias demandas (contagem por status) | Query WHERE assigned_to = auth()->id() com GROUP BY status |
| DASH-05 | Dashboard exibe feed de atividade recente (últimas 10–15 ações) | activity_logs table + Observer pattern; ActivityLog model com query scoped por role |
| ONBRD-01 | Novo usuário (sem clientes/demandas) vê checklist guiado | Verificar Client::count() + Demand::count() por org no DashboardController; OnboardingChecklist component |
| ONBRD-02 | Usuário pode dispensar ou marcar onboarding completo | PATCH /settings/preferences com onboarding_dismissed=true; preferences route PRECISA ser atualizada |
</phase_requirements>

---

## Summary

A Fase 5 constrói o dashboard completo sobre o esqueleto existente (`DashboardController`, `Dashboard.tsx`) que atualmente retorna apenas dados de planejamento. A expansão requer quatro frentes paralelas: (1) queries de agregação no `DashboardController`, (2) nova tabela `activity_logs` com Observer pattern, (3) instalação do Recharts e construção dos componentes de gráfico, e (4) onboarding checklist dismissível.

O projeto está em estado muito favorável para esta fase: padrões de controllers, Inertia partial reloads, e o padrão de widget dismissível (DashboardPlanningWidget) já estão estabelecidos. O único bloqueio crítico descoberto na pesquisa é que o campo `priority` **não existe** na tabela `demands` — o CONTEXT.md e o UI-SPEC referenciam prioridade (Alta/Média/Baixa) em múltiplos gráficos e tabelas, mas não há coluna nem migração. Isso exige uma migração nova como Wave 0 obrigatório antes de qualquer query de prioridade.

Um segundo ponto crítico: o PATCH `/settings/preferences` atualmente filtra via `$r->only(['locale', 'theme'])` — `onboarding_dismissed` será silenciosamente ignorado sem atualização da rota.

**Primary recommendation:** Criar Wave 0 com (1) migração `activity_logs`, (2) migração `add_priority_to_demands`, (3) atualização da rota preferences, e (4) instalação do Recharts — antes de qualquer wave de features.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Queries de agregação (contagens, deltas, gráficos) | API/Backend (DashboardController) | — | Dados sensíveis ao escopo de org — nunca calcular no cliente |
| Scoping por role (personal vs overview) | API/Backend (DashboardController) | — | `isAdminOrOwner()` é server-side; dados gerenciais nunca vazam para colaboradores |
| Toggle de view (personal/overview) | Frontend (React state) | — | Estado local puro — ambas as views já carregadas como props Inertia |
| Date range filtering | Frontend (router.get) + Backend (DashboardController) | — | Frontend dispara Inertia partial reload `only: ['overview']`; backend filtra queries pelo range |
| Activity logging | API/Backend (Observer) | — | Disparado em models, fora dos controllers |
| Feed de atividade (scoping) | API/Backend (DashboardController) | — | Colaborador vs admin filtra no servidor |
| Charts rendering | Browser/Client (Recharts) | — | SVG renderizado no cliente via React components |
| Onboarding trigger check | API/Backend (DashboardController) | — | Verificar Client + Demand count no servidor; passar booleans para frontend |
| Onboarding dismiss | Frontend (router.patch) + Backend (preferences route) | — | Inertia PATCH com only: ['auth'] para atualizar shared props |
| Skeleton loading | Browser/Client (React) | — | Estado local baseado em carregamento inicial da página |

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| recharts | 3.8.1 | PieChart, BarChart, LineChart, ResponsiveContainer | Declarativo, React-native, suporte TypeScript, leve sem deps extras [VERIFIED: npm registry] |
| lucide-react | já instalado (^1.8.0) | Ícones nos cards de status, feed de atividade | Já em uso no projeto [VERIFIED: codebase] |
| @inertiajs/react | já instalado (^2.0.0) | router.get partial reloads para date range | Já em uso em todo o projeto [VERIFIED: codebase] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Laravel Eloquent (PHP) | no projeto | Queries de agregação com `groupBy`, `selectRaw`, `whereBetween` | Toda query de dashboard |
| Carbon | no projeto | Cálculo de "início da semana" (`Carbon::now()->startOfWeek()`), delta vs ontem | Queries com date ranges |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| recharts | chart.js / react-chartjs-2 | recharts é mais React-native (composable components); D-01 é decisão locked |
| Observer pattern | Disparar log diretamente nos controllers | Observer é mais limpo e D-25 é decisão locked — não duplicar lógica |

**Installation:**
```bash
npm install recharts
```

**Version verification:** recharts 3.8.1 verificado via `npm view recharts version` em 2026-04-23. [VERIFIED: npm registry]

---

## Architecture Patterns

### System Architecture Diagram

```
GET /dashboard?start=YYYY-MM-DD&end=YYYY-MM-DD
         │
         ▼
DashboardController::index()
         │
         ├─── [always] personal props ──────────────────────────────────────┐
         │    Demand WHERE assigned_to = $user->id                           │
         │    ├── statusCounts (todo/in_progress/etc.)                       │
         │    ├── deltaVsYesterday (subquery DATE = yesterday)               │
         │    ├── focusDemands (atrasadas + deadline hoje/amanhã, max 5)     │
         │    ├── myDemands (todas as minhas, max 5 + tabs)                 │
         │    ├── blockers (awaiting_feedback assigned to me)                │
         │    └── weekProgress (completed this week / total assigned)        │
         │                                                                   │
         ├─── [if isAdminOrOwner()] overview props ─────────────────────────┤
         │    Demand WHERE organization_id = $orgId                          │
         │    ├── orgStatusCounts                                            │
         │    ├── orgDeltaVsYesterday                                        │
         │    ├── statusBreakdown (for donut chart)                         │
         │    ├── priorityBreakdown (for bar chart — REQUIRES priority col)  │
         │    ├── demandsOverTime (created vs completed by day, scoped)      │
         │    ├── latestDemands (5 most recent updated_at)                   │
         │    └── teamPerformance (completion rate)                          │
         │                                                                   │
         ├─── [always] activityFeed ─────────────────────────────────────────┤
         │    ActivityLog WHERE org = $orgId                                  │
         │    ├── [collaborator] only demands assigned_to/created_by me      │
         │    └── [admin] all org events, last 15                            │
         │                                                                   │
         └─── [always] onboarding ──────────────────────────────────────────┘
              hasClients = Client::where(org)->exists()
              hasDemands = Demand::where(org)->whereNull(archived)->exists()
                                       │
                                       ▼
                              Inertia::render('Dashboard', [...props])
                                       │
                                       ▼ (partial reload — only: ['overview'])
                                   date range change via router.get
                                       │
                                       ▼
                              React Dashboard.tsx
                                       │
         ┌─────────────────────────────┴────────────────────────────────┐
         │                                                              │
         ▼                                                              ▼
 view === 'personal'                                          view === 'overview'
 DashboardStatusCard ×5                                      DashboardStatusCard ×5
 "Seu foco agora" list                                       DonutChart (panorama)
 BarChart (semanal)                                          BarChart (prioridade)
 DonutChart (progresso)                                      LineChart (ao longo do tempo)
 "Minhas demandas" table                                     "Últimas demandas" table
 "Bloqueios" card                                            DonutChart (desempenho)
 ActivityFeed                                                ActivityFeed
         │
         ▼
 OnboardingChecklist (conditional — top of page)
```

### Recommended Project Structure
```
app/
├── Models/
│   └── ActivityLog.php           # New model for activity_logs table
├── Observers/
│   ├── DemandObserver.php        # Hooks: created, updated (status/assigned), deleted, restored
│   └── ClientObserver.php        # Hook: created
├── Providers/
│   └── AppServiceProvider.php    # Register observers in boot()
├── Http/Controllers/
│   └── DashboardController.php   # Expand with full query logic
database/
└── migrations/
    ├── XXXX_create_activity_logs_table.php
    └── XXXX_add_priority_to_demands_table.php
resources/js/
├── pages/
│   └── Dashboard.tsx             # Full replace of stub
└── Components/
    ├── DashboardStatusCard.tsx   # New — status metric card
    ├── DashboardSectionCard.tsx  # New — generic section wrapper
    ├── ActivityFeed.tsx          # New — activity log feed
    └── OnboardingChecklist.tsx   # New — dismissible onboarding card
```

### Pattern 1: DashboardController — Personal Props Query
**What:** Queries scoped para o usuário atual, agregando contagens por status e calculando delta vs ontem.
**When to use:** Sempre no page load, independente de role.
**Example:**
```php
// Source: Established project pattern (DemandController, ArchiveController) + Carbon
$user = auth()->user();
$orgId = $user->current_organization_id;
$today = Carbon::today();
$yesterday = Carbon::yesterday();
$weekStart = Carbon::now()->startOfWeek();
$weekEnd = Carbon::now()->endOfWeek();

// Status counts (assigned to me, active)
$statusCounts = Demand::where('organization_id', $orgId)
    ->where('assigned_to', $user->id)
    ->whereNull('archived_at')
    ->whereNull('deleted_at')
    ->selectRaw('status, COUNT(*) as count')
    ->groupBy('status')
    ->pluck('count', 'status')
    ->toArray();

// Overdue = past deadline, not approved, not archived
$overdueCount = Demand::where('organization_id', $orgId)
    ->where('assigned_to', $user->id)
    ->whereNull('archived_at')
    ->whereNull('deleted_at')
    ->where('deadline', '<', $today)
    ->whereNotIn('status', ['approved'])
    ->count();

// Delta vs yesterday — count demands that had their status as of yesterday
// Simplest approach: count yesterday's completed (archived_at between yesterday-start and today)
// For status cards delta, query count WHERE DATE(updated_at) = yesterday per status
$yesterdayCounts = Demand::where('organization_id', $orgId)
    ->where('assigned_to', $user->id)
    ->whereDate('updated_at', $yesterday)
    ->selectRaw('status, COUNT(*) as count')
    ->groupBy('status')
    ->pluck('count', 'status')
    ->toArray();
```
[VERIFIED: codebase — padrão de query idêntico ao DemandController/ArchiveController]

### Pattern 2: Inertia Partial Reload para Date Range
**What:** Frontend dispara `router.get` com `only: ['overview']` ao mudar o date range — servidor recalcula apenas as props gerenciais.
**When to use:** Date range change no `DateRangePicker` da visão geral.
**Example:**
```tsx
// Source: Established project pattern (DemandDetailModal.tsx `only: ['selectedDemand']`)
router.get(
  route('dashboard'),
  { start: startDate, end: endDate },
  {
    preserveScroll: true,
    preserveState: true,
    only: ['overview'],
  }
);
```
No controller, o prop `overview` é condicional ao role e ao date range:
```php
// Source: codebase pattern — request params consumed in DemandController::index()
$start = $request->filled('start') ? Carbon::parse($request->start)->startOfDay() : Carbon::now()->startOfWeek();
$end   = $request->filled('end')   ? Carbon::parse($request->end)->endOfDay()     : Carbon::now()->endOfWeek();
```
[VERIFIED: codebase — DemandController usa `$request->filled()` e `when()` para filtros opcionais]

### Pattern 3: Laravel Observer para Activity Logging
**What:** Observer escuta eventos do Eloquent model (created, updated, deleted, restored) e cria registros em `activity_logs`.
**When to use:** D-25 — NÃO adicionar log nos controllers diretamente.
**Example:**
```php
// app/Observers/DemandObserver.php
namespace App\Observers;

use App\Models\ActivityLog;
use App\Models\Demand;

class DemandObserver
{
    public function created(Demand $demand): void
    {
        ActivityLog::create([
            'organization_id' => $demand->organization_id,
            'user_id'         => $demand->created_by,
            'action_type'     => 'demand.created',
            'subject_type'    => 'demand',
            'subject_id'      => $demand->id,
            'subject_name'    => $demand->title,
            'metadata'        => [],
        ]);
    }

    public function updated(Demand $demand): void
    {
        // Detect status change
        if ($demand->wasChanged('status')) {
            ActivityLog::create([
                'organization_id' => $demand->organization_id,
                'user_id'         => auth()->id() ?? $demand->created_by,
                'action_type'     => 'demand.status_changed',
                'subject_type'    => 'demand',
                'subject_id'      => $demand->id,
                'subject_name'    => $demand->title,
                'metadata'        => [
                    'from' => $demand->getOriginal('status'),
                    'to'   => $demand->status,
                ],
            ]);
        }
        // Detect assignment change
        if ($demand->wasChanged('assigned_to') && $demand->assigned_to !== null) {
            ActivityLog::create([
                'organization_id' => $demand->organization_id,
                'user_id'         => auth()->id() ?? $demand->created_by,
                'action_type'     => 'demand.assigned',
                'subject_type'    => 'demand',
                'subject_id'      => $demand->id,
                'subject_name'    => $demand->title,
                'metadata'        => ['assigned_to_id' => $demand->assigned_to],
            ]);
        }
    }

    public function deleted(Demand $demand): void
    {
        ActivityLog::create([
            'organization_id' => $demand->organization_id,
            'user_id'         => auth()->id() ?? $demand->created_by,
            'action_type'     => 'demand.archived',  // soft delete = "arquivado"
            'subject_type'    => 'demand',
            'subject_id'      => $demand->id,
            'subject_name'    => $demand->title,
            'metadata'        => [],
        ]);
    }

    public function restored(Demand $demand): void
    {
        ActivityLog::create([
            'organization_id' => $demand->organization_id,
            'user_id'         => auth()->id() ?? $demand->created_by,
            'action_type'     => 'demand.restored',
            'subject_type'    => 'demand',
            'subject_id'      => $demand->id,
            'subject_name'    => $demand->title,
            'metadata'        => [],
        ]);
    }
}
```
Registro em AppServiceProvider::boot():
```php
use App\Models\Demand;
use App\Observers\DemandObserver;

Demand::observe(DemandObserver::class);
```
[VERIFIED: codebase — AppServiceProvider::boot() já existe e usa esse padrão para o singleton da factory. Observer não existe ainda.]

### Pattern 4: Recharts Donut Chart com Centro Overlay
**What:** PieChart com innerRadius para donut + texto absoluto centralizado no centro.
**When to use:** "Panorama geral", "Seu progresso", "Desempenho da equipe"
**Example:**
```tsx
// Source: Context7 /recharts/recharts + 05-UI-SPEC.md
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const STATUS_COLORS = {
  todo:               '#9ca3af',
  in_progress:        '#3b82f6',
  awaiting_feedback:  '#f59e0b',
  in_review:          '#8b5cf6',
  approved:           '#10b981',
};

function DonutChart({ data, centerLabel }: { data: Array<{ name: string; value: number; status: string }>; centerLabel: string }) {
  return (
    <div className="relative h-[160px]">
      <ResponsiveContainer width="100%" height={160}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={48}
            outerRadius={72}
            paddingAngle={3}
            dataKey="value"
          >
            {data.map((entry) => (
              <Cell key={entry.status} fill={STATUS_COLORS[entry.status as keyof typeof STATUS_COLORS] ?? '#9ca3af'} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '8px', fontSize: '12px', color: '#f9fafb' }}
          />
        </PieChart>
      </ResponsiveContainer>
      {/* Center label overlay — absolute positioned */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span className="text-lg font-bold text-[#111827] dark:text-[#f9fafb]">{centerLabel}</span>
      </div>
    </div>
  );
}
```
[VERIFIED: Context7 /recharts/recharts]

### Pattern 5: Onboarding Dismiss com Inertia PATCH
**What:** Otimisticamente esconde o card localmente, depois confirma via PATCH com `only: ['auth']`.
**When to use:** Botão X do OnboardingChecklist.
**Example:**
```tsx
// Source: codebase — useTheme.ts usa mesma rota com preserveState + preserveScroll
const [dismissed, setDismissed] = useState(false);

const handleDismiss = () => {
  setDismissed(true);  // otimistic — esconde imediatamente
  router.patch(
    route('settings.preferences'),
    { onboarding_dismissed: true },
    { preserveState: true, preserveScroll: true, only: ['auth'] }
  );
};

if (dismissed || preferences?.onboarding_dismissed) return null;
```
[VERIFIED: codebase — useTheme.ts linha 22-28 usa padrão idêntico]

### Anti-Patterns to Avoid
- **Calcular agregações no frontend:** Nunca passar dados brutos de demands e calcular contagens em React — faz N+1 implicito e vaza dados de outros usuários para colaboradores.
- **Logar eventos diretamente nos controllers:** D-25 é locked — Observer é o único local correto.
- **Usar `$r->only(['locale', 'theme'])` na rota de preferences sem atualizar:** A rota atual filtra apenas `locale` e `theme`. `onboarding_dismissed` será descartado silenciosamente. [VERIFIED: routes/web.php linha 138-145]
- **Queries sem `whereNull('deleted_at')` e `whereNull('archived_at')`:** A tabela `demands` usa soft deletes (`deleted_at`) e arquivamento (`archived_at`) — todas as queries de dashboard devem excluir ambos.
- **Observer disparando em contextos sem auth (jobs/CLI):** `auth()->id()` retorna null em contextos CLI. Usar `$demand->created_by` como fallback no user_id do log.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Charts SVG | Custom SVG drawing | Recharts PieChart/BarChart/LineChart | Tooltip, responsividade, animação, acessibilidade — complexidade enorme |
| Relative timestamps ("há 5 min") | Custom função JS | `Carbon::parse($createdAt)->diffForHumans()` no backend OU `Intl.RelativeTimeFormat` no frontend | Edge cases de localização e formato |
| Date math (início/fim da semana) | Custom JS/PHP | `Carbon::now()->startOfWeek()` / `endOfWeek()` | Carbon respeita locale e timezone |
| Observer registration | Manual listeners em controllers | `Demand::observe(DemandObserver::class)` em AppServiceProvider::boot() | Eloquent observer lifecycle é o padrão Laravel |

**Key insight:** O Recharts transforma dados em SVG — nunca construir SVG de gráfico à mão em React.

---

## Critical Findings (Blockers)

### BLOCKER-01: Campo `priority` não existe na tabela `demands`

**Descoberto em:** migrations + Demand.php + StoreDemandRequest.php

O CONTEXT.md referencia `priority` (Alta/Média/Baixa) em D-07 ("badge de prioridade"), D-08, D-09, D-16 (bar chart por prioridade). O UI-SPEC tem toda uma seção de "Priority Color Map". Porém:
- A tabela `demands` não tem coluna `priority` [VERIFIED: `2026_04_22_015617_create_demands_table.php`]
- `Demand::$fillable` não contém `priority` [VERIFIED: `app/Models/Demand.php`]
- `StoreDemandRequest` não valida `priority` [VERIFIED: `app/Http/Requests/StoreDemandRequest.php`]

**Impacto:** Todos os gráficos de prioridade (D-16) e badges de prioridade nas tabelas/cards falharão sem esta coluna. O Wave 0 DEVE incluir migração `add_priority_to_demands`.

**Schema correto:**
```php
// Migration Wave 0
$table->enum('priority', ['high', 'medium', 'low'])->default('medium')->after('status');
```
Também precisará atualizar: `Demand::$fillable`, `StoreDemandRequest`, `UpdateDemandRequest`, DemandFactory.

### BLOCKER-02: Rota `preferences` filtra apenas `locale` e `theme`

**Descoberto em:** `routes/web.php` linha 140: `$r->only(['locale', 'theme'])`

O dismiss do onboarding (D-29) faz PATCH com `{ onboarding_dismissed: true }` — este campo será descartado silenciosamente pelo `$r->only()` atual. A rota precisa ser atualizada para aceitar também `onboarding_dismissed`.

**Fix necessário:**
```php
// routes/web.php
$r->user()->update([
    'preferences' => array_merge(
        $r->user()->preferences ?? [],
        $r->only(['locale', 'theme', 'onboarding_dismissed'])  // adicionar onboarding_dismissed
    ),
]);
```

---

## Common Pitfalls

### Pitfall 1: Observer disparando em contextos sem autenticação
**What goes wrong:** `auth()->id()` retorna `null` quando o Observer é chamado de um job em queue, seeder, ou console command — o ActivityLog tem `user_id` nullable (ou falhará se NOT NULL).
**Why it happens:** Observers do Eloquent são chamados independente do contexto HTTP.
**How to avoid:** Definir `user_id` como nullable na migration de `activity_logs`. No Observer, usar `auth()->id() ?? $demand->created_by` como fallback.
**Warning signs:** `Integrity constraint violation: 1048 Column 'user_id' cannot be null` em testes que chamam `Demand::create()` sem `actingAs()`.

### Pitfall 2: Partial reload `only: ['overview']` requer que o prop exista na resposta inicial
**What goes wrong:** Se `overview` prop só é retornado para admin, um colaborador que faz reload com `only: ['overview']` recebe um array vazio sem erro — mas a visão overview não deveria ser acessível para colaboradores de qualquer forma.
**Why it happens:** Inertia partial reloads (`only`) fazem merge com os props existentes — props não enviados são mantidos do estado anterior.
**How to avoid:** No controller, sempre incluir o prop `overview` (como array vazio ou null) para não-admins. O toggle de view já é renderizado condicionalmente no frontend.
**Warning signs:** `overview` undefined após date range change mesmo para admin — verificar que o controller retorna o prop quando `$request->filled('start')`.

### Pitfall 3: `demand.archived` vs `demand.deleted` (soft delete vs `archived_at`)
**What goes wrong:** O projeto usa dois mecanismos distintos: soft delete (`deleted_at` — "lixeira") e `archived_at` ("concluídas/arquivadas"). Um Observer `deleted()` captura o soft delete para a lixeira — não o arquivamento via `archived_at`.
**Why it happens:** `archived_at` é um campo customizado, não um soft delete — não dispara `deleted()` no Observer.
**How to avoid:** O evento `demand.archived` (D-22) deve ser registrado no `updated()` do Observer verificando `wasChanged('archived_at')`, não no `deleted()`. O `deleted()` deve gerar `demand.archived` também (soft delete = mover para lixeira), mas são eventos separados: `demand.archived` para `archived_at != null`, e um evento de lixeira sem equivalente no D-22 (o D-22 só lista `demand.archived` e `demand.restored`).
**Warning signs:** Eventos de arquivamento não aparecendo no feed após clicar "Arquivar demanda" no ArchiveController.

### Pitfall 4: `only` no partial reload não atualiza shared props (`auth`)
**What goes wrong:** `only: ['auth']` no dismiss do onboarding pode não funcionar como esperado para atualizar `auth.user.preferences` nos shared props do Inertia.
**Why it happens:** Shared props como `auth` são definidos no middleware `HandleInertiaRequests::share()` — eles fazem parte da resposta Inertia mas como `shared`, não como `page props`. O Inertia 2.x trata shared props separadamente.
**How to avoid:** Usar abordagem otimista: estado local `dismissed = true` imediatamente, e após o PATCH, confiar que o `auth.user.preferences.onboarding_dismissed` será atualizado automaticamente no próximo reload completo. Alternativamente, omitir `only` no dismiss PATCH (permitir full reload da página), ou usar `only: []` passando array vazio para forçar atualização de shared props.
**Warning signs:** Card de onboarding reaparece após reload mesmo após clicar X.

### Pitfall 5: Recharts não instalado (package.json confirmado)
**What goes wrong:** `import { PieChart } from 'recharts'` falha com "Cannot find module 'recharts'".
**Why it happens:** `recharts` não está em `package.json` nem em `node_modules`. [VERIFIED: codebase]
**How to avoid:** Wave 0 DEVE executar `npm install recharts` antes de qualquer componente de gráfico.
**Warning signs:** `Module not found: Error: Can't resolve 'recharts'` no build Vite.

### Pitfall 6: Delta "vs ontem" — estratégia de cálculo
**What goes wrong:** Calcular delta como "quantas demandas mudaram de status ontem" é ambíguo — uma demanda pode mudar de status múltiplas vezes num dia.
**Why it happens:** O campo `updated_at` é atualizado em qualquer mudança, não só status.
**How to avoid:** A abordagem mais simples e correta: para cada status card, o delta é `count(hoje) - count(ontem)` onde "count(hoje)" = demandas naquele status AGORA, e "count(ontem)" = demandas cujo `updated_at` era ontem com aquele status. Como a tabela não tem histórico completo, a melhor proxy é: `delta = status_count_now - status_count_where_updated_at = yesterday`. Documentar isso claramente no código.

---

## Code Examples

Verified patterns from official sources:

### DashboardController — Estrutura de Props Expandida
```php
// Source: codebase — projeto existente (DemandController, ArchiveController patterns)
public function index(Request $request): Response
{
    $user  = auth()->user();
    $orgId = $user->current_organization_id;
    $today = Carbon::today();
    $weekStart = Carbon::now()->startOfWeek();
    $weekEnd   = Carbon::now()->endOfWeek();

    // --- Personal props (todos os usuários) ---
    $personalBase = Demand::where('organization_id', $orgId)
        ->where('assigned_to', $user->id)
        ->whereNull('archived_at')
        ->whereNotNull('assigned_to');

    $statusCounts = (clone $personalBase)
        ->selectRaw('status, COUNT(*) as count')
        ->groupBy('status')
        ->pluck('count', 'status');

    $focusDemands = (clone $personalBase)
        ->whereNotIn('status', ['approved'])
        ->where(fn($q) =>
            $q->where('deadline', '<', $today)
              ->orWhereDate('deadline', $today)
              ->orWhereDate('deadline', $today->copy()->addDay())
        )
        ->with('client:id,name')
        ->orderByRaw("CASE WHEN deadline < NOW() THEN 0 ELSE 1 END")
        ->orderBy('deadline')
        ->limit(5)
        ->get(['id', 'title', 'status', 'priority', 'deadline', 'client_id']);

    // --- Overview props (admin/owner only) ---
    $overview = null;
    if ($user->isAdminOrOwner()) {
        $start = $request->filled('start') ? Carbon::parse($request->start)->startOfDay() : $weekStart;
        $end   = $request->filled('end')   ? Carbon::parse($request->end)->endOfDay()     : $weekEnd;

        $orgBase = Demand::where('organization_id', $orgId)->whereNull('archived_at');

        $overview = [
            'statusBreakdown'  => (clone $orgBase)->selectRaw('status, COUNT(*) as count')->groupBy('status')->pluck('count', 'status'),
            'priorityBreakdown' => (clone $orgBase)->whereBetween('created_at', [$start, $end])->selectRaw('priority, COUNT(*) as count')->groupBy('priority')->pluck('count', 'priority'),
            // ... etc
        ];
    }

    // --- Onboarding ---
    $hasClients = \App\Models\Client::where('organization_id', $orgId)->exists();
    $hasDemands = Demand::where('organization_id', $orgId)->whereNull('archived_at')->exists();

    // --- Activity Feed ---
    $activityQuery = \App\Models\ActivityLog::where('organization_id', $orgId)
        ->with('user:id,name,avatar')
        ->orderByDesc('created_at')
        ->limit(15);

    if (!$user->isAdminOrOwner()) {
        // Colaborador: somente eventos de demandas atribuídas a ele ou criadas por ele
        $activityQuery->where(function ($q) use ($user) {
            $q->whereIn('subject_id',
                Demand::where('organization_id', $user->current_organization_id)
                    ->where(fn($d) => $d->where('assigned_to', $user->id)->orWhere('created_by', $user->id))
                    ->pluck('id')
            )->where('subject_type', 'demand')
            ->orWhere('user_id', $user->id);
        });
    }

    return Inertia::render('Dashboard', [
        'personal'               => [...],
        'overview'               => $overview,  // null para colaboradores
        'activityFeed'           => $activityQuery->get(),
        'hasClients'             => $hasClients,
        'hasDemands'             => $hasDemands,
        'planningReminderClients' => $planningReminderClients, // mantém existente
    ]);
}
```
[VERIFIED: codebase patterns]

### Recharts BarChart — Demandas por Prioridade
```tsx
// Source: Context7 /recharts/recharts
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const PRIORITY_COLORS = { high: '#ef4444', medium: '#f59e0b', low: '#9ca3af' };

const data = [
  { name: 'Alta', value: priorityBreakdown.high ?? 0, color: '#ef4444' },
  { name: 'Média', value: priorityBreakdown.medium ?? 0, color: '#f59e0b' },
  { name: 'Baixa', value: priorityBreakdown.low ?? 0, color: '#9ca3af' },
];

<ResponsiveContainer width="100%" height={200}>
  <BarChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
    <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} />
    <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} />
    <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '8px', fontSize: '12px', color: '#f9fafb' }} />
    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
      {data.map((entry) => (
        <Cell key={entry.name} fill={entry.color} />
      ))}
    </Bar>
  </BarChart>
</ResponsiveContainer>
```
[VERIFIED: Context7 /recharts/recharts]

### Recharts LineChart — Criadas vs Concluídas ao Longo do Tempo
```tsx
// Source: Context7 /recharts/recharts
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// data: [{ date: 'Seg', created: 3, completed: 1 }, ...]
<ResponsiveContainer width="100%" height={200}>
  <LineChart data={timelineData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
    <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} />
    <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} />
    <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '8px', fontSize: '12px', color: '#f9fafb' }} />
    <Legend wrapperStyle={{ fontSize: '12px', color: '#6b7280' }} />
    <Line type="monotone" dataKey="created" stroke="#3b82f6" strokeWidth={2} dot={false} activeDot={{ r: 4 }} name="Criadas" />
    <Line type="monotone" dataKey="completed" stroke="#10b981" strokeWidth={2} dot={false} activeDot={{ r: 4 }} name="Concluídas" />
  </LineChart>
</ResponsiveContainer>
```
[VERIFIED: Context7 /recharts/recharts]

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Dashboard.tsx stub (`"Em breve..."`) | Dashboard completo com views personal/overview | Phase 5 | Substituição total do componente |
| DashboardController retorna props vazios | DashboardController com queries reais de agregação | Phase 5 | Expansão do método `index()` |
| Sem activity_logs | Tabela + Observer + ActivityLog model | Phase 5 | Nova infra permanente |
| Sem prioridade nas demandas | Coluna `priority` enum(high/medium/low) | Phase 5 (Wave 0) | Nova coluna em demandas — afeta formulários |

**Deprecated/outdated:**
- Dashboard placeholder `<p className="text-[#9ca3af]...">Em breve...</p>`: substituído pela implementação completa

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Delta "vs ontem" pode ser aproximado como `count_now - count_where_updated_at_was_yesterday` (sem tabela de histórico) | Pitfalls + Code Examples | Delta pode ser impreciso; impacto visual menor, aceitável para v1.1 |
| A2 | DASH-02 (workload por membro) pode ser atendido como tabela simples na visão gerencial em vez de gráfico de barras horizontal separado | Phase Requirements | Se o usuário esperar gráfico horizontal explícito, precisará de wave adicional |
| A3 | DASH-03 (demandas por cliente) pode ser atendido via "Últimas demandas" com coluna de cliente ou card adicional — não há gráfico dedicado no UI-SPEC | Phase Requirements | Se precisar de gráfico separado por cliente, adiciona complexidade |
| A4 | `only: ['auth']` para atualizar shared props do Inertia no dismiss do onboarding funciona no Inertia 2.x | Pitfalls | Se não funcionar, usar abordagem otimista local — impacto mínimo |

---

## Open Questions

1. **DASH-02 (workload por membro) — como implementar?**
   - O que sabemos: não aparece como gráfico nas imagens de referência do CONTEXT.md
   - O que está incerto: é uma tabela simples "Demandas por membro" na visão gerencial ou um gráfico de barras horizontal separado?
   - Recomendação: Implementar como tabela simples ou lista no card "Desempenho da equipe" (ao lado do donut D-19), que já mostra totais. Satisfaz DASH-02 com esforço mínimo.

2. **DASH-03 (demandas por cliente) — card dedicado ou incluir na view gerencial existente?**
   - O que sabemos: UI-SPEC não menciona gráfico separado por cliente
   - O que está incerto: onde fica essa informação na visão gerencial?
   - Recomendação: Adicionar campo "Cliente" no "Últimas demandas" e/ou tabela de distribuição por cliente no Wave final da view gerencial.

3. **Comment added events — como capturar no Observer?**
   - O que sabemos: `demand.comment_added` (D-22) deve ser registrado. `DemandComment` é um model separado, não capturado pelo DemandObserver.
   - O que está incerto: criar `DemandCommentObserver` separado ou disparar o log no controller?
   - Recomendação: Criar `DemandCommentObserver` para o model `DemandComment` — mantém consistência com D-25 (não logar nos controllers). Alternativamente, aceitar que `addComment` no DemandController é o único local razoável e fazer uma exceção pontual.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| PHP | Backend | ✓ | 8.4.18 | — |
| Node.js | Frontend build | ✓ | 24.14.0 | — |
| recharts (npm) | Charts | ✗ (não instalado) | — | Wave 0: `npm install recharts` |
| PostgreSQL | DB queries | Assumido ✓ | — | — (DB_CONNECTION=pgsql em phpunit.xml) |

**Missing dependencies com fallback:**
- recharts: não instalado — instalar via `npm install recharts` no Wave 0 antes de qualquer componente de gráfico

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | PHPUnit (via Laravel) |
| Config file | `phpunit.xml` |
| Quick run command | `php artisan test --filter DashboardControllerTest` |
| Full suite command | `php artisan test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DASH-01 | Admin vê `overview.statusBreakdown` nas props Inertia | Feature (HTTP) | `php artisan test --filter DashboardControllerTest::test_admin_sees_overview_props` | ❌ Wave 0 |
| DASH-02 | Admin vê workload de membros | Feature (HTTP) | `php artisan test --filter DashboardControllerTest::test_admin_sees_team_workload` | ❌ Wave 0 |
| DASH-03 | Admin vê demandas por cliente | Feature (HTTP) | `php artisan test --filter DashboardControllerTest::test_admin_sees_client_distribution` | ❌ Wave 0 |
| DASH-04 | Colaborador vê `personal.statusCounts` próprios | Feature (HTTP) | `php artisan test --filter DashboardControllerTest::test_collaborator_sees_personal_props` | ❌ Wave 0 |
| DASH-05 | ActivityLog criado ao criar/mover demanda | Feature (Observer) | `php artisan test --filter ActivityLogTest::test_demand_created_logs_activity` | ❌ Wave 0 |
| ONBRD-01 | hasClients/hasDemands corretos nas props | Feature (HTTP) | `php artisan test --filter DashboardControllerTest::test_onboarding_props` | ❌ Wave 0 |
| ONBRD-02 | PATCH preferences persiste onboarding_dismissed | Feature (HTTP) | `php artisan test --filter PreferencesTest::test_onboarding_dismissed_persists` | ❌ Wave 0 |

### Sampling Rate
- **Por task commit:** `php artisan test --filter DashboardControllerTest`
- **Por wave merge:** `php artisan test`
- **Phase gate:** Full suite verde antes de `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `tests/Feature/DashboardControllerTest.php` — cobre DASH-01, DASH-02, DASH-03, DASH-04, ONBRD-01
- [ ] `tests/Feature/ActivityLogTest.php` — cobre DASH-05
- [ ] `tests/Feature/PreferencesTest.php` — cobre ONBRD-02 (ou adicionar ao SettingsControllerTest existente)
- [ ] `database/migrations/XXXX_create_activity_logs_table.php`
- [ ] `database/migrations/XXXX_add_priority_to_demands_table.php`
- [ ] `npm install recharts` — pacote não instalado [VERIFIED: package.json]

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V4 Access Control | sim | `isAdminOrOwner()` — colaborador não recebe `overview` props; ActivityLog scoped por role |
| V5 Input Validation | sim | Date range inputs validados com `Carbon::parse()` + `$request->filled()` no controller |
| V2 Authentication | não diretamente | Rota `/dashboard` já protegida por middleware `auth,verified` |
| V6 Cryptography | não | Sem dados sensíveis novos nesta fase |

### Known Threat Patterns for Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Colaborador acessando dados gerenciais via query param `?view=overview` | Elevation of Privilege | Scoping server-side em DashboardController — overview props só retornados se `isAdminOrOwner()` |
| Injeção via date range params (`?start=...&end=...`) | Tampering | `Carbon::parse()` com `try/catch` ou validação `date` rule; queries usam parameterized bindings via Eloquent |
| IDOR no ActivityLog — colaborador vê eventos de outros usuários | Information Disclosure | ActivityLog query filtrada por `assigned_to/created_by` para colaboradores [VERIFIED: codebase pattern em DemandController] |

---

## Sources

### Primary (HIGH confidence)
- Codebase — `app/Http/Controllers/DemandController.php`, `ArchiveController.php`, `TrashController.php`: padrões de query Eloquent verificados [VERIFIED: codebase]
- Codebase — `app/Models/Demand.php`, `User.php`, `Organization.php`: campos, casts, relacionamentos [VERIFIED: codebase]
- Codebase — `routes/web.php`: rotas existentes, rota preferences atual [VERIFIED: codebase]
- Codebase — `database/migrations/2026_04_22_015617_create_demands_table.php`: ausência do campo `priority` [VERIFIED: codebase]
- Codebase — `resources/js/hooks/useTheme.ts`: padrão de `router.patch` para preferences [VERIFIED: codebase]
- Codebase — `resources/js/Components/DashboardPlanningWidget.tsx`: padrão de widget dismissível [VERIFIED: codebase]
- Context7 `/recharts/recharts`: PieChart, BarChart, LineChart, ResponsiveContainer, Cell patterns [VERIFIED: Context7]
- npm registry: recharts@3.8.1 (versão atual) [VERIFIED: npm view recharts version]

### Secondary (MEDIUM confidence)
- `05-UI-SPEC.md` — specs visuais completos para componentes, grids, cores [VERIFIED: arquivo]
- `05-CONTEXT.md` — decisões D-01 a D-30, todas locked [VERIFIED: arquivo]

### Tertiary (LOW confidence)
- Inertia 2.x behavior para `only: ['auth']` em shared props: comportamento de partial reload com shared props pode diferir da expectativa — [ASSUMED]

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — recharts 3.8.1 verificado no npm; todas as outras libs já instaladas no projeto
- Architecture: HIGH — baseado em código existente verificado, padrões estabelecidos das Fases 1-4
- Pitfalls: HIGH — BLOCKER-01 (priority) e BLOCKER-02 (preferences route) verificados diretamente no código

**Research date:** 2026-04-23
**Valid until:** 2026-05-23 (recharts é estável; dependências Laravel do projeto são fixas)
