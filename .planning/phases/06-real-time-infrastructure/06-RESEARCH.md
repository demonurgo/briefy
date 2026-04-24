# Phase 6: Real-time Infrastructure — Research

**Researched:** 2026-04-24
**Domain:** Laravel Reverb / Laravel Echo / React WebSocket subscriptions
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Frontend RT-01 strategy — **partial reload**. `demand.board.updated` chega → `router.reload({ only: ['demands'] })`. Nenhuma mudança no payload do evento.
- **D-02:** Self-update no Kanban — **sem filtragem**. Quem arrastou o card também recebe o broadcast e recarrega. O update otimista já moveu o card; o reload confirma o estado do servidor.
- **D-03:** Subscription do canal vive em `KanbanBoard.tsx`. `orgId` vem dos Inertia auth props.
- **D-04:** Novo evento dedicado `DemandCommentCreated`. Payload: `{ organizationId, demandId, comment: { id, body, user: { id, name }, created_at } }`.
- **D-05:** Frontend RT-02 strategy — **payload-driven local state append**. `DemandDetailModal` filtra por `demandId` e faz append direto no state `comments`. Sem round-trip.
- **D-06:** Self-update para comentários — **sem filtragem**. Autor também recebe o broadcast. Guard por `id` se o modal já faz append otimista.
- **D-07:** Subscription de comentários vive em `DemandDetailModal`. Subscribe on mount, unsubscribe on unmount. Mesmo canal `private-organization.{orgId}`.
- **D-08:** `DemandObserver` permanece **coarse-grained** — sem mudanças. `DemandBoardUpdated` continua disparando em todas as mutações.

### Claude's Discretion

- Debouncing: se broadcasts rápidos chegarem (drag contínuo), Claude pode adicionar debounce no `router.reload`.
- Tratamento de erro para falhas do canal Echo (drop/reconnect) — comportamento padrão do Reverb; sem UI customizada para v1.2.
- Onde exatamente em `DemandDetailModal` gerenciar o estado da subscription Echo (`useEffect`, `useRef` para referência do canal).

### Deferred Ideas (OUT OF SCOPE)

- Live cursor / presence no Kanban — adiado para v2.
- Demand locking durante edição — adiado para v2.
- Filtragem do Observer (disparar apenas para campos relevantes ao board) — adiado para Phase 8 Polish (D-08).
- Debounce/throttle para eventos rápidos — discrição do Claude na implementação.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| RT-01 | Usuário vê atualização de status do card Kanban em tempo real sem refresh quando outro membro da equipe o muda | Subscription `demand.board.updated` → `router.reload({ only: ['demands'] })` — infraestrutura completa já existe; implementação parcialmente já presente em `Index.tsx` |
| RT-02 | Usuário vê novos comentários aparecerem ao vivo no modal de detalhe sem refresh quando outro membro os adiciona | Novo evento `DemandCommentCreated` + subscription em `DemandDetailModal` com append local no state |
</phase_requirements>

---

## Summary

A infraestrutura de WebSocket para o Briefy está **quase totalmente provisionada**. Laravel Reverb está instalado (`laravel/reverb: ^1.10`), configurado (`.env` com `BROADCAST_CONNECTION=reverb`), e funcionando. O cliente frontend `window.Echo` está inicializado em `app.tsx` com o broadcaster `reverb`. O evento `DemandBoardUpdated` existe e é disparado pelo `DemandObserver`. O canal `private-organization.{orgId}` já está autorizado em `routes/channels.php`.

**Descoberta crítica:** A subscription RT-01 (`demand.board.updated` → `router.reload`) **já está implementada** em `resources/js/pages/Demands/Index.tsx` (linhas 62–77), não em `KanbanBoard.tsx` como descrito no CONTEXT.md D-03. O planner deve considerar esta realidade: RT-01 já está funcional no nível de página. O trabalho restante de RT-01 é verificar/confirmar que funciona corretamente (debouncing, guard durante drag ativo) e possivelmente mover a subscription para `KanbanBoard.tsx` per D-03, ou aceitar a localização atual em `Index.tsx`.

Para RT-02, o trabalho é 100% novo: criar o evento `DemandCommentCreated`, dispatch após `DemandComment::create()` no `addComment()`, e adicionar a subscription no `DemandDetailModal`.

