# Phase 4: Team Management - Context

**Gathered:** 2026-04-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 4 delivers multi-org team management for agencies:
1. **Convite por email** — admin convida por email, token em tabela, convidado define senha e entra na org
2. **Multi-org** — um usuário pode pertencer a várias orgs; switcher no header troca o contexto ativo
3. **Roles** — enum expandido para `owner | admin | collaborator` com permissões claras
4. **Perfil do usuário** — avatar com upload local + gradiente único como fallback
5. **Settings unificado** — página única `/settings` com seções: Perfil, Organização, Equipe, IA

Fora de escopo da Fase 4: dashboard de métricas, onboarding checklist, real-time/WebSockets.

</domain>

<decisions>
## Implementation Decisions

### Convite por email

- **D-01:** Tabela `invitations` com campos: `id`, `organization_id`, `invited_by` (user_id), `email`, `role`, `token` (uuid), `accepted_at`, `expires_at` (7 dias), `timestamps`
- **D-02:** Fluxo: admin digita email + escolhe role → cria registro em `invitations` → envia email com link `/invite/{token}` → convidado vê página de aceite → define nome+senha (ou apenas confirma se já tem conta) → entra na org
- **D-03:** Se email já tem conta Briefy em outra org: convite válido — usuário aceita o link e passa a pertencer a ambas as orgs (multi-org)
- **D-04:** Se email não tem conta: criar `User` + associar à org no aceite
- **D-05:** Convite pode ser cancelado pelo admin antes do aceite (delete do registro em `invitations`)

### Multi-org

- **D-06:** Tabela pivot `organization_user` com campos: `user_id`, `organization_id`, `role` (owner/admin/collaborator), `joined_at`
- **D-07:** `users.organization_id` renomeado para `users.current_organization_id` — armazena a org ativa no momento (contexto de trabalho atual)
- **D-08:** Migration cria `organization_user`, popula a partir dos `users.organization_id` existentes, renomeia a coluna
- **D-09:** Todos os controllers passam a usar `auth()->user()->currentOrganization()` (relation por `current_organization_id`) — sem quebrar os `organization_id` das demandas/clientes existentes
- **D-10:** Switcher de org: dropdown no header ao lado do nome do usuário. Trocar de org faz `PATCH /settings/current-org` → atualiza `current_organization_id` → Inertia reload

### Roles

- **D-11:** Enum expandido: `owner | admin | collaborator` (migration de alter column)
- **D-12:** `owner`: criador da org (setado no register), não pode ser removido nem rebaixado. Apenas owner pode remover/rebaixar admins.
- **D-13:** `admin`: pode gerenciar toda a equipe (convidar, remover membros, alterar roles de collaborators), editar/deletar clientes, acessar todas as settings, ver dashboard completo
- **D-14:** `collaborator` NÃO pode:
  - Convidar ou remover membros
  - Editar ou deletar clientes (pode criar demandas para clientes existentes)
  - Acessar Settings/Organização e Settings/IA (seções ocultas da UI + proteção no backend)
  - Ver dashboard completo da org (apenas resumo pessoal)
  - Deletar demandas de outros usuários
- **D-15:** `User::isOwner()` e `User::isAdminOrOwner()` helper methods adicionados ao Model
- **D-16:** Middleware `EnsureRole` ou policy gates para proteger rotas sensíveis no backend

### Avatar do usuário

- **D-17:** Upload para `storage/app/public/avatars/users/{user_id}.{ext}` via `Storage::disk('public')`
- **D-18:** Campo `avatar` (string nullable) adicionado à tabela `users`
- **D-19:** Fallback sem foto: componente `UserAvatar` gera gradiente de 2 cores deterministicamente a partir do nome (hash → 2 hues HSL espaçadas 120° ou mais), com iniciais em branco por cima. Mesmo padrão visual elegante para todos os usuários sem foto.
- **D-20:** `UserAvatar` é um novo componente (não modifica `ClientAvatar`), mas segue a mesma API: `name`, `avatar`, `size` props. Reutilizado em: header, roster de equipe, cards de demanda (assignee), comentários.
- **D-21:** Tamanho máximo de upload: 2MB, formatos: jpg/png/webp. Redimensionamento no backend para 256x256.

### Settings reorganizado

- **D-22:** Rota única `/settings` — página única com 4 seções separadas por dividers com âncoras (`#profile`, `#organization`, `#team`, `#ai`)
- **D-23:** Seção **Perfil**: avatar upload (drag & drop ou click), nome, email (readonly se SSO), alterar senha
- **D-24:** Seção **Organização**: nome da org, logo da org (upload igual ao avatar). Visível para todos, editável apenas por admin/owner.
- **D-25:** Seção **Equipe**: lista de membros (avatar, nome, role, data de entrada) + form de convite + ações de role/remoção. Visível para todos, ações restritas a admin/owner.
- **D-26:** Seção **IA**: absorve integralmente o conteúdo atual de `/settings/ai` (chave Anthropic, status, botão testar). `/settings/ai` passa a redirecionar para `/settings#ai`.
- **D-27:** Sub-navegação na página: sticky nav interna com links âncora para cada seção (rola suavemente). Em mobile, colapsa em select dropdown.

