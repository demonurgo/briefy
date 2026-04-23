# Phase 3: AI Integration - Context

**Gathered:** 2026-04-22
**Last updated:** 2026-04-22 — added BYOK + AGPL open source (D-29 a D-34) and "Conheça o Cliente" Managed Agent (D-35 a D-40) for hackathon eligibility + Managed Agents prize track.
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 3 delivers AI capabilities integrated into the existing demand and client workflows:
1. **Brief generation** — AI generates a structured content brief from demand metadata, displayed in a new tab inside DemandDetailModal
2. **AI chat per demand** — Contextual assistant tab in DemandDetailModal, with persistent history and streaming
3. **Client AI memory** — Automatically extracted and stored per interaction, feeding future AI calls
4. **Monthly planning** — Client-level AI generation of a full month's content plan, with review/convert workflow
5. **Client plan configuration** — `monthly_posts`, `monthly_plan_notes`, and `planning_day` fields added to clients
6. **"Conheça o Cliente" — Client Research Managed Agent** — long-running (20–40 min) background agent that crawls a client's public site + social profiles, analyzes 20–30 content pieces, and populates `client_ai_memory` with categorized insights at onboarding. Uses Claude Managed Agents beta.
7. **BYOK + Open Source** — Briefy ships under AGPL-3.0; each organization brings its own Anthropic API key (stored encrypted). No centralized billing.

Out of scope for Phase 3: real-time collaboration, notifications, dashboard charts, onboarding checklist (first-time user guide).

</domain>

<decisions>
## Implementation Decisions

### Brief na DemandDetailModal

- **D-01:** Brief gerado aparece em aba dedicada no painel direito da modal. O painel direito passa a ter **4 abas**: `Comentários | Arquivos | Brief | Chat IA`.
- **D-02:** Botão "✨ Gerar Brief" fica no **header da modal**, ao lado do botão "Editar" existente. Visível independente da aba ativa.
- **D-03:** Aba Brief com brief ausente: **empty state** com ícone chatbot + texto "Nenhum brief gerado ainda" + botão grande "Gerar Brief com IA".
- **D-04:** Streaming visual: durante geração/regeneração, o conteúdo anterior some imediatamente e o novo texto **aparece char a char** (efeito typewriter via SSE). Sem overlay, sem skeleton.
- **D-05:** Após geração, brief é **read-only por padrão**. Botão "Editar" aparece no canto da aba Brief para abrir o campo de texto editável. Salva via PATCH no mesmo endpoint inline (`demands.inline.update` ou endpoint dedicado).
- **D-06:** Brief renderizado como **markdown** (negrito, títulos, listas). Usar biblioteca de renderização leve (ex: `react-markdown`).
- **D-07:** Botão "Regenerar" aparece ao lado de "Editar" quando brief já existe. Usa o mesmo endpoint de geração.
- **D-08:** Brief armazenado em `demands.ai_analysis` (JSON já existente). Campo: `ai_analysis.brief` (string).

### Chat com AI na DemandDetailModal

- **D-09:** Chat vive na aba **"Chat IA"** no painel direito (4ª aba: Comentários | Arquivos | Brief | Chat IA).
- **D-10:** Histórico **persiste em banco** via `ai_conversations` (context_type=`demand`, context_id=demand.id) + `ai_conversation_messages`.
- **D-11:** Respostas do assistente fazem **streaming typewriter** igual ao brief (SSE reutilizado).
- **D-12:** **System prompt** do chat inclui: metadados completos da demanda (título, descrição, objetivo, tom, canal, deadline) + lista de arquivos da demanda + últimos 20 comentários + memória do cliente (`client_ai_memory` daquele cliente, todas as categorias).
- **D-13:** **Gerenciamento de histórico**: botão "Nova Conversa" cria nova `ai_conversation` para a demanda (múltiplas conversas por demanda são permitidas). Quando uma conversa atingir >30 mensagens, o backend **auto-compacta** as mensagens mais antigas em um resumo (uma única mensagem de sistema) e sugere ao usuário iniciar nova conversa.
- **D-14:** **Memória do cliente atualiza automaticamente** após cada resposta do assistente. Backend extrai insights da interação e cria/atualiza registros em `client_ai_memory` (categories: tone, patterns, preferences, etc.) com confidence score.

### Ícone do Chatbot (Design Token de IA)