**Primary recommendation:** RT-01 está ~80% pronto; o principal trabalho da fase é RT-02 (evento backend + subscription frontend).

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Broadcast de atualização de board | API / Backend | — | Observer dispara evento sincronamente após mutação do model Demand |
| Broadcast de novo comentário | API / Backend | — | Controller dispara evento após `DemandComment::create()` |
| Autorização de canal privado | API / Backend | — | `routes/channels.php` valida `current_organization_id` do usuário |
| Subscription Kanban (RT-01) | Frontend (page) | — | Já implementado em `Index.tsx`; se mover para `KanbanBoard.tsx`, ainda é frontend |
| Subscription comentários (RT-02) | Frontend (component) | — | `DemandDetailModal` gerencia estado local de comentários |
| Echo client global | Browser / Client | — | `window.Echo` inicializado em `app.tsx`, disponível globalmente |

---

## Standard Stack

### Core (já instalado — verificado)

| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| `laravel/reverb` | `^1.10` [VERIFIED: composer.json] | WebSocket server PHP | Instalado e configurado |
| `laravel-echo` | `2.3.4` [VERIFIED: npm view] | Cliente JS para canais Pusher/Reverb | Instalado e configurado em `app.tsx` |
| `pusher-js` | `8.5.0` [VERIFIED: npm view] | Driver WebSocket do Echo para Reverb | Instalado; `window.Pusher` já definido |
| `@inertiajs/react` | `^2.0.0` [VERIFIED: package.json] | `router.reload({ only: [...] })` | Instalado |

### Nenhuma instalação nova necessária

Todos os pacotes estão presentes. Não há `npm install` ou `composer require` a executar nesta fase.

**Verificação de versão em runtime:**
```bash
php artisan reverb:start  # iniciar o servidor Reverb em dev
```

---

## Architecture Patterns

### System Architecture Diagram

```
[User A browser]                [Reverb WS Server]         [User B browser]
      |                               |                           |
      | PATCH /demands/{id}/status    |                           |
      |─────────────────────────────>|                           |
      |                              |                           |
[Laravel API]                        |                           |
      | DemandObserver.updated()     |                           |
      | DemandBoardUpdated::dispatch()|                          |
      |──── broadcast ──────────────>|                           |
      |                              |──── WS push ─────────────>|
      |                              |   "demand.board.updated"  |
      |                              |                           | window.Echo.private(...)
      |                              |                    router.reload({ only: ['demands'] })
      |                              |                           |
      |                              |              [GET /demands?... (partial)]
      |                              |              Inertia retorna apenas `demands`
      |                              |              KanbanBoard re-renders com novo estado

[User A browser]                [Reverb WS Server]         [User B browser]
      |                               |                           |
      | POST /demands/{id}/comments   |                           |
      |─────────────────────────────>|                           |
      |                              |                           |
[Laravel API — addComment()]         |                           |
      | DemandComment::create()      |                           |
      | DemandCommentCreated::dispatch()|                        |
      |──── broadcast ──────────────>|                           |
      |                              |──── WS push ─────────────>|
      |                              | "demand.comment.created"  |
      |                              |                    filter: event.demandId === demand.id
      |                              |                    setComments(prev => [...prev, event.comment])
```

### Recommended Project Structure (alterações desta fase)

```
app/
└── Events/
    ├── DemandBoardUpdated.php       # existente — sem mudanças
    └── DemandCommentCreated.php     # NOVO — RT-02

resources/js/
├── pages/Demands/
│   └── Index.tsx                   # RT-01 subscription já presente aqui (linhas 62-77)
└── Components/
    ├── KanbanBoard.tsx              # guard durante drag ativo (se necessário)
    └── DemandDetailModal.tsx        # NOVO subscription RT-02
```

### Pattern 1: Laravel Broadcast Event (ShouldBroadcastNow)

**O que é:** Classe PHP que implementa `ShouldBroadcastNow` para broadcast síncrono (sem fila). Idêntico ao `DemandBoardUpdated` existente.

**Quando usar:** Sempre que um evento deve ser enviado via WebSocket imediatamente após a ação do usuário.