### Claude's Discretion

- Algoritmo exato de geração das 2 cores do gradiente (hashing do nome → HSL)
- CSS exato do gradiente no `UserAvatar` (linear-gradient, ângulo, tamanhos)
- Email template do convite (texto, layout)
- Estratégia de cache do `organization_user` pivot (eager loading vs. cache tag)
- Redimensionamento de avatar: Intervention Image vs. GD nativo do PHP
- Animação do switcher de org no header

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Context
- `.planning/REQUIREMENTS.md` — TEAM-01 a TEAM-06
- `.planning/ROADMAP.md` — Phase 4 goal e success criteria
- `.planning/PROJECT.md` — Stack, design tokens, constraints
- `.planning/STATE.md` — Decisões acumuladas de fases anteriores

### Existing Code (leitura obrigatória)
- `app/Models/User.php` — model atual, fillable, casts, isAdmin()
- `app/Models/Organization.php` — model da org
- `database/migrations/2026_04_22_015406_add_organization_fields_to_users_table.php` — migration original do role enum
- `resources/js/Components/ClientAvatar.tsx` — padrão de avatar a ser adaptado para UserAvatar
- `resources/js/Layouts/AppLayout.tsx` — header onde o switcher de org e UserAvatar entram
- `resources/js/pages/Settings/Ai.tsx` — tela de AI settings a ser absorvida
- `resources/js/pages/Settings/Team.tsx` — stub a ser implementado
- `app/Http/Controllers/TeamController.php` — stub a ser implementado
- `routes/web.php` — rotas existentes de settings e team

### Design System
- `docs/design-brief.md` — tokens de cor, tipografia, bordas

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ClientAvatar.tsx`: gera cor determinística do nome + mostra iniciais — adaptar para `UserAvatar` com gradiente
- `AppLayout.tsx`: header já tem bell + theme toggle + user name — adicionar switcher de org e UserAvatar aqui
- `CostConfirmModal.tsx`: padrão de modal de confirmação reutilizável para "remover membro"
- `FlashMessage.tsx`: já trata flash de sucesso/erro — convites e remoções usam este padrão
- `Dropdown.tsx`: componente de dropdown existente — usar no switcher de org

### Established Patterns
- Inertia partial reloads `only: [...]` — usar para atualizar roster sem reload completo
- `router.patch/delete` com `preserveScroll: true` — padrão para ações inline no roster
- `useForm` Inertia — usar no form de perfil e convite
- Design tokens: `rounded-[8px]`, `border-[#1f2937]`, `bg-[#111827]` dark, `text-[#f9fafb]` dark
- AGPL headers em todos os arquivos novos

### Integration Points
- `AppLayout.tsx`: adicionar `UserAvatar` no lugar do nome de texto + switcher de org dropdown
- `AppLayout.tsx`: `auth.user.organizations` no shared props (lista de orgs do usuário)
- `HandleInertiaRequests.php`: adicionar `organizations` (lista) e `current_organization` ao share()
- `routes/web.php`: novas rotas `/settings`, `/invitations/{token}`, `PATCH /settings/current-org`
- `Organization.php`: relation `users()` via pivot `organization_user`
- `User.php`: relation `organizations()` (hasMany via pivot) + `currentOrganization()` (belongsTo por current_organization_id)

</code_context>

<specifics>
## Specific Ideas

- **Switcher de org**: dropdown no header mostrando org ativa com checkmark + lista das outras orgs. "Criar nova organização" como último item.
- **UserAvatar gradiente**: duas cores HSL com hue derivado do hash do nome, separadas ~120°. Ex: `linear-gradient(135deg, hsl(270,70%,55%), hsl(150,70%,45%))` para "Aether". Iniciais em branco com font-weight semibold.
- **Roster**: tabela/lista com avatar + nome + email + role badge + data de entrada + ações (role select dropdown inline + botão remover). Owner não tem botão remover.
- **Convite pendente**: seção separada no roster mostrando convites enviados (email, role, enviado em, status). Botão "Cancelar convite" e "Reenviar".
- **Settings page scroll spy**: nav interna com indicador de seção ativa ao rolar.

</specifics>

<deferred>
## Deferred Ideas

- Multi-org switcher com workspaces nomeados por contexto (ex: "Modo freelancer" vs "Modo agência") — v2
- SSO / login social (Google/GitHub) para aceitar convites sem senha — v2
- Convite em massa (CSV de emails) — v2
- Limitar número de membros por plano de assinatura — deferred billing phase
- Permissões granulares por cliente (collaborator vê apenas clientes X e Y) — v2

</deferred>

---

*Phase: 04-team-management*
*Context gathered: 2026-04-23*