- **D-15:** **Todos os elementos de UI relacionados a IA** devem usar o ícone do chatbot de `resources/js/assets/chatbot-icon-dark.svg` (dark mode) e `chatbot-icon-light.svg` (light mode). Isso inclui: botão Gerar Brief, aba Chat IA, empty state do brief, widget de planejamento no dashboard, botões de gerar planejamento.

### Cotas Mensais do Cliente

- **D-16:** Adicionar **3 novos campos** na tabela `clients` (nova migration):
  - `monthly_posts` (unsignedSmallInteger, nullable) — total de posts por mês
  - `monthly_plan_notes` (text, nullable) — distribuição opcional em texto livre (ex: "8 Instagram, 5 LinkedIn, 7 Facebook")
  - `planning_day` (unsignedTinyInteger 1-31, nullable) — dia do mês em que o planejamento costuma ser feito
- **D-17:** Esses campos aparecem em uma nova **seção "Plano de Conteúdo Mensal"** no final do `ClientForm` existente (após o campo avatar).
- **D-18:** Campos **opcionais**. Quando `monthly_posts` não está preenchido e o usuário tenta gerar o planejamento, exibir aviso: "Configure o plano mensal do cliente para gerar o planejamento".
- **D-19:** Exibir badge discreto **"X posts/mês"** no card do cliente na listagem (`/clients`) quando `monthly_posts` estiver preenchido.

### Planejamento Mensal — Estrutura de Dados

- **D-20:** Planejamento mensal usa a estrutura existente: cria-se uma **demand de type='planning'** para o par (client_id, mês/ano), e as sugestões ficam em `planning_suggestions` (demand_id → essa demand de planning). Campos da demand de planning: title="Planejamento [Mês/Ano]", client_id, type='planning', status='todo'.
- **D-21:** `planning_suggestions` já tem os campos necessários: date, title, description, status (pending/accepted/rejected), converted_demand_id. **Não precisa de migration adicional** para esta tabela.
- **D-22:** Ao **converter um item em demanda**, criar `Demand` com: title=suggestion.title, channel=inferido do texto (ou deixar vazio), deadline=suggestion.date, client_id=mesmo da planning demand, type='demand', status='todo'. Setar `planning_suggestions.converted_demand_id` = nova demand.id e `status='accepted'`.

### Planejamento Mensal — UI

- **D-23:** Novo item **"Planejamento"** na Sidebar (entre Demandas e eventual Dashboard). Rota: `/planejamento`.
- **D-24:** **Página /planejamento**: filtro por cliente (select), lista de planejamentos existentes (demands type='planning') agrupados por mês. Botão "Gerar Planejamento" seleciona cliente + mês.
- **D-25:** **Cards dos itens** do planejamento: título, canal, semana/data sugerida. Três ações por card:
  - ✓ **Converter em demanda** (individual)
  - ✗ **Rejeitar** (marca status='rejected')
  - 🔄 **Redesenhar** (abre textarea inline no card; usuário digita feedback; AI revisa só aquele item com novo título/descrição)
- **D-26:** **Converter em massa**: checkbox em cada card + botão flutuante "Converter X selecionados" aparece quando há seleção. Cria N demands de uma vez.
- **D-27:** **Widget de lembrete no dashboard** (implementação mínima em Phase 3): quando `planning_day` do cliente está configurado, mostrar card de aviso no dashboard no **dia anterior (planning_day - 1)**. Clicar vai para `/planejamento?client_id=X`. Card é **descartável** (X para ignorar) e some automaticamente no `planning_day + 2` se não agido.
- **D-28:** Botão "Redesenhar" chama API que envia o item atual + feedback do usuário para Claude, recebe novo título/description, e atualiza o card in-place (sem recarregar a página).

### BYOK & Open Source (AGPL-3.0)