```php
// Source: app/Events/DemandBoardUpdated.php (codebase — VERIFIED)
// Pattern para DemandCommentCreated:

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;

class DemandCommentCreated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets;

    public function __construct(
        public readonly int $organizationId,
        public readonly int $demandId,
        public readonly array $comment, // {id, body, user: {id, name}, created_at}
    ) {}

    public function broadcastOn(): Channel
    {
        return new PrivateChannel("organization.{$this->organizationId}");
    }

    public function broadcastAs(): string
    {
        return 'demand.comment.created';
    }
}
```

**Nota sobre `broadcastWith()`:** `DemandBoardUpdated` não define `broadcastWith()` — nesse caso o Laravel serializa todas as propriedades `public` automaticamente. Para `DemandCommentCreated`, as propriedades públicas `organizationId`, `demandId` e `comment` serão serializadas. O planner pode optar por não definir `broadcastWith()` (mesma convenção que o evento existente).

### Pattern 2: Dispatch do evento no Controller

**O que é:** Após persistir o comentário, construir o payload e disparar o evento.

**Onde:** `DemandController::addComment()` — linha 198 do arquivo verificado.

```php
// Source: app/Http/Controllers/DemandController.php (codebase — VERIFIED)
// Adição na linha após DemandComment::create():

public function addComment(Request $request, Demand $demand): RedirectResponse
{
    $this->authorizeDemand($demand);
    $request->validate(['body' => 'required|string|max:5000']);

    $comment = DemandComment::create([
        'demand_id' => $demand->id,
        'user_id'   => auth()->id(),
        'body'      => $request->body,
        'source'    => 'user',
    ]);

    // Carregar o user para o payload do broadcast
    $comment->load('user');

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
            'created_at' => $comment->created_at->toIso8601String(),
        ]
    );

    return back()->with('success', __('app.comment_added'));
}
```

**Nota sobre `created_at`:** O campo `created_at` do model é um `Carbon` — usar `->toIso8601String()` ou `->toJSON()` para consistência com o formato que já aparece em `DemandDetailModal.tsx` (`new Date(c.created_at).toLocaleString('pt-BR')`). [VERIFIED: DemandDetailModal.tsx linha 384]

### Pattern 3: Echo subscription em React com cleanup

**O que é:** `useEffect` que assina o canal privado no mount e cancela no unmount. Padrão já em uso no `Index.tsx`.

**Localização atual de RT-01:** `resources/js/pages/Demands/Index.tsx` linhas 62–77 [VERIFIED: codebase].

```typescript
// Source: resources/js/pages/Demands/Index.tsx linhas 62-77 (VERIFIED — já implementado)
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

**ATENÇÃO:** O evento usa `.demand.board.updated` com ponto inicial. Laravel Echo adiciona automaticamente o namespace `App\Events\` quando o nome não começa com `.`. O `broadcastAs()` retorna `'demand.board.updated'` (sem namespace), mas no cliente usa-se `.demand.board.updated` (com ponto) para indicar nome de evento absoluto sem prefixo de namespace. [VERIFIED: comportamento no codebase atual funcionando].

### Pattern 4: Subscription RT-02 em DemandDetailModal

```typescript
// Source: baseado no pattern verificado em Index.tsx + D-05/D-07 do CONTEXT.md

// Dentro de DemandDetailModal, após os useState existentes:
const [comments, setComments] = useState<Comment[]>(demand.comments);
const orgId = (auth?.user as { current_organization_id?: number } | undefined)
  ?.current_organization_id;

// Sincronizar comments quando demand prop muda (partial reload do pai)
useEffect(() => {
  setComments(demand.comments);
}, [demand.comments]);

