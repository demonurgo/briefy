# Briefy — Design Brief Completo

## Contexto do produto

**Briefy** é um SaaS B2B para agências de marketing e freelancers gerenciarem demandas de clientes com inteligência artificial integrada via Claude (Anthropic). O foco é produtividade, clareza e confiança — a agência sente que tem controle total sobre seus projetos e que a IA trabalha *com* ela, não no lugar dela.

**Público-alvo:** Agências de marketing pequenas/médias e freelancers criativos (designers, redatores, social media managers). Perfil: adultos de 25–40 anos, acostumados com ferramentas como Notion, Linear, Trello.

**Tom:** Profissional mas acessível. Moderno sem ser frio. Inteligente sem ser intimidador.

**Plataforma:** Web app (desktop-first com suporte mobile via bottom navigation). PWA instalável.

---

## O que precisa ser criado

### 1. Logo principal

**Nome:** Briefy

**Conceito esperado:**
- Combinação de logotipo (ícone + texto "Briefy")
- O ícone deve remeter a: briefing/documento + inteligência artificial + comunicação
- Ideias de formas: balão de fala estilizado, documento com faísca/spark, letra B abstraída, caneta/lápis com elemento digital

**Variações necessárias:**
- Logo completo horizontal (ícone + texto lado a lado)
- Logo compacto (só ícone, para favicon e sidebar colapsada)
- Versão clara (para fundos escuros)
- Versão escura (para fundos claros)

**Formato de entrega:** SVG (obrigatório), PNG 512x512

**Restrições:**
- Sem gradientes complexos — deve funcionar em 1 ou 2 cores
- Deve ser legível em 16x16px (favicon)
- Sem fontes customizadas no ícone — formas geométricas puras

---

### 2. Ícone do Assistente de IA (Chatbot flutuante)

**Descrição:** Botão fixo no canto inferior direito de todas as telas. Abre um painel de chat com Claude.

**Conceito esperado:**
- Ícone circular ou levemente arredondado (40–48px)
- Deve transmitir: IA, assistente, conversa inteligente
- Ideias: faísca/spark dentro de balão, estrela estilizada, forma abstrata de "mente", ondas/pulso
- Deve ser diferente do ícone principal do Briefy, mas coerente com o sistema visual
- Efeito opcional: brilho sutil ou pulsação animável (CSS)

**Variações necessárias:**
- Estado padrão (fechado)
- Estado ativo/aberto (pode ser só uma rotação ou mudança de cor)

**Formato de entrega:** SVG

---

### 3. Sistema de cores

**Defina as seguintes variáveis (responda com hex codes):**

#### Cor primária (brand)
> Usada em: botões principais, links ativos na navegação, badges de status, indicadores de progresso

- `primary-50` — fundo levíssimo (hover states, backgrounds sutis)
- `primary-100` — fundo suave
- `primary-400` — versão clara (textos em dark mode)
- `primary-500` — **cor principal**
- `primary-600` — hover de botões
- `primary-700` — pressed/active
- `primary-900` — texto escuro sobre fundo primário claro

> Referência de estilo: pode ser roxo-azulado (como o Notion/Linear), azul vibrante, verde-azulado, ou outro que combine com o conceito do logo.

#### Modo claro (light mode)
- `bg-page` — fundo da página (ex: `#f9fafb` cinza levíssimo ou `#ffffff` branco puro)
- `bg-surface` — fundo de cards, sidebar, header (ex: `#ffffff`)
- `bg-surface-hover` — hover de itens de lista (ex: `#f3f4f6`)
- `border` — cor de bordas e divisores (ex: `#e5e7eb`)
- `text-primary` — texto principal (ex: `#111827`)
- `text-secondary` — texto secundário, labels (ex: `#6b7280`)
- `text-muted` — texto desabilitado/placeholder (ex: `#9ca3af`)

#### Modo escuro (dark mode)
- `bg-page` — fundo da página (ex: `#0a0a0a` preto, `#0f172a` azul muito escuro, `#111827` cinza escuro)
- `bg-surface` — fundo de cards, sidebar, header
- `bg-surface-hover` — hover de itens
- `border` — bordas e divisores
- `text-primary` — texto principal
- `text-secondary` — texto secundário
- `text-muted` — placeholder/desabilitado

#### Cores semânticas
- `success` — verde (confirmações, status "approved") — hex
- `warning` — amarelo/laranja (prazos próximos, alertas) — hex
- `error` — vermelho (erros, exclusões) — hex
- `info` — azul claro (informações neutras) — hex

---

### 4. Tipografia

**Defina:**

#### Fonte principal (UI + corpo)
> Usada em: botões, labels, texto geral, parágrafos
> Deve ser do Google Fonts ou fonte do sistema
> Opções populares para SaaS: Inter, Geist, DM Sans, Plus Jakarta Sans, Nunito, Outfit

