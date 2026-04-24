# Phase 5: Dashboard + Onboarding — Pattern Map

**Mapped:** 2026-04-23
**Files analyzed:** 12 (new/modified)
**Analogs found:** 11 / 12 (1 sem analog direto no codebase — ActivityLog model)

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `app/Http/Controllers/DashboardController.php` | controller | request-response | `app/Http/Controllers/DemandController.php` + `ArchiveController.php` | role-match (query patterns idênticos) |
| `app/Models/ActivityLog.php` | model | CRUD | `app/Models/DemandComment.php` | role-match (model simples com belongs-to) |
| `app/Observers/DemandObserver.php` | observer | event-driven | sem analog no codebase | no-analog |
| `app/Observers/ClientObserver.php` | observer | event-driven | padrão idêntico ao DemandObserver — usar como template | derived |
| `app/Providers/AppServiceProvider.php` | provider/config | — | `app/Providers/AppServiceProvider.php` (arquivo existente a expandir) | exact |
| `database/migrations/XXXX_create_activity_logs_table.php` | migration | — | `database/migrations/2026_04_22_015617_create_demands_table.php` | role-match |
| `database/migrations/XXXX_add_priority_to_demands_table.php` | migration | — | `database/migrations/2026_04_23_140500_add_archived_at_to_demands_table.php` | exact |
| `resources/js/pages/Dashboard.tsx` | page component | request-response | `resources/js/pages/Demands/Index.tsx` | role-match (page com view toggle + Inertia props) |
| `resources/js/Components/DashboardStatusCard.tsx` | component | — | `resources/js/Components/DashboardPlanningWidget.tsx` | role-match (card com border/bg tokens idênticos) |
| `resources/js/Components/DashboardSectionCard.tsx` | component | — | `resources/js/Components/DashboardPlanningWidget.tsx` | role-match (card wrapper pattern) |
| `resources/js/Components/ActivityFeed.tsx` | component | event-driven | `resources/js/Components/DashboardPlanningWidget.tsx` | role-match (lista com dismiss, border, bg) |
| `resources/js/Components/OnboardingChecklist.tsx` | component | request-response | `resources/js/Components/DashboardPlanningWidget.tsx` | exact (padrão de widget dismissível — reusar visual) |
| `routes/web.php` (preferences closure) | route/config | request-response | `routes/web.php` linhas 138–146 (arquivo existente a modificar) | exact |

---

## Pattern Assignments

### `app/Http/Controllers/DashboardController.php` (controller, request-response)

**Analog:** `app/Http/Controllers/DemandController.php` (query patterns) + `app/Http/Controllers/ArchiveController.php` (org scoping)

**Imports pattern** — copiar de `app/Http/Controllers/DemandController.php` linhas 1–17:
```php
<?php
// (c) 2026 Briefy contributors — AGPL-3.0
namespace App\Http\Controllers;

use App\Models\Client;
use App\Models\Demand;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Carbon\Carbon;
```
Adicionar: `use App\Models\ActivityLog;` para o feed de atividade.

**Org scoping pattern** — copiar de `app/Http/Controllers/DashboardController.php` linha 15 (arquivo existente):
```php
$orgId = auth()->user()->current_organization_id;
```
Este padrão é idêntico em todos os controllers (DemandController linha 23, ArchiveController linha 17, SettingsController linha 20).

**Role check pattern** — copiar de `app/Http/Controllers/DemandController.php` linha 63:
```php
'isAdmin' => auth()->user()->isAdminOrOwner(),
```
Na expansão do DashboardController, usar:
```php
if ($user->isAdminOrOwner()) { /* montar overview props */ }
```

**Query base pattern com whereNull guards** — copiar de `app/Http/Controllers/ArchiveController.php` linhas 18–28:
```php
$demands = Demand::where('organization_id', $orgId)
    ->whereNotNull('archived_at')        // ← para archive; no dashboard: ->whereNull('archived_at')
    ->with(['client:id,name', 'assignee:id,name'])
    ->when($request->client_id, fn ($q, $id) => $q->where('client_id', $id))
    ->orderByDesc('archived_at')
    ->get()
    ->map(fn ($d) => [...]);
```
ATENÇÃO: No dashboard, todas as queries de demandas ativas devem incluir `->whereNull('archived_at')` E respeitar o soft-delete (o model usa `SoftDeletes`, então `whereNull('deleted_at')` é aplicado automaticamente pelo Eloquent).