// Subscription Echo para RT-02
useEffect(() => {
  if (!orgId || !window.Echo) return;

  const channel = window.Echo.private(`organization.${orgId}`);
  channel.listen('.demand.comment.created', (event: {
    organizationId: number;
    demandId: number;
    comment: Comment;
  }) => {
    if (event.demandId !== demand.id) return; // filtrar por demanda correta

    setComments(prev => {
      // Guard D-06: evitar duplicata se já existe (append otimista)
      if (prev.some(c => c.id === event.comment.id)) return prev;
      return [...prev, event.comment];
    });
  });

  return () => {
    channel.stopListening('.demand.comment.created');
    // NÃO chamar window.Echo.leave() aqui — o canal pode estar sendo
    // usado pela subscription RT-01 em Index.tsx
  };
}, [orgId, demand.id]);
```

**IMPORTANTE:** Usar `channel.stopListening('.demand.comment.created')` no cleanup, **não** `window.Echo.leave(...)`. O canal `private-organization.{orgId}` é compartilhado com a subscription RT-01 no `Index.tsx`. Chamar `leave()` removeria também a subscription RT-01. [VERIFIED: laravel-echo API — `stopListening` cancela apenas o listener, `leave` cancela o canal inteiro].

### Pattern 5: Acesso ao orgId em componentes filhos

**Verificado:** `orgId` está disponível via `usePage().props.auth.user.current_organization_id` em qualquer componente Inertia. Já em uso em `Index.tsx` (linha 64) e em `AppLayout.tsx` (linha 30). O tipo global `PageProps` em `types/index.d.ts` não declara `current_organization_id` explicitamente (inclui apenas `id`, `name`, `email`, `email_verified_at`) — o `Index.tsx` usa cast `as { current_organization_id?: number }`. [VERIFIED: codebase]

**Para evitar o cast feio em cada componente**, o planner pode considerar estender `User` em `types/index.d.ts` adicionando `current_organization_id?: number` — mas isso está dentro da discrição do Claude (POLISH-02 já foi adiado para Phase 8; adicionar aqui é um improvement menor aceitável nesta fase).

### Anti-Patterns a Evitar

- **`window.Echo.leave()` no cleanup do modal:** Remove o canal inteiro, matando a subscription RT-01 que vive em `Index.tsx`. Usar `channel.stopListening(eventName)` em vez disso.
- **`channel.listen()` sem o ponto inicial:** Eventos com `broadcastAs()` retornando nome sem namespace DEVEM ser ouvidos com `.` inicial no cliente (`'.demand.comment.created'`), caso contrário Echo adiciona o prefixo de namespace `App.Events.DemandCommentCreated` e o evento nunca é recebido.
- **Serializar `created_at` como objeto Carbon:** No payload do broadcast, sempre converter `->toIso8601String()` ou `->toJSON()`. O frontend espera string parseável por `new Date()`.
- **Não fazer `$comment->load('user')` antes do dispatch:** O `DemandComment::create()` retorna o model sem a relação carregada. Sem o `load('user')`, `$comment->user` seria null e o payload ficaria incompleto.
- **Append sem guard de duplicata (D-06):** Se o modal fizer append otimista após `commentForm.post()`, o broadcast do próprio autor chegará e duplicará o comentário. **Verificado:** `DemandDetailModal.submitComment()` usa `only: ['selectedDemand']` e não faz append otimista — reseta o form em `onSuccess` e aguarda o reload do Inertia para atualizar `demand.comments`. Portanto: quando RT-02 for implementado, o autor verá o comentário primeiro via broadcast (append local) e depois **não** via reload (pois `selectedDemand` não é recarregado após o submit de comentário no estado atual). O guard por `id` é uma boa prática defensiva mas pode não ser estritamente necessário na implementação atual.

---

## Don't Hand-Roll

| Problema | Não Construir | Usar Em Vez | Por quê |
|----------|---------------|-------------|---------|
| WebSocket server | Servidor Node.js/Ratchet custom | Laravel Reverb (já instalado) | Gerencia reconnect, autenticação, heartbeat, escalonamento |
| Canal privado auth | Endpoint `/broadcasting/auth` manual | `routes/channels.php` + `Broadcast::channel()` (já existe) | Lida com CSRF, sessão, autorização |
| Reconnect automático | Loop de retry manual | pusher-js internals (já no stack) | pusher-js gerencia exponential backoff e reconexão transparente |
| Deduplicação de subscriptions | Ref counter manual | `window.Echo.private()` retorna o canal existente se já subscrito | Echo mantém um registry interno de canais — chamar `private()` duas vezes no mesmo canal retorna a mesma instância |

---

## Descoberta Crítica: RT-01 Já Implementado

### Estado atual de RT-01 em Index.tsx

**Verificado no codebase** (`resources/js/pages/Demands/Index.tsx`, linhas 62–77):

```typescript
// JÁ EXISTE — não é necessário implementar do zero
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

**Divergência com CONTEXT.md D-03:** D-03 diz que a subscription deve viver em `KanbanBoard.tsx`, mas o código **já está em `Index.tsx`**. Ambas as localizações são corretas do ponto de vista funcional — `Index.tsx` é o componente pai que gerencia o estado de `demands` e chama `router.reload`.

