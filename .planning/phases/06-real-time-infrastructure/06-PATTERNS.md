# Phase 6: Real-time Infrastructure - Pattern Map

**Mapped:** 2026-04-24
**Files analyzed:** 6
**Analogs found:** 6 / 6

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `app/Events/DemandCommentCreated.php` | event | event-driven | `app/Events/DemandBoardUpdated.php` | exact |
| `app/Http/Controllers/DemandController.php` | controller | request-response | self (existing `addComment()`) | exact (modify) |
| `resources/js/pages/Demands/Index.tsx` | page | event-driven | self (existing RT-01 subscription linhas 62-77) | exact (verify/debounce) |
| `resources/js/Components/DemandDetailModal.tsx` | component | event-driven + CRUD | `resources/js/pages/Demands/Index.tsx` linhas 62-77 | role-match |
| `tests/Feature/Broadcasting/DemandCommentCreatedTest.php` | test | request-response | `tests/Feature/ActivityLogTest.php` | role-match |
| `tests/Unit/Events/DemandBoardUpdatedTest.php` | test | event-driven | `tests/Unit/Models/DemandModelTest.php` | partial-match |

---

## Pattern Assignments

### `app/Events/DemandCommentCreated.php` (event, event-driven)

**Analog:** `app/Events/DemandBoardUpdated.php`
**Acao:** CREATE novo arquivo — copiar estrutura exata, alterar propriedades e strings.

**Estrutura completa do analog** (linhas 1-29):
```php
<?php
// (c) 2026 Briefy contributors — AGPL-3.0
namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;

class DemandBoardUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets;

    public function __construct(
        public readonly int $organizationId,
        public readonly string $action, // created, updated, deleted, restored
    ) {}

    public function broadcastOn(): Channel
    {
        return new PrivateChannel("organization.{$this->organizationId}");
    }

    public function broadcastAs(): string
    {
        return 'demand.board.updated';
    }
}
```

**Diferencas para DemandCommentCreated:**
- Nome da classe: `DemandCommentCreated`
- Propriedades do construtor: `int $organizationId`, `int $demandId`, `array $comment`
- `broadcastAs()` retorna: `'demand.comment.created'`
- Canal `broadcastOn()`: identico — `new PrivateChannel("organization.{$this->organizationId}")`
- NAO definir `broadcastWith()` — Laravel serializa propriedades `public` automaticamente (mesma convencao do analog)

---

### `app/Http/Controllers/DemandController.php` — metodo `addComment()` (controller, request-response)

**Analog:** self — `addComment()` existente (linhas 193-206)
**Acao:** MODIFY — adicionar `$comment->load('user')` e `DemandCommentCreated::dispatch(...)` apos `DemandComment::create()`.

**Codigo atual** (linhas 193-206):
```php
public function addComment(Request $request, Demand $demand): RedirectResponse
{
    $this->authorizeDemand($demand);
    $request->validate(['body' => 'required|string|max:5000']);

    DemandComment::create([
        'demand_id' => $demand->id,
        'user_id'   => auth()->id(),
        'body'      => $request->body,
        'source'    => 'user',
    ]);

    return back()->with('success', __('app.comment_added'));
}
```

**Adicionar apos `DemandComment::create()`:**
```php
$comment = DemandComment::create([
    'demand_id' => $demand->id,
    'user_id'   => auth()->id(),
    'body'      => $request->body,
    'source'    => 'user',
]);

$comment->load('user'); // necessario antes do dispatch — create() nao carrega relacoes

DemandCommentCreated::dispatch(
    $demand->organization_id,
    $demand->id,
    [
        'id'         => $comment->id,
        'body'       => $comment->body,
        'user'       => [
            'id'   => $comment->user->id,
            'name' => $comment->user->name,
        ],
        'created_at' => $comment->created_at->toJSON(), // Carbon->toJSON() = string ISO 8601
    ]
);
```

**Import a adicionar no topo do arquivo:**
```php
use App\Events\DemandCommentCreated;
```

**Pitfall critico:** Usar `$comment->created_at->toJSON()`, NAO serializar Carbon diretamente. O frontend usa `new Date(c.created_at).toLocaleString('pt-BR')` (DemandDetailModal.tsx linha 384).

---

### `resources/js/pages/Demands/Index.tsx` — RT-01 subscription (page, event-driven)