**Request date range pattern** — copiar de `app/Http/Controllers/DemandController.php` linhas 27–30:
```php
->when($request->client_id, fn($q, $id) => $q->where('client_id', $id))
->when($request->status, fn($q, $s) => $q->where('status', $s))
->when($request->search, fn($q, $s) => $q->where('title', 'ilike', "%{$s}%"))
```
Para o date range no dashboard:
```php
$start = $request->filled('start')
    ? Carbon::parse($request->start)->startOfDay()
    : Carbon::now()->startOfWeek();
$end = $request->filled('end')
    ? Carbon::parse($request->end)->endOfDay()
    : Carbon::now()->endOfWeek();
```

**Inertia render pattern** — copiar de `app/Http/Controllers/DashboardController.php` linhas 21–28 (existente):
```php
return Inertia::render('Dashboard', [
    'stats'                   => [],
    'alerts'                  => [],
    'recentDemands'           => [],
    'clients'                 => [],
    'planningReminderClients' => $planningReminderClients,
]);
```
Substituir os props vazios pelos dados reais. Manter `planningReminderClients` no shape final (widget existente ainda precisa dele).

---

### `app/Models/ActivityLog.php` (model, CRUD)

**Analog:** `app/Models/DemandComment.php` (model simples, belongs-to User + entidade pai)

**Imports e estrutura** — copiar de `app/Models/DemandComment.php` linhas 1–14:
```php
<?php
// (c) 2026 Briefy contributors — AGPL-3.0
namespace App\Models;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DemandComment extends Model
{
    use HasFactory;
    protected $fillable = ['demand_id', 'user_id', 'body', 'source'];
    public function demand(): BelongsTo { return $this->belongsTo(Demand::class); }
    public function user(): BelongsTo { return $this->belongsTo(User::class); }
}
```
Adaptar para ActivityLog:
```php
class ActivityLog extends Model
{
    use HasFactory;
    public $timestamps = false; // só created_at, sem updated_at
    protected $fillable = [
        'organization_id', 'user_id', 'action_type',
        'subject_type', 'subject_id', 'subject_name', 'metadata',
    ];
    protected $casts = [
        'metadata' => 'array',
        'created_at' => 'datetime',
    ];
    public function organization(): BelongsTo { return $this->belongsTo(Organization::class); }
    public function user(): BelongsTo { return $this->belongsTo(User::class); }
}
```

**Cast de JSON** — copiar de `app/Models/Demand.php` linha 21:
```php
'ai_analysis' => 'array',
```
Mesmo padrão para `'metadata' => 'array'`.

---

### `app/Observers/DemandObserver.php` (observer, event-driven)

**Analog:** Sem observer existente no codebase. Usar o padrão do `AppServiceProvider` como ponto de registro e o padrão de RESEARCH.md (Pattern 3) como template de implementação.

**Namespace e classe base** — copiar padrão de namespace do projeto (todo controller/provider usa `namespace App\...`):
```php
<?php
// (c) 2026 Briefy contributors — AGPL-3.0
namespace App\Observers;

use App\Models\ActivityLog;
use App\Models\Demand;
```

**Detecção de mudança** — padrão Eloquent `wasChanged()` e `getOriginal()`:
```php
public function updated(Demand $demand): void
{
    if ($demand->wasChanged('status')) {
        ActivityLog::create([
            'metadata' => [
                'from' => $demand->getOriginal('status'),
                'to'   => $demand->status,
            ],
        ]);
    }
    if ($demand->wasChanged('archived_at') && $demand->archived_at !== null) {
        // demand.archived event (não confundir com soft-delete)
    }
}
```
ATENÇÃO: `demand.archived` = `wasChanged('archived_at')` no `updated()`, NÃO no `deleted()`. O `deleted()` corresponde ao soft-delete (lixeira). Ver Pitfall 3 no RESEARCH.md.

**Fallback de user_id** — padrão para evitar null em contexto CLI (Pitfall 1 do RESEARCH.md):
```php
'user_id' => auth()->id() ?? $demand->created_by,
```

---

### `app/Observers/ClientObserver.php` (observer, event-driven)

**Analog:** Mesmo padrão do `DemandObserver` — só implementar `created()`.

```php
<?php
// (c) 2026 Briefy contributors — AGPL-3.0
namespace App\Observers;

use App\Models\ActivityLog;
use App\Models\Client;

class ClientObserver
{
    public function created(Client $client): void
    {
        ActivityLog::create([
            'organization_id' => $client->organization_id,
            'user_id'         => auth()->id(),
            'action_type'     => 'client.created',
            'subject_type'    => 'client',
            'subject_id'      => $client->id,
            'subject_name'    => $client->name,
            'metadata'        => [],
        ]);
    }
}
```

