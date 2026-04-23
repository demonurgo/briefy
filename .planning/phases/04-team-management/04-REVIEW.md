---
phase: 04-team-management
reviewed: 2026-04-23T00:00:00Z
depth: standard
files_reviewed: 42
files_reviewed_list:
  - app/Http/Controllers/AiBriefController.php
  - app/Http/Controllers/AiChatController.php
  - app/Http/Controllers/ArchiveController.php
  - app/Http/Controllers/Auth/RegisteredUserController.php
  - app/Http/Controllers/ClientAiMemoryController.php
  - app/Http/Controllers/ClientController.php
  - app/Http/Controllers/ClientResearchController.php
  - app/Http/Controllers/DashboardController.php
  - app/Http/Controllers/DemandController.php
  - app/Http/Controllers/InvitationController.php
  - app/Http/Controllers/MonthlyPlanningController.php
  - app/Http/Controllers/Settings/ProfileController.php
  - app/Http/Controllers/Settings/SettingsController.php
  - app/Http/Controllers/TeamController.php
  - app/Http/Controllers/TrashController.php
  - app/Http/Middleware/AiUsageMeter.php
  - app/Http/Middleware/EnsureRole.php
  - app/Http/Middleware/HandleInertiaRequests.php
  - app/Mail/InvitationMail.php
  - app/Models/Invitation.php
  - app/Models/Organization.php
  - app/Models/User.php
  - bootstrap/app.php
  - database/factories/UserFactory.php
  - database/migrations/2026_04_23_300000_create_organization_user_table_and_rename_column.php
  - database/migrations/2026_04_23_300100_create_invitations_table.php
  - database/migrations/2026_04_23_300200_add_avatar_to_users_table.php
  - database/migrations/2026_04_23_300300_expand_role_enum_on_users_table.php
  - resources/js/Components/UserAvatar.tsx
  - resources/js/layouts/AppLayout.tsx
  - resources/js/pages/Invite/Accept.tsx
  - resources/js/pages/Settings/Index.tsx
  - resources/views/mail/invitation.blade.php
  - routes/web.php
  - tests/Feature/Auth/RegistrationTest.php
  - tests/Feature/EnsureRoleTest.php
  - tests/Feature/InvitationAcceptTest.php
  - tests/Feature/InvitationControllerTest.php
  - tests/Feature/ProfileControllerTest.php
  - tests/Feature/SettingsControllerTest.php
  - tests/Feature/TeamRoleTest.php
  - tests/Feature/TeamRosterTest.php
findings:
  critical: 3
  warning: 6
  info: 5
  total: 14
status: issues_found
---

# Fase 04: Relatório de Revisão de Código — Team Management

**Revisado:** 2026-04-23
**Profundidade:** standard
**Arquivos Revisados:** 42
**Status:** issues_found

---

## Sumário

A fase 04 implementa gestão de equipe (convites, papéis, remoção), avatar de usuário, org-switcher, página unificada de configurações e as migrações de suporte. A arquitetura geral é sólida: escopo por organização está presente em todos os controllers, tokens UUID são usados para convites, e a proteção contra demoção do `owner` existe tanto no backend quanto nos testes. Foram encontrados **3 problemas críticos**, **6 avisos** e **5 informacionais**.

Os problemas críticos envolvem: (1) um token de convite exposto no e-mail aponta para a rota `store` em vez de `show`, impedindo o fluxo correto de aceite; (2) `getCurrentRoleAttribute()` dispara uma query a cada chamada — funções de autorização chamadas múltiplas vezes por requisição lançam N+1 silencioso capaz de causar bug de autorização se o cache de relacionamento for descartado; (3) `InvitationController::store` atualiza `users.role` globalmente mas não verifica se o usuário já está logado antes de fazer login, permitindo que um usuário autenticado em outra sessão seja silenciosamente re-autenticado.

---

## Problemas Críticos

### CR-01: URL do e-mail de convite aponta para rota `store` em vez de `show`

**Arquivo:** `app/Mail/InvitationMail.php:35`

