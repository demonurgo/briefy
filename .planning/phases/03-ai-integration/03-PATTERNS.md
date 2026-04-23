# Phase 3: AI Integration — Pattern Map

**Mapped:** 2026-04-22
**Files analyzed:** 42 new/modified files
**Analogs found:** 38 / 42
**Truly new patterns (no analog):** 4 (SSE streaming, typewriter, Managed Agents raw HTTP, AGPL packaging)

> Consumed by `gsd-planner`. Every file below has a concrete analog in the existing Briefy codebase (Phases 1 & 2) OR an explicit "no analog" note pointing to RESEARCH/AI-SPEC fallback patterns.

---

## File Classification

### Backend (PHP / Laravel 13)

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `app/Services/Ai/AnthropicClientFactory.php` | service (factory) | request-response | `app/Providers/AppServiceProvider.php` + `config/services.php` | **no-analog** (first service class in `app/Services/`) |
| `app/Services/Ai/BriefPromptBuilder.php` | service (composer) | transform | none — builder pattern is net-new | **no-analog** |
| `app/Services/Ai/ChatPromptBuilder.php` | service (composer) | transform | none — builder pattern is net-new | **no-analog** |
| `app/Services/Ai/BriefStreamer.php` | service (streamer) | **streaming (SSE)** | none (PHP-side SSE is net-new) — fallback: AI-SPEC §3 `response()->eventStream()` | **no-analog** |
| `app/Services/Ai/ChatStreamer.php` | service (streamer) | **streaming (SSE)** | mirror of BriefStreamer | **no-analog** |
| `app/Services/Ai/MonthlyPlanGenerator.php` | service | request-response (blocking LLM) | `ClientController::store` (validate + persist flow) | role-adjacent |
| `app/Services/Ai/ItemRedesigner.php` | service | request-response | `DemandController::updateInline` (single-entity update) | role-adjacent |
| `app/Services/Ai/ClientMemoryExtractor.php` | service (tool-use) | background / transform | none — tool-use is net-new; fallback AI-SPEC §4 Tool Use | **no-analog** |
| `app/Services/Ai/ConversationCompactor.php` | service (summarizer) | background | none — fallback AI-SPEC §4 Context Window Management | **no-analog** |
| `app/Services/Ai/ClientResearchAgent.php` | service (HTTP wrapper) | **event-driven / long-running** | none — raw HTTP to Managed Agents; fallback RESEARCH §Managed Agents Integration | **no-analog** |
| `app/Services/Ai/ClientResearchPromptBuilder.php` | service (composer) | transform | mirror of ChatPromptBuilder | role-match |
| `app/Services/Ai/Schemas/MonthlyPlanSchema.php` | service (schema def) | transform | `app/Http/Requests/StoreDemandRequest.php` (Laravel validator rules) | role-adjacent |
| `app/Services/Ai/Schemas/MemoryInsightSchema.php` | service (schema def) | transform | mirror of MonthlyPlanSchema | role-match |
| `app/Http/Controllers/AiBriefController.php` | controller | **streaming (SSE)** | `app/Http/Controllers/DemandController.php` (auth + CRUD idioms) — SSE layer is new | role-match |
| `app/Http/Controllers/AiChatController.php` | controller | **streaming (SSE)** | mirror of AiBriefController | role-match |
| `app/Http/Controllers/MonthlyPlanningController.php` | controller | CRUD + job-dispatch | `app/Http/Controllers/DemandController.php` (resource methods + flash messages) | exact |
| `app/Http/Controllers/PlanningController.php` **(modified)** | controller | read-only (Inertia page) | current stub — expand to match DemandController::index | exact |
| `app/Http/Controllers/ClientResearchController.php` | controller | streaming (SSE proxy) | `AiBriefController` (once written) — until then, RESEARCH §SSE proxy | role-match |
| `app/Http/Controllers/Settings/AiController.php` | controller | CRUD + external HTTP | `app/Http/Controllers/DemandController.php::updateInline` (simple update) + RESEARCH §BYOK Test key | role-adjacent |
| `app/Http/Controllers/ClientController.php` **(modified)** | controller | CRUD | existing file — extend index() to include `monthly_posts`, `hasActiveResearchSession` | exact |
| `app/Http/Controllers/DashboardController.php` **(modified)** | controller | read-only | existing stub — expand to include `planningReminders` | exact |
| `app/Http/Middleware/AiUsageMeter.php` | middleware | request-response (instrumentation) | `app/Http/Middleware/SetLocale.php` | role-match |
| `app/Http/Requests/StoreClientRequest.php` **(modified)** | form request | validation | existing file — add `monthly_posts`, `monthly_plan_notes`, `planning_day`, `social_handles`, `anthropic_api_key` | exact |
| `app/Http/Requests/UpdateClientRequest.php` **(modified)** | form request | validation | mirror of Store | exact |
| `app/Http/Requests/ChatMessageRequest.php` | form request | validation | `app/Http/Requests/StoreDemandRequest.php` | role-match |
| `app/Http/Requests/RedesignItemRequest.php` | form request | validation | `app/Http/Requests/StoreDemandRequest.php` | role-match |
| `app/Http/Requests/TestAnthropicKeyRequest.php` | form request | validation | `app/Http/Requests/StoreClientRequest.php` | role-match |
| `app/Http/Middleware/HandleInertiaRequests.php` **(modified)** | middleware (Inertia share) | request-response | existing file — add `has_anthropic_key`, `anthropic_api_key_mask` to shared `auth.organization` prop | exact |
| `app/Models/Organization.php` **(modified)** | model | n/a (Eloquent) | existing file — add `$casts['anthropic_api_key_encrypted' => 'encrypted']` + `$hidden` + `hasAnthropicKey()` | exact |
| `app/Models/Client.php` **(modified)** | model | n/a (Eloquent) | existing file — add `monthly_posts`, `monthly_plan_notes`, `planning_day`, `social_handles` fillable + casts | exact |
| `app/Models/Demand.php` **(no modification required)** | model | n/a | existing file — `ai_analysis` JSON cast already exists | n/a |
| `app/Models/AiConversation.php` **(modified)** | model | n/a | existing file — add `compacted_at` cast | exact |
| `app/Models/ClientResearchSession.php` | model | n/a | `app/Models/AiConversation.php` (scoped to client_id, status enum) | exact |
| `app/Jobs/ExtractClientMemoryJob.php` | job (queued) | background | none — `app/Jobs/` directory does not exist yet; fallback AI-SPEC §4 Async-First Design | **no-analog** |
| `app/Jobs/CompactConversationJob.php` | job (queued) | background | mirror of ExtractClientMemoryJob | **no-analog** |
| `app/Jobs/GenerateMonthlyPlanJob.php` | job (queued, long-running) | background | mirror of ExtractClientMemoryJob | **no-analog** |
| `app/Jobs/PollClientResearchSessionJob.php` | job (queued) | background | mirror of ExtractClientMemoryJob | **no-analog** |
| Migration `xxxx_add_anthropic_api_key_to_organizations.php` | migration (ALTER) | n/a | existing migrations use `Schema::create`; fallback: Laravel `Schema::table(...)` pattern, standard | role-match |
| Migration `xxxx_add_monthly_plan_to_clients_table.php` | migration (ALTER) | n/a | mirror above | role-match |
| Migration `xxxx_create_client_research_sessions_table.php` | migration (CREATE) | n/a | `database/migrations/2026_04_22_015652_create_ai_conversations_table.php` | exact |
| Migration `xxxx_add_compacted_at_to_ai_conversations.php` | migration (ALTER) | n/a | mirror of first migration | role-match |
| `config/services.php` **(modified)** | config | n/a | existing file — append `anthropic` array | exact |
| `app/Providers/AppServiceProvider.php` **(modified)** | provider | n/a | existing file — `register()` binds `Anthropic\Client` singleton | exact |
| `routes/web.php` **(modified)** | route file | n/a | existing file — append SSE routes + MA routes + settings.ai routes | exact |