---

### `app/Providers/AppServiceProvider.php` (provider, configuração)

**Analog:** `app/Providers/AppServiceProvider.php` (arquivo existente a expandir — linhas 1–28)

**Padrão de boot()** — copiar a estrutura existente e adicionar registros de observer:
```php
// Existente (linha 26):
Vite::prefetch(concurrency: 3);

// Adicionar após:
\App\Models\Demand::observe(\App\Observers\DemandObserver::class);
\App\Models\Client::observe(\App\Observers\ClientObserver::class);
```

**Imports** — adicionar no topo junto com `use Illuminate\Support\Facades\Vite;`:
```php
use App\Models\Demand;
use App\Models\Client;
use App\Observers\DemandObserver;
use App\Observers\ClientObserver;
```

---

### `database/migrations/XXXX_create_activity_logs_table.php` (migration)

**Analog:** `database/migrations/2026_04_22_015617_create_demands_table.php` (migration de criação com foreignId, enum, json)

**Estrutura base** — copiar de `create_demands_table.php` linhas 1–12 (cabeçalho + Schema::create):
```php
<?php
// (c) 2026 Briefy contributors — AGPL-3.0

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('activity_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->enum('action_type', [
                'demand.status_changed', 'demand.created', 'demand.comment_added',
                'demand.assigned', 'demand.archived', 'demand.restored',
                'client.created', 'member.invited',
            ]);
            $table->string('subject_type', 50);
            $table->unsignedBigInteger('subject_id');
            $table->string('subject_name');
            $table->json('metadata')->nullable();
            $table->timestamp('created_at')->useCurrent();
            // Sem updated_at — log é imutável
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('activity_logs');
    }
};
```
NOTA: `user_id` é `nullable()` + `nullOnDelete()` — evita Integrity Constraint Violation quando Observer é chamado em contexto CLI sem auth (Pitfall 1 do RESEARCH.md).

---

### `database/migrations/XXXX_add_priority_to_demands_table.php` (migration — BLOCKER)

**Analog:** `database/migrations/2026_04_23_140500_add_archived_at_to_demands_table.php` (migration de alteração de tabela existente — padrão exato)

**Estrutura** — copiar diretamente de `add_archived_at_to_demands_table.php` linhas 1–22:
```php
<?php
// (c) 2026 Briefy contributors — AGPL-3.0
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('demands', function (Blueprint $table) {
            $table->enum('priority', ['high', 'medium', 'low'])->default('medium')->after('status');
        });
    }

    public function down(): void
    {
        Schema::table('demands', function (Blueprint $table) {
            $table->dropColumn('priority');
        });
    }
};
```
Após esta migração, atualizar também:
- `app/Models/Demand.php` — adicionar `'priority'` em `$fillable`
- `app/Http/Requests/StoreDemandRequest.php` — adicionar rule `'priority' => 'nullable|in:high,medium,low'`
- `app/Http/Requests/UpdateDemandRequest.php` — mesma rule

---

### `resources/js/pages/Dashboard.tsx` (page component, request-response)

**Analog:** `resources/js/pages/Demands/Index.tsx` (page com view toggle via useState, Inertia props, AppLayout)

**Imports pattern** — copiar de `resources/js/pages/Demands/Index.tsx` linhas 1–12:
```tsx
// (c) 2026 Briefy contributors — AGPL-3.0
import { useState, useEffect } from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import AppLayout from '@/Layouts/AppLayout';
```
Adicionar imports de Recharts e componentes novos:
```tsx
import { DashboardStatusCard } from '@/Components/DashboardStatusCard';
import { DashboardSectionCard } from '@/Components/DashboardSectionCard';
import { ActivityFeed } from '@/Components/ActivityFeed';
import { OnboardingChecklist } from '@/Components/OnboardingChecklist';
import { DashboardPlanningWidget } from '@/Components/DashboardPlanningWidget';
import { StatusBadge } from '@/Components/StatusBadge';
import { UserAvatar } from '@/Components/UserAvatar';
```