**Problema:** O link gerado para o e-mail de convite usa `route('invitations.store', ...)`, que corresponde ao endpoint `POST /invite/{token}/accept`. Um clique nesse link via navegador gera uma requisição `GET`, que não bate com o método da rota e resulta em erro 405 ou redirecionamento inesperado. O usuário convidado não consegue acessar a página de aceite ao clicar no link recebido por e-mail.

**Fix:**
```php
// app/Mail/InvitationMail.php:35
'acceptUrl' => route('invitations.show', $this->invitation->token),
```

---

### CR-02: `getCurrentRoleAttribute()` executa query a cada invocação — risco de autorização inconsistente sob cache parcial

**Arquivo:** `app/Models/User.php:62-66`

**Problema:** O método `getCurrentRoleAttribute()` faz uma query ao banco a cada chamada:
```php
return $this->organizations()
    ->wherePivot('organization_id', $this->current_organization_id)
    ->first()?->pivot?->role;
```
Ao longo de uma única requisição, `isAdminOrOwner()`, `isOwner()`, `isAdmin()` e `EnsureRole` middleware chamam esse método independentemente. Se o relacionamento `organizations` já tiver sido carregado em memória (via `load('organizations')` no `HandleInertiaRequests`), a query adicional contorna o eager-load e acessa o BD novamente — criando inconsistência se houver qualquer mudança concorrente de role entre chamadas na mesma requisição. Além disso, em controllers como `TeamController::updateRole` onde vários checks de autorização são feitos em sequência, cada check dispara uma query separada.

**Fix:** Adicionar memoização local na instância ou usar `$this->organizations` (já carregado) ao invés de refazer a query:
```php
public function getCurrentRoleAttribute(): ?string
{
    // Usa a coleção já carregada em memória se disponível
    if ($this->relationLoaded('organizations')) {
        return $this->organizations
            ->firstWhere('id', $this->current_organization_id)
            ?->pivot
            ?->role;
    }
    return $this->organizations()
        ->wherePivot('organization_id', $this->current_organization_id)
        ->first()?->pivot?->role;
}
```

---

### CR-03: `InvitationController::store` chama `Auth::login()` sem verificar sessão existente — usuário já autenticado sofre troca silenciosa de conta

**Arquivo:** `app/Http/Controllers/InvitationController.php:70` e `91`

**Problema:** Tanto no fluxo de usuário existente (linha 70) quanto no de novo usuário (linha 91), `Auth::login($user)` é chamado incondicionalmente. Se um usuário autenticado (ex: admin) abrir um link de convite de outra pessoa, ele será silenciosamente re-autenticado como o convidado. Isto não é verificado em nenhuma parte do fluxo. A rota é guest-accessible (sem middleware `auth`), portanto qualquer pessoa autenticada pode acionar essa troca.

**Fix:**
```php
// Antes de Auth::login() em ambos os ramos:
if (! auth()->check()) {
    Auth::login($existingUser); // ou $user para novo usuário
}
// Se já autenticado, apenas anexar o org e redirecionar,
// sem trocar a sessão do usuário atual.
```
Para o caso do usuário já autenticado, verificar se `auth()->id() === $existingUser->id` antes de fazer login e, caso sejam diferentes, retornar erro ou redirecionar sem trocar sessão.

---

## Avisos

### WR-01: `MonthlyPlanningController::convertBulk` não valida org-scoping antes de processar — verificação dentro do loop pode ser contornada

**Arquivo:** `app/Http/Controllers/MonthlyPlanningController.php:151-170`

**Problema:** Em `convertBulk`, as sugestões são buscadas com `whereIn('id', $request->ids)` sem filtro de organização. O check de organização é feito dentro do loop com `continue` em vez de `abort`. Um atacante autenticado que conheça IDs de sugestões de outra org pode enviá-los na requisição; o `continue` simplesmente os pula silenciosamente sem gerar log ou erro. A validação `exists:planning_suggestions,id` na linha 145 não verifica org-scoping.

**Fix:**
```php
// Antes do loop, filtrar apenas sugestões da org do usuário:
$suggestions = PlanningSuggestion::whereIn('id', $request->ids)
    ->whereHas('demand', fn($q) => $q->where('organization_id', $orgId))
    ->with('demand')
    ->get();
// Remover o `if ($s->demand->organization_id !== ...) continue;`
```

