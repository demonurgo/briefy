# Phase 5: Dashboard + Onboarding - Context

**Gathered:** 2026-04-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 5 entrega visibilidade operacional completa para a agência:

1. **Dashboard pessoal** (todos os usuários) — cards de status próprios, lista de foco prioritário, progresso semanal, bloqueios
2. **Dashboard gerencial** (admin/owner, via toggle) — panorama da org, gráficos de distribuição, desempenho da equipe, timeline de atividade
3. **Feed de atividade** — tabela `activity_logs` registrando eventos relevantes da org, scoped por role
4. **Onboarding checklist** — card dismissível para novos usuários sem clientes/demandas

Fora de escopo da Fase 5: filtros rápidos avançados no dashboard, "meta semanal" configurável, notificações push, tempo médio de entrega como KPI separado.

</domain>

<decisions>
## Implementation Decisions

### Gráficos
- **D-01:** Biblioteca: **Recharts** — suporte nativo a donut, bar e line chart; leve, componentes React nativos, sem dependências extras
- **D-02:** Tipos de gráfico usados:
  - **Donut/Pie**: Panorama geral (status breakdown) e Desempenho da equipe (completion rate)
  - **Bar**: Demandas por prioridade (Alta/Média/Baixa) e Concluídas na semana (por dia)
  - **Line**: Demanda ao longo do tempo (Criadas vs Concluídas) e Tempo médio de entrega (por dia)
- **D-03:** Cores dos status nos gráficos devem usar o mesmo padrão do StatusBadge existente para consistência visual

### Layout — Estrutura do Dashboard
- **D-04:** Dashboard tem **uma URL** (`/dashboard`) com **toggle de view** — "Visão pessoal / Visão geral" — visível apenas para admin/owner. Colaborador vê somente a visão pessoal sem o toggle.
- **D-05:** Greeting no topo: `"Olá, [nome]! 👋"` + subtítulo contextual ("Aqui está o que precisa da sua atenção hoje." na visão pessoal / "Aqui está o resumo das suas demandas hoje." na visão geral)
- **D-06:** Botão **"+ Nova demanda"** no header direito do dashboard (como nas referências)

### View Pessoal (todos os usuários)
- **D-07:** 5 cards de status no topo — contagens das **próprias demandas** do usuário:
  - Atrasadas (past deadline, não concluída)
  - Em andamento
  - Aguardando retorno/feedback
  - Em revisão
  - Concluídas esta semana
  - Cada card mostra delta vs dia anterior (↑/↓/—)
- **D-08:** "Seu foco agora" — lista das 3–5 demandas mais urgentes do usuário (atrasadas ou com deadline hoje/amanhã), com badge de prioridade, status e prazo
- **D-09:** "Minhas demandas" — tabela com tabs: Todas | Em andamento | Atrasadas | Concluídas. Colunas: Título, Status, Prioridade, Prazo, Cliente (não Projeto). Máximo 5 linhas com "Ver todas →"
- **D-10:** "Bloqueios / Aguardando" — card lateral com demandas no status `awaiting_feedback`, mostrando nome da demanda e "Desde [data]"
- **D-11:** "Seu progresso" — donut chart mostrando % de demandas concluídas esta semana vs total atribuídas ao usuário. Sem "meta configurável" — apenas proporção das concluídas

### View Gerencial — Admin/Owner Toggle
- **D-12:** Toggle "Visão pessoal / Visão geral" no header ao lado do greeting (visível apenas para admin/owner)
- **D-13:** Date range picker na visão geral (padrão: semana atual). Filtra todos os gráficos e tabela de últimas demandas
- **D-14:** 5 cards de status na visão geral mostram contagens da **organização inteira** (mesmo cards, dados agregados)
- **D-15:** "Panorama geral" — donut chart com total de demandas por status + legenda (count + %). Baseado nas imagens de referência
- **D-16:** "Demandas por prioridade" — bar chart (Alta/Média/Baixa). Scoped pelo date range
- **D-17:** "Demanda ao longo do tempo" — line chart dual (Criadas vs Concluídas) por dia no range selecionado
- **D-18:** "Últimas demandas" — tabela com colunas: Título, Status, Prioridade, Atualizado em, Responsável (com UserAvatar). 5 linhas + "Ver todas →"
- **D-19:** "Desempenho da equipe" — donut chart mostrando completion rate da org + contagens (Concluídas, Em andamento, Total)
- **D-20:** Dados da visão gerencial scoped para a `current_organization_id` do admin