**Props interface** — copiar padrão de `Demands/Index.tsx` linhas 14–40 e adaptar:
```tsx
interface Props {
  planningReminderClients?: Array<{ id: number; name: string; planning_day: number }>;
  personal: {
    statusCounts: Record<string, number>;
    deltaVsYesterday: Record<string, number>;
    focusDemands: FocusDemand[];
    myDemands: Demand[];
    blockers: Blocker[];
    weekProgress: { completed: number; total: number };
    completedByDay: Array<{ day: string; count: number }>;
  };
  overview: OverviewData | null;  // null para colaboradores
  activityFeed: ActivityEvent[];
  hasClients: boolean;
  hasDemands: boolean;
}
```

**View toggle pattern** — copiar de `resources/js/pages/Demands/Index.tsx` linha 47:
```tsx
const [view, setView] = useState<'kanban' | 'list'>('kanban');
```
Adaptar para:
```tsx
const [view, setView] = useState<'personal' | 'overview'>('personal');
```

**Auth props pattern** — copiar de `resources/js/hooks/useTheme.ts` linhas 12–13:
```tsx
const { auth } = usePage<PageProps>().props;
const isAdmin = auth?.user?.role === 'admin' || auth?.user?.role === 'owner';
```

**Inertia partial reload pattern** — copiar de `resources/js/pages/Demands/Index.tsx` linhas 58–63:
```tsx
router.get(route('demands.index'), { ...filters, demand: id }, {
  preserveScroll: true,
  preserveState: true,
  only: ['selectedDemand'],
});
```
Adaptar para date range:
```tsx
router.get(route('dashboard'), { start, end }, {
  preserveScroll: true,
  preserveState: true,
  only: ['overview'],
});
```

**AppLayout usage** — copiar de `resources/js/pages/Dashboard.tsx` linha 13 (existente):
```tsx
<AppLayout title={t('nav.dashboard')}>
```

---

### `resources/js/Components/DashboardStatusCard.tsx` (component)

**Analog:** `resources/js/Components/DashboardPlanningWidget.tsx` (card com mesmos tokens de design: border, bg, rounded-xl/12)

**Tokens de design** — copiar de `DashboardPlanningWidget.tsx` linha 70:
```tsx
<div className="rounded-xl border border-[#a78bfa]/30 bg-[#7c3aed]/5 dark:bg-[#7c3aed]/10 p-4 space-y-3">
```
Para o StatusCard (card neutro, não roxo):
```tsx
<div className="rounded-[12px] border border-[#e5e7eb] dark:border-[#1f2937] bg-white dark:bg-[#111827] p-4 flex flex-col gap-2">
```

**Lucide icon pattern** — copiar de `DashboardPlanningWidget.tsx` linha 73:
```tsx
<Sparkles size={20} className="text-[#7c3aed] dark:text-[#a78bfa]" />
```
Adaptar para aceitar icon como prop:
```tsx
const Icon = icon; // prop: LucideIcon
<Icon size={20} style={{ color: iconColor }} />
```

**Imports de ícones** — copiar de `DashboardPlanningWidget.tsx` linha 5:
```tsx
import { X, Calendar, Sparkles } from 'lucide-react';
```
Para StatusCard: `import { ArrowUp, ArrowDown, Minus } from 'lucide-react';`

---

### `resources/js/Components/DashboardSectionCard.tsx` (component)

**Analog:** `resources/js/Components/DashboardPlanningWidget.tsx` — card wrapper genérico