### Frontend (React 19 + TypeScript + Inertia v3)

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `resources/js/pages/Planejamento/Index.tsx` | page (Inertia) | read-only (with filter) | `resources/js/pages/Demands/Index.tsx` | **exact** |
| `resources/js/pages/Settings/Ai.tsx` | page (Inertia) | CRUD (1 field) | `resources/js/pages/Clients/Edit.tsx` + `resources/js/hooks/useTheme.ts` (settings PATCH pattern) | role-match |
| `resources/js/pages/Planning/Index.tsx` **(DELETE or RENAME)** | page stub | n/a | existing placeholder — replace with Planejamento/Index or redirect | n/a |
| `resources/js/Components/BriefTab.tsx` | component | **streaming (SSE consumer)** | `resources/js/Components/DemandDetailModal.tsx` (left-column detail pattern) + RESEARCH Pattern A | role-adjacent |
| `resources/js/Components/ChatTab.tsx` | component | **streaming (SSE consumer)** | mirror of BriefTab | role-match |
| `resources/js/Components/AiMarkdown.tsx` | component | transform | none — react-markdown v10 setup (fallback RESEARCH §Markdown Rendering) | **no-analog** |
| `resources/js/Components/AiIcon.tsx` | component | n/a | existing `<img dark:hidden>/<img hidden dark:block>` pair pattern in `Sidebar.tsx` lines 69-79 | exact |
| `resources/js/Components/PlanningCard.tsx` | component | CRUD (card) | `resources/js/Components/KanbanBoard.tsx::DemandCard` lines 40-72 | exact |
| `resources/js/Components/DashboardPlanningWidget.tsx` | component | read-only (widget) | `resources/js/pages/Clients/Index.tsx` card layout lines 82-138 | role-adjacent |
| `resources/js/Components/DemandDetailModal.tsx` **(modified)** | component | tab refactor | existing file — wrap right panel in `<TabGroup>` from @headlessui/react (already installed) | exact |
| `resources/js/Components/ClientForm.tsx` **(modified)** | component | form | existing file — append "Plano de Conteúdo Mensal" section + "Conhecer com IA" button after avatar | exact |
| `resources/js/Components/Sidebar.tsx` **(modified)** | component | n/a | existing file — update `/planning` → `/planejamento` in `navItems` line 14 | exact |
| `resources/js/pages/Clients/Index.tsx` **(modified)** | page | read-only | existing file — add `monthly_posts` badge + research-session badge inside card block lines 82-138 | exact |
| `resources/js/pages/Dashboard.tsx` **(modified)** | page | read-only | existing stub — add `<DashboardPlanningWidget>` render | exact |
| `resources/js/pages/Clients/Create.tsx` **(modified)** | page | form | existing file — extend `useForm` initial state with 4 new fields | exact |
| `resources/js/pages/Clients/Edit.tsx` **(modified)** | page | form | existing file — extend initial state, read from `client` prop | exact |
| `resources/js/hooks/useAiStream.ts` | hook | **streaming (fetch+reader)** | `resources/js/hooks/useTheme.ts` (hook shape) + RESEARCH Pattern A | role-adjacent |
| `resources/js/hooks/useTypewriter.ts` | hook | transform (animation) | none — rAF queue net-new (fallback RESEARCH §Typewriter Rendering) | **no-analog** |
| `resources/js/locales/pt-BR.json` **(modified)** | i18n | n/a | existing file — append `ai.*`, `planning.*`, `clients.monthlyPlan.*`, `clients.badges.*` per UI-SPEC §i18n Contract | exact |
| `resources/js/locales/en.json` **(modified)** | i18n | n/a | mirror above | exact |
| `resources/js/locales/es.json` **(modified)** | i18n | n/a | mirror above | exact |

### Infra / Docs / Tests

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `LICENSE` (AGPL-3.0) | docs | n/a | none — net-new at repo root | **no-analog** |
| `README.md` **(modified)** | docs | n/a | existing file — add BYOK setup + AGPL notice | role-match |
| `composer.json` **(modified)** | config | n/a | existing file — append `"anthropic-ai/sdk": "^0.16.0"` (keep `echolabsdev/prism` dormant per AI-SPEC §2) | exact |
| `package.json` **(modified)** | config | n/a | existing file — append `react-markdown@^10.1.0`, `rehype-sanitize@^6.0.0`, `remark-gfm@^4.0.1` to dependencies | exact |
| `resources/prompts/brief_system.md` | asset (prompt) | n/a | none — new versioned prompt library | **no-analog** |
| `resources/prompts/plan_system.md` | asset (prompt) | n/a | mirror above | **no-analog** |
| `resources/prompts/chat_system.md` | asset (prompt) | n/a | mirror above | **no-analog** |
| `resources/prompts/client_research_system.md` | asset (prompt) | n/a | mirror above | **no-analog** |
| `tests/Feature/AiBriefControllerTest.php` | test | n/a | `tests/Feature/RoutesTest.php` (TestCase + actingAs + asserts) | role-adjacent (SSE assertions are new) |
| `tests/Feature/MonthlyPlanningControllerTest.php` | test | n/a | mirror above | role-match |
| `tests/Feature/Settings/AiControllerTest.php` | test | n/a | `tests/Feature/RoutesTest.php` + `tests/Feature/Settings/PreferencesTest.php` | exact |
| `.github/workflows/ai-evals.yml` (optional) | CI | n/a | none — no existing workflows; defer to AI-SPEC §5 eval strategy | **no-analog** |

---

## Pattern Assignments

### BACKEND PATTERNS

---

### `app/Http/Controllers/DemandController.php` — THE canonical controller analog

**Source file:** `app/Http/Controllers/DemandController.php` (235 lines)

**Imports pattern** (lines 1-14):
```php
<?php
namespace App\Http\Controllers;

use App\Http\Requests\StoreDemandRequest;
use App\Http\Requests\UpdateDemandRequest;
use App\Models\Client;
use App\Models\Demand;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
```
**What to copy:** PSR-4 namespace, import FormRequest classes, `Illuminate\Http\RedirectResponse` return type for mutations, `Inertia\Response` for page renders, **no `use` block opened with brace — inline class declaration**.

**Auth pattern — org scoping** (lines 19-20, 231-234):
```php
$orgId = auth()->user()->organization_id;
$demands = Demand::where('organization_id', $orgId)
    // ...

private function authorizeDemand(Demand $demand): void
{
    abort_if($demand->organization_id !== auth()->user()->organization_id, 403);
}
```
**What to copy:** org-scoped queries with `where('organization_id', ...)` at the top of every `index`; private `authorize*` helpers called as the first line of every mutation method. **No Laravel Policies in use** — controllers own authorization.

