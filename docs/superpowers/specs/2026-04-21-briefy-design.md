# Briefy — Design Spec
**Data:** 2026-04-21  
**Contexto:** Hackathon Anthropic — prazo de 5 dias  
**Stack:** PHP 8.5, Laravel 13, Inertia.js v3, React 19, PostgreSQL 17 (nativo), Prism PHP (Anthropic/Claude), Laravel Reverb

---

## 1. Visão Geral do Produto

Briefy é uma plataforma SaaS para agências de marketing e freelancers gerenciarem suas demandas com clientes, com inteligência artificial integrada via Claude. O foco é na agência/freelancer — não existe portal do cliente. A agência alimenta o sistema com informações sobre pedidos e feedbacks recebidos dos clientes externamente, e o Claude atua como assistente inteligente em todo o fluxo.

**Problema resolvido:** Agências perdem informações importantes de clientes em WhatsApp, e-mail e reuniões; entregas saem desalinhadas com o briefing; datas importantes são esquecidas; planejamento de conteúdo é feito manualmente todo mês.

**Proposta de valor central:** Um sistema onde o Claude conhece cada cliente profundamente, aprende com cada demanda aprovada ou rejeitada, e age de forma proativa para evitar erros e retrabalho.

---

## 2. Usuários e Permissões

### Tipos de usuário
| Role | Capacidades |
|---|---|
| `admin` | Acesso total: criar/editar/excluir clientes, demandas, membros, configurações |
| `collaborator` | Criar e editar demandas, comentar, ver clientes atribuídos |

### Organização
- Cada agência/freelancer cria uma `organization`
- Usuários pertencem a uma `organization`
- Sem billing — qualquer um cria conta e usa tudo

---

## 3. Estrutura de Dados

### Hierarquia
```
Organization
└── Clients
    ├── Client Events
    ├── Client AI Memory
    └── Demands
        ├── Demand Files
        ├── Demand Comments
        └── Planning Suggestions (quando type = planning)
```

### Schema completo

```sql
organizations
  id, name, slug, logo, settings(json), created_at
  -- settings: { auto_analyze_deliverable: bool, planning_day: int|null, ... }

users
  id, organization_id, name, email, password
  role: enum(admin, collaborator)
  preferences: json        -- { locale: "pt-BR", theme: "dark" }
  last_login_at, created_at

clients
  id, organization_id, name, segment
  channels: json           -- ["instagram", "linkedin", "blog", ...]
  tone_of_voice: text
  target_audience: text
  brand_references: text
  briefing: text           -- texto livre complementar
  avatar: string|null
  created_at, updated_at

client_events
  id, client_id, title, date
  recurrent: boolean
  source: enum(manual, ai_extracted)
  created_at

client_ai_memory
  id, client_id
  category: enum(preferences, rejections, tone, style, audience, patterns)
  insight: text            -- ex: "Cliente prefere posts curtos, máx 3 parágrafos"
  confidence: int          -- 1-100, aumenta conforme confirmado em demandas
  source_demand_id: int|null
  created_at, updated_at

demands
  id, organization_id, client_id
  type: enum(demand, planning)
  title: string
  description: text|null   -- texto livre
  objective: string|null
  tone: string|null
  channel: string|null
  deadline: date|null
  status: enum(todo, in_progress, awaiting_feedback, in_review, approved)
  recurrence_day: int|null -- 1-31, somente para type=planning
  ai_analysis: json|null   -- { score, positives[], suggestions[], generated_at }
  created_by: int
  assigned_to: int|null
  created_at, updated_at

demand_files
  id, demand_id
  type: enum(upload, link)
  name: string
  path_or_url: string
  uploaded_by: int
  created_at

demand_comments
  id, demand_id, user_id|null
  body: text
  source: enum(user, ai)
  created_at

planning_suggestions
  id, demand_id
  date: date
  title: string
  description: text
  status: enum(pending, accepted, rejected)
  converted_demand_id: int|null
  created_at

notifications
  id, organization_id
  user_id: int|null        -- null = para todos da org
  type: string
  title: string
  body: text
  data: json
  read_at: timestamp|null
  created_at

ai_conversations
  id, organization_id, user_id
  context_type: enum(global, client, demand)
  context_id: int|null     -- client_id ou demand_id
  title: text|null         -- gerado pelo Claude
  created_at, updated_at

ai_conversation_messages
  id, conversation_id
  role: enum(user, assistant)
  content: text
  tokens_used: int
  created_at
```

---

## 4. Fluxo de Status das Demandas

```
todo → in_progress → awaiting_feedback → in_review → approved
                                         ↑        |
                                         └────────┘
                                          (volta para revisão
                                           se precisar de ajuste)
```

- Ao mover para `awaiting_feedback`: se `auto_analyze_deliverable = true` nas configurações **e** a demanda tiver ao menos um entregável, dispara `AnalyzeDeliverableJob`
- Ao mover para `approved`: dispara `ExtractClientInsightsJob` para atualizar `client_ai_memory`

---

## 5. Integrações com IA (Claude via Prism PHP)