---

### WR-02: `SettingsController::switchOrg` valida apenas membership mas atualiza `current_organization_id` sem verificar se o ID fornecido é inteiro válido

**Arquivo:** `app/Http/Controllers/Settings/SettingsController.php:65`

**Problema:** A validação é `'organization_id' => 'required|integer'` mas não há `exists:organizations,id`. Um atacante pode enviar um ID de organização que existe mas ao qual o usuário não pertence — o check `wherePivot` protege isso, mas a ausência de `exists` significa que uma organização deletada ou inválida passa pela validação antes de ser rejeitada pelo `abort_if`.

**Fix:**
```php
$request->validate([
    'organization_id' => 'required|integer|exists:organizations,id',
]);
```

---

### WR-03: `DemandController::deleteComment` usa `isAdmin()` para permissão de moderação, mas `isAdmin()` delega para `isAdminOrOwner()`

**Arquivo:** `app/Http/Controllers/DemandController.php:220-222`

**Problema:** A linha `abort_if($comment->user_id !== auth()->id() && !auth()->user()->isAdmin(), 403)` tem semântica documentada como "apenas admins podem deletar comentários de outros", mas `isAdmin()` (linha 89 de User.php) é um alias para `isAdminOrOwner()`. Portanto, owners também podem deletar, o que é consistente com as intenções do sistema. O problema real é que o comentário "apenas admins" no código é enganoso e pode causar regressões futuras onde alguém adicionar verificação `isOwner()` separadamente achando que owners estão excluídos.

**Fix:** Substituir `isAdmin()` por `isAdminOrOwner()` na linha 221 para deixar a intenção explícita:
```php
abort_if($comment->user_id !== auth()->id() && !auth()->user()->isAdminOrOwner(), 403);
```

---

### WR-04: `UserAvatar` não valida que `avatar` é uma URL relativa segura — path armazenado é usado diretamente na tag `<img src>`

**Arquivo:** `resources/js/Components/UserAvatar.tsx:30`

**Problema:** O componente constrói a URL como `/storage/${avatar}` sem qualquer validação do valor de `avatar`. Se o campo `avatar` no banco de dados fosse corrompido com um caminho como `../../etc/passwd` ou uma URL absoluta `http://evil.com/img.jpg`, o navegador seguiria o link. No backend, o path é derivado do `user->id` (seguro), mas um administrador de banco de dados ou bug futuro poderia inserir valor arbitrário.

**Fix:** Validar no componente que o valor começa com o prefixo esperado:
```tsx
const safePath = avatar?.startsWith('avatars/') ? avatar : null;
if (safePath) {
  return <img src={`/storage/${safePath}`} ... />;
}
```

---

### WR-05: `EnsureRole` middleware redireciona para 403 se o usuário não está autenticado, mas deveria redirecionar para login

**Arquivo:** `app/Http/Middleware/EnsureRole.php:22-24`

**Problema:** Se `$request->user()` retornar `null` (usuário não autenticado que chegou a essa rota de alguma forma), o middleware retorna `abort(403)`. O comportamento correto para unauthenticated seria `abort(401)` ou redirecionar para login. Na prática, as rotas com `role:` estão dentro do grupo `auth`, então isso é protegido pelo middleware de autenticação; mas o `EnsureRole` sozinho é inseguro se aplicado fora do grupo auth, o que pode acontecer por erro de configuração futura.

**Fix:**
```php
if (!$user) {
    abort(401); // ou return redirect()->route('login');
}
```

---

### WR-06: `TrashController::forceDelete` carrega `$demand->files` sem eager-load explícito

**Arquivo:** `app/Http/Controllers/TrashController.php:71`

**Problema:** `$demand->files->each(...)` acessa a relação `files` no modelo já buscado, mas o modelo foi obtido via `Demand::onlyTrashed()->where(...)->findOrFail($id)` sem `->with('files')`. Isso gera uma query adicional lazy-loaded para carregar os arquivos. Se houver muitos arquivos, isso pode resultar em N+1 no loop `each`. Além disso, se a relação retornar null por algum erro, a chamada `->each()` em null causaria um erro fatal.