**Index pattern — filters + Inertia render** (lines 18-51):
```php
public function index(Request $request): Response
{
    $orgId = auth()->user()->organization_id;

    $demands = Demand::where('organization_id', $orgId)
        ->with(['client', 'assignee'])
        ->when($request->client_id, fn($q, $id) => $q->where('client_id', $id))
        ->when($request->status, fn($q, $s) => $q->where('status', $s))
        ->when($request->search, fn($q, $s) => $q->where('title', 'ilike', "%{$s}%"))
        ->orderByDesc('created_at')
        ->get();

    $clients = Client::where('organization_id', $orgId)->orderBy('name')->get(['id', 'name']);

    return Inertia::render('Demands/Index', [
        'demands'        => $demands,
        'clients'        => $clients,
        'filters'        => $request->only('client_id', 'status', 'search'),
        'selectedDemand' => $selectedDemand,
        'teamMembers'    => $teamMembers,
        'isAdmin'        => auth()->user()->isAdmin(),
    ]);
}
```
**Idioms to mirror:** `->when($flag, fn($q, $val) => ...)` for optional filters, `ilike` for case-insensitive Postgres search, `$request->only(...)` to pass filters back to frontend, `Inertia::render('Path/File', [...])` for page response.

**Mutation + flash pattern** (lines 66-79, 117-134):
```php
public function store(StoreDemandRequest $request, Client $client): RedirectResponse
{
    abort_if($client->organization_id !== auth()->user()->organization_id, 403);

    $demand = Demand::create([
        ...$request->validated(),
        'organization_id' => auth()->user()->organization_id,
        'client_id'       => $client->id,
        'created_by'      => auth()->id(),
    ]);

    return redirect()->route('demands.show', $demand)
        ->with('success', __('app.demand_created'));
}
```
**What to copy:** FormRequest for validation, spread `$request->validated()` into `create`, inject `organization_id` + `created_by` from `auth()`, redirect with `->with('success', __('app.xxx'))` — consumed by `FlashMessage.tsx` component.

**Inline update pattern (for inline modal edits)** (lines 214-220):
```php
public function updateInline(UpdateDemandRequest $request, Demand $demand): RedirectResponse
{
    $this->authorizeDemand($demand);
    $demand->update($request->validated());

    return back()->with('success', __('app.demand_updated'));
}
```
**What to copy:** `return back()` (not `redirect()->route()`) for inline actions so Inertia partial-reloads `only: ['selectedDemand']` finish cleanly without navigation. This is the pattern for `AiBriefController::saveEdit` (D-05).

**Apply to:** `AiBriefController`, `AiChatController`, `MonthlyPlanningController`, `ClientResearchController`, `Settings\AiController`. **SSE controllers deviate only in their streaming method** — base class scaffolding (namespace, auth helper, FormRequest injection, `__()` translation keys) stays identical.

---

### `app/Http/Controllers/ClientController.php` — simpler controller analog (fewer related entities)

**Source file:** `app/Http/Controllers/ClientController.php` (100 lines)

**Use this analog for:** `Settings\AiController.php` (single entity CRUD on org-level resource).

**Authorize helper** (lines 96-99):
```php
private function authorizeClient(Client $client): void
{
    abort_if($client->organization_id !== auth()->user()->organization_id, 403);
}
```

**Apply to:** `Settings\AiController::update` and `::testKey` — same `abort_if` on org ownership (scoped to `auth()->user()->organization`).

---

### `app/Http/Controllers/AiBriefController.php` (new, streaming)

**Primary analog for non-streaming structure:** `app/Http/Controllers/DemandController.php`
**Primary analog for streaming body:** AI-SPEC §3 (entry point pattern (a), lines 245-305) — **NO existing codebase SSE pattern yet**

**Imports to inherit (from DemandController):**
```php
use App\Http\Requests\UpdateDemandRequest;   // for ::saveEdit endpoint
use App\Models\Demand;
use Anthropic\Client;                        // NEW — from anthropic-ai/sdk
use App\Services\Ai\AnthropicClientFactory;  // NEW
use App\Services\Ai\BriefPromptBuilder;      // NEW
use Illuminate\Http\StreamedEvent;           // NEW — Laravel 13 SSE
use Symfony\Component\HttpFoundation\StreamedResponse; // NEW
```

**Streaming method pattern (copy from AI-SPEC §3 lines 263-305):**
```php
public function generate(Demand $demand, AnthropicClientFactory $factory): StreamedResponse
{
    // auth: mirror DemandController::authorizeDemand
    abort_if($demand->organization_id !== auth()->user()->organization_id, 403);

    $client = $factory->forOrganization(auth()->user()->organization);

    [$system, $userMessage] = $this->prompts->build($demand);

    return response()->eventStream(function () use ($client, $system, $userMessage, $demand) {
        $buffer = '';
        $stream = $client->messages->createStream(
            maxTokens: 2048,
            messages: [['role' => 'user', 'content' => $userMessage]],
            model: config('services.anthropic.model_chat'),
            system: $system,
            temperature: 0.7,
        );

        foreach ($stream as $event) {
            if ($event->type === 'content_block_delta' && $event->delta->type === 'text_delta') {
                $buffer .= $event->delta->text;
                yield new StreamedEvent(event: 'delta', data: json_encode(['text' => $event->delta->text]));
            }
            if ($event->type === 'message_stop') {
                $demand->update([
                    'ai_analysis' => array_merge((array) $demand->ai_analysis, [
                        'brief' => $buffer,
                        'brief_generated_at' => now()->toIso8601String(),
                    ]),
                ]);
                yield new StreamedEvent(event: 'done', data: json_encode(['ok' => true]));
            }
        }
    });
}
```

**Edit-save method (non-streaming, mirrors `DemandController::updateInline`):**
```php
public function saveEdit(Request $request, Demand $demand): RedirectResponse
{
    abort_if($demand->organization_id !== auth()->user()->organization_id, 403);
    $request->validate(['brief' => 'required|string|max:20000']);

    $demand->update([
        'ai_analysis' => array_merge((array) $demand->ai_analysis, ['brief' => $request->brief]),
    ]);

    return back()->with('success', __('app.brief_updated'));
}
```

---

### `app/Http/Requests/StoreDemandRequest.php` — FormRequest analog

**Source file:** `app/Http/Requests/StoreDemandRequest.php` (24 lines)

**Full pattern** (lines 1-24):
```php
<?php
namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreDemandRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'title'       => 'required|string|max:255',
            'description' => 'nullable|string|max:5000',
            'objective'   => 'nullable|string|max:500',
            'tone'        => 'nullable|string|max:100',
            'channel'     => 'nullable|string|max:100',
            'deadline'    => 'nullable|date|after_or_equal:today',
            'status'      => 'sometimes|in:todo,in_progress,awaiting_feedback,in_review,approved',
            'type'        => 'sometimes|in:demand,planning',
            'assigned_to' => 'nullable|exists:users,id',
        ];
    }
}
```

**What to copy:**
- `authorize(): bool { return true; }` on one line (org auth handled in controller `abort_if`).
- `rules()` as single method, inline pipe-string rules, `|in:...,...` enum style.
- `nullable` vs `required` vs `sometimes` discipline: `sometimes` for optional on-update fields.
- **No custom error messages** — rely on default Laravel messages + `lang/*/validation.php`.

**Apply to:** `ChatMessageRequest`, `RedesignItemRequest`, `TestAnthropicKeyRequest`, `StoreClientRequest` (modifications).

**Modified `StoreClientRequest::rules()` additions** (append to existing rules array):
```php
'monthly_posts'       => 'nullable|integer|min:0|max:200',
'monthly_plan_notes'  => 'nullable|string|max:1000',
'planning_day'        => 'nullable|integer|min:1|max:31',
'social_handles'      => 'nullable|array',
'social_handles.*'    => 'string|max:255',
```

---

### `app/Http/Middleware/SetLocale.php` — middleware analog