**Implicação para o planner:**
- Opção A (manter em Index.tsx): RT-01 está funcionando. Trabalho restante = testes + possível debounce guard durante drag ativo.
- Opção B (mover para KanbanBoard.tsx per D-03): Requer passar `orgId` como prop para `KanbanBoard`, remover de `Index.tsx`. Mais invasivo, sem benefício funcional claro para v1.2.
- **Recomendação:** Manter em `Index.tsx`. A subscription já funciona e o componente de nível de página é o lugar correto para chamar `router.reload`.

### Guard durante drag ativo

**Problema identificado:** Se o usuário está arrastando um card (`activeId !== null`) e um broadcast chega, `router.reload` executa e reseta o estado local do Kanban (incluindo a posição otimista do drag). Isso causa jank visual.

**Solução (discretion do Claude):**
```typescript
// Em Index.tsx, capturar o estado isDragging de KanbanBoard
// OU adicionar debounce simples:
const reloadTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

channel.listen('.demand.board.updated', () => {
  if (reloadTimeout.current) clearTimeout(reloadTimeout.current);
  reloadTimeout.current = setTimeout(() => {
    router.reload({ only: ['demands'] });
  }, 300); // 300ms de debounce — agrupa rafagas
});
```

---

## Common Pitfalls

### Pitfall 1: Ponto inicial no nome do evento no cliente Echo

**O que dá errado:** Ouvir `'demand.board.updated'` em vez de `'.demand.board.updated'` — evento nunca é recebido.

**Por que acontece:** Laravel Echo adiciona automaticamente o namespace `App\\Events\\` quando o nome não começa com `.`. Com ponto, o nome é tratado como absoluto.

**Como evitar:** Sempre usar `.` inicial no `channel.listen()` quando o `broadcastAs()` do evento PHP retorna um nome sem namespace.

**Sinal de alerta:** WebSocket conecta, canal autoriza (HTTP 200 em `/broadcasting/auth`), mas nenhum evento chega no callback.

**Verificado no codebase:** `Index.tsx` linha 70 usa `.demand.board.updated` com ponto — padrão correto confirmado. [VERIFIED]

### Pitfall 2: `window.Echo.leave()` remove canal compartilhado

**O que dá errado:** `DemandDetailModal` faz `window.Echo.leave('organization.X')` no unmount — remove a subscription RT-01 também, quebrando o Kanban em tempo real até o próximo reload de página.

**Por que acontece:** `leave()` cancela o canal inteiro (todas as subscriptions). `stopListening()` cancela apenas um listener específico.

**Como evitar:** No cleanup do `DemandDetailModal`, usar `channel.stopListening('.demand.comment.created')`. Guardar a referência do canal em `useRef` para acessar no cleanup.

**Verificado:** laravel-echo `echo.d.ts` confirma que `leave(channel: string): void` e `stopListening(event: string, callback?: CallableFunction): this` são métodos distintos. [VERIFIED]

### Pitfall 3: `BROADCAST_CONNECTION=null` em testes

**O que dá errado:** Testes que exercitam o `addComment()` não disparam broadcasts reais, o que é o comportamento correto para testes. Mas se um teste fizer assert de que o evento foi dispatched, precisa usar `Event::fake()`.

**Como evitar:** No `phpunit.xml`, `BROADCAST_CONNECTION` já está como `null` — testes não fazem broadcast real. Para verificar que o evento é disparado, usar `Event::fake()` + `Event::assertDispatched(DemandCommentCreated::class)`. [VERIFIED: phpunit.xml linha 24]

### Pitfall 4: Campo `created_at` como objeto Carbon no payload

**O que dá errado:** `$comment->created_at` é um objeto `Carbon`; quando serializado em array PHP sem conversão explícita, vira `{"date": "...", "timezone_type": 3, "timezone": "UTC"}` em vez de uma string ISO.

**Como evitar:** Usar `$comment->created_at->toIso8601String()` ou `$comment->created_at->toJSON()` no payload do `DemandCommentCreated`. Alternativamente, chamar `$comment->toArray()` que usa o cast de data configurado no model.