**Analog:** self — subscription existente (linhas 62-77)
**Acao:** VERIFY existencia + adicionar debounce de 300ms para guard durante drag ativo.

**Codigo existente** (linhas 62-77) — ja funcional, NAO reescrever:
```typescript
const { auth } = usePage<PageProps>().props;
const orgId = (auth?.user as { current_organization_id?: number } | undefined)?.current_organization_id;

useEffect(() => {
  if (!orgId || !window.Echo) return;

  const channel = window.Echo.private(`organization.${orgId}`);
  channel.listen('.demand.board.updated', () => {
    router.reload({ only: ['demands'] });
  });

  return () => {
    window.Echo.leave(`organization.${orgId}`);
  };
}, [orgId]);
```

**Modificacao optional (discretion):** adicionar `useRef` para debounce de 300ms:
```typescript
const reloadTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

// Dentro do useEffect, trocar o callback do listen:
channel.listen('.demand.board.updated', () => {
  if (reloadTimeout.current) clearTimeout(reloadTimeout.current);
  reloadTimeout.current = setTimeout(() => {
    router.reload({ only: ['demands'] });
  }, 300);
});
```

**Contexto:** `activeId` em `KanbanBoard.tsx` (linha 168) controla se drag esta ativo. O debounce de 300ms agrupa rafagas sem precisar de prop drilling.

**Divergencia D-03:** CONTEXT.md diz subscription em `KanbanBoard.tsx`, mas ja esta em `Index.tsx`. Manter em `Index.tsx` — `router.reload` deve executar no nivel de pagina. Registrar divergencia no PLAN.

---

### `resources/js/Components/DemandDetailModal.tsx` — RT-02 subscription (component, event-driven)

**Analog:** `resources/js/pages/Demands/Index.tsx` linhas 62-77 (mesma estrutura de useEffect + cleanup)
**Acao:** MODIFY — converter `demand.comments` de prop direta para `useState`, adicionar subscription Echo.

**Padrao de imports existente** (linhas 1-3) — adicionar `useRef` se necessario para canal:
```typescript
import { useEffect, useRef, useState } from 'react';
import { router, useForm, usePage } from '@inertiajs/react';
```
`useRef` ja esta importado (linha 2). `usePage` ja esta importado.

**Interface Comment existente** (linha 17) — payload broadcast deve ser compativel:
```typescript
interface Comment { id: number; body: string; user: User; created_at: string; }
interface User { id: number; name: string; email: string; }
```

**Estado atual de comments** (sem useState — lido direto de prop):
```typescript
// linha 376: demand.comments.length === 0
// linha 379: demand.comments.map(c => ...)
```

**Adicionar apos os useState existentes** (apos linha 83):
```typescript
// Estado local de comentarios (RT-02: permite append via broadcast)
const [comments, setComments] = useState<Comment[]>(demand.comments);

// Sincronizar com prop quando pai faz partial reload
useEffect(() => {
  setComments(demand.comments);
}, [demand.comments]);

// Acessar orgId (mesmo cast usado em Index.tsx linha 64)
const orgId = (auth?.user as { current_organization_id?: number } | undefined)
  ?.current_organization_id;
```

**Subscription Echo RT-02** (adicionar apos o useEffect de sync acima):
```typescript
// Interface do evento recebido
interface DemandCommentCreatedEvent {
  organizationId: number;
  demandId: number;
  comment: {
    id: number;
    body: string;
    user: { id: number; name: string; email?: string };
    created_at: string;
  };
}

useEffect(() => {
  if (!orgId || !window.Echo) return;

  const channel = window.Echo.private(`organization.${orgId}`);

  channel.listen('.demand.comment.created', (event: DemandCommentCreatedEvent) => {
    if (event.demandId !== demand.id) return; // filtrar pela demanda aberta

    setComments(prev => {
      if (prev.some(c => c.id === event.comment.id)) return prev; // guard D-06: deduplicar
      return [...prev, event.comment as Comment];
    });
  });

  return () => {
    // CRITICO: usar stopListening, NAO window.Echo.leave()
    // leave() removeria o canal inteiro, matando a subscription RT-01 em Index.tsx
    channel.stopListening('.demand.comment.created');
  };
}, [orgId, demand.id]);
```