**Source file:** `app/Http/Middleware/SetLocale.php` (42 lines)

**Full pattern** (lines 1-42):
```php
<?php
namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class SetLocale
{
    private const SUPPORTED = ['pt-BR', 'en', 'es'];

    public function handle(Request $request, Closure $next): mixed
    {
        if (auth()->check()) {
            app()->setLocale(auth()->user()->getLocale());
        }
        // ...
        return $next($request);
    }
}
```

**What to copy for `AiUsageMeter`:**
- Single `handle(Request $request, Closure $next): mixed` signature.
- `return $next($request)` at the bottom — all instrumentation happens before/after this line.
- Class-level `private const` for enum-ish configuration (budgets, thresholds).
- **Zero dependency injection via constructor** — middlewares in Briefy are stateless and resolve deps via facades / app container inside `handle`.

---

### `app/Http/Middleware/HandleInertiaRequests.php` — Inertia shared props analog

**Source file:** `app/Http/Middleware/HandleInertiaRequests.php` (52 lines)

**Share method** (lines 30-51):
```php
public function share(Request $request): array
{
    $user = $request->user();

    return array_merge(parent::share($request), [
        'auth' => [
            'user' => $user ? [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'preferences' => $user->preferences,
                'organization' => $user->organization?->only(['id', 'name', 'slug', 'logo']),
            ] : null,
        ],
        'locale' => $user?->getLocale() ?? 'pt-BR',
        'flash' => [
            'success' => $request->session()->get('success'),
            'error' => $request->session()->get('error'),
        ],
    ]);
}
```

**Modification for Phase 3 (D-33 BYOK UX toggle):** extend the `organization` sub-array to include `has_anthropic_key` and `anthropic_api_key_mask`:
```php
'organization' => $user->organization ? [
    ...$user->organization->only(['id', 'name', 'slug', 'logo']),
    'has_anthropic_key'     => $user->organization->hasAnthropicKey(),
    'anthropic_api_key_mask' => $user->organization->anthropic_api_key_mask,
] : null,
```
**Never expose** `anthropic_api_key_encrypted` — it's in `$hidden` on the Organization model.

---

### `app/Models/Client.php` — model analog

**Source file:** `app/Models/Client.php` (22 lines)

**Full pattern** (lines 1-22):
```php
<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Client extends Model
{
    use HasFactory;
    protected $fillable = [
        'organization_id', 'name', 'segment', 'channels',
        'tone_of_voice', 'target_audience', 'brand_references', 'briefing', 'avatar',
    ];
    protected $casts = ['channels' => 'array'];

    public function organization(): BelongsTo { return $this->belongsTo(Organization::class); }
    public function demands(): HasMany { return $this->hasMany(Demand::class); }
    public function aiMemory(): HasMany { return $this->hasMany(ClientAiMemory::class); }
}
```

**What to copy:**
- `use HasFactory;` on every model (factories live in `database/factories/`).
- `protected $fillable` array declares mass-assignable columns (never use `$guarded`).
- `protected $casts` array for JSON (`array`), dates, enums, and for Phase 3: `'encrypted'` cast.
- Relationships as one-liners when trivial: `public function x(): BelongsTo { return $this->belongsTo(Y::class); }`.

**Modifications for Phase 3 Client model (D-16, D-35):**
```php
protected $fillable = [
    'organization_id', 'name', 'segment', 'channels',
    'tone_of_voice', 'target_audience', 'brand_references', 'briefing', 'avatar',
    'monthly_posts', 'monthly_plan_notes', 'planning_day', 'social_handles', // NEW
];
protected $casts = [
    'channels' => 'array',
    'social_handles' => 'array',       // NEW
    'monthly_posts' => 'integer',      // NEW
    'planning_day' => 'integer',       // NEW
];

public function researchSessions(): HasMany   // NEW
{
    return $this->hasMany(ClientResearchSession::class);
}
```

**Modifications for Organization model (D-29, D-31):**
```php
protected $casts = [
    'settings' => 'array',
    'anthropic_api_key_encrypted' => 'encrypted',   // NEW — Laravel native
];
protected $hidden = ['anthropic_api_key_encrypted']; // NEW — never serialize

public function getAnthropicApiKeyAttribute(): ?string // NEW
{
    return $this->anthropic_api_key_encrypted;
}
public function hasAnthropicKey(): bool // NEW
{
    return !empty($this->anthropic_api_key_encrypted);
}
```

---

### `app/Models/AiConversation.php` — lean model for new `ClientResearchSession`

**Source file:** `app/Models/AiConversation.php` (12 lines)

**Full pattern**:
```php
<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AiConversation extends Model
{
    protected $fillable = ['organization_id', 'user_id', 'context_type', 'context_id', 'title'];
    public function user(): BelongsTo { return $this->belongsTo(User::class); }
    public function messages(): HasMany { return $this->hasMany(AiConversationMessage::class, 'conversation_id')->orderBy('created_at'); }
}
```

**Apply to `ClientResearchSession`:**
```php
<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ClientResearchSession extends Model
{
    protected $fillable = [
        'client_id', 'managed_agent_session_id', 'status',
        'started_at', 'completed_at', 'events_url', 'progress_summary',
    ];
    protected $casts = [
        'started_at' => 'datetime',
        'completed_at' => 'datetime',
    ];
    public function client(): BelongsTo { return $this->belongsTo(Client::class); }
}
```

**Key convention:** models without `use HasFactory` are also valid (AiConversation has none); factories are optional for Phase 3 lean tables.

---

### Migrations — `2026_04_22_015652_create_ai_conversations_table.php` as CREATE analog

**Source file:** `database/migrations/2026_04_22_015652_create_ai_conversations_table.php` (32 lines)

**Full pattern** (lines 1-32):
```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_conversations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->enum('context_type', ['global', 'client', 'demand'])->default('global');
            $table->unsignedBigInteger('context_id')->nullable();
            $table->text('title')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_conversations');
    }
};
```

**Conventions:**
- `return new class extends Migration { ... };` anonymous class (Laravel 9+ default).
- `foreignId('x_id')->constrained()->cascadeOnDelete()` for FK with automatic inferred table name.
- `enum('status', [...])` for status columns — matches existing `demands.status`, `planning_suggestions.status`.
- `timestamps()` at the end of every table.
- `dropIfExists()` in `down()`.

**Apply to `create_client_research_sessions_table`:**
```php
Schema::create('client_research_sessions', function (Blueprint $table) {
    $table->id();
    $table->foreignId('client_id')->constrained()->cascadeOnDelete();
    $table->string('managed_agent_session_id')->nullable()->index();
    $table->enum('status', ['queued', 'running', 'idle', 'completed', 'failed', 'terminated'])->default('queued');
    $table->timestamp('started_at')->nullable();
    $table->timestamp('completed_at')->nullable();
    $table->text('events_url')->nullable();
    $table->text('progress_summary')->nullable();
    $table->timestamps();
});
```

**Alter-table migration pattern** (no existing analog with `Schema::table`, use standard Laravel):
```php
// xxxx_add_anthropic_api_key_to_organizations.php
public function up(): void
{
    Schema::table('organizations', function (Blueprint $table) {
        $table->text('anthropic_api_key_encrypted')->nullable()->after('settings');
        $table->string('anthropic_api_key_mask', 32)->nullable()->after('anthropic_api_key_encrypted');
        $table->string('client_research_agent_id')->nullable();
        $table->string('client_research_environment_id')->nullable();
    });
}

public function down(): void
{
    Schema::table('organizations', function (Blueprint $table) {
        $table->dropColumn([
            'anthropic_api_key_encrypted', 'anthropic_api_key_mask',
            'client_research_agent_id', 'client_research_environment_id',
        ]);
    });
}
```