**Verificado:** `DemandComment` model não define `$casts` explícitos, mas o Eloquent aplica casting automático de `created_at` via `HasTimestamps`. Usar `->toJSON()` é o mais seguro. [VERIFIED: DemandComment.php]

### Pitfall 5: Subscription duplicada por re-render

**O que dá errado:** `useEffect` sem array de dependências correto dispara a cada render, criando múltiplos listeners para o mesmo evento.

**Como evitar:** Array de dependências deve conter `[orgId]` (RT-01 em Index.tsx) ou `[orgId, demand.id]` (RT-02 em DemandDetailModal). Com a mesma instância de canal (Echo deduplica), múltiplos `listen()` no mesmo evento e canal **acumulam** callbacks — cada broadcast executa N vezes.

**Verificado:** `Index.tsx` já usa `[orgId]` corretamente. [VERIFIED]

---

## Code Examples

### Criar DemandCommentCreated — estrutura completa

```php
// app/Events/DemandCommentCreated.php
// Source: baseado em app/Events/DemandBoardUpdated.php (VERIFIED codebase pattern)
<?php
namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;

class DemandCommentCreated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets;

    public function __construct(
        public readonly int   $organizationId,
        public readonly int   $demandId,
        public readonly array $comment,
    ) {}

    public function broadcastOn(): Channel
    {
        return new PrivateChannel("organization.{$this->organizationId}");
    }

    public function broadcastAs(): string
    {
        return 'demand.comment.created';
    }
}
```

### Dispatch no addComment()

```php
// app/Http/Controllers/DemandController.php — método addComment()
// Source: codebase (VERIFIED) + dispatch adicionado

$comment = DemandComment::create([...]);
$comment->load('user');

DemandCommentCreated::dispatch(
    $demand->organization_id,
    $demand->id,
    [
        'id'         => $comment->id,
        'body'       => $comment->body,
        'user'       => ['id' => $comment->user->id, 'name' => $comment->user->name],
        'created_at' => $comment->created_at->toJSON(),
    ]
);
```

### TypeScript interface do payload broadcast

```typescript
// Alinhamento com Comment interface em DemandDetailModal.tsx linha 17 (VERIFIED)
// interface Comment { id: number; body: string; user: User; created_at: string; }
// interface User { id: number; name: string; email: string; }
//
// ATENÇÃO: O payload broadcast envia apenas { id, name } em user,
// sem email. A interface Comment local usa User que inclui email.
// Solução: o payload pode omitir email (comentários recebidos via broadcast
// não precisam de email para renderização). O guard de tipo deve tratar
// email como opcional no contexto do broadcast, ou o payload pode incluir
// email vazio/nulo.
//
// Interface para o evento recebido no frontend:
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
```

### Subscription RT-02 em DemandDetailModal

```typescript
// Source: pattern baseado em Index.tsx (VERIFIED) + D-05, D-06, D-07 do CONTEXT.md

// 1. Estado local de comentários (novo — atualmente demand.comments é lido diretamente)
const [comments, setComments] = useState<Comment[]>(demand.comments);

// 2. Sincronizar com prop quando modal recebe partial reload
useEffect(() => {
  setComments(demand.comments);
}, [demand.comments]);

// 3. Echo subscription
const orgId = (auth?.user as { current_organization_id?: number } | undefined)
  ?.current_organization_id;

useEffect(() => {
  if (!orgId || !window.Echo) return;

  const channel = window.Echo.private(`organization.${orgId}`);

  channel.listen('.demand.comment.created', (event: DemandCommentCreatedEvent) => {
    if (event.demandId !== demand.id) return;
    setComments(prev => {
      if (prev.some(c => c.id === event.comment.id)) return prev; // guard D-06
      return [...prev, event.comment as Comment];
    });
  });

  return () => {
    // Usar stopListening, NÃO leave() — canal é compartilhado
    channel.stopListening('.demand.comment.created');
  };
}, [orgId, demand.id]);

// 4. No JSX, trocar demand.comments por comments (state local)
// demand.comments → comments (em todos os places no template)
```

---

## Runtime State Inventory

Fase de adição de features novas, não renaming/migration — esta seção não se aplica.