### 5.1 Extração de Briefing
**Trigger:** Usuário cola texto livre e clica "Extrair com IA"  
**Input:** texto livre + perfil do cliente  
**Output:** campos preenchidos (objective, tone, channel, deadline, eventos detectados)  
**Execução:** síncrona (resposta rápida)

### 5.2 Validação de Perfil do Cliente
**Trigger:** Salvar perfil do cliente  
**Input:** todos os campos preenchidos  
**Output:** alerta se informações críticas estiverem faltando (ex: tom de voz vazio)  
**Execução:** síncrona

### 5.3 Análise de Entregável
**Trigger:** botão manual "Analisar com IA" OU automático ao mudar status (configurável)  
**Input:** briefing da demanda + perfil do cliente + memória IA do cliente + entregável (texto/link)  
**Output:** `{ score: 0-100, positives: [], suggestions: [], summary: "" }` → gravado em `demands.ai_analysis`  
**Execução:** job em fila → resultado enviado via Reverb broadcast

### 5.4 Geração de Planejamento
**Trigger:** usuário clica "Gerar Planejamento" dentro da demanda de planejamento OU scheduler diário (`TriggerRecurringPlannings`) que verifica demandas com `recurrence_day = dia_atual` e dispara automaticamente  
**Input:** perfil do cliente + memória IA + eventos do cliente + feriados (Brasil API) + demandas do mês seguinte  
**Output:** lista de `planning_suggestions` com datas e descrições  
**Execução:** job em fila → resultado via Reverb broadcast

### 5.5 Extração de Insights do Cliente
**Trigger:** demanda movida para `approved`  
**Input:** toda a demanda (briefing, comentários, entregável, análise)  
**Output:** novos insights gravados ou `confidence` incrementado em `client_ai_memory`  
**Execução:** job em fila silencioso (sem notificação ao usuário)

### 5.6 Extração de Datas Importantes
**Trigger:** novo comentário adicionado a uma demanda  
**Input:** texto do comentário + contexto da demanda  
**Output:** novos `client_events` com `source = ai_extracted` + notificação se data próxima  
**Execução:** job em fila

### 5.7 Assistente Flutuante (Chatbot)
**Trigger:** usuário envia mensagem no assistente  
**Input:** histórico da conversa (últimas 20 mensagens ou ~4000 tokens, o que vier primeiro) + contexto detectado (tela atual → perfil do cliente ou demanda) + memória IA do cliente (se contexto = cliente)  
**Output:** resposta em streaming via `StreamedResponse`  
**Execução:** síncrona com streaming SSE

---

## 6. Sistema de Notificações

### Tipos de notificação
| Tipo | Gatilho | Canal |
|---|---|---|
| `deadline_approaching` | Prazo da demanda em ≤ 2 dias, status ≠ approved | Dashboard (1º login) + e-mail + push PWA |
| `important_date` | Data extraída pela IA se aproximando (≤ 7 dias) | Dashboard + e-mail + push PWA |
| `analysis_ready` | Job de análise de entregável concluído | In-app (Reverb) |
| `planning_ready` | Job de planejamento concluído | In-app (Reverb) |

### Lógica do primeiro login
- Ao autenticar, verificar se `last_login_at < hoje`
- Se sim: buscar notificações pendentes de `deadline_approaching` e `important_date`
- Exibir modal ou banner de resumo no dashboard antes de qualquer outra ação

---

## 7. Telas e Navegação

### Navegação principal
**Desktop:** Sidebar fixa à esquerda  
**Mobile:** Bottom navigation bar

```
├── Dashboard
├── Clientes
│   └── [cliente]
│       ├── Demandas
│       ├── Perfil (tabs: Visão Geral / Identidade de Marca / Briefing / Eventos / Memória IA)
├── Demandas (visão global)
├── Planejamento
├── Configurações
│   ├── Perfil da Agência
│   ├── Membros da Equipe
│   └── Preferências de IA
└── [Assistente IA flutuante — todas as telas]
```

### Onboarding (4 passos)
1. Nome e logo da agência
2. Convidar membros da equipe (e-mail + role)
3. Cadastrar primeiro cliente (campos essenciais)
4. Tour interativo das funcionalidades principais

### Dashboard
- **Seção de alertas:** demandas com prazo próximo e tarefas em aberto, eventos importantes se aproximando
- **Cards de clientes:** avatar, nome, segmento, nº demandas abertas, última atividade, próximo prazo
- **Demandas recentes:** tabela com título, cliente, status, prazo

### Lista de Clientes
- Grid de cards com: avatar, nome, segmento, nº demandas abertas, status geral
- Busca e filtro por segmento

### Perfil do Cliente
Tabs:
- **Visão Geral:** métricas (total demandas, taxa de aprovação, tempo médio)
- **Identidade de Marca:** campos estruturados (segmento, canais, tom, público, referências)
- **Briefing:** textarea livre
- **Eventos:** calendário com datas manuais e extraídas pela IA
- **Memória IA:** lista de insights com categoria, confidence e origem