- **D-29:** Briefy é publicada como **open source sob AGPL-3.0** — arquivo `LICENSE` na raiz do repo, README em EN explicando setup + BYOK, notice de copyright em cada arquivo fonte (via comment header curto). Escolha da AGPL é deliberada: protege contra SaaS-forks que rodem como serviço sem contribuir de volta.
- **D-30:** **BYOK (Bring Your Own Key)** — cada organização cola sua própria chave Anthropic. Sem billing centralizado pela Briefy. Sem fallback "default key" do time. Sem chave = sem recursos AI (degradação graciosa, não crash).
- **D-31:** Chave armazenada em `organizations.anthropic_api_key_encrypted` (nova coluna text encrypted via Laravel `encrypted` cast + chave `APP_KEY`). **Nunca logada**, **nunca retornada pelo JSON API**, exibida mascarada como `sk-ant-...XXXX` (4 últimos chars) após salvar. Trocar chave = novo input completo.
- **D-32:** Tela `/settings/ai` (nova rota, visível apenas para owner/admin da organização): input password-type para chave + botão "Testar chave" (faz 1 call mínima à Anthropic para validar formato e saldo) + badge de status "configurada ✓ / inválida ✗ / não configurada ○". Histórico de alterações não é guardado (privacidade).
- **D-33:** Sem chave configurada válida: todos os botões AI (Gerar Brief, Chat IA, Gerar Planejamento, Conhecer Cliente) ficam **desabilitados** com tooltip "Configure sua chave Anthropic em Configurações → IA" + link direto. Menus, abas e modais continuam navegáveis (não escondemos UI, apenas bloqueamos a ação).
- **D-34:** Guardrails de custo (AI-SPEC Section 6) mudam de "bloquear" para "avisar com confirmação" — o usuário paga sua própria API; a Briefy avisa "Essa operação custará aproximadamente $X. Continuar?" em operações caras (ex: gerar planejamento 50+ posts, rodar Managed Agent). Operações baratas (<$0.05) não perguntam.

### "Conheça o Cliente" — Managed Agent de Onboarding

- **D-35:** No `ClientForm` (criação ou edição) existe um botão opcional **"🤖 Conhecer este cliente com IA"** após os campos básicos, exigindo preenchimento de pelo menos `website` OU um handle social (novo campo `social_handles` JSON na tabela `clients`). Clicar dispara um **Managed Agent** via Claude Managed Agents API (beta header `managed-agents-2026-04-01`).
- **D-36:** O Managed Agent faz crawl do site público do cliente + Instagram + LinkedIn (via web search/fetch built-in tools) durante 20–40 min, analisa 20–30 peças de conteúdo textual e popula `client_ai_memory` com 10–15 insights categorizados (tom, padrões, preferências, o-que-evitar, terminologia) + `confidence` score calibrado pelo próprio agente. Tudo via tool-use `record_insights` (mesma estrutura D-14).
- **D-37:** **Estado visível durante o research:** uma nova tabela `client_research_sessions` guarda `client_id`, `managed_agent_session_id`, `status` (queued/running/completed/failed), `started_at`, `completed_at`, `events_url` (stream SSE do MA), `progress_summary` (string curta atualizada pelo backend a cada N eventos). O card do cliente na lista (`Clients/Index`) mostra badge **"🔍 Pesquisando — ~XX min restantes"** enquanto `status=running`. Clicar no badge abre modal com timeline da sessão (eventos resumidos do MA).
- **D-38:** Ao concluir: toast "Pesquisa concluída — N insights adicionados ao cliente X" + inserção real dos entries em `client_ai_memory` com `source='managed_agent_onboarding'`. Usuário pode abrir a aba de memória do cliente e revisar/editar cada insight. Se `confidence < 0.6`, insight entra como "sugestão" (flag visual) e pede confirmação manual.
- **D-39:** Sem chave Anthropic válida (D-33), botão aparece desabilitado como outros. Se o usuário não quiser rodar o MA, pode preencher `client_ai_memory` manualmente depois via chat (fluxo D-14 existente continua válido) — MA é opt-in, nunca obrigatório.
- **D-40:** **Observabilidade:** todas as sessões MA trackadas via OTEL → Arize Phoenix (mesma infra do AI-SPEC Section 7) com tags `capability=client_research`, `client_id`, `organization_id`, `session_duration_sec`, `pieces_analyzed`, `insights_generated`, `cost_usd`. Evento `session.failed` dispara notificação in-app para o usuário ("Pesquisa falhou — ver detalhes" + CTA para retry ou preenchimento manual).

### Claude's Discretion

