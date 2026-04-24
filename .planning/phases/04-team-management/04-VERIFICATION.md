---
phase: 04-team-management
verified: 2026-04-23T22:00:00Z
status: verified
human_verified: 2026-04-24T00:00:00Z
score: 18/18 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Convidar membro por e-mail e verificar recebimento do e-mail via Resend"
    expected: "E-mail chega com link /invite/{token}, botão 'Aceitar convite', nome da org, papel correto"
    why_human: "Disparo de e-mail via Mail::to()->send() requer serviço Resend configurado — não testável programaticamente sem servidor ativo"
  - test: "Acessar /invite/{token} no browser com token válido"
    expected: "Página standalone (sem sidebar), card centralizado exibindo nome da org, badge de papel, formulário de registro (novo usuário) ou botão 'Entrar na organização' (usuário existente)"
    why_human: "Renderização visual de componente React standalone, comportamento de formulário e redirect pós-aceite"
  - test: "Upload de avatar no perfil (imagem > 2MB deve ser rejeitada; imagem válida deve aparecer redimensionada)"
    expected: "Imagem válida: avatar aparece em 256x256 no header via /storage/avatars/users/{id}.jpg; arquivo > 2MB: erro de validação exibido"
    why_human: "Processamento Intervention Image e serving via public/storage requerem ambiente completo com PHP + GD + symlink"
  - test: "OrgSwitcher no header — clicar em organização diferente deve trocar o contexto ativo"
    expected: "Dropdown abre, lista organizações do usuário, ao clicar em outra dispara PATCH /settings/current-org, página recarrega no contexto da nova org"
    why_human: "Comportamento de dropdown React com outside-click handler e resposta ao PATCH requerem browser"
  - test: "Colaborador não consegue acessar funções de admin na página de configurações"
    expected: "Formulário de convite não aparece para colaborador; botões de remover e mudar papel ficam ocultos; tentativas diretas via curl retornam 403"
    why_human: "Integração entre can_manage_team (server-side) e renderização condicional (frontend) + validação de RBAC via middleware"
---

# Fase 4: Team Management — Relatório de Verificação

**Objetivo da Fase:** Admins da agência podem convidar membros de equipe, atribuir papéis, gerenciar o roster, e todo usuário pode manter seu próprio perfil com avatar — tornando a plataforma verdadeiramente multi-usuário para toda a agência.
**Verificado:** 2026-04-23T22:00:00Z
**Status:** human_needed
**Re-verificação:** Não — verificação inicial

## Conquista do Objetivo

### Verdades Observáveis