### Feed de Atividade (DASH-05)
- **D-21:** Nova tabela `activity_logs` no banco com campos: `organization_id`, `user_id`, `action_type` (enum), `subject_type` (demand, client), `subject_id`, `subject_name`, `metadata` (JSON), `created_at`
- **D-22:** Eventos registrados no `activity_logs`:
  - `demand.status_changed` — "X moveu [Demanda] para [Status]"
  - `demand.created` — "X criou [Demanda]"
  - `demand.comment_added` — "X comentou em [Demanda]"
  - `demand.assigned` — "X atribuiu [Demanda] para Y"
  - `demand.archived` — "X arquivou [Demanda]"
  - `demand.restored` — "X restaurou [Demanda] da lixeira"
  - `client.created` — "X adicionou o cliente [Cliente]" (admin/owner only event)
  - `member.invited` — "X convidou [Email] como [Role]" (admin/owner only event)
- **D-23:** Scoping por role:
  - **Colaborador**: vê apenas eventos das demandas atribuídas a ele ou criadas por ele
  - **Admin/Owner**: vê todos os eventos da organização
- **D-24:** Feed aparece como card no dashboard (ambas as views) com os últimos 10–15 eventos. Admin vê mais contexto (quem fez, em qual cliente)
- **D-25:** Registro de eventos via **Observer/Event** do Laravel — disparado automaticamente nas ações existentes. Não adicionar lógica de log nos controllers diretamente.

### Onboarding Checklist (ONBRD-01, ONBRD-02)
- **D-26:** Aparece como **card dismissível no topo do dashboard** — mesmo padrão do `DashboardPlanningWidget` (localStorage + flag em preferences)
- **D-27:** Trigger: usuário sem nenhum cliente **OU** sem nenhuma demanda na organização
- **D-28:** Passos do checklist:
  1. ✅/☐ Adicionar um cliente → link para `/clients/create`
  2. ✅/☐ Criar primeira demanda → link para `/demands?create=1`
  - Cada passo tem checkbox visual que marca automaticamente quando o estado existe no BD
- **D-29:** Dismiss: botão "✕" fecha permanentemente via `preferences.onboarding_dismissed = true` (PATCH `/settings/preferences`)
- **D-30:** O card some automaticamente quando ambos os passos estão completos OU quando o usuário clica em dispensar

### Claude's Discretion
- Animação de entrada dos cards de status (fade in leve ou contagem animada) — Claude decide
- Skeleton loading state dos gráficos enquanto carregam — Claude decide
- Tooltip nos gráficos Recharts (formato exato) — Claude decide
- Ícone e cor de cada `action_type` no feed de atividade — Claude decide (consistente com sistema existente)
- Breakpoints responsivos para o grid do dashboard — Claude decide

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requisitos
- `.planning/REQUIREMENTS.md` — DASH-01 a DASH-05 e ONBRD-01 a ONBRD-02 (critérios de aceite completos)