**Fix:**
```php
$demand = Demand::onlyTrashed()
    ->where('organization_id', $user->current_organization_id)
    ->with('files')  // eager-load explícito
    ->findOrFail($id);
```

---

## Informacionais

### IN-01: `InviteAccept.tsx` extrai token da URL via `window.location.pathname.split()` — frágil

**Arquivo:** `resources/js/pages/Invite/Accept.tsx:28`

**Problema:** O token é extraído manualmente do pathname com `window.location.pathname.split('/invite/')[1]?.split('/accept')[0]`. Isso é frágil: se a rota mudar, o split silenciosamente retornaria string vazia e `form.post(route('invitations.store', ''))` enviaria para uma rota inválida. O Inertia já possui o token disponível via props de rota.

**Fix:** Passar o token como prop do controller (já disponível como parâmetro da rota) e usar diretamente:
```php
// InvitationController::show():
'token' => $token,  // adicionar ao array de props
```
```tsx
// Accept.tsx:
const { token } = props; // em vez de extrair do pathname
```

---

### IN-02: `HandleInertiaRequests` expõe `client_research_agent_id` e `client_research_environment_id` como props globais

**Arquivo:** `resources/js/pages/Settings/Index.tsx:75-76`

**Problema:** Os campos `client_research_agent_id` e `client_research_environment_id` da organização são compartilhados via Inertia shared props para todos os usuários autenticados (lidos em Settings/Index via `user.organization`). Esses são identificadores de configuração de infraestrutura que deveriam estar visíveis apenas para admins/owners. Colaboradores recebem esses IDs via shared props.

**Sugestão:** Filtrar esses campos na share do `HandleInertiaRequests` ou no `SettingsController::index` para retorná-los apenas quando `$user->isAdminOrOwner()`.

---

### IN-03: `UserFactory` define `role` padrão como `'admin'` — pode mascarar bugs de autorização em testes

**Arquivo:** `database/factories/UserFactory.php:35`

**Problema:** O factory padrão cria usuários com `role => 'admin'`. Testes que instanciam `User::factory()->create()` sem especificar role têm permissões elevadas por padrão. Isso pode mascarar bugs de autorização onde a lógica deveria rejeitar um `collaborator` mas o teste usa o factory padrão que é admin.

**Sugestão:** Alterar o padrão para `'collaborator'` (o menor privilégio) e criar estados explícitos `->admin()` e `->owner()`.

---

### IN-04: `ArchiveController::index` usa `ilike` sem verificar se o driver é PostgreSQL

**Arquivo:** `app/Http/Controllers/ArchiveController.php:22`

**Problema:** A query usa `'ilike'` (case-insensitive LIKE do PostgreSQL). Se o ambiente de desenvolvimento usar SQLite (comum em testes), `ilike` não é suportado e os testes de busca falhariam. O mesmo padrão existe em `DemandController` e `ClientController`.

**Sugestão:** Usar `whereRaw('LOWER(title) LIKE ?', ['%' . strtolower($s) . '%'])` para compatibilidade cross-database, ou documentar explicitamente que PostgreSQL é obrigatório em `CLAUDE.md`.

---

### IN-05: `InvitationMail` não está na fila (queue) — envio síncrono pode travar a requisição HTTP

**Arquivo:** `app/Mail/InvitationMail.php:14`

**Problema:** `InvitationMail` usa `Queueable` mas é enviado com `Mail::to()->send()` (síncrono) em `TeamController::invite` (linha 65) e `TeamController::resendInvitation` (linha 100). O `use Queueable` não tem efeito sem `Mail::to()->queue()`. Se o servidor de e-mail estiver lento ou indisponível, a requisição HTTP do admin fica bloqueada.

**Sugestão:** Substituir `Mail::to(...)->send(...)` por `Mail::to(...)->queue(...)` em `TeamController`, ou usar `Mail::later()` com delay mínimo.

---

_Revisado: 2026-04-23_
_Revisor: Claude (gsd-code-reviewer)_
_Profundidade: standard_