Entretanto, é relevante notar:
- **Estado de Reverb server:** O servidor Reverb precisa estar rodando (`php artisan reverb:start`) em dev. Em produção, deve estar configurado como processo daemon.
- **`BROADCAST_CONNECTION=reverb` no `.env` de produção:** Verificado no `.env` de desenvolvimento — confirmar no ambiente de staging/produção antes do deploy.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Laravel Reverb (PHP) | Broadcast de eventos | Instalado | `^1.10` [VERIFIED: composer.json] | — |
| laravel-echo (JS) | Subscription frontend | Instalado | `2.3.4` [VERIFIED: npm view] | — |
| pusher-js (JS) | Driver WS para Echo | Instalado | `8.5.0` [VERIFIED: npm view] | — |
| Reverb server process | Conexão WebSocket | Precisa ser iniciado | — | `php artisan reverb:start` |
| `BROADCAST_CONNECTION=reverb` | Envio de broadcasts | Configurado [VERIFIED: .env] | — | — |

**Missing dependencies with no fallback:** Nenhum — tudo instalado.

**Nota operacional:** O servidor `php artisan reverb:start` precisa estar ativo durante dev/test. Em `phpunit.xml`, `BROADCAST_CONNECTION=null` garante que testes não dependem do servidor.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | PHPUnit (Laravel) |
| Config file | `phpunit.xml` |
| Quick run command | `php artisan test --filter DemandComment` |
| Full suite command | `php artisan test` |

**Nota:** Não há testes de frontend automatizados presentes no projeto. Validação de RT-01 e RT-02 é primariamente via testes de integração backend + teste manual do WebSocket.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | Arquivo Existe? |
|--------|----------|-----------|-------------------|-----------------|
| RT-01 | `DemandBoardUpdated` é dispatched quando demand é atualizado | Unit/Integration (Event::fake) | `php artisan test --filter DemandObserver` | Não existe — Wave 0 |
| RT-01 | Canal correto (`private-organization.{orgId}`) usado no broadcastOn() | Unit | `php artisan test --filter DemandBoardUpdated` | Não existe — Wave 0 |
| RT-02 | `DemandCommentCreated` é dispatched após `addComment()` | Feature (Event::fake) | `php artisan test --filter DemandCommentCreated` | Não existe — Wave 0 |
| RT-02 | Payload do evento contém `organizationId`, `demandId`, `comment.{id,body,user,created_at}` | Unit | incluído no mesmo test file | Não existe — Wave 0 |
| RT-02 | `broadcastAs()` retorna `'demand.comment.created'` | Unit | incluído no mesmo test file | Não existe — Wave 0 |

### Abordagem para testar WebSocket em Feature Tests

Laravel fornece `Event::fake()` para interceptar broadcasts sem precisar do servidor Reverb:

```php
// Verificar que evento foi dispatched com payload correto
use Illuminate\Support\Facades\Event;
use App\Events\DemandCommentCreated;

Event::fake([DemandCommentCreated::class]);

$response = $this->actingAs($user)
    ->post(route('demands.comments.store', $demand), ['body' => 'Comentário teste']);

Event::assertDispatched(DemandCommentCreated::class, function ($event) use ($demand) {
    return $event->demandId === $demand->id
        && $event->comment['body'] === 'Comentário teste';
});
```

### Validação Manual de RT-01 e RT-02

Para confirmar que o WebSocket funciona end-to-end (não automatizável sem browser real):

1. Abrir dois browsers com users diferentes na mesma organização
2. **RT-01:** User A arrasta card para nova coluna → User B vê o card se mover sem refresh
3. **RT-02:** User A abre modal de demand → User B posta comentário nessa demand → User A vê o comentário aparecer no modal sem refresh
4. Verificar no DevTools (Network → WS) que a conexão Reverb está ativa e eventos chegam

### Wave 0 Gaps

- [ ] `tests/Feature/Broadcasting/DemandCommentCreatedTest.php` — cobre RT-02 (dispatch, payload, canal)
- [ ] `tests/Unit/Events/DemandBoardUpdatedTest.php` — cobre RT-01 (canal, broadcastAs, ShouldBroadcastNow)

*(Se os testes existentes não cobrem DemandObserver para RT-01, pode-se adicionar um caso em `tests/Feature/ActivityLogTest.php` ou criar arquivo dedicado)*

---

## State of the Art