### Contexto do projeto
- `.planning/PROJECT.md` — design tokens (primary #7c3aed, dark bg #0b0f14, surface #111827, border #1f2937)
- `.planning/STATE.md` — decisões acumuladas de fases anteriores

### Código existente relevante
- `app/Http/Controllers/DashboardController.php` — controller existente a expandir
- `resources/js/pages/Dashboard.tsx` — página existente com placeholder
- `resources/js/Components/DashboardPlanningWidget.tsx` — padrão de widget dismissível a reusar
- `resources/js/Components/StatusBadge.tsx` — cores de status a reusar nos gráficos
- `resources/js/Components/UserAvatar.tsx` — avatar a usar na tabela de últimas demandas
- `app/Models/Demand.php` — modelo de demanda (status, assignee, created_by, deadline)
- `app/Models/User.php` — getCurrentRoleAttribute(), isAdminOrOwner()
- `app/Http/Middleware/HandleInertiaRequests.php` — shared props (auth.user.role)

### Referências visuais
- Imagem 1 (View pessoal): cards de status pessoal, "Seu foco agora", "Minhas demandas", "Bloqueios/Aguardando", "Seu progresso"
- Imagem 2 (View gerencial): panorama geral (donut), demandas por prioridade (bar), timeline (line), desempenho da equipe (donut), últimas demandas (tabela com responsável)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `DashboardPlanningWidget.tsx` — padrão exato de card dismissível com localStorage; reusar para onboarding
- `StatusBadge.tsx` — cores de status prontas, importar para colorir donut chart
- `UserAvatar` — usar na tabela de últimas demandas (Responsável)
- `useForm` / `router.patch` via Inertia — para PATCH preferences ao dispensar onboarding
- `HandleInertiaRequests.php` — já compartilha `auth.user.role` e `auth.user.organizations`

### Established Patterns
- Controllers retornam props Inertia que o React consume diretamente (sem API separada)
- Role check: `$user->isAdminOrOwner()` para dados admin; `$user->current_organization_id` para scoping
- Dismiss via `preferences` JSON: padrão já validado no DashboardPlanningWidget
- `useEffect` sync para atualizar estado local quando props Inertia mudam (Phase 2 pattern)

### Integration Points
- `DashboardController::index()` — expandir para incluir todos os dados das views
- Observer/Event do Laravel para alimentar `activity_logs` a partir de ações existentes (DemandController, TrashController, etc.)
- Rota existente `/dashboard` — manter; adicionar query param `?view=overview` para toggle de admin ou gerenciar via estado do React
- `preferences.onboarding_dismissed` — PATCH via rota existente `settings.preferences`

</code_context>

<specifics>
## Specific Ideas

### Referências visuais do usuário (imagens compartilhadas)
As imagens mostram com precisão o layout esperado:

**View pessoal (Image 1):**
- Header: "Olá, [nome]! 👋 / Aqui está o que precisa da sua atenção hoje." + botão "+ Nova demanda"
- 5 cards no topo: Atrasadas 🔴, Em andamento 🟣, Aguardando retorno 💬, Em revisão 👁, Concluídas ✅ — cada um com delta vs ontem
- Grid 3 colunas: [Seu foco agora — lista priorizada] | [Bar chart semanal] | [Line chart tempo médio]
- Grid 2 colunas: [Minhas demandas — tabela com tabs] | [Bloqueios/Aguardando + Seu progresso (donut)]

**View gerencial (Image 2):**
- Header: "Olá, [nome]! 👋" + date range picker + botão "+ Nova demanda"
- 5 cards org-wide
- Grid 3 colunas: [Donut panorama geral com legenda] | [Bar por prioridade] | [Line ao longo do tempo]
- Grid 2 colunas: [Últimas demandas com responsável] | [Donut desempenho da equipe com stats]

</specifics>

<deferred>
## Deferred Ideas

- **"Filtros rápidos"** (botão visível nas referências Image 1) — feature de filtragem avançada do dashboard. Própria fase.
- **"Tempo médio de entrega"** como KPI — requer cálculo de `completed_at - created_at`. Pode ser incluído se simples, mas não é requisito do DASH-*.
- **Meta semanal configurável** ("75% da meta semanal") — requer campo de meta por usuário. Deferred; por ora "Seu progresso" mostra proporção simples das concluídas.
- **Notificações push/email** ao registrar eventos no activity_logs — futuro.
- **Workload por membro** (DASH-02) como gráfico de barras horizontal mostrando demandas por pessoa — pode ser incluído na visão gerencial se couber no escopo; está nos requirements mas não ficou claro nas imagens de referência. Pesquisador deve decidir placement.

</deferred>

---

*Phase: 05-dashboard-onboarding*
*Context gathered: 2026-04-23*
