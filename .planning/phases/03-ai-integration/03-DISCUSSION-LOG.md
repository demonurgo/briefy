# Phase 3: AI Integration - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-22
**Phase:** 03-ai-integration
**Areas discussed:** Brief na modal, Chat com AI, Cotas mensais do cliente, Planejamento mensal: UI

---

## Brief na modal

| Option | Description | Selected |
|--------|-------------|----------|
| Aba dedicada "Brief" no painel direito | Modal ganha 4 abas: Comentários, Arquivos, Brief, Chat IA | ✓ |
| Seção colapsável no painel esquerdo | Abaixo da descrição, bloco expansível | |
| Substitui a descrição quando gerado | Campo dedicado mais simples | |

**User's choice:** Aba dedicada "Brief" no painel direito da modal

---

| Option | Description | Selected |
|--------|-------------|----------|
| No header da modal ao lado de "Editar" | Sempre visível independente da aba | ✓ |
| Dentro da aba/seção de Brief | Só visível na aba Brief | |
| FAB flutuante no canto inferior | Disponível em qualquer aba | |

**User's choice:** Botão "✨ Gerar Brief" no header da modal ao lado de "Editar"

---

| Option | Description | Selected |
|--------|-------------|----------|
| Empty state com botão de gerar | Ícone chatbot + "Nenhum brief gerado ainda" + botão grande | ✓ |
| Redirect para o botão no header | Texto instrucional simples | |

**User's choice:** Empty state com botão de gerar

---

| Option | Description | Selected |
|--------|-------------|----------|
| Conteúdo anterior some, novo texto char a char | Typewriter / streaming progressivo | ✓ |
| Overlay de loading sobre o brief existente | Mantém brief antigo visível com overlay | |
| Skeleton loader | Lines de skeleton durante geração | |

**User's choice:** Conteúdo anterior some, novo texto aparece char a char (typewriter)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Sim, com botão "Editar" que abre campo de texto | Read-only por padrão, editável via botão | ✓ |
| Sempre editável (textarea) | Máxima simplicidade | |
| Não, apenas visualização | Somente gerar/regenerar | |

**User's choice:** Sim, com botão "Editar" inline (PATCH para salvar)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Markdown renderizado | Seções, negrito, listas — profissional | ✓ |
| Texto simples pré-formatado | Sem dependência de biblioteca | |

**User's choice:** Markdown renderizado (usar react-markdown ou similar)

---

## Chat com AI

| Option | Description | Selected |
|--------|-------------|----------|
| Aba "Chat IA" no painel direito | 3 (depois 4) abas: Comentários, Arquivos, Chat IA | ✓ |
| Painel lateral | Empurra o conteúdo ao abrir | |
| Modal dentro do modal (fullscreen) | Máximo espaço, UX pesada | |

**User's choice:** Aba "Chat IA" no painel direito

---

| Option | Description | Selected |
|--------|-------------|----------|
| Sim, persiste em banco | ai_conversations + ai_conversation_messages já existem | ✓ |
| Não, sessão apenas | Mais simples, sem estado persistido | |

**User's choice:** Histórico persiste em banco

---

| Option | Description | Selected |
|--------|-------------|----------|
| Sim, mesmo typewriter | SSE reutilizado do brief | ✓ |
| Não, espera resposta completa | Mais simples, menos UX | |

**User's choice:** Streaming typewriter nas respostas do chat

---

| Option | Description | Selected |
|--------|-------------|----------|
| Sim, automaticamente a cada interação | Backend extrai insights e atualiza client_ai_memory | ✓ |
| Só após brief gerado | Menos processamento extra | |
| Manual: botão "Salvar insight" | Controle total, mais trabalho | |

**User's choice:** Atualização automática de memória a cada interação

---

| Option | Description | Selected |
|--------|-------------|----------|
| Tudo: metadados + arquivos + comentários + memória | Contexto rico para o AI | ✓ |
| Só metadados + memória | Menor token usage | |

**User's choice:** System prompt inclui tudo

---

| Option | Description | Selected |
|--------|-------------|----------|
| Limpar histórico | Botão de excluir todas as mensagens | |
| Sempre preservado | Sem opção de limpar | |
| Limite automático | Últimas 20 mensagens no context | |
| Nova Conversa + auto-compactação | Botão "Nova Conversa" + compactação automática > 30 msgs | ✓ |

**User's choice:** Botão "Nova Conversa" cria nova ai_conversation. Auto-compactação quando > 30 mensagens, sugere nova conversa.
**Notes:** O usuário levantou que "limpar" não é o ideal — melhor criar nova conversa e compactar a antiga automaticamente.

---

## Cotas mensais do cliente