- Prompt engineering exato para geração de brief e planejamento (estrutura de seções, tom padrão)
- Algoritmo de extração de insights para `client_ai_memory` (parsing da resposta do assistente)
- Threshold e algoritmo de auto-compactação de conversas (quando e como resumir)
- Biblioteca de markdown rendering (react-markdown ou similar leve)
- Estrutura interna do SSE (Server-Sent Events) e error handling de stream
- Formatação exata das datas no cabeçalho do brief e nos cards de planejamento
- System prompt exato do Managed Agent "Conheça o Cliente" (quais seções ele deve popular, critérios de confidence, limite de páginas crawleadas)
- Algoritmo de dedupe do crawl (bloom filter em URLs visitadas, hash de conteúdo para descartar duplicatas)
- Exato set de built-in tools do MA (bash necessário? ou só web_search + web_fetch + file ops?)
- Estrutura visual da timeline de eventos da sessão MA (fica com UI-SPEC follow-up se necessário)
- Crypto adapter Laravel para a coluna `anthropic_api_key_encrypted` (nativo `encrypted` cast vs. biblioteca dedicada)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Context
- `.planning/REQUIREMENTS.md` — Requisitos completos da Phase 3 (AI-01→07, MPLAN-01→05)
- `.planning/ROADMAP.md` — Phase 3 goal, success criteria, dependencies
- `.planning/STATE.md` — Decisões técnicas acumuladas (SDK Anthropic, SSE, ai_memory table)
- `.planning/PROJECT.md` — Stack, design tokens, constraints

### Existing Code (leitura obrigatória antes de modificar)
- `resources/js/Components/DemandDetailModal.tsx` — Modal que receberá as abas de Brief e Chat IA
- `resources/js/pages/Clients/Index.tsx` — Listagem de clientes que receberá badge de cotas
- `resources/js/Components/ClientForm.tsx` — Formulário de cliente que receberá seção de plano mensal
- `resources/js/Components/Sidebar.tsx` — Sidebar que receberá item "Planejamento"
- `app/Models/Demand.php` — Inclui ai_analysis (JSON), type enum (demand/planning)
- `app/Models/Client.php` — Modelo base para adição de campos mensais
- `app/Models/ClientAiMemory.php` — Estrutura de memória: categories, insight, confidence
- `app/Models/PlanningSuggestion.php` — Estrutura de sugestões de planejamento
- `app/Models/AiConversation.php` e `AiConversationMessage.php` — Persistência de chat

### Assets
- `resources/js/assets/chatbot-icon-dark.svg` e `chatbot-icon-light.svg` — Ícone obrigatório em todas as UIs de IA