- Nome da fonte:
- Pesos usados: (ex: 400, 500, 600, 700)

#### Fonte de títulos (opcional — pode ser a mesma)
> Usada em: headings H1–H3, nome da organização, títulos de página
- Nome da fonte: (se diferente da principal)
- Peso: (ex: 600, 700, 800)

#### Escala tipográfica
> Defina os tamanhos para cada nível:
- `text-xs` — labels pequenos, badges (ex: 11px ou 12px)
- `text-sm` — texto secundário, tabelas (ex: 13px ou 14px)
- `text-base` — texto padrão (ex: 14px ou 16px)
- `text-lg` — subtítulos (ex: 16px ou 18px)
- `text-xl` — títulos de seção (ex: 18px ou 20px)
- `text-2xl` — títulos de página (ex: 20px ou 24px)

---

### 5. Estilo visual dos componentes

**Responda cada item:**

#### Border radius
- Botões: (ex: `rounded-md` = 6px, `rounded-lg` = 8px, `rounded-full` = pill)
- Cards: (ex: `rounded-lg` = 8px, `rounded-xl` = 12px)
- Inputs/campos: (ex: `rounded-md`, `rounded-lg`)
- Modais/painéis: (ex: `rounded-xl`, `rounded-2xl`)

#### Sombras
- Cards: (ex: sem sombra + só borda, sombra sutil `shadow-sm`, sombra média `shadow-md`)
- Modais: (ex: `shadow-xl` forte, `shadow-lg` médio)
- Estilo geral: flat (sem sombra, só bordas) / com sombras sutis / sombras pronunciadas

#### Densidade/espaçamento
- Compacto (padding pequeno, tabelas densas — estilo Linear)
- Médio (padrão — estilo Notion)
- Espaçado (muito respiro — estilo Stripe)

---

### 6. Ícones de status das demandas

As demandas têm 5 status. Defina a cor de cada um (ou diga "use o padrão"):

| Status | Label | Cor sugerida |
|---|---|---|
| `todo` | A fazer | cinza neutro |
| `in_progress` | Em andamento | azul |
| `awaiting_feedback` | Aguardando feedback | amarelo/laranja |
| `in_review` | Em revisão | roxo |
| `approved` | Aprovado | verde |

> Você pode confirmar, ajustar as cores, ou pedir algo diferente.

---

### 7. Ícones de PWA (para instalar como app)

**Necessários:**
- `icon-192.png` — 192×192px
- `icon-512.png` — 512×512px
- `apple-touch-icon.png` — 180×180px (para iOS)
- Fundo: usar a `primary-500` ou cor que combinar com o logo
- O ícone no centro deve ser a versão compacta do logo (só o símbolo, sem texto)

---

### 8. Referências visuais (opcional mas muito útil)

**Responda:**
- Algum SaaS/app que você gosta do visual? (Linear, Vercel, Notion, Stripe, Loom, etc.)
- Estilo preferido: minimalista / moderno-bold / clean corporativo / dark-first / colorido
- Alguma cor que definitivamente NÃO quer usar?
- Algum exemplo de logo que admira (mesmo de outro setor)?

---

### 9. Elementos adicionais (nice to have)

Se a IA de design conseguir gerar, seria ótimo ter também:
- **Empty state illustration** — imagem vetorial simples para telas sem dados (ex: lista de clientes vazia)
- **Favicon ICO/SVG** — versão 32×32 do ícone
- **Open Graph image** — 1200×630px para compartilhamento em redes sociais

---

## Como usar este brief

1. Copie este documento
2. Cole em uma IA de design (Ideogram, Midjourney com /describe, ChatGPT com DALL-E, Galileo AI, v0.dev, etc.)
3. Para o **logo e ícone do chatbot**: use ferramentas como Ideogram, Looka, ou peça para uma IA gerar o SVG
4. Para o **sistema de cores e tipografia**: preencha os campos em branco e me envie de volta preenchido
5. Para as **cores de status**: confirme ou ajuste a tabela
6. Com tudo respondido, atualizo o `tailwind.config.js`, o design spec e retomo a implementação frontend

---

## Checklist de entrega para o desenvolvedor

Quando tiver tudo, me envie:

- [ ] Logo SVG (completo + compacto + variações claro/escuro)
- [ ] Ícone do chatbot SVG
- [ ] Ícones PWA PNG (192, 512, 180)
- [ ] Hex codes de todas as cores (preenchidos acima)
- [ ] Nome da(s) fonte(s) escolhida(s)
- [ ] Border radius e estilo de sombras escolhidos
- [ ] Tabela de cores de status preenchida