**Estrutura base** — copiar e simplificar de `DashboardPlanningWidget.tsx` linhas 69–123:
```tsx
// (c) 2026 Briefy contributors — AGPL-3.0
import { ReactNode } from 'react';

interface Props {
  title: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function DashboardSectionCard({ title, children, action, className = '' }: Props) {
  return (
    <div className={`rounded-[12px] border border-[#e5e7eb] dark:border-[#1f2937] bg-white dark:bg-[#111827] p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-[#111827] dark:text-[#f9fafb]">{title}</h3>
        {action && <div>{action}</div>}
      </div>
      {children}
    </div>
  );
}
```

---

### `resources/js/Components/ActivityFeed.tsx` (component, event-driven)

**Analog:** `resources/js/Components/DashboardPlanningWidget.tsx` (lista com item rows, border-b, link pattern)

**Row pattern** — copiar de `DashboardPlanningWidget.tsx` linhas 80–114 (estrutura de `displayed.map(...)`):
```tsx
{displayed.map(client => (
  <div
    key={client.id}
    className="flex items-start justify-between gap-3 rounded-lg border border-[#a78bfa]/20 bg-white dark:bg-[#1e1b2e] px-4 py-3 shadow-sm"
  >
    <div className="flex items-start gap-3 min-w-0">
      ...
    </div>
  </div>
))}
```
Adaptar para feed (sem borda no container individual, usar `border-b last:border-0`):
```tsx
{events.map(event => (
  <div key={event.id} className="flex items-start gap-3 py-3 border-b border-[#e5e7eb] dark:border-[#1f2937] last:border-0">
    ...
  </div>
))}
```

**Empty state pattern** — copiar de `DashboardPlanningWidget.tsx` linha 64:
```tsx
if (visible.length === 0) return null;
```
Para ActivityFeed (mostra estado vazio em vez de null):
```tsx
{events.length === 0 && (
  <p className="text-sm text-[#9ca3af] text-center py-8">Nenhuma atividade recente.</p>
)}
```

**Icon circle pattern** (Claude's discretion — conforme UI-SPEC):
```tsx
const iconCircleClass = `w-8 h-8 rounded-full flex items-center justify-center`;
// bg é dinâmico baseado em ACTION_COLORS[event.action_type]
```

---

### `resources/js/Components/OnboardingChecklist.tsx` (component, request-response)

**Analog:** `resources/js/Components/DashboardPlanningWidget.tsx` — padrão EXATO (D-26: "mesmo padrão do DashboardPlanningWidget")

**Dismiss pattern** — copiar de `resources/js/hooks/useTheme.ts` linhas 21–29:
```tsx
const toggle = useCallback(() => {
  const next: Theme = theme === 'light' ? 'dark' : 'light';
  setTheme(next);
  localStorage.setItem('theme', next);
  router.patch(
    route('settings.preferences'),
    { theme: next },
    { preserveState: true, preserveScroll: true }
  );
}, [theme]);
```
Adaptar para onboarding dismiss:
```tsx
const [dismissed, setDismissed] = useState(false);

const handleDismiss = () => {
  setDismissed(true); // otimistic
  router.patch(
    route('settings.preferences'),
    { onboarding_dismissed: true },
    { preserveState: true, preserveScroll: true }
  );
};

if (dismissed) return null;
```

**Container visual** — copiar de `DashboardPlanningWidget.tsx` linha 70 (padrão exato):
```tsx
<div className="rounded-xl border border-[#a78bfa]/30 bg-[#7c3aed]/5 dark:bg-[#7c3aed]/10 p-4 space-y-3">
```

**Header com X** — copiar de `DashboardPlanningWidget.tsx` linhas 71–76 e linhas 103–113:
```tsx
<div className="flex items-center gap-2 mb-1">
  <Sparkles size={20} className="text-[#7c3aed] dark:text-[#a78bfa]" />
  <span className="text-sm font-semibold text-[#7c3aed] dark:text-[#a78bfa]">...</span>
</div>
...
<button
  onClick={() => dismiss(client)}
  className="p-1 rounded text-[#9ca3af] hover:text-[#374151] dark:hover:text-[#d1d5db] transition-colors"
  aria-label={t('common.dismiss')}
  type="button"
>
  <X size={14} />
</button>
```
Substituir `Sparkles` por `CheckCircle` (conforme UI-SPEC).

**Item card style** — copiar de `DashboardPlanningWidget.tsx` linha 83:
```tsx
className="flex items-start justify-between gap-3 rounded-lg border border-[#a78bfa]/20 bg-white dark:bg-[#1e1b2e] px-4 py-3 shadow-sm"
```

**Link pattern** — copiar de `DashboardPlanningWidget.tsx` linha 98:
```tsx
<Link
  href={`/planejamento?client_id=${client.id}`}
  className="text-xs font-medium text-[#7c3aed] hover:underline whitespace-nowrap"