**Substituicoes no JSX** — trocar todas as referencias `demand.comments` por `comments`:
- Linha 376: `demand.comments.length === 0` → `comments.length === 0`
- Linha 379: `demand.comments.map(c => ...)` → `comments.map(c => ...)`

**Pitfall critico:** `.demand.comment.created` com ponto inicial — sem o ponto, Echo adiciona prefixo de namespace `App.Events.` e o evento nunca chega.

---

### `tests/Feature/Broadcasting/DemandCommentCreatedTest.php` (test, request-response)

**Analog:** `tests/Feature/ActivityLogTest.php`
**Acao:** CREATE novo arquivo em novo subdirectorio `tests/Feature/Broadcasting/`.

**Padrao setUp** (ActivityLogTest.php linhas 19-25):
```php
protected function setUp(): void
{
    parent::setUp();
    $this->org = Organization::factory()->create();
    $this->admin = User::factory()->create(['current_organization_id' => $this->org->id]);
    $this->org->users()->attach($this->admin->id, ['role' => 'admin']);
}
```

**Padrao de teste com Event::fake** (de RESEARCH.md — padrao verificado):
```php
use Illuminate\Support\Facades\Event;
use App\Events\DemandCommentCreated;

Event::fake([DemandCommentCreated::class]);

$response = $this->actingAs($user)
    ->post(route('demands.comments.store', $demand), ['body' => 'Comentario teste']);

$response->assertRedirect();

Event::assertDispatched(DemandCommentCreated::class, function ($event) use ($demand) {
    return $event->demandId === $demand->id
        && $event->organizationId === $demand->organization_id
        && $event->comment['body'] === 'Comentario teste'
        && isset($event->comment['id'])
        && isset($event->comment['user']['id'])
        && isset($event->comment['user']['name'])
        && isset($event->comment['created_at']);
});
```

**Namespace/cabecalho** (copiar de ActivityLogTest.php linhas 1-14):
```php
<?php
// (c) 2026 Briefy contributors — AGPL-3.0
namespace Tests\Feature\Broadcasting;

use App\Events\DemandCommentCreated;
use App\Models\Client;
use App\Models\Demand;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;
```

**Casos de teste necessarios:**
1. `test_dispatch_after_add_comment()` — verifica que evento e dispatched com payload correto
2. `test_broadcast_channel_is_private_organization()` — verifica `broadcastOn()` retorna canal correto
3. `test_broadcast_as_returns_correct_event_name()` — verifica `broadcastAs()` retorna `'demand.comment.created'`

---

### `tests/Unit/Events/DemandBoardUpdatedTest.php` (test, event-driven)

**Analog:** `tests/Unit/Models/DemandModelTest.php`
**Acao:** CREATE novo arquivo em novo subdirectorio `tests/Unit/Events/`.

**Padrao setUp** (DemandModelTest.php linhas 19-35):
```php
protected function setUp(): void
{
    parent::setUp();
    $this->org = Organization::factory()->create();
    $this->user = User::factory()->create(['organization_id' => $this->org->id]);
    $this->client = Client::factory()->create(['organization_id' => $this->org->id]);
}
```

**Padrao de teste unitario simples** (DemandModelTest.php):
```php
public function test_demand_has_many_comments_ordered_by_created_at(): void
{
    $demand = $this->makeDemand();
    DemandComment::factory()->create(['demand_id' => $demand->id, 'created_at' => now()->subMinutes(2)]);
    DemandComment::factory()->create(['demand_id' => $demand->id, 'created_at' => now()]);
    $comments = $demand->comments;
    $this->assertTrue($comments->first()->created_at->lt($comments->last()->created_at));
}
```

**Namespace/cabecalho** para `DemandBoardUpdatedTest.php`:
```php
<?php
// (c) 2026 Briefy contributors — AGPL-3.0
namespace Tests\Unit\Events;

use App\Events\DemandBoardUpdated;
use Illuminate\Broadcasting\PrivateChannel;
use Tests\TestCase;
```

**Casos de teste necessarios:**
1. `test_broadcast_on_returns_private_channel()` — `broadcastOn()` retorna `PrivateChannel` com nome `"organization.{orgId}"`
2. `test_broadcast_as_returns_correct_name()` — `broadcastAs()` retorna `'demand.board.updated'`
3. `test_implements_should_broadcast_now()` — evento implementa `ShouldBroadcastNow`
4. Opcionalmente: `test_observer_dispatches_event_on_demand_update()` — via `Event::fake()` + `$demand->update()`