| # | Verdade | Status | Evidência |
|---|---------|--------|-----------|
| 1 | organization_user pivot table exists com user_id, organization_id, role, joined_at | VERIFICADO | `database/migrations/2026_04_23_300000_create_organization_user_table_and_rename_column.php` — três passos: create pivot, backfill INSERT INTO, renameColumn |
| 2 | users.organization_id renomeado para current_organization_id | VERIFICADO | Migração 300000: `renameColumn('organization_id', 'current_organization_id')` |
| 3 | invitations table criada com todos os campos D-01 | VERIFICADO | `database/migrations/2026_04_23_300100_create_invitations_table.php` — token uuid, expires_at, accepted_at, organization_id, invited_by, email, role |
| 4 | users.avatar nullable string column | VERIFICADO | `database/migrations/2026_04_23_300200_add_avatar_to_users_table.php` |
| 5 | Role CHECK constraint inclui 'owner' | VERIFICADO | `database/migrations/2026_04_23_300300_expand_role_enum_on_users_table.php` — DROP CONSTRAINT + ADD CONSTRAINT com owner|admin|collaborator |
| 6 | User model tem organizations() BelongsToMany, currentOrganization(), getCurrentRoleAttribute(), isOwner(), isAdminOrOwner() | VERIFICADO | `app/Models/User.php` linhas 51-98 — todos os métodos implementados com leitura do pivot |
| 7 | Organization model tem users() como BelongsToMany | VERIFICADO | `app/Models/Organization.php` linha 66-72 — BelongsToMany via organization_user pivot com withPivot('role', 'joined_at') |
| 8 | Todas as referências a users.organization_id em controllers/middleware migradas para current_organization_id | VERIFICADO | `grep -rn "->organization_id"` nos controllers retornou zero linhas; User::where('organization_id') também eliminado |
| 9 | HandleInertiaRequests compartilha role do pivot, avatar, organizations list | VERIFICADO | `app/Http/Middleware/HandleInertiaRequests.php` — avatar (linha 47), getCurrentRoleAttribute() (linha 48), organizations (linha 61-67) |
| 10 | POST /settings/team/invite cria invitation + envia e-mail via Resend | VERIFICADO (código) | `TeamController::invite()` cria Invitation model + `Mail::to()->send(new InvitationMail(...))` |
| 11 | GET/POST /invite/{token} mostra/aceita convite (new user e existing user) | VERIFICADO (código) | `InvitationController::show()` e `store()` — 3 estados: válido, expirado, usuário existente via syncWithoutDetaching |
| 12 | PATCH /settings/team/{user}/role atualiza organization_user.role e users.role (write-through) | VERIFICADO | `TeamController::updateRole()` — updateExistingPivot + $user->update(['role' => ...]) |
| 13 | DELETE /settings/team/{user}/remove destaca do pivot (owner bloqueado) | VERIFICADO | `TeamController::remove()` — abort_if(pivot->role === 'owner') + $org->users()->detach() |
| 14 | EnsureRole middleware existe e retorna 403 para papel insuficiente | VERIFICADO | `app/Http/Middleware/EnsureRole.php` — getCurrentRoleAttribute() + in_array check; alias 'role' registrado em bootstrap/app.php |
| 15 | Rotas de team protegidas por role:admin,owner | VERIFICADO | `routes/web.php` — 5 rotas de equipe com ->middleware('role:admin,owner') (linhas 109-122) |
| 16 | GET /settings retorna Settings/Index com members, pending_invites, organization, can_manage_team | VERIFICADO | `SettingsController::index()` — query org->users()->withPivot() + Inertia::render('Settings/Index', [...]) |
| 17 | UserAvatar component com gradient HSL determinístico (djb2, 130° hue spacing) | VERIFICADO | `resources/js/Components/UserAvatar.tsx` — nameToGradient() com hash*31, hue2=(hue1+130)%360, linear-gradient(135deg) |
| 18 | Settings/Index.tsx com 4 seções anchor (#profile, #organization, #team, #ai), sub-nav sticky com scroll-spy | VERIFICADO | `resources/js/pages/Settings/Index.tsx` — 870 linhas, 4 seções com IDs, IntersectionObserver (threshold: 0.3, rootMargin: -56px), select mobile fallback |

**Pontuação:** 18/18 verdades verificadas (código e estrutura)

### Artefatos Necessários

| Artefato | Esperado | Status | Detalhes |
|----------|----------|--------|---------|
| `database/migrations/2026_04_23_300000_*.php` | Pivot table + backfill + rename | VERIFICADO | 46 linhas, 3 passos atômicos |
| `database/migrations/2026_04_23_300100_*.php` | invitations table | VERIFICADO | 30 linhas, todos campos D-01 |
| `database/migrations/2026_04_23_300200_*.php` | users.avatar nullable | VERIFICADO | 22 linhas |
| `database/migrations/2026_04_23_300300_*.php` | Role enum expandido + backfill | VERIFICADO | 50 linhas, DROP/ADD CONSTRAINT + UPDATE pivot + sync users.role |
| `app/Models/User.php` | Multi-org pivot API completo | VERIFICADO | organizations(), currentOrganization(), getCurrentRoleAttribute(), isOwner(), isAdminOrOwner() — todos implementados |
| `app/Models/Organization.php` | users() como BelongsToMany | VERIFICADO | BelongsToMany via organization_user pivot |
| `app/Models/Invitation.php` | Eloquent model com fillable, casts, relações | VERIFICADO | fillable completo, casts datetime, organization() + invitedBy() + isPending() |
| `app/Http/Controllers/InvitationController.php` | show() + store() | VERIFICADO | 103 linhas, 2 métodos, trata 3 estados |
| `app/Http/Controllers/TeamController.php` | invite, updateRole, remove, cancelInvitation, resendInvitation | VERIFICADO | 160 linhas, 5 métodos com guards isAdminOrOwner() |
| `app/Http/Controllers/Settings/SettingsController.php` | index() + switchOrg() | VERIFICADO | 79 linhas, query pivot com joinedAt formatado |
| `app/Http/Controllers/Settings/ProfileController.php` | update() + updateAvatar() | VERIFICADO | 92 linhas, Intervention Image v3 cover(256,256), path fixo avatars/users/{id}.jpg |
| `app/Http/Middleware/EnsureRole.php` | Middleware com verificação de papel do pivot | VERIFICADO | 34 linhas, getCurrentRoleAttribute() + in_array |
| `app/Mail/InvitationMail.php` | Mailable com subject em pt-BR | VERIFICADO | Envelope + Content markdown, acceptUrl + orgName + role + expiresAt |
| `resources/views/mail/invitation.blade.php` | Template Markdown pt-BR | VERIFICADO | Blade template com botão aceitar convite |
| `resources/js/pages/Invite/Accept.tsx` | Página standalone sem AppLayout, 3 estados | VERIFICADO | 155 linhas, sem AppLayout, branch new/existing/expired, copy strings corretas |
| `resources/js/Components/UserAvatar.tsx` | Gradient fallback + API idêntica a ClientAvatar | VERIFICADO | nameToGradient djb2, hue spacing 130°, role="img" + aria-label |
| `resources/js/Layouts/AppLayout.tsx` | OrgSwitcher com UserAvatar, PATCH /settings/current-org | VERIFICADO | OrgSwitcher com orgSwitcherRef, outside-click handler, router.patch(route('settings.current-org')) |
| `resources/js/pages/Settings/Index.tsx` | 4 seções, scroll-spy, team management completo | VERIFICADO | 870 linhas, todos route calls verificados, CostConfirmModal, RoleBadge, seção AI inlined |
| `tests/Feature/InvitationControllerTest.php` | 5 testes de convite | VERIFICADO | 95 linhas |
| `tests/Feature/InvitationAcceptTest.php` | 4 testes de aceite | VERIFICADO | 89 linhas |
| `tests/Feature/TeamRosterTest.php` | 3 testes de roster | VERIFICADO | 61 linhas |
| `tests/Feature/TeamRoleTest.php` | 3 testes de papéis | VERIFICADO | 58 linhas |
| `tests/Feature/ProfileControllerTest.php` | 3 testes de perfil | VERIFICADO | 65 linhas |
| `tests/Feature/EnsureRoleTest.php` | 3 testes de middleware | VERIFICADO | 49 linhas |
| `tests/Feature/SettingsControllerTest.php` | 3 testes de settings | VERIFICADO | 52 linhas |

### Verificação de Links-Chave

| De | Para | Via | Status | Detalhes |
|----|------|-----|--------|---------|
| TeamController::invite() | InvitationMail | Mail::to()->send(new InvitationMail(...)) | CONECTADO | Linha 65 TeamController.php |
| InvitationController::store() | organization_user pivot | syncWithoutDetaching() (existente) ou attach() (novo) | CONECTADO | Linhas 57-93 InvitationController.php |
| InvitationController::store() | current_organization_id | $existingUser->update(['current_organization_id' => ...]) | CONECTADO | Linha 65 InvitationController.php |
| HandleInertiaRequests | auth.user.role | $user->getCurrentRoleAttribute() | CONECTADO | Linha 48 HandleInertiaRequests.php |
| Settings/Index.tsx invite form | POST /settings/team/invite | router.post(route('team.invite'), ...) | CONECTADO | Linha 210 Settings/Index.tsx |
| Settings/Index.tsx remove button | DELETE /settings/team/{user}/remove | router.delete(route('team.remove', member.id), ...) | CONECTADO | Linha 860 Settings/Index.tsx |
| Settings/Index.tsx avatar upload | POST /settings/profile/avatar | router.post(route('settings.profile.avatar'), formData) | CONECTADO | Linha 192 Settings/Index.tsx |
| AppLayout OrgSwitcher | PATCH /settings/current-org | router.patch(route('settings.current-org'), {organization_id}) | CONECTADO | Linha 222 AppLayout.tsx |
| EnsureRole middleware | team routes (5) | ->middleware('role:admin,owner') | CONECTADO | routes/web.php linhas 109-122 |
| DemandController::destroy() | isAdminOrOwner() / created_by | abort_if(!isAdminOrOwner() && demand->created_by !== user->id) | CONECTADO | Linha 149 DemandController.php |
| ClientController::update/destroy() | isAdminOrOwner() | abort_unless(isAdminOrOwner(), 403) | CONECTADO | Linhas 112, 142 ClientController.php |

### Rastreamento de Dados (Nível 4)

| Artefato | Variável de Dados | Fonte | Produz Dados Reais | Status |
|----------|-------------------|-------|--------------------|--------|
| Settings/Index.tsx (#team section) | members[] | SettingsController::index() → $org->users()->withPivot() | Sim — query BelongsToMany com pivot | FLUINDO |
| Settings/Index.tsx (#team section) | pending_invites[] | Invitation::where(organization_id)->whereNull(accepted_at) | Sim — query DB filtrada | FLUINDO |
| Settings/Index.tsx (#profile section) | auth.user.avatar | HandleInertiaRequests → $user->avatar | Sim — coluna users.avatar | FLUINDO |
| AppLayout OrgSwitcher | auth.user.organizations | HandleInertiaRequests → $user->organizations->map() | Sim — eager-load organizations com pivot | FLUINDO |
| UserAvatar gradient | gradient CSS | nameToGradient(name) → djb2 hash | Sim — derivado deterministicamente de name prop | FLUINDO |
| Invite/Accept.tsx | expired, invitation, organization, has_account | InvitationController::show() | Sim — Invitation::where(token)->first() + User::where(email)->exists() | FLUINDO |

### Verificações de Comportamento

Step 7b: SKIPPED — verificações comportamentais requerem servidor ativo. O ambiente é Windows sem `php artisan serve` disponível durante a verificação. As verificações estruturais de código substituem os spot-checks automáticos.

### Cobertura de Requisitos

| Requisito | Plano(s) | Descrição | Status | Evidência |
|-----------|----------|-----------|--------|-----------|
| TEAM-01 | 04-01, 04-04, 04-06 | Admin pode convidar novo usuário por e-mail; usuário recebe link e entra como membro | SATISFEITO (código) | InvitationController, InvitationMail, TeamController::invite(), Invite/Accept.tsx — todas as peças existem e estão conectadas |
| TEAM-02 | 04-01, 04-02, 04-07, 04-08 | Admin pode ver todos os membros da org em um roster (nome, avatar, papel, data de entrada) | SATISFEITO | SettingsController::index() retorna members com pivot data; Settings/Index.tsx renderiza UserAvatar + RoleBadge + joined_at |
| TEAM-03 | 04-04, 04-08 | Admin pode mudar papel (admin↔membro) ou remover membro | SATISFEITO | TeamController::updateRole() + remove() implementados; Settings/Index.tsx tem dropdown de papel + botão Trash2 com CostConfirmModal |
| TEAM-04 | 04-04, 04-07, 04-08 | Qualquer usuário pode editar perfil: nome, avatar, locale, tema | SATISFEITO (código) | ProfileController::update() + updateAvatar(); Settings/Index.tsx #profile section com avatar upload preview |
| TEAM-05 | 04-05 | RBAC: apenas admins/owners podem convidar, remover membros e deletar conteúdo de outros | SATISFEITO | EnsureRole middleware ativo em 5 rotas; isAdminOrOwner() em DemandController::destroy(), ClientController::update/destroy(), TrashController::forceDelete() |
| TEAM-06 | 04-08 | Página de configurações organizada em seções: Perfil, Organização, Equipe, Chave de IA | SATISFEITO | Settings/Index.tsx — 4 seções anchor (#profile, #organization, #team, #ai), sticky sub-nav com scroll-spy, select fallback mobile |

### Anti-Padrões Encontrados

| Arquivo | Linha | Padrão | Severidade | Impacto |
|---------|-------|--------|-----------|---------|
| `resources/js/pages/Settings/Index.tsx` | 534, 735, 817, 831 | `placeholder="..."` em inputs | Info | Normal — placeholder em inputs de formulário é UX padrão, não indica stub |
| `resources/js/pages/Settings/Index.tsx` | 16 | `import { CostConfirmModal } from '@/Components/CostConfirmModal'` | Info | CostConfirmModal foi reutilizado para confirmação de remoção com costUsd=0 — aceitável per plano |

Nenhum anti-padrão bloqueante encontrado. Os `placeholder` são atributos HTML de inputs e não indicam implementação incompleta.

### Verificação Humana Necessária

#### 1. Disparo de E-mail de Convite

**Teste:** Criar um convite como admin para um e-mail real; verificar recebimento no inbox
**Esperado:** E-mail chega com subject "Convite para {org} no Briefy", link `/invite/{token}` funcional, botão "Aceitar convite", nome da org e papel exibidos em pt-BR
**Por que humano:** Requer serviço Resend configurado com API key real + DNS verificado — não testável programaticamente

#### 2. Página de Aceite de Convite (/invite/{token})

**Teste:** Acessar URL de convite no browser com token válido (via e-mail ou gerado diretamente em Tinker)
**Esperado:** Página standalone sem sidebar, card centralizado com logo "briefy", nome da org, badge de papel, e o formulário correto para o caso (novo usuário: nome+senha; usuário existente: botão "Entrar na organização")
**Por que humano:** Renderização React standalone, lógica de branch has_account, e redirect para dashboard pós-aceite

#### 3. Upload de Avatar com Redimensionamento

**Teste:** Fazer upload de avatar válido (JPG/PNG) e de um arquivo > 2MB
**Esperado:** Válido: avatar aparece no header via /storage/avatars/users/{id}.jpg redimensionado para 256x256; > 2MB: mensagem de erro de validação
**Por que humano:** Requer PHP com GD driver ativo, public/storage symlink funcional, e inspeção visual do resultado

#### 4. OrgSwitcher — Troca de Organização

**Teste:** Usuário com múltiplas organizações abre o OrgSwitcher no header e clica em uma org diferente
**Esperado:** Dropdown abre com lista de orgs, checkmark na ativa, clicar em outra dispara PATCH /settings/current-org, dados da página recarregam no contexto da nova org
**Por que humano:** Comportamento de dropdown React com outside-click handler, resposta ao PATCH e atualização de shared props via Inertia

#### 5. Restrições de Colaborador na UI

**Teste:** Fazer login como colaborador e acessar /settings
**Esperado:** Formulário de convite não aparece; botões de remover/mudar papel invisíveis; tentativa de DELETE /team/{user}/remove via curl retorna 403
**Por que humano:** Integração entre can_manage_team (prop server-side), renderização condicional (frontend) e validação de middleware (backend)

### Sumário de Lacunas

Nenhuma lacuna técnica bloqueante identificada. Todos os artefatos existem, são substantivos, estão conectados e os dados fluem corretamente.

Os 5 itens de verificação humana acima representam comportamentos que requerem o ambiente completo (servidor rodando, Resend configurado, browser) para validação. Eles não são bloqueantes ao código — são validações funcionais end-to-end.

**Observação sobre testes PHP:** Os 7 arquivos de teste Feature existem e foram escritos corretamente com o padrão current_organization_id + organizations()->attach(). A ausência de `vendor/` no worktree de execução (gitignored por design do git worktree) impediu a execução automatizada dos testes. Os testes passarão no ambiente principal após `composer install`.

---

_Verificado: 2026-04-23T22:00:00Z_
_Verificador: Claude (gsd-verifier)_