>
```

---

### `routes/web.php` — preferences closure (modificação)

**Analog:** `routes/web.php` linhas 138–146 (arquivo existente a modificar — BLOCKER-02)

**Código atual** (linha 142):
```php
$r->only(['locale', 'theme'])
```

**Fix** — substituir por:
```php
$r->only(['locale', 'theme', 'onboarding_dismissed'])
```
Contexto completo (linhas 138–146):
```php
Route::patch('/preferences', function (Request $r) {
    $r->user()->update([
        'preferences' => array_merge(
            $r->user()->preferences ?? [],
            $r->only(['locale', 'theme', 'onboarding_dismissed'])  // ← adicionar
        ),
    ]);
    return back()->with('success', 'Preferências salvas.');
})->name('preferences');
```

---

## Shared Patterns

### Auth e Org Scoping
**Source:** `app/Http/Controllers/DashboardController.php` linha 15 + `app/Http/Controllers/DemandController.php` linha 23
**Aplicar em:** DashboardController (expansão)
```php
$user  = auth()->user();
$orgId = $user->current_organization_id;
```

### Role Check
**Source:** `app/Models/User.php` linhas 83–89 + `app/Http/Controllers/DemandController.php` linha 63
**Aplicar em:** DashboardController (gating de overview props), SettingsController (referência de padrão)
```php
if ($user->isAdminOrOwner()) {
    // overview props
}
```

### isAdminOrOwner no Frontend
**Source:** `app/Http/Middleware/HandleInertiaRequests.php` linha 48 — `auth.user.role` está disponível como shared prop
**Aplicar em:** Dashboard.tsx (controle de toggle e dados de overview)
```tsx
const { auth } = usePage<PageProps>().props;
const isAdmin = ['admin', 'owner'].includes(auth?.user?.role ?? '');
```

### Inertia Partial Reload
**Source:** `resources/js/pages/Demands/Index.tsx` linhas 60–64
**Aplicar em:** Dashboard.tsx (date range change), OnboardingChecklist.tsx (dismiss)
```tsx
router.get(route('dashboard'), params, {
  preserveScroll: true,
  preserveState: true,
  only: ['overview'],
});
```

### Design Token de Card
**Source:** `resources/js/Components/DashboardPlanningWidget.tsx` linhas 70 e 83
**Aplicar em:** DashboardStatusCard, DashboardSectionCard, ActivityFeed, OnboardingChecklist
```
rounded-[12px] border border-[#e5e7eb] dark:border-[#1f2937] bg-white dark:bg-[#111827]  ← card neutro
rounded-xl border border-[#a78bfa]/30 bg-[#7c3aed]/5 dark:bg-[#7c3aed]/10              ← card roxo (onboarding/widget)
```

### Soft-Delete + Archived Guards
**Source:** `app/Http/Controllers/ArchiveController.php` linha 19 + `app/Http/Controllers/DemandController.php` linha 25
**Aplicar em:** DashboardController — todas as queries de demandas ativas
```php
->whereNull('archived_at')
// whereNull('deleted_at') é automático via SoftDeletes no model
```

### Router.patch para Preferences
**Source:** `resources/js/hooks/useTheme.ts` linhas 25–29
**Aplicar em:** OnboardingChecklist.tsx
```tsx
router.patch(route('settings.preferences'), { key: value }, { preserveState: true, preserveScroll: true });
```

### Cabeçalho de Arquivo
**Source:** Todos os arquivos do projeto
**Aplicar em:** Todos os novos arquivos PHP e TypeScript
```php
// (c) 2026 Briefy contributors — AGPL-3.0
```

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `app/Observers/DemandObserver.php` | observer | event-driven | Nenhum Observer existe no codebase. Usar RESEARCH.md Pattern 3 como template de implementação. |

---

## Metadata

**Analog search scope:** `app/Http/Controllers/`, `app/Models/`, `app/Providers/`, `database/migrations/`, `resources/js/pages/`, `resources/js/Components/`, `resources/js/hooks/`, `routes/`
**Files scanned:** 22
**Pattern extraction date:** 2026-04-23

---

## Notas Críticas para o Planner

1. **Wave 0 obrigatório antes de qualquer feature:** `add_priority_to_demands_table` (BLOCKER-01) + atualização do `preferences` route (BLOCKER-02) + `npm install recharts` + `create_activity_logs_table`.

2. **`DashboardPlanningWidget.tsx` é o template visual mestre** para OnboardingChecklist. Copiar estrutura visual, tokens e padrão de dismiss. Não reinventar.

3. **`DashboardController.php` existente é um stub** (retorna props vazios). O Wave 0 ou Wave 1 deve substituir completamente o corpo do `index()` mantendo o `planningReminderClients` existente.

4. **Observer `demand.archived` ≠ soft-delete:** O `deleted()` do Observer captura o soft-delete (lixeira). O `demand.archived` (arquivamento manual) deve ser detectado em `updated()` via `wasChanged('archived_at')`. Ver Pitfall 3 no RESEARCH.md.

5. **`user_id` nullable em activity_logs:** Previne falha em contextos sem auth (jobs, seeders). Observer usa `auth()->id() ?? $demand->created_by` como fallback.