| Option | Description | Selected |
|--------|-------------|----------|
| Total único por mês (1 campo numérico) | Simples, AI distribui entre canais | |
| Detalhado por canal (tabela) | Granular, UI complexa | |
| Texto livre (IA interpreta) | Flexível sem limitações de UI | |
| Numérico + textarea opcional | Campo numérico total + notas de distribuição | ✓ |

**User's choice:** Campo `monthly_posts` (numérico) + `monthly_plan_notes` (textarea opcional)
**Notes:** Usuário considerou texto livre puro ou apenas número, mas fechou com a combinação de ambos.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Seção 'Plano Mensal' no final do ClientForm | Após os campos atuais | ✓ |
| Aba separada 'Plano Mensal' | Requer navegação extra | |
| Página dedicada | Mais cliques | |

**User's choice:** Seção 'Plano Mensal' no final do ClientForm existente

---

| Option | Description | Selected |
|--------|-------------|----------|
| Não, opcionais | Botão avisa se não configurado | ✓ |
| monthly_posts obrigatório | Force campo preenchido | |

**User's choice:** Campos opcionais

---

| Option | Description | Selected |
|--------|-------------|----------|
| Badge discreto no card do cliente | '20 posts/mês' como tag pequena | ✓ |
| Só visível na edição | Mais limpo na listagem | |
| Não exibir | Metadata interna apenas | |

**User's choice:** Badge '20 posts/mês' no card do cliente na listagem

---

## Planejamento mensal: UI

| Option | Description | Selected |
|--------|-------------|----------|
| Página de detalhes do cliente | Seção na página /clients/{id} | |
| Botão no topo da página de demandas | Modal para selecionar cliente e mês | |
| Menu lateral dedicado "Planejamento" | Nova entrada no Sidebar | ✓ (+ dashboard) |

**User's choice:** Item "Planejamento" no Sidebar + widget de lembrete no dashboard baseado em planning_day por cliente
**Notes:** Usuário definiu que o widget aparece no dia anterior ao planning_day e pode ser descartado. Se o dia passar sem ação, pode ser descartado com X.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Cards com checkbox de aprovação | Título + canal + semana, 3 ações | ✓ |
| Tabela com ações em linha | Colunas: Título, Canal, Semana, Ações | |
| Visualização calendário | Itens no calendário mensal | |

**User's choice:** Card-style com 3 ações: Converter | Rejeitar | Redesenhar
**Notes:** Usuário pediu uma 3ª ação "Redesenhar" — feedback ao Claude para revisar apenas aquele item específico sem descartar.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Textarea inline no card | Feedback → AI revisa → card atualiza in-place | ✓ |
| Mini modal com preview lado a lado | Mais espaço para feedback complexo | |

**User's choice:** Textarea inline no card para feedback do Redesenhar

---

| Option | Description | Selected |
|--------|-------------|----------|
| Por cliente e mês, lista de planejamentos passados | /planejamento com filtro + histórico | ✓ |
| Só planejamento do mês atual | Simples, sem histórico | |

**User's choice:** Histórico de planejamentos por cliente e mês

---

| Option | Description | Selected |
|--------|-------------|----------|
| planning_day na seção 'Plano Mensal' do ClientForm | Junto com monthly_posts e monthly_plan_notes | ✓ |
| Separado nos dados gerais do cliente | Próximo ao nome/segmento | |

**User's choice:** Campo planning_day na mesma seção 'Plano Mensal'

---

| Option | Description | Selected |
|--------|-------------|----------|
| Widget dia-1, clicar vai para /planejamento filtrado | Descartável até dia+2 | ✓ |
| Widget 3 dias antes, gera diretamente no dashboard | Mais antecipação | |

**User's choice:** Widget aparece no dia anterior (planning_day - 1), clicar navega para /planejamento?client_id=X

---

| Option | Description | Selected |
|--------|-------------|----------|
| Checkbox + botão "Converter selecionados" | Seleção múltipla, conversão em massa | ✓ |
| Só item a item | Mais simples | |

**User's choice:** Conversão em massa com checkbox por card

---

| Option | Description | Selected |
|--------|-------------|----------|
| Título + canal + data + tipo=demand + cliente | Campos pré-preenchidos ao converter | ✓ |
| Só título e cliente | Minimalista | |

**User's choice:** Converter cria demand com: title, channel, deadline=suggestion.date, type='demand', status='todo', client_id já vinculado

---

## Claude's Discretion

- Prompt engineering exato para geração de brief e planejamento
- Algoritmo de extração de insights para client_ai_memory
- Threshold e estratégia de auto-compactação de conversas
- Biblioteca de markdown rendering (react-markdown ou similar)
- Estrutura interna do SSE e error handling
- Formatação de datas nos cards de planejamento

## Deferred Ideas

- Visualização de calendário para planejamento (considerada, descartada em favor de cards)
- Histórico de upgrades de plano com data de vigência (v2)
- Geração de imagens/criativos por AI (out of scope v1.1)