```php
// xxxx_add_monthly_plan_to_clients_table.php
public function up(): void
{
    Schema::table('clients', function (Blueprint $table) {
        $table->unsignedSmallInteger('monthly_posts')->nullable()->after('avatar');
        $table->text('monthly_plan_notes')->nullable()->after('monthly_posts');
        $table->unsignedTinyInteger('planning_day')->nullable()->after('monthly_plan_notes');
        $table->json('social_handles')->nullable()->after('planning_day');
    });
}
```

---

### `config/services.php` — config analog

**Source file:** `config/services.php` (38 lines)

**Full pattern:**
```php
<?php
return [
    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],
    // ... other services
];
```

**Modification — append:**
```php
'anthropic' => [
    'api_key_fallback' => env('ANTHROPIC_API_KEY'),            // dev/test only
    'beta_ma'          => 'managed-agents-2026-04-01',
    'model_complex'    => env('ANTHROPIC_MODEL_COMPLEX', 'claude-opus-4-7'),
    'model_chat'       => env('ANTHROPIC_MODEL_CHAT',    'claude-sonnet-4-6'),
    'model_cheap'      => env('ANTHROPIC_MODEL_CHEAP',   'claude-haiku-4-5'),
],
```

---

### `app/Providers/AppServiceProvider.php` — singleton binding analog

**Source file:** `app/Providers/AppServiceProvider.php` (25 lines)

**Current state:**
```php
public function register(): void
{
    //
}
```

**Modification for Phase 3:** AnthropicClientFactory is resolved per-request (not singleton), so DON'T bind `Client` globally. Instead, bind the factory:
```php
public function register(): void
{
    $this->app->singleton(\App\Services\Ai\AnthropicClientFactory::class);
}
```
The factory resolves a per-org `Anthropic\Client` on demand — never globally singleton, because BYOK requires per-organization API keys.

---

### `routes/web.php` — route analog

**Source file:** `routes/web.php` (52 lines)

**Existing patterns to mirror:**
```php
Route::middleware(['auth', 'verified'])->group(function () {
    Route::resource('clients', ClientController::class);
    Route::get('/demands', [DemandController::class, 'index'])->name('demands.index');

    // custom nested routes for demand actions
    Route::post('/demands/{demand}/files', [DemandController::class, 'addFile'])->name('demands.files.store');
    Route::patch('/demands/{demand}/status', [DemandController::class, 'updateStatus'])->name('demands.status.update');

    Route::prefix('planning')->name('planning.')->group(function () {
        Route::get('/', [PlanningController::class, 'index'])->name('index');
    });
});
```

**Phase 3 additions (append inside the `auth` middleware group):**
```php
// AI — Brief + Chat (streaming SSE)
Route::post('/demands/{demand}/brief/generate', [AiBriefController::class, 'generate'])->name('demands.brief.generate');
Route::patch('/demands/{demand}/brief', [AiBriefController::class, 'saveEdit'])->name('demands.brief.edit');

Route::post('/demands/{demand}/chat/conversations', [AiChatController::class, 'startConversation'])->name('demands.chat.start');
Route::post('/demands/{demand}/chat/{conversation}/stream', [AiChatController::class, 'stream'])->name('demands.chat.stream');

// Monthly Planning
Route::prefix('planejamento')->name('planejamento.')->group(function () {
    Route::get('/', [MonthlyPlanningController::class, 'index'])->name('index');
    Route::post('/generate', [MonthlyPlanningController::class, 'generate'])->name('generate');
});
Route::post('/planning-suggestions/{suggestion}/convert', [MonthlyPlanningController::class, 'convert'])->name('planning-suggestions.convert');
Route::post('/planning-suggestions/convert-bulk', [MonthlyPlanningController::class, 'convertBulk'])->name('planning-suggestions.convertBulk');
Route::post('/planning-suggestions/{suggestion}/redesign', [MonthlyPlanningController::class, 'redesign'])->name('planning-suggestions.redesign');
Route::patch('/planning-suggestions/{suggestion}', [MonthlyPlanningController::class, 'update'])->name('planning-suggestions.update');

// Client Research — Managed Agents
Route::post('/clients/{client}/research', [ClientResearchController::class, 'launch'])->name('clients.research.launch');
Route::get('/clients/{client}/research/{session}', [ClientResearchController::class, 'show'])->name('clients.research.show');
Route::get('/clients/{client}/research/{session}/events', [ClientResearchController::class, 'streamEvents'])->name('clients.research.stream');

// Settings — BYOK
Route::prefix('settings')->name('settings.')->group(function () {
    Route::get('/ai', [\App\Http\Controllers\Settings\AiController::class, 'edit'])->name('ai.edit');
    Route::patch('/ai', [\App\Http\Controllers\Settings\AiController::class, 'update'])->name('ai.update');
    Route::post('/ai/test', [\App\Http\Controllers\Settings\AiController::class, 'testKey'])->name('ai.test');
});
```
**Keep the old `/planning` route as a redirect → `/planejamento`** to avoid breaking any existing bookmarks; or delete if safe.

---

### FRONTEND PATTERNS

---

### `resources/js/pages/Demands/Index.tsx` — canonical Inertia page analog

**Source file:** `resources/js/pages/Demands/Index.tsx` (183 lines) — **use this for `Planejamento/Index.tsx`**

**Imports pattern** (lines 1-10):
```tsx
import { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { LayoutGrid, List, Loader2, Search } from 'lucide-react';
import AppLayout from '@/Layouts/AppLayout';
import { KanbanBoard } from '@/Components/KanbanBoard';
import { StatusBadge } from '@/Components/StatusBadge';
import { DemandDetailModal } from '@/Components/DemandDetailModal';
import emptyLight from '@/assets/empty-state-light.svg';
import emptyDark from '@/assets/empty-state-dark.svg';
```
**What to copy:**
- React hooks first, then `@inertiajs/react` (`Head`, `Link`, `router`, `useForm`, `usePage`).
- `react-i18next` for copy.
- `lucide-react` for icons (16-18px default size).
- `@/Layouts/AppLayout` default import.
- `@/Components/*` named imports for components.
- `@/assets/*` for static SVGs via Vite.

**Props + state pattern** (lines 31-56):
```tsx
interface Props {
  demands: Demand[];
  clients: Client[];
  filters: { client_id?: string; status?: string; search?: string };
  selectedDemand?: SelectedDemand | null;
}

export default function DemandsIndex({ demands, clients, filters, selectedDemand }: Props) {
  const { t } = useTranslation();
  const [search, setSearch] = useState(filters.search ?? '');
  const [loadingDemandId, setLoadingDemandId] = useState<number | null>(null);

  const openDemand = (id: number) => {
    setLoadingDemandId(id);
    router.get(route('demands.index'), { ...filters, demand: id }, {
      preserveState: true,
      replace: true,
      only: ['selectedDemand'],
      onFinish: () => setLoadingDemandId(null),
    });
  };
```
**Idioms to mirror:**
- `export default function XxxIndex({...}: Props)` — default export.
- `useTranslation()` destructure `t`.
- Controlled inputs synced to query string via `router.get(route('...'), {...}, { preserveState: true, replace: true })`.
- `only: ['selectedDemand']` for partial reloads (keeps the list intact).
- Loading states held in local `useState` (no global store).