### Demandas do Cliente
- Toggle kanban / lista
- Kanban: colunas por status, cards com título, prazo, responsável
- Mobile: lista com swipe para mudar status
- Botão "Nova Demanda" com modal de criação

### Criação/Edição de Demanda
- Dois modos: **Formulário** (campos individuais) e **Texto livre** (colar briefing → Claude extrai)
- Campos: título, tipo, objetivo, tom, canal, prazo, responsável, descrição
- Nenhum campo obrigatório além do título

### Detalhe da Demanda
```
Header: título | status (dropdown) | prazo | responsável

Seções (accordion no mobile):
├── Briefing (campos + texto livre)
├── Entregáveis (upload + links externos)
├── Análise da IA (score, pontos positivos, sugestões)
└── Histórico (timeline de ações, feedbacks, comentários)
    └── Campo de novo comentário
```

### Planejamento
- Lista de demandas do tipo `planning`
- Ao abrir: calendário visual do mês com sugestões do Claude
- Cada sugestão: aceitar (gera demanda) / rejeitar / editar

### Assistente IA Flutuante
- Botão fixo (bottom-right todas as telas)
- **Desktop:** abre painel lateral deslizante
- **Mobile:** abre bottom sheet
- Detecta contexto automaticamente (tela atual)
- Histórico de conversas por contexto
- Resposta em streaming

---

## 8. Tema e Internacionalização

### Temas (Dark / Light)
- Suporte a tema claro e escuro via Tailwind CSS (`dark:` classes + `class` strategy)
- Detecção automática na primeira visita via `prefers-color-scheme`
- Preferência salva em `users.preferences(json)` e também em `localStorage` para aplicar antes do hydration (evitar flash)
- Toggle acessível nas Configurações e no header/sidebar

### Idiomas suportados
| Código | Idioma |
|---|---|
| `pt-BR` | Português (Brasil) — padrão |
| `en` | English |
| `es` | Español |

### Detecção automática
- Na criação da conta: detectar idioma pelo `Accept-Language` do browser
- Fallback: `pt-BR`

### Onde o usuário pode alterar
- **Configurações → Perfil** (idioma + tema)
- Preferências salvas em `users.preferences(json)`: `{ locale: "pt-BR", theme: "dark" }`

### Implementação
- **Backend (Laravel):** arquivos de tradução em `lang/pt-BR/`, `lang/en/`, `lang/es/` para mensagens de sistema, e-mails e notificações
- **Frontend (React):** biblioteca `react-i18next` com arquivos JSON por idioma em `resources/js/locales/`
- Todos os textos da UI passam por `t('chave')` — sem strings hardcoded na interface
- O locale ativo é passado via Inertia shared props (`usePage().props.locale`) e configura o `i18next` no boot da aplicação

---

## 9. PWA  

- `manifest.json` com nome, ícones, `theme_color`, `display: standalone`
- Service Worker para: cache de assets estáticos, ícone de instalação
- Push notifications via Web Push API + Laravel Notifications
- Sem suporte offline — apenas a aparência de app nativo

---

## 10. Real-time (Laravel Reverb)

Eventos broadcast:
| Evento | Canal | Gatilho |
|---|---|---|
| `DeliverableAnalyzed` | `private-org.{id}` | Job de análise concluído |
| `PlanningGenerated` | `private-org.{id}` | Job de planejamento concluído |
| `DemandUpdated` | `private-org.{id}` | Status, comentário ou arquivo alterado |
| `NotificationCreated` | `private-user.{id}` | Nova notificação criada |

---

## 11. Arquitetura de Código (Laravel)

```
app/
├── Http/Controllers/
│   ├── Auth/LoginController, RegisterController
│   ├── DashboardController
│   ├── ClientController
│   ├── DemandController
│   ├── PlanningController
│   ├── TeamController
│   ├── AIAssistantController    ← streaming SSE
│   └── NotificationController
├── Console/Commands/
│   └── TriggerRecurringPlannings  ← roda diariamente via scheduler
├── Services/
│   ├── AI/
│   │   ├── BriefingExtractorService
│   │   ├── DeliverableAnalyzerService
│   │   ├── PlanningGeneratorService
│   │   ├── InsightExtractorService
│   │   └── AssistantService     ← streaming
│   └── NotificationService
├── Jobs/
│   ├── AnalyzeDeliverableJob
│   ├── GeneratePlanningJob
│   ├── ExtractClientInsightsJob
│   └── ExtractDatesFromCommentJob
├── Events/
│   ├── DeliverableAnalyzed
│   ├── PlanningGenerated
│   └── DemandUpdated
└── Models/
    ├── Organization, User, Client
    ├── ClientEvent, ClientAiMemory
    ├── Demand, DemandFile, DemandComment
    ├── PlanningSuggestion, Notification
    └── AiConversation, AiConversationMessage
```

---

## 12. Fora do Escopo (v1)

- Portal do cliente (login para clientes)
- Billing / planos pagos
- Integração com redes sociais (agendamento de posts)
- Relatórios e exportações
- App mobile nativo
- Suporte offline no PWA
- Múltiplas organizações por usuário