### Design System
- `docs/design-brief.md` — Tokens de cor, tipografia, bordas (primary #7c3aed, surface #111827)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `DemandDetailModal.tsx`: estrutura de 2 colunas (esq: detalhes, dir: comentários+arquivos) — a coluna direita precisa de sistema de abas. Padrão tab já existe em outros componentes? A ser verificado.
- `demands.ai_analysis` (JSON column): já existe, usar `ai_analysis.brief` para o brief gerado. Sem nova migration para demands.
- `ai_conversations` + `ai_conversation_messages` tables: já criadas com context_type=demand — usar diretamente.
- `client_ai_memory` table: já criada com categories e confidence — usar e atualizar.
- `planning_suggestions` table: já criada com status (pending/accepted/rejected) e converted_demand_id.
- `chatbot-icon-dark.svg` / `chatbot-icon-light.svg` em `resources/js/assets/` — já existem, importar onde necessário.
- Inertia partial reloads `only: ['selectedDemand']` — padrão já estabelecido para a modal.

### Established Patterns
- SSE: Laravel streaming response + React EventSource/fetch — a implementar (padrão decidido em STATE.md).
- Inline actions na modal: `router.patch/post/delete` com `only: ['selectedDemand']` + `preserveScroll: true`.
- Formulários: `useForm` do Inertia, `editForm.put()` para updates inline.
- Design tokens: `rounded-[8px]`, `border-[#1f2937]`, `bg-[#111827]` dark, `text-[#f9fafb]` dark.
- Empty states: padrão com ícone SVG + texto + botão de ação primária.

### Integration Points
- DemandDetailModal: adicionar abas Brief e Chat IA no painel direito.
- ClientForm + ClientsCreate/Edit: adicionar seção "Plano de Conteúdo Mensal" com 3 novos campos + botão "🤖 Conhecer este cliente com IA" (D-35) + novo campo opcional `social_handles` (JSON).
- Clients/Index.tsx: adicionar badge "X posts/mês" nos cards + badge "🔍 Pesquisando — ~XX min restantes" durante sessão MA ativa (D-37).
- Sidebar.tsx: adicionar item "Planejamento" com ícone e rota `/planejamento`.
- Nova página: `resources/js/pages/Planejamento/Index.tsx` com filtro + lista + cards de itens.
- Nova página: `resources/js/pages/Settings/Ai.tsx` — tela de configuração BYOK (D-32).
- Nova migration: `add_monthly_plan_to_clients_table` com 3 colunas + `social_handles` (JSON, nullable).
- Nova migration: `add_anthropic_api_key_to_organizations` com coluna text encrypted (D-31).
- Nova migration: `create_client_research_sessions_table` (id, client_id, managed_agent_session_id, status enum, started_at, completed_at, events_url, progress_summary) (D-37).
- Novos controllers: `AiBriefController`, `AiChatController`, `MonthlyPlanningController`, `Settings\AiController`, `ClientResearchController`.
- Novas rotas SSE: `GET /demands/{demand}/brief/generate` e `GET /demands/{demand}/chat/stream`.
- Novas rotas Managed Agents: `POST /clients/{client}/research` (inicia sessão MA), `GET /clients/{client}/research/{session}/events` (proxy SSE dos eventos do MA), `GET /clients/{client}/research/{session}` (status JSON).
- Nova service class: `app/Services/Ai/ClientResearchAgent.php` — wrapper do Managed Agents SDK; define Agent + Environment + Session.
- `LICENSE` na raiz (AGPL-3.0) + atualização do README com setup + BYOK (D-29).

</code_context>

<specifics>
## Specific Ideas

- **Brief tab**: 4 abas no painel direito: `Comentários | Arquivos | Brief | Chat IA`
- **Ícone AI obrigatório**: chatbot-icon-{dark,light}.svg em TODOS os elementos de IA. Sem exceções.
- **Nova Conversa**: botão discreto no header da aba Chat IA. Cria nova `ai_conversation`, não exclui a anterior.
- **Redesenhar**: textarea inline no card (sem modal). Feedback → Claude → atualiza title/description in-place.
- **Widget dashboard**: dia-1 aparece, dia+2 auto-descarta. Descartável com X. Clicar vai para /planejamento filtrado.
- **planning_day**: campo numérico 1-31 na seção "Plano Mensal" do ClientForm.
- **BYOK Settings**: tela `/settings/ai` com input password-type + botão "Testar chave" + badge de status. Acesso restrito a owner/admin.
- **"Conhecer cliente" opt-in**: botão dispara Managed Agent com duração 20–40 min. UI sinaliza pesquisa em andamento no card do cliente. Sem bloqueio de outras ações na Briefy durante a sessão.
- **Confidence flag**: insights com `confidence < 0.6` entram como sugestão para revisão manual (não auto-aplicados).
- **AGPL notice headers**: curtos, no topo de cada arquivo fonte PHP/TS: `// (c) 2026 Briefy contributors - AGPL-3.0`.

</specifics>

<deferred>
## Deferred Ideas

- Histórico de upgrades/downgrades de plano do cliente com data de vigência — registrar quando o plano mudou (deferred v2)
- Visualização de calendário para itens do planejamento mensal (deferred, Phase 3 usa cards)
- Geração de imagens/criativos pelo AI (out of scope v1.1)
- Modo de aprovação do cliente (portal cliente) — agency-only por ora
- Limite de tokens por plano de assinatura (deferred billing phase)

### Deferred to v1.2 (from Codex review H6 — 03-REVIEWS.md)

- **Live SSE timeline de Managed Agent events** — substituído em v1.1 por polling de DB a cada 30s. Ver `03-12b-PLAN.md` Task 1.
- **`ClientResearchTimelineModal`** — modal com timeline clicável das sessões MA. Ver `03-12b-PLAN.md` Task 2.
- **`ClientAiMemoryPanel` Sugestões tab** — UI Aprovar/Descartar para insights com `status='suggested'` (confidence < 0.6). Em v1.1 os insights são persistidos mas sem UI de review. Ver `03-12b-PLAN.md` Task 3.
- **Notificação in-app de conclusão de MA session** — depende da infra de notificações da Phase 4. Ver `03-12b-PLAN.md` Task 4.
- **Conversation picker na ChatTab** — v1.1 mostra apenas a conversa mais recente; histórico só acessível via DB (FLAG 11 do plan-checker original).

</deferred>

---

*Phase: 03-ai-integration*
*Context gathered: 2026-04-22*