**Filter bar pattern** (lines 81-125):
```tsx
<div className="mb-5 flex flex-wrap items-center gap-2">
  <div className="relative">
    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9ca3af]" />
    <input type="text" value={search} onChange={e => handleSearch(e.target.value)} placeholder={t('common.search')}
      className="rounded-[8px] border border-[#e5e7eb] bg-white pl-8 pr-3 py-1.5 text-sm ..." />
  </div>
  <select value={filters.client_id ?? ''} onChange={e => applyFilter('client_id', e.target.value)}
    className="rounded-[8px] border border-[#e5e7eb] bg-white px-3 py-1.5 text-sm ...">
    <option value="">{t('common.all')} {t('clients.title')}</option>
    {clients.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
  </select>
</div>
```
**Copy for Planejamento/Index.tsx filter row.**

**Empty state pattern** (lines 127-133):
```tsx
{demands.length === 0 ? (
  <div className="flex flex-col items-center justify-center py-20 text-center">
    <img src={emptyLight} alt="" className="mb-4 h-40 dark:hidden" aria-hidden />
    <img src={emptyDark}  alt="" className="mb-4 h-40 hidden dark:block" aria-hidden />
    <p className="text-base font-medium text-[#111827] dark:text-[#f9fafb]">{t('demands.empty')}</p>
    <p className="mt-1 text-sm text-[#6b7280]">{t('demands.emptyHint')}</p>
  </div>
) : ...}
```
**For AI empty states (D-03), swap `empty-state-*.svg` for `chatbot-icon-*.svg` at the UI-SPEC sizes (48–64px).**

---

### `resources/js/Components/DemandDetailModal.tsx` — THE modal + inline-edit analog (D-04, D-05, D-11)

**Source file:** `resources/js/Components/DemandDetailModal.tsx` (403 lines)

**Form + useForm pattern** (lines 75-107):
```tsx
const editForm = useForm({
  title: demand.title,
  description: demand.description ?? '',
  // ...
  deadline: demand.deadline ? demand.deadline.substring(0, 10) : '',
});

useEffect(() => {
  if (!isEditing) {
    editForm.setData({ title: demand.title, /* ... */ });
  }
}, [demand]);

const submitEdit = (e: React.FormEvent) => {
  e.preventDefault();
  editForm.put(route('demands.inline.update', demand.id), {
    preserveScroll: true,
    only: ['selectedDemand'],
    onSuccess: () => setIsEditing(false),
  });
};
```
**What to copy:**
- `useForm({...})` with initial state derived from prop.
- `useEffect(..., [demand])` syncs form when the prop reloads (Inertia partial reload pattern — CRITICAL for SSE streams that update `selectedDemand`).
- `router.patch/put/post` with `preserveScroll: true` and `only: ['selectedDemand']`.
- `onSuccess: () => setState(...)` for UI transitions.

**Router.patch inline-update pattern** (lines 132-135):
```tsx
const deleteFile = (id: number) => router.delete(route('demands.files.destroy', [demand.id, id]), { preserveScroll: true, only: ['selectedDemand'] });
const saveFileName = (id: number) => router.patch(route('demands.files.update', [demand.id, id]), { name: editingFileName }, { preserveScroll: true, only: ['selectedDemand'], onSuccess: () => setEditingFileId(null) });
```
**Apply to:** Brief save-edit, planning suggestion redesign-apply, chat new-conversation create.

**Token classes to reuse verbatim** (lines 22-23):
```tsx
const inputClass = 'w-full rounded-[8px] border border-[#e5e7eb] bg-white px-3 py-2 text-sm placeholder-[#9ca3af] focus:border-[#7c3aed] focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/20 dark:border-[#1f2937] dark:bg-[#0b0f14] dark:text-[#f9fafb]';
const labelClass = 'mb-1 block text-xs font-medium uppercase tracking-wide text-[#9ca3af]';
```
**For non-modal forms use ClientForm.tsx constants (different padding):**
```tsx
// ClientForm.tsx lines 6-8
const inputClass = 'w-full rounded-[8px] border border-[#e5e7eb] bg-white px-3.5 py-2.5 text-sm text-[#111827] placeholder-[#9ca3af] focus:border-[#7c3aed] focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/20 dark:border-[#1f2937] dark:bg-[#111827] dark:text-[#f9fafb] dark:placeholder-[#6b7280]';
const labelClass = 'mb-1.5 block text-sm font-medium text-[#111827] dark:text-[#f9fafb]';
const textareaClass = inputClass + ' resize-none';
```

**Confirm-inline pattern** (lines 113-128, `Clients/Index.tsx`):
```tsx
{deletingId === client.id ? (
  <div className="flex items-center gap-1">
    <button onClick={() => handleDelete(client.id)} className="rounded-[8px] bg-red-500 px-2 py-1.5 text-xs font-medium text-white">{t('common.confirm')}</button>
    <button onClick={() => setDeletingId(null)} className="rounded-[8px] border border-[#e5e7eb] px-2 py-1.5 text-xs text-[#6b7280] dark:border-[#1f2937]">{t('common.cancel')}</button>
  </div>
) : (
  <button onClick={() => setDeletingId(client.id)} className="rounded-[8px] border border-[#e5e7eb] p-1.5 text-[#6b7280] hover:border-red-400 hover:text-red-500 transition-colors dark:border-[#1f2937]"><Trash2 size={14} /></button>
)}
```
**Apply to:** D-13 "Nova Conversa" confirm + Regenerar confirm state (UI-SPEC §Destructive Confirmations). **Note:** UI-SPEC specifies destructive text on hover, NOT filled red buttons — update the style per UI-SPEC, but keep the two-state toggle mechanism.

---

### `resources/js/Components/KanbanBoard.tsx::DemandCard` — card component analog (for `PlanningCard.tsx`)

**Source file:** `resources/js/Components/KanbanBoard.tsx` lines 40-72