---

## Shared Patterns

### Padrao de broadcast event (ShouldBroadcastNow)
**Fonte:** `app/Events/DemandBoardUpdated.php` (linhas completas, arquivo tem 29 linhas)
**Aplicar em:** `app/Events/DemandCommentCreated.php` (novo)

Regras extraidas:
- Sempre `ShouldBroadcastNow` (sync, sem fila) — consistente com v1.2
- Traits: `Dispatchable, InteractsWithSockets`
- Canal: `PrivateChannel("organization.{$this->organizationId}")` — mesmo canal para todos os eventos da org
- Propriedades `public readonly` — serializadas automaticamente, sem precisar de `broadcastWith()`
- `broadcastAs()` retorna nome sem namespace — cliente usa `.nome` com ponto inicial

### Padrao de subscription Echo com cleanup
**Fonte:** `resources/js/pages/Demands/Index.tsx` linhas 62-77
**Aplicar em:** `resources/js/Components/DemandDetailModal.tsx` (RT-02)

Regras extraidas:
- Guard `if (!orgId || !window.Echo) return;` — previne subscription sem auth
- `window.Echo.private(...)` — canal privado autorizado
- `channel.listen('.nome.do.evento', callback)` — ponto inicial obrigatorio para eventos com `broadcastAs()`
- Cleanup: `return () => { ... }` — sempre cancelar no unmount
- DIFERENCA critica: `Index.tsx` usa `window.Echo.leave()` (ok, pois e o unico subscriber do canal naquele contexto); `DemandDetailModal` DEVE usar `channel.stopListening()` (canal e compartilhado com RT-01)

### Padrao de acesso a orgId em componentes
**Fonte:** `resources/js/pages/Demands/Index.tsx` linha 64
**Aplicar em:** `resources/js/Components/DemandDetailModal.tsx`

```typescript
const orgId = (auth?.user as { current_organization_id?: number } | undefined)?.current_organization_id;
```
Nota: `PageProps.auth.user` nao declara `current_organization_id` no tipo global (`types/index.d.ts`) — cast necessario. O planner pode considerar estender o tipo global como melhoria menor.

### Padrao de teste Feature com setUp de org+user
**Fonte:** `tests/Feature/ActivityLogTest.php` linhas 19-25
**Aplicar em:** `tests/Feature/Broadcasting/DemandCommentCreatedTest.php`

```php
protected function setUp(): void
{
    parent::setUp();
    $this->org = Organization::factory()->create();
    $this->admin = User::factory()->create(['current_organization_id' => $this->org->id]);
    $this->org->users()->attach($this->admin->id, ['role' => 'admin']);
}
```

### Padrao de autorizacao de canal privado
**Fonte:** `routes/channels.php` linhas 9-11
**Aplicar em:** Nenhum arquivo novo — ja cobre `organization.{orgId}` para RT-01 e RT-02

```php
Broadcast::channel('organization.{orgId}', function ($user, $orgId) {
    return (int) $user->current_organization_id === (int) $orgId;
});
```

---

## No Analog Found

Todos os 6 arquivos possuem analog no codebase. Nenhum arquivo sem correspondencia.

---

## Anti-patterns Criticos (extraidos do codebase)

| Anti-pattern | Onde evitar | Correto |
|---|---|---|
| `window.Echo.leave()` no modal | `DemandDetailModal` cleanup | `channel.stopListening('.demand.comment.created')` |
| `channel.listen('demand.comment.created', ...)` sem ponto | Qualquer subscribe | `channel.listen('.demand.comment.created', ...)` |
| `$comment->created_at` sem conversao | Payload do dispatch | `$comment->created_at->toJSON()` |
| `DemandComment::create()` sem `load('user')` | `addComment()` antes do dispatch | `$comment->load('user')` apos create |

---

## Metadata

**Analogos buscados em:** `app/Events/`, `app/Http/Controllers/`, `app/Observers/`, `resources/js/pages/`, `resources/js/Components/`, `tests/Feature/`, `tests/Unit/`
**Arquivos lidos:** 11
**Data do mapeamento:** 2026-04-24