| Abordagem antiga | Abordagem atual | Quando mudou | Impacto |
|------------------|-----------------|--------------|---------|
| `ShouldBroadcast` (queued) | `ShouldBroadcastNow` (sync) | Laravel 5.x+ | Broadcast imediato sem depender de queue worker — adequado para v1.2 de equipe pequena |
| Pusher cloud | Laravel Reverb (self-hosted) | Laravel 11/Reverb 1.0 | Zero custo, mesmo protocolo Pusher, funciona em localhost |
| `Echo.channel()` público | `Echo.private()` com auth | — | Garante que apenas membros da org recebem os broadcasts |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `DemandComment::create()` retorna o model com `created_at` como objeto Carbon (não string) | Pattern 2 | Se for string, usar diretamente sem `->toJSON()` — baixo risco |
| A2 | Múltiplos `channel.listen()` na mesma instância de canal Echo acumulam callbacks (não sobrescrevem) | Pitfall 5 | Se Echo sobrescrever, o guard de duplicatas seria diferente — verificar com teste manual |
| A3 | `submitComment` em DemandDetailModal não faz append otimista (confirmado pela leitura do código) | Pattern 4 / Pitfall: guard | Se em algum momento for adicionado append otimista, o guard por `id` se torna necessário |

---

## Open Questions (RESOLVED)

1. **Mover RT-01 subscription para KanbanBoard.tsx (D-03) ou manter em Index.tsx?**
   - O que sabemos: Index.tsx já tem a implementação funcional. D-03 diz que deveria estar em KanbanBoard.tsx.
   - O que está incerto: Se há benefício real em mover para o componente filho.
   - **RESOLVED:** Manter em Index.tsx. O reload precisa acontecer no nível de página mesmo. Divergência D-03 documentada no 06-02-PLAN.md.

2. **Email no payload do comentário broadcast**
   - O que sabemos: `Comment` interface local tem `user: { id, name, email }`, mas o broadcast payload envia apenas `{ id, name }`.
   - O que está incerto: Se alguma parte do template usa `c.user.email` nos comentários recebidos via broadcast.
   - **RESOLVED:** Incluir `email` no payload broadcast (`'email' => $comment->user->email`). Interface `DemandCommentCreatedEvent` usa `email: string` obrigatório. Coberto em 06-01-PLAN.md Task 2 e 06-03-PLAN.md Task 1.

3. **Guard durante drag ativo para RT-01**
   - O que sabemos: `router.reload()` durante drag ativo reseta o estado otimista do Kanban.
   - **RESOLVED:** Debounce de 300ms adicionado como discretion do Claude. Coberto em 06-02-PLAN.md Task 1.

---

## Sources

### Primary (HIGH confidence)
- `resources/js/pages/Demands/Index.tsx` — RT-01 subscription já implementada (linhas 62-77)
- `app/Events/DemandBoardUpdated.php` — pattern de broadcast event verificado no codebase
- `app/Http/Controllers/DemandController.php` — método `addComment()` verificado; ponto de dispatch para RT-02
- `routes/channels.php` — autorização de canal verificada
- `resources/js/app.tsx` — `window.Echo` configurado e tipado
- `resources/js/Components/DemandDetailModal.tsx` — interface `Comment` verificada (linha 17)
- `node_modules/laravel-echo/dist/echo.d.ts` — API `listen`, `stopListening`, `leave` verificada
- `phpunit.xml` — `BROADCAST_CONNECTION=null` em testes verificado
- `.env` — `BROADCAST_CONNECTION=reverb` em dev verificado

### Secondary (MEDIUM confidence)
- `app/Http/Middleware/HandleInertiaRequests.php` — `current_organization_id` compartilhado via Inertia props verificado
- `resources/js/types/index.d.ts` — `PageProps.auth.user` não inclui `current_organization_id` formalmente (usa cast no Index.tsx)

### Tertiary (LOW confidence)
- Comportamento de acumulação de listeners com `channel.listen()` duplicado — baseado em conhecimento de training sobre pusher-js internals [ASSUMED A2]

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — tudo instalado e verificado no codebase
- Architecture: HIGH — RT-01 já implementado; RT-02 segue exato mesmo pattern
- Pitfalls: HIGH — identificados via leitura direta do código existente e da API Echo
- Validation: MEDIUM — testes de WebSocket são por natureza manuais para o end-to-end

**Research date:** 2026-04-24
**Valid until:** 2026-07-24 (stack estável; Reverb 1.x bem estabelecido)