**Pattern:**
```tsx
function DemandCard({ demand, isDragging = false, onDemandClick, loadingId }: { ... }) {
  const isLoading = loadingId === demand.id;
  return (
    <div onClick={() => !isDragging && onDemandClick?.(demand.id)}
      className={`relative rounded-[8px] bg-white p-3.5 shadow-sm dark:bg-[#111827] ${isDragging ? 'shadow-lg rotate-1 opacity-90' : 'hover:shadow-md'} transition-shadow ${!isDragging && onDemandClick ? 'cursor-pointer' : ''}`}>
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-[8px] bg-white/80 dark:bg-[#111827]/80">
          <Loader2 size={18} className="animate-spin text-[#7c3aed]" />
        </div>
      )}
      <p className="text-sm font-medium text-[#111827] dark:text-[#f9fafb] line-clamp-2">{demand.title}</p>
      {demand.client && <p className="mt-1.5 text-xs text-[#9ca3af]">{demand.client.name}</p>}
      <div className="mt-3 flex items-center gap-3">
        {demand.deadline && (
          <span className="flex items-center gap-1 text-xs text-[#9ca3af]">
            <Calendar size={11} />
            {new Date(demand.deadline).toLocaleDateString('pt-BR')}
          </span>
        )}
      </div>
    </div>
  );
}
```

**Apply to `PlanningCard.tsx`:** same outer container (`rounded-[8px] bg-white p-3.5 shadow-sm dark:bg-[#111827]`), `line-clamp-2` for title, `Calendar size={11}` for date. Add the 3 UI-SPEC action buttons in a bottom action row (pattern from DemandDetailModal lines 287-290).

---

### `resources/js/Components/Sidebar.tsx` — dark/light icon pair pattern (for `AiIcon.tsx`)

**Source file:** `resources/js/Components/Sidebar.tsx` lines 68-79

**Pattern:**
```tsx
{collapsed ? (
  <>
    <img src={logoIconLight} alt="Briefy" className="h-7 shrink-0 dark:hidden" />
    <img src={logoIconDark}  alt="Briefy" className="h-7 shrink-0 hidden dark:block" />
  </>
) : (
  <>
    <img src={logoLight} alt="Briefy" className="h-7 dark:hidden" />
    <img src={logoDark}  alt="Briefy" className="h-7 hidden dark:block" />
  </>
)}
```

**Apply to `AiIcon.tsx` (new component wrapping chatbot SVG per D-15):**
```tsx
import chatbotIconLight from '@/assets/chatbot-icon-light.svg';
import chatbotIconDark  from '@/assets/chatbot-icon-dark.svg';

interface Props { size?: 12 | 16 | 20 | 24 | 32 | 48 | 64; spinning?: boolean; className?: string; alt?: string; }

export function AiIcon({ size = 16, spinning = false, className = '', alt = '' }: Props) {
  const spin = spinning ? 'animate-spin' : '';
  return (
    <>
      <img src={chatbotIconLight} alt={alt} width={size} height={size} className={`shrink-0 dark:hidden ${spin} ${className}`} />
      <img src={chatbotIconDark}  alt={alt} width={size} height={size} className={`shrink-0 hidden dark:block ${spin} ${className}`} />
    </>
  );
}
```
Note: chatbot SVGs already live at `resources/js/assets/chatbot-icon-{dark,light}.svg` (confirmed).

---

### `resources/js/hooks/useTheme.ts` — hook analog (for `useAiStream`, `useTypewriter`)

**Source file:** `resources/js/hooks/useTheme.ts` (32 lines)

**Full pattern** (lines 1-32):
```tsx
import { useCallback, useEffect, useState } from 'react';
import { router, usePage } from '@inertiajs/react';

type Theme = 'light' | 'dark';

export function useTheme() {
  const { auth } = usePage<PageProps>().props;
  const initial = (auth?.user?.preferences?.theme as Theme) ?? 'light';
  const [theme, setTheme] = useState<Theme>(initial);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const toggle = useCallback(() => { /* ... */ }, [theme]);

  return { theme, toggle };
}
```

**What to copy for new hooks:**
- Named export (not default): `export function useAiStream()`.
- `useState` + `useCallback` pattern; never `useReducer`.
- Pull from Inertia via `usePage<PageProps>().props` when shared state is needed.
- Return an object (`{ state, start, cancel }`) not a tuple.

**For `useAiStream` and `useTypewriter`, implementation bodies are in RESEARCH.md §Frontend Integration Patterns Pattern A and §Typewriter Rendering — copy verbatim.**

---

### `resources/js/Components/ClientForm.tsx` — form-section append pattern

**Source file:** `resources/js/Components/ClientForm.tsx` (165 lines)

**Section divider + fields pattern** (reuse shape from lines 88-110):
```tsx
<div>
  <label className={labelClass}>{t('clients.toneOfVoice')}</label>
  <textarea value={data.tone_of_voice} onChange={e => setData('tone_of_voice', e.target.value)}
    className={textareaClass} rows={3}
    placeholder="Ex: Jovem, descontraído..." />
  <InputError message={errors.tone_of_voice} className="mt-1.5" />
</div>
```

**Modifications (append after avatar field at line 145, before submit row line 147):**
```tsx
{/* New "Plano de Conteúdo Mensal" section per D-16/D-17 */}
<div className="border-t border-[#e5e7eb] dark:border-[#1f2937] pt-6 mt-6">
  <h3 className="text-sm font-semibold text-[#111827] dark:text-[#f9fafb] mb-1">
    {t('clients.monthlyPlan.sectionTitle')}
  </h3>
  <p className="text-xs text-[#9ca3af] mb-4">{t('clients.monthlyPlan.sectionSubtitle')}</p>

  <div className="space-y-5">
    <div>
      <label className={labelClass}>{t('clients.monthlyPlan.monthlyPostsLabel')}</label>
      <input type="number" min={0} max={200} step={1}
        value={data.monthly_posts ?? ''}
        onChange={e => setData('monthly_posts', e.target.value ? Number(e.target.value) : null)}
        className={inputClass} placeholder={t('clients.monthlyPlan.monthlyPostsPlaceholder')} />
      <p className="text-xs text-[#9ca3af] mt-1">{t('clients.monthlyPlan.monthlyPostsHint')}</p>
      <InputError message={errors.monthly_posts} className="mt-1.5" />
    </div>
    {/* ... monthly_plan_notes (textarea), planning_day (number max-w-[120px]) ... */}
  </div>
</div>

{/* "Conhecer com IA" CTA — disabled when no key (D-33, D-39) */}
{isEditMode && <ConhecerClienteButton client={client} disabled={!auth.organization?.has_anthropic_key} />}
```

---

## Shared Patterns

### Authentication (org-scoping)

**Source:** `app/Http/Controllers/DemandController.php` lines 231-234 + `ClientController.php` lines 96-99

**Apply to:** All new controllers (`AiBriefController`, `AiChatController`, `MonthlyPlanningController`, `ClientResearchController`, `Settings\AiController`).

**Pattern:**
```php
private function authorize{Entity}({Entity} $entity): void
{
    abort_if($entity->organization_id !== auth()->user()->organization_id, 403);
}
```
Called as first line in every non-index method. **Briefy has NO Laravel Policies in `app/Policies/` — do NOT introduce them in Phase 3.** Continue the `abort_if` inline pattern.

### Error handling — flash messages + inline banner

**Backend source:** `DemandController.php` line 78, 133, etc.
```php
return back()->with('success', __('app.thing_did'));
// or
return redirect()->route('demands.show', $demand)->with('success', __('app.thing_did'));
```

**Frontend source:** `resources/js/Components/FlashMessage.tsx` (existing — auto-renders flash on every page).

**Inertia shared flash source:** `HandleInertiaRequests::share` lines 46-49:
```php
'flash' => [
    'success' => $request->session()->get('success'),
    'error' => $request->session()->get('error'),
],
```

**Apply to:** all mutations (brief save-edit, planning convert, settings update). **For streaming endpoints** (AiBriefController::generate, AiChatController::stream) — errors come via the SSE `event: error` channel, rendered as inline banners per UI-SPEC §Error States (NOT toasts).

**Translation keys:** add to `lang/pt-BR/app.php`, `lang/en/app.php`, `lang/es/app.php` — existing convention (file already exists at `lang/pt-BR/app.php`).

### Validation

**Source:** `app/Http/Requests/StoreDemandRequest.php` (24 lines) — use as boilerplate.

**Apply to:** every new FormRequest. **Always** `authorize(): bool { return true; }` (controller owns authorization via abort_if); **always** pipe-string rules; **never** custom message overrides unless truly necessary.

### Inertia partial reload

**Source:** `DemandDetailModal.tsx` line 34, line 102, line 135 — `{ preserveScroll: true, only: ['selectedDemand'] }`

**Apply to:** every new mutation that happens inside a modal or inline edit. Planner should keep this pattern for brief save-edit, chat new-conversation, planning redesign-apply.

### Localization

**Source:** `resources/js/locales/pt-BR.json` (existing) + `useTranslation()` from `react-i18next` called at top of every page/component.

**Apply to:** every new user-facing string per UI-SPEC §i18n Contract. Source of truth is pt-BR. Translation keys follow `{feature}.{area}.{label}` dotted structure (e.g., `ai.brief.generate`).

### File Structure

| Kind | Location | Naming |
|------|----------|--------|
| Controllers | `app/Http/Controllers/` or `app/Http/Controllers/Settings/` | `XxxController.php` |
| Form Requests | `app/Http/Requests/` | `{Verb}{Entity}Request.php` |
| Models | `app/Models/` | `Xxx.php` (singular) |
| Migrations | `database/migrations/` | `{timestamp}_{verb}_{object}.php` |
| Services | `app/Services/Ai/` **(NEW DIRECTORY)** | `XxxStreamer.php`, `XxxBuilder.php`, `XxxGenerator.php`, `XxxExtractor.php` |
| Jobs | `app/Jobs/` **(NEW DIRECTORY)** | `XxxJob.php` |
| React pages | `resources/js/pages/{Feature}/Index.tsx` | PascalCase directory, `Index.tsx` / `Create.tsx` / `Edit.tsx` / `Show.tsx` |
| React components | `resources/js/Components/` | `PascalCase.tsx` (note: capital `C` — there's a legacy `components/` lowercase duplicate, prefer `Components/`) |
| React hooks | `resources/js/hooks/` | `useXxx.ts` (lowercase `h`) |
| Asset icons | `resources/js/assets/` | `kebab-case.svg` |
| Prompt templates | `resources/prompts/` **(NEW DIRECTORY)** | `{capability}_{role}.md` (e.g., `brief_system.md`) |

> **Casing conflict to flag to planner:** both `resources/js/Components/` and `resources/js/components/` exist (duplicate files). Existing imports use `@/Components/*` (capital C). Stick with `@/Components/*` for all new Phase 3 components — do NOT add new files to lowercase `components/`.

> **Hook directory conflict:** both `resources/js/hooks/` and `resources/js/Hooks/` exist. Existing `useTheme.ts` is in lowercase `hooks/`. AI-SPEC §3 references `resources/js/hooks/useAiStream.ts` (lowercase). Use **lowercase `hooks/`** for all new hooks.

> **Layouts:** both `resources/js/Layouts/` and `resources/js/layouts/` exist. Existing imports use `@/Layouts/AppLayout` (capital L). **Use capital `Layouts/`** for any new layout.

---

## Tests — inherited pattern

**Source:** `tests/Feature/RoutesTest.php` (63 lines)

**Pattern:**
```php
<?php
namespace Tests\Feature;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class XxxControllerTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $org = Organization::factory()->create();
        $this->user = User::factory()->create(['organization_id' => $org->id]);
    }

    public function test_xxx(): void
    {
        $this->actingAs($this->user)->get('/x')->assertStatus(200);
    }
}
```

**Conventions:**
- Snake_case test method names (`test_authenticated_user_can_access_dashboard`).
- `RefreshDatabase` trait on every test class.
- Factory-based fixtures (`Organization::factory()->create()`).
- `$this->actingAs($this->user)` pattern for authenticated requests.
- **No mocking libraries configured yet** — for Anthropic SDK mocking in new tests, use `Http::fake()` (Laravel built-in) OR inject a fake `Anthropic\Client` via container binding.

**New test files needed:** mirror the naming pattern. SSE testing needs `Http::fake()` to stub Anthropic responses (see AI-SPEC §5 eval strategy for test fixtures).

---

## No Analog Found — plan with extra care

Files with no close match in the existing codebase. Planner should use RESEARCH.md + AI-SPEC.md as primary reference and flag risk in PLAN.md.

| File | Role | Fallback Reference | Risk Notes |
|------|------|---------|-----|
| `app/Services/Ai/BriefStreamer.php`, `ChatStreamer.php` | streaming service | AI-SPEC §3 lines 245-346 | First SSE implementation in codebase. Verify PHP-FPM/nginx buffering config at deploy time (RESEARCH §Pattern C). |
| `app/Services/Ai/ClientMemoryExtractor.php` | tool-use | AI-SPEC §4 lines 592-635 | First tool-use call. `toolChoice` enforcement + schema validation are new patterns. |
| `app/Services/Ai/ConversationCompactor.php` | summarizer | AI-SPEC §4 "Context Window Strategy" | Triggered by queue job; no existing background job pattern. |
| `app/Services/Ai/ClientResearchAgent.php` | raw HTTP wrapper | RESEARCH §Managed Agents Integration, lines 580-785 | Anthropic PHP SDK does NOT expose MA endpoints in v0.16 — use `Http::withHeaders()` directly. |
| `app/Services/Ai/AnthropicClientFactory.php` | factory | AI-SPEC §4 lines 480-494 | First service class in `app/Services/` (directory does not exist). Create directory. |
| `app/Jobs/*Job.php` (4 jobs) | queued jobs | AI-SPEC §4 "Async-First Design" lines 775-805 | `app/Jobs/` directory does not exist. Use `php artisan make:job` scaffold — standard Laravel shape. |
| `resources/js/hooks/useAiStream.ts` | SSE consumer hook | RESEARCH §Frontend Integration Patterns Pattern A, lines 219-317 | `fetch` + `ReadableStream.getReader()` — net-new. Use RESEARCH code verbatim. |
| `resources/js/hooks/useTypewriter.ts` | rAF queue hook | RESEARCH §Typewriter Rendering, lines 375-444 | rAF-paced character drain. No existing animation pattern in codebase. |
| `resources/js/Components/AiMarkdown.tsx` | markdown wrapper | RESEARCH §Markdown Rendering lines 464-516 | react-markdown v10 with custom `components` + `rehype-sanitize`. |
| `resources/js/Components/BriefTab.tsx`, `ChatTab.tsx` | streaming consumer | UI-SPEC §Component 3-4 + RESEARCH Pattern A | Headless UI `TabPanel` children — new combination but both parts have analogs. |
| `resources/js/Components/DashboardPlanningWidget.tsx` | widget | UI-SPEC §Component 9 | Date-math render logic + localStorage dismissal persistence — net-new. |
| `LICENSE` (AGPL-3.0) | docs root | RESEARCH §AGPL packaging | Plain-file copy of official AGPL-3.0 text. |
| `resources/prompts/*.md` | prompt templates | AI-SPEC §4 "Prompt Engineering Discipline" | New asset directory. Version via file hash logged in trace. |
| `.github/workflows/ai-evals.yml` (optional) | CI | AI-SPEC §5 eval strategy | No existing workflows; can be deferred post-hackathon. |

---

## Metadata

**Analog search scope:**
- `app/Http/Controllers/` (7 existing controllers inspected)
- `app/Http/Requests/` (6 form requests)
- `app/Http/Middleware/` (2 middlewares)
- `app/Models/` (12 models)
- `app/Providers/` (1 provider)
- `database/migrations/` (15 migrations)
- `config/` (12 config files)
- `routes/web.php`
- `resources/js/pages/` (Dashboard, Clients, Demands, Settings, Planning, Auth subtrees)
- `resources/js/Components/` (22 components)
- `resources/js/hooks/useTheme.ts`
- `resources/js/layouts/AppLayout.tsx`
- `resources/js/locales/pt-BR.json`
- `tests/Feature/` (Auth, Settings, RoutesTest)

**Files scanned:** 60+
**Pattern extraction date:** 2026-04-22
**Upstream inputs:** 03-CONTEXT.md (D-01..D-40), 03-AI-SPEC.md (all 9 sections), 03-UI-SPEC.md (all 10 component specs + i18n contract), 03-RESEARCH.md (6 research sections)
