# Phase 3: AI Integration — Research

**Researched:** 2026-04-22
**Domain:** AI integration plumbing (frontend SSE consumption, Managed Agents raw HTTP, BYOK crypto, AGPL packaging) — NOT the AI layer itself (see 03-AI-SPEC.md)
**Confidence:** HIGH overall; MEDIUM on typewriter rendering details; HIGH on MA API shapes (pulled directly from `platform.claude.com` 2026-04)

> **Scope note.** This document intentionally does NOT re-research topics already locked in `03-AI-SPEC.md` (Anthropic PHP SDK usage, PHP-side SSE, prompt caching, model routing, tool-use for structured outputs, OTEL, eval strategy). It fills the planning gaps that AI-SPEC + UI-SPEC leave open: the browser side of the SSE contract, Managed Agents HTTP plumbing, BYOK crypto, AGPL packaging, the `/planejamento` page architecture, dashboard reminder widget mechanics, and the `client.social_handles` JSON column.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions — copied verbatim from 03-CONTEXT.md (D-01..D-40)

**Brief na DemandDetailModal**
- **D-01:** Brief gerado aparece em aba dedicada no painel direito da modal. O painel direito passa a ter **4 abas**: `Comentários | Arquivos | Brief | Chat IA`.
- **D-02:** Botão "✨ Gerar Brief" fica no **header da modal**, ao lado do botão "Editar" existente. Visível independente da aba ativa.
- **D-03:** Aba Brief com brief ausente: **empty state** com ícone chatbot + texto "Nenhum brief gerado ainda" + botão grande "Gerar Brief com IA".
- **D-04:** Streaming visual: durante geração/regeneração, o conteúdo anterior some imediatamente e o novo texto **aparece char a char** (efeito typewriter via SSE). Sem overlay, sem skeleton.
- **D-05:** Após geração, brief é **read-only por padrão**. Botão "Editar" aparece no canto da aba Brief para abrir o campo de texto editável. Salva via PATCH no mesmo endpoint inline (`demands.inline.update` ou endpoint dedicado).
- **D-06:** Brief renderizado como **markdown** (negrito, títulos, listas). Usar biblioteca de renderização leve (ex: `react-markdown`).
- **D-07:** Botão "Regenerar" aparece ao lado de "Editar" quando brief já existe. Usa o mesmo endpoint de geração.
- **D-08:** Brief armazenado em `demands.ai_analysis` (JSON já existente). Campo: `ai_analysis.brief` (string).

**Chat com AI na DemandDetailModal**
- **D-09:** Chat vive na aba **"Chat IA"** no painel direito (4ª aba: Comentários | Arquivos | Brief | Chat IA).
- **D-10:** Histórico **persiste em banco** via `ai_conversations` (context_type=`demand`, context_id=demand.id) + `ai_conversation_messages`.
- **D-11:** Respostas do assistente fazem **streaming typewriter** igual ao brief (SSE reutilizado).
- **D-12:** **System prompt** do chat inclui: metadados completos da demanda + lista de arquivos + últimos 20 comentários + memória do cliente.
- **D-13:** **Gerenciamento de histórico**: botão "Nova Conversa" cria nova `ai_conversation`. Quando uma conversa atingir >30 mensagens, backend **auto-compacta**.
- **D-14:** **Memória do cliente atualiza automaticamente** após cada resposta do assistente.

**Ícone do Chatbot (Design Token de IA)**
- **D-15:** **Todos os elementos de UI de IA** devem usar `chatbot-icon-{dark,light}.svg`.

**Cotas Mensais do Cliente**
- **D-16:** Adicionar **3 novos campos** na tabela `clients` (`monthly_posts`, `monthly_plan_notes`, `planning_day`).
- **D-17:** Seção "Plano de Conteúdo Mensal" no final do `ClientForm`.
- **D-18:** Campos **opcionais**. Aviso quando `monthly_posts` não está preenchido.
- **D-19:** Badge discreto **"X posts/mês"** no card do cliente na listagem.

**Planejamento Mensal — Estrutura de Dados**
- **D-20:** Planejamento mensal usa **demand de type='planning'** + `planning_suggestions`.
- **D-21:** `planning_suggestions` já tem os campos necessários. **Não precisa de migration adicional**.
- **D-22:** Ao converter item em demanda, criar `Demand` e setar `converted_demand_id`.

**Planejamento Mensal — UI**
- **D-23:** Novo item **"Planejamento"** na Sidebar. Rota: `/planejamento`.
- **D-24:** Página `/planejamento`: filtro por cliente, lista agrupada por mês, botão "Gerar Planejamento".
- **D-25:** Cards com três ações: Converter em demanda / Rejeitar / Redesenhar (textarea inline).
- **D-26:** Converter em massa: checkbox + botão flutuante.
- **D-27:** Widget de lembrete no dashboard: visível `planning_day - 1` até `planning_day + 2`, descartável.
- **D-28:** Redesenhar chama API que envia item + feedback, atualiza in-place.

**BYOK & Open Source (AGPL-3.0)**
- **D-29:** Briefy é open source **AGPL-3.0**. LICENSE na raiz + README em EN + notice per-file.
- **D-30:** **BYOK (Bring Your Own Key)** — cada organização cola sua chave Anthropic.
- **D-31:** Chave em `organizations.anthropic_api_key_encrypted` (Laravel `encrypted` cast). **Nunca logada**, **nunca retornada pelo JSON API**, mascarada como `sk-ant-...XXXX`.
- **D-32:** Tela `/settings/ai` com input password-type + "Testar chave" + badge de status.
- **D-33:** Sem chave configurada: botões AI desabilitados com tooltip. Menus/abas continuam navegáveis.
- **D-34:** Guardrails de custo: "avisar com confirmação" para operações caras, não bloquear.

**"Conheça o Cliente" — Managed Agent**
- **D-35:** Botão **"🤖 Conhecer este cliente com IA"** no ClientForm. Novo campo `social_handles` JSON.
- **D-36:** MA faz crawl 20–40 min + popula `client_ai_memory`.
- **D-37:** Nova tabela `client_research_sessions`. Badge "🔍 Pesquisando" no card.
- **D-38:** Concluído: toast + inserção em `client_ai_memory` com `source='managed_agent_onboarding'`.
- **D-39:** Sem chave válida: botão desabilitado. MA é opt-in.
- **D-40:** Todas as sessões MA trackadas via OTEL → Arize Phoenix.

### Claude's Discretion
- Prompt engineering exato para brief/planejamento
- Algoritmo de extração de insights para `client_ai_memory`
- Threshold e algoritmo de auto-compactação de conversas
- **Biblioteca de markdown rendering (react-markdown ou similar)** ← THIS RESEARCH RECOMMENDS: `react-markdown@10.1.0`
- **Estrutura interna do SSE e error handling de stream** ← THIS RESEARCH RECOMMENDS: `fetch(ReadableStream).getReader()` for SSE consumption
- Formatação exata das datas
- System prompt exato do MA
- Algoritmo de dedupe do crawl
- Exato set de built-in tools do MA
- Estrutura visual da timeline de eventos MA
- **Crypto adapter Laravel para `anthropic_api_key_encrypted`** ← THIS RESEARCH RECOMMENDS: native Laravel `encrypted` cast (AES-256 + APP_KEY signed via HMAC)

### Deferred Ideas (OUT OF SCOPE)
- Histórico de upgrades/downgrades de plano do cliente
- Visualização de calendário (Phase 3 usa cards)
- Geração de imagens/criativos pelo AI
- Modo de aprovação do cliente (portal cliente)
- Limite de tokens por plano de assinatura
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| **AI-01** | User can request AI to generate a content brief for a demand | Covered by AI-SPEC §3 (`AiBriefController` streaming endpoint). This doc contributes: frontend EventSource consumption pattern (§ Frontend Integration Patterns → Pattern A) |
| **AI-02** | AI-generated brief is displayed as a dedicated section in modal | Covered by UI-SPEC §Component 3. This doc contributes: react-markdown v10 setup with custom `components` prop (§ Markdown Rendering) |
| **AI-03** | Regenerate brief with one click | Covered by AI-SPEC §3; this doc adds: SSE cancellation via `AbortController` + state reset before re-stream (§ Frontend Integration Patterns → Cancellation) |
| **AI-04** | Chat with AI within a demand | Covered by AI-SPEC §3; this doc adds: Chat tab via Headless UI Tabs vs. custom (§ Tab System) + typewriter queue for assistant bubbles (§ Typewriter Rendering) |
| **AI-05** | Chat has full demand context as system prompt | Covered entirely by AI-SPEC §4 (`ChatPromptBuilder`). No new research needed. |
| **AI-06** | AI stores/retrieves `client_ai_memory` per org | Covered by AI-SPEC §4 (`ClientMemoryExtractor`). No new research needed. |
| **AI-07** | AI responses stream progressively (char-by-char) | Covered partially by AI-SPEC §3 (server side); this doc contributes: browser side `ReadableStream.getReader()` chunk parsing + rAF-batched state update (§ Typewriter Rendering) |
| **MPLAN-01** | Client has configurable monthly plan with quantities | This doc contributes: migration columns shape (§ Client Monthly Plan Columns) + `social_handles` JSON column (§ Social Handles) |
| **MPLAN-02** | Client plan quantities editable anytime | Covered by standard Inertia `useForm` PATCH pattern (no new research). |
| **MPLAN-03** | AI respects plan quantities exactly | Covered by AI-SPEC §4b (JSON-schema tool-use + Laravel validator). No new research. |
| **MPLAN-04** | Monthly plan produces structured list | Covered by AI-SPEC §3 + §4b. No new research. |
| **MPLAN-05** | Plan items can be converted to demands | This doc contributes: `/planejamento` page architecture with URL query-string filter state + card state machine (§ /planejamento Page Architecture) + mass-convert batch endpoint shape |
</phase_requirements>

---

## Summary

Phase 3 is 60% "plumbing around a locked AI design" and 40% "net-new UI surfaces + open-source packaging". AI-SPEC already locks the server-side (PHP SDK, streaming, prompt caching, model tiers, eval). This research closes the remaining loop: (1) **how the browser consumes the SSE stream Laravel emits** (verdict: `fetch` + `ReadableStream.getReader()`, NOT `EventSource`, because authenticated Laravel session cookies + POST body sometimes requires headers `EventSource` cannot send); (2) **how to call Managed Agents from PHP without an SDK** (verdict: raw HTTP via `Http::withHeaders()` — the Anthropic PHP SDK does NOT yet wrap MA; `$client->beta->sessions->create()` examples in MA quickstart are **forward-looking TypeScript/Python SDK pseudocode**, NOT available in the current PHP SDK v0.16); (3) **how to store BYOK keys securely** (verdict: Laravel's native `encrypted` cast, backed by APP_KEY, HMAC-signed, is sufficient — no third-party crypto library needed); (4) **what AGPL-3.0 packaging actually requires** (verdict: LICENSE file at repo root + 10-line notice header per source file is the minimum; the short notice pattern `// (c) 2026 Briefy contributors — AGPL-3.0` from CONTEXT.md specifics is formally sufficient when LICENSE is present in the same distribution); (5) **a minimal tab system** (verdict: **use `@headlessui/react@^2.2.10` Tabs** — already in `devDependencies`, provides correct ARIA + keyboard; building it ourselves is a 2-hour cost-for-nothing); (6) **react-markdown v10** (current, NOT v9 — v10 released 2025-03-07, peer deps `react@>=18`, wire `rehype-sanitize@^6.0.0` for defense-in-depth); (7) **typewriter rendering** (verdict: decouple chunk arrival from render via a ref-based character queue drained by `requestAnimationFrame` at 200 chars/sec, not by re-rendering on every SSE chunk).

**Primary recommendation:** Use the **browser-side `fetch` + `ReadableStream.getReader()` pattern** (not `EventSource`) for SSE; use **Headless UI Tabs** (already installed); use **react-markdown@10.1.0 + rehype-sanitize@6.0.0 + remark-gfm@4.0.1**; use **Laravel's native `encrypted` cast** for BYOK; package **AGPL-3.0** with short per-file headers + full `LICENSE`; use **raw HTTP (`Http::withHeaders`)** to call Managed Agents endpoints — confirm the PHP SDK release cycle at implementation time in case `beta->sessions` lands in v0.17+.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| SSE chunk parsing + rAF typewriter | **Browser** | — | DOM rendering is inherently browser-side; decoupling network chunk arrival from paint is a pure-UI concern. |
| SSE stream emission (brief/chat) | **API / Backend (PHP-FPM)** | — | Locked by AI-SPEC §3 (`response()->eventStream`). |
| Managed Agents proxy endpoint | **API / Backend** | — | The user's Anthropic key MUST NOT reach the browser; the backend terminates the MA SSE stream, redacts the API key from events, and re-emits to the browser. |
| `client_research_sessions` polling | **Browser** (Inertia prop on next navigation) OR Reverb channel (Phase 4) | **API / Backend** | Polling is acceptable for v1.1 (20-40 min sessions). Reverb broadcast is a Phase 4 upgrade. |
| BYOK key encrypt/decrypt | **API / Backend** | **Database** (stores ciphertext) | All crypto stays server-side; key is decrypted per-request, never persisted in memory beyond the request. |
| BYOK key display (masked) | **API / Backend** | **Browser** | Server computes the `sk-ant-...XXXX` mask and ships ONLY the mask to the browser via Inertia prop. |
| `/planejamento` list + filter | **Frontend Server (Inertia SSR)** | **API** | Standard Inertia page with server-side filter via query string; no client-side refetch needed. |
| Dashboard planning reminder widget | **Browser** | **API / Backend** | Render-time visibility check (date math); dismissal state is a localStorage concern (keyed `planning_reminder_dismissed:{client_id}:{YYYY-MM}` per UI-SPEC §9). |
| AGPL notice headers | **Build-time tooling** (lint) | — | Adding a header is a scripted find-and-prepend. Enforce via a CI check or pre-commit hook. |

---

## Standard Stack

### Core — new dependencies for Phase 3

| Library | Version | Purpose | Why Standard | Provenance |
|---------|---------|---------|--------------|------------|
| `react-markdown` | **10.1.0** (released 2025-03-07) | Render AI brief + chat assistant bubbles as markdown | Most-downloaded React markdown renderer; exposes `components` prop for Tailwind class mapping; works with React 19 (peer `react@>=18`). | [VERIFIED: npm view react-markdown = 10.1.0 time.modified=2025-03-07] [CITED: github.com/remarkjs/react-markdown] |
| `rehype-sanitize` | **6.0.0** | XSS defense-in-depth on rendered markdown | Even though we generate the markdown ourselves via Claude, the input could be influenced by a poisoned `client_ai_memory` entry; sanitizing on render is cheap and eliminates an entire class of bug. | [VERIFIED: npm view rehype-sanitize = 6.0.0] [CITED: github.com/remarkjs/react-markdown#security] |
| `remark-gfm` | **4.0.1** | GitHub-flavored markdown (tables, strikethrough, task lists) | Claude commonly emits tables in monthly plans and strikethrough in chat; without gfm, these render as raw text. | [VERIFIED: npm view remark-gfm = 4.0.1] |
| `@headlessui/react` | **2.2.10** (already installed — `package.json` devDeps) | Tabs + Listbox components with baked-in ARIA + keyboard | Already in project; no new dep. Correct ARIA is not something you want to hand-roll. | [VERIFIED: npm view @headlessui/react = 2.2.10; found in `package.json` devDependencies] [CITED: headlessui.com/react/tabs] |

### Supporting — existing deps (confirm already-installed, no bump required)

| Library | Version in project | Purpose |
|---------|-------------------|---------|
| `@inertiajs/react` | ^2.0.0 | Already handles partial reloads `only: [...]`, query-string navigation via `router.get(..., {}, { preserveState: true })`. |
| `lucide-react` | ^1.8.0 | Icons for non-AI surfaces (Calendar, Check, X, RefreshCw, Send) — AI surfaces use `chatbot-icon-{dark,light}.svg` per D-15. |
| `react-i18next` | ^17.0.4 | i18n for new pt-BR/en/es tokens defined in UI-SPEC §i18n Contract. |

### PHP (composer) — no new deps beyond AI-SPEC lock

| Package | Version | Purpose | Why standard |
|---------|---------|---------|--------------|
| `anthropic-ai/sdk` | `^0.16.0` | Messages API for brief / chat / plan / redesign | Already locked in AI-SPEC §2-3. |
| Laravel native `encrypted` cast | Built-in (Laravel 13.x) | BYOK key at-rest encryption | AES-256-GCM signed with APP_KEY. No third-party crypto lib needed. [CITED: laravel.com/docs/13.x/encryption] |

**Do NOT add:** `spatie/laravel-encrypted-*`, `stechstudio/laravel-crypto`, or any other third-party encryption package. Laravel's native cast is sufficient and battle-tested.

**Do NOT add:** `symfony/http-client` (for MA HTTP calls) — Laravel's `Http::*` facade (Guzzle under the hood) is already in the framework and handles SSE responses via `Http::withOptions(['stream' => true])`.

### Alternatives Considered

| Instead of | Could Use | Tradeoff — why we don't |
|------------|-----------|------------------------|
| react-markdown | `markdown-it` + `react-markdown-it` | Less idiomatic for React; no built-in `components` prop for per-element overrides; smaller ecosystem around plugins. |
| react-markdown | `micromark` directly | Lower-level, no React integration — we'd re-implement `components` mapping ourselves. |
| Headless UI Tabs | Custom-built tab component | 2–4 hrs to build correctly + ongoing ARIA maintenance; Headless UI is ALREADY IN THE PROJECT. Zero-cost win. |
| Headless UI Tabs | Radix UI Tabs | Adds a new dep; project pattern is Tailwind + manual tokens (UI-SPEC explicitly "no shadcn"); Radix brings its own conventions. |
| `fetch` + `ReadableStream` for SSE | `EventSource` | `EventSource` can't send custom headers (problem for CSRF token), can't use POST (problem for chat that needs a message body), auto-reconnects (undesired for a one-shot stream). |
| Native `encrypted` cast | `paragonie/halite` | Halite is excellent but overkill; Laravel's cast is correct AES-256-GCM + HMAC; the attack surface is not "Laravel's crypto is weak", it's "we leaked the key via a log statement" — which is a code-review concern, not a crypto-library choice. |
| Raw HTTP for Managed Agents | Wait for `beta->sessions` in PHP SDK | Currently (v0.16.0, 2026-04-16) the PHP SDK does NOT expose MA endpoints; the Python/TS SDKs do. Waiting is an open-ended timeline risk; raw HTTP is 40 lines of code. |

### Installation

```bash
# Frontend (from project root)
npm install react-markdown@^10.1.0 rehype-sanitize@^6.0.0 remark-gfm@^4.0.1

# Backend — nothing new beyond AI-SPEC lock
composer require "anthropic-ai/sdk:^0.16.0"  # already in AI-SPEC §3
```

**Version verification (performed 2026-04-22):**
```
$ npm view react-markdown version        → 10.1.0   (published 2025-03-07)
$ npm view rehype-sanitize version       → 6.0.0    (published 2023-11-20, stable API)
$ npm view remark-gfm version            → 4.0.1
$ npm view @headlessui/react version     → 2.2.10   (published 2026-04-13 — very current)
$ composer show anthropic-ai/sdk         → v0.16.0 (published 2026-04-16) via Packagist API
```

---

## Frontend Integration Patterns

### Why NOT `EventSource`: the research finding

`EventSource` (built-in browser API) is the obvious choice for SSE. It has three disqualifying limitations in a Laravel + Inertia + CSRF context:

1. **No custom headers** — cannot send `X-CSRF-TOKEN` or `Authorization` headers. Laravel routes protected by the `web` middleware group require the CSRF token on POST. [CITED: oneuptime.com/blog/post/2026-01-15-server-sent-events-sse-react/view]
2. **No POST body** — `EventSource` only supports GET. The chat endpoint in AI-SPEC §3 uses POST to accept the user message. Brief generation could use GET, but consistency matters.
3. **Auto-reconnects** — `EventSource` attempts reconnection on disconnect. For a one-shot stream, this is unwanted; user clicks "Regenerate" and we don't want the previous stream to come back from the dead.

`fetch` + `ReadableStream.getReader()` has none of these limitations: it sends any headers, supports POST bodies, respects `AbortController.signal`, and terminates cleanly.

### Pattern A — Shared SSE consumer hook (recommended)

Create `resources/js/hooks/useAiStream.ts` (already referenced in AI-SPEC §3 project structure) as the single SSE consumer for brief + chat:

```ts
// resources/js/hooks/useAiStream.ts
// Source: pattern verified against MDN ReadableStream + Laravel 13 eventStream docs
import { useCallback, useRef, useState } from 'react';

export type StreamState = 'idle' | 'streaming' | 'done' | 'error';

export interface StreamChunk {
  event: 'delta' | 'done' | 'error';
  data: { text?: string; message?: string; ok?: boolean };
}

export function useAiStream() {
  const [state, setState] = useState<StreamState>('idle');
  const [buffer, setBuffer] = useState('');
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const start = useCallback(async (url: string, init?: RequestInit) => {
    abortRef.current?.abort();        // cancel any in-flight previous stream (D-04 "clear immediately")
    const controller = new AbortController();
    abortRef.current = controller;

    setBuffer('');
    setError(null);
    setState('streaming');

    try {
      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
        headers: {
          Accept: 'text/event-stream',
          'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '',
          'X-Requested-With': 'XMLHttpRequest',   // Laravel marks Inertia requests; keeps the session guard happy
          ...init?.headers,
        },
      });

      if (!response.ok || !response.body) {
        setError(`Stream failed (${response.status})`);
        setState('error');
        return;
      }

      const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
      let acc = '';                    // multi-chunk buffer for partial SSE frames

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        acc += value;
        // SSE frames are delimited by \n\n
        const frames = acc.split('\n\n');
        acc = frames.pop() ?? '';      // keep the trailing partial frame
        for (const frame of frames) {
          const parsed = parseSseFrame(frame);
          if (!parsed) continue;
          if (parsed.event === 'delta' && parsed.data.text) {
            // Push to typewriter queue (see § Typewriter Rendering)
            enqueueChars(parsed.data.text);
          } else if (parsed.event === 'done') {
            setState('done');
          } else if (parsed.event === 'error') {
            setError(parsed.data.message ?? 'Unknown stream error');
            setState('error');
          }
        }
      }
    } catch (err: unknown) {
      if ((err as Error).name === 'AbortError') return;   // user cancelled, not an error
      setError((err as Error).message);
      setState('error');
    }
  }, []);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setState('idle');
  }, []);

  return { state, buffer, error, start, cancel };
}

function parseSseFrame(frame: string): StreamChunk | null {
  const lines = frame.split('\n');
  let event: string | undefined;
  let data: string | undefined;
  for (const line of lines) {
    if (line.startsWith('event:')) event = line.slice(6).trim();
    else if (line.startsWith('data:')) data = (data ?? '') + line.slice(5).trim();
  }
  if (!event || !data) return null;
  try {
    return { event: event as StreamChunk['event'], data: JSON.parse(data) };
  } catch {
    return null;
  }
}
```

[CITED: developer.mozilla.org — ReadableStream.getReader, TextDecoderStream]
[CITED: laravel.com/docs/13.x/responses — `eventStream()` closes with `</stream>` tail marker]

**Why the `}-split on \n\n` approach and not `response.body.pipeThrough(new EventSourceParser())`:** there is no standard `EventSourceParser` TransformStream in browsers as of April 2026; third-party libraries exist (`eventsource-parser` on npm) but the 20-line inline parser above is simpler and has fewer moving parts.

**Alternative (if you want a tested parser):** `eventsource-parser@^3.0.0` — MIT, 3KB gzipped, widely used in AI SDKs. Swap `parseSseFrame` for its `createParser` callback. [ASSUMED — not verified in this session; confirm on npm before adopting.]

### Pattern B — Relationship to Inertia partial reloads

When a stream completes (event `done`), the controller has already persisted the final result (brief text → `demands.ai_analysis.brief`; assistant message → `ai_conversation_messages`). The frontend should NOT try to reconstruct state from the accumulated stream buffer for long-term display — instead, ask Inertia to re-fetch the canonical `selectedDemand` prop:

```ts
// inside useAiStream or the caller's `onDone` callback
import { router } from '@inertiajs/react';

router.reload({ only: ['selectedDemand'], preserveScroll: true });
```

This mirrors the pattern established in Phase 2 (see `DemandDetailModal.tsx` line 34: `router.patch(..., { only: ['demands', 'selectedDemand'] })`). The streamed text is rendered during streaming for UX; the persisted prop is the source of truth afterward. [CITED: inertiajs.com/partial-reloads]

### Pattern C — Production SSE behind Apache/nginx

**HIGH-severity pitfall (already surfaced in AI-SPEC §3 pitfall 2, repeated here for planner):** PHP-FPM and proxies buffer by default. Laravel 13's `response()->eventStream()` sets `X-Accel-Buffering: no` automatically, but the **reverse proxy must also disable buffering**:

**nginx location block for SSE routes** (verified pattern, [CITED: serversideup.net/blog/sending-server-sent-events-with-laravel/]):
```nginx
location ~ ^/demands/\d+/(brief/generate|chat/.*/stream)$ {
    proxy_buffering off;
    proxy_cache off;
    proxy_read_timeout 300s;
    proxy_connect_timeout 75s;
    fastcgi_buffering off;
    gzip off;
    # ... rest of FastCGI/proxy_pass directives
}
```

**Apache:** `SetEnv no-gzip 1` + `ProxyPass ... flushpackets=on` on the SSE location. If the deployment uses `mod_deflate`, exclude SSE routes explicitly.

### Pattern D — Cancellation on user action

Canceling a stream mid-flight (user clicks "Regenerar" during generation, switches tabs, or closes the modal) calls `abortRef.current.abort()` in the hook. The server detects the socket close and the `Anthropic\Client::messages->createStream()` iterator raises inside the generator; the controller catches this and abandons the partial response without persisting it.

**Pitfall:** if the user clicks "Regenerar" mid-stream, D-04 mandates **clearing the previous brief immediately**. The hook above does this by calling `setBuffer('')` before starting the next stream. Verify `typewriter queue` (§ Typewriter Rendering) is also cleared in the same step — otherwise leftover characters from the previous stream leak into the new one.

---

## Typewriter Rendering

### Why naive `setBuffer(buffer + chunk)` on every SSE chunk is wrong

- **Chunks arrive in unpredictable bursts.** Anthropic's stream may emit 1 token every 30ms at the start (TTFT) and 50 tokens in a single frame 2 seconds in. Re-rendering on every chunk means 50 re-renders in one animation frame → jank, wasted reconciliation.
- **React 18/19 auto-batching helps but not enough.** Concurrent rendering schedules low-priority updates, but a streaming prose block with markdown parsing is a medium-priority update — it gets painted, just suboptimally.
- **UX-wise, char-by-char at a human reading rate (~200 chars/sec) looks more polished than "200 chars appear, then 30ms of nothing, then 200 more".**

### Recommended: ref-queue + `requestAnimationFrame` drain

```ts
// resources/js/hooks/useTypewriter.ts
// Source: pattern synthesized from sitepoint.com/streaming-backends-react-controlling-re-render-chaos
//         + upstash.com/blog/smooth-streaming (AI SDK v5 smooth streaming)
import { useEffect, useRef, useState } from 'react';

const CHARS_PER_SECOND = 200;                 // ~5ms per char — readable, not sluggish

export function useTypewriter(active: boolean) {
  const queueRef = useRef<string[]>([]);       // incoming chunk queue
  const [rendered, setRendered] = useState('');
  const rafRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(performance.now());

  // drain loop — runs only while streaming
  useEffect(() => {
    if (!active) {
      // on stream end, flush whatever's left in one final setState so we don't
      // lose trailing characters that arrived right before `done`
      if (queueRef.current.length > 0) {
        setRendered((r) => r + queueRef.current.join(''));
        queueRef.current = [];
      }
      return;
    }

    const tick = (now: number) => {
      const elapsed = now - lastTickRef.current;
      const toDrain = Math.floor((elapsed / 1000) * CHARS_PER_SECOND);
      if (toDrain > 0 && queueRef.current.length > 0) {
        const pulled = queueRef.current.splice(0, toDrain).join('');
        setRendered((r) => r + pulled);
        lastTickRef.current = now;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [active]);

  const enqueue = (text: string) => {
    for (const ch of text) queueRef.current.push(ch);
  };

  const reset = () => {
    queueRef.current = [];
    setRendered('');
  };

  return { rendered, enqueue, reset };
}
```

**Integration with `useAiStream`:** inside the hook's chunk handler, replace `enqueueChars(parsed.data.text)` with a callback that calls `typewriter.enqueue(parsed.data.text)`. The stream hook only pushes; the typewriter hook drains. They are decoupled.

**Backpressure safety:** if Anthropic streams 5000 chars in one frame (pathological case), the queue grows; the drain loop catches up at 200 chars/sec over ~25 seconds, OR — if the stream `done` event arrives first — the `!active` branch flushes everything in one `setState`. No characters lost.

**Reduced-motion:** per UI-SPEC, `prefers-reduced-motion: reduce` disables the typewriter animation. Replace the rAF loop with "flush whatever arrives immediately". Simple branch:
```ts
const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (prefersReduced) {
  setRendered((r) => r + text); return;   // bypass queue entirely
}
```

**Cursor glyph:** The blinking `▎` cursor (UI-SPEC §Typography "Locked decisions") is a trailing DOM node rendered as a sibling to the text, NOT appended to the string. This is critical — if you concatenate `▎` into the state, the persisted `demands.ai_analysis.brief` gets the cursor character saved too.

```tsx
<div aria-live="polite" className="p-6 overflow-y-auto">
  <ReactMarkdown {...markdownProps}>{rendered}</ReactMarkdown>
  {state === 'streaming' && (
    <span aria-hidden className="inline-block align-baseline text-[#7c3aed] animate-[blink_1s_step-end_infinite]">▎</span>
  )}
</div>
```

[CITED: upstash.com/blog/smooth-streaming — AI SDK v5 smooth streaming pattern using chunk buffers + paced render]
[CITED: sitepoint.com/streaming-backends-react-controlling-re-render-chaos — rAF-batched state update]

---

## Markdown Rendering (react-markdown v10)

### Setup and imports

```tsx
// resources/js/Components/AiMarkdown.tsx
// Source: https://github.com/remarkjs/react-markdown (v10.1.0 README, 2025-03-07)
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';

const components: React.ComponentProps<typeof ReactMarkdown>['components'] = {
  h1: ({ node: _n, ...props }) => <h1 className="text-base font-semibold mb-2 mt-4 first:mt-0" {...props} />,
  h2: ({ node: _n, ...props }) => <h2 className="text-sm font-semibold mb-2 mt-3" {...props} />,
  h3: ({ node: _n, ...props }) => <h3 className="text-sm font-semibold mb-2 mt-3" {...props} />,
  p:  ({ node: _n, ...props }) => <p  className="text-sm leading-[1.5] mb-3 last:mb-0" {...props} />,
  strong: ({ node: _n, ...props }) => <strong className="font-semibold" {...props} />,
  ul: ({ node: _n, ...props }) => <ul className="ml-4 list-disc space-y-1 text-sm" {...props} />,
  ol: ({ node: _n, ...props }) => <ol className="ml-4 list-decimal space-y-1 text-sm" {...props} />,
  li: ({ node: _n, ...props }) => <li className="text-sm" {...props} />,
  code: ({ node: _n, className, children, ...props }) => {
    const inline = !className?.startsWith('language-');
    return inline
      ? <code className="rounded bg-[#f3f4f6] dark:bg-[#1f2937] px-1 py-0.5 text-[13px] font-mono" {...props}>{children}</code>
      : <pre className="rounded-[8px] bg-[#f3f4f6] dark:bg-[#1f2937] p-3 overflow-x-auto text-xs font-mono"><code {...props}>{children}</code></pre>;
  },
  // Tables (remark-gfm) — not styled here; if Claude emits tables in chat, fall back to default borderless rendering
};

export function AiMarkdown({ children }: { children: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeSanitize]}
      components={components}
    >
      {children}
    </ReactMarkdown>
  );
}
```

**Why manual `components` prop instead of `@tailwindcss/typography`:** UI-SPEC §Typography locks: "No `@tailwindcss/typography` plugin. Per-element class mapping." The `components` prop gives us exact control over Tailwind utilities per element and respects the app's dark-mode tokens.

**Why `rehype-sanitize`:** the markdown body we render comes from Claude, but the `client_ai_memory.insight` string (inlined into chat system prompt per D-14) could be user-influenced. A malicious insight containing raw HTML could sneak through. `rehype-sanitize` with default schema strips scripts, iframes, and dangerous attributes. [CITED: github.com/remarkjs/react-markdown#security — "Use `rehype-sanitize`"]

**Peer deps:** `react-markdown@10` requires `react@>=18` and `@types/react@>=18`. Our project runs React 19 — no issue. [VERIFIED: npm view react-markdown peerDependencies]

### Pitfall: streaming partial markdown

During streaming, `rendered` may end mid-token (e.g., `**bol` — the closing `**` hasn't arrived yet). react-markdown handles this gracefully (renders as raw text with unclosed asterisks), but the visual briefly flashes a broken fragment. Two options:

1. **Accept the flash** — it self-corrects within 1–2 rAF ticks; most users never notice.
2. **Buffer until complete tokens** — delay rendering until a chunk boundary is a newline or end-of-sentence. Adds latency. Not recommended for Phase 3.

Verdict: accept the flash. Document in PLAN as "known behavior, not a bug."

---

## Tab System

### Verdict: use `@headlessui/react` Tabs (already installed)

`@headlessui/react@2.2.10` is already in `devDependencies` (confirmed via `package.json`). Its `Tab` primitive provides:

- Correct ARIA: `role="tablist"`, `role="tab"`, `aria-selected`, `aria-controls`, `role="tabpanel"`, `aria-labelledby` — all automatic. [CITED: headlessui.com/react/tabs]
- Keyboard navigation: Left/Right arrows cycle tabs, Home/End jump to first/last, Tab moves focus into the panel.
- Focus management on mount + tab change.
- Fully unstyled — we keep full Tailwind class control.

**Do NOT build a custom tab component.** UI-SPEC §8 Interaction Contract Accessibility mandates `role="tablist"` + full ARIA attributes. Getting this right manually is a known source of accessibility bugs in React projects. [CITED: blog.tailwindcss.com/headless-ui-unstyled-accessible-ui-components]

### Minimal usage pattern for `DemandDetailModal` right panel

```tsx
// resources/js/Components/DemandDetailModal.tsx — inside the right panel
// Source: https://headlessui.com/react/tabs (API reference, 2026-04 verified)
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/react';
import { MessageSquare, Paperclip, FileText } from 'lucide-react';
import chatbotIconDark from '@/assets/chatbot-icon-dark.svg';
import chatbotIconLight from '@/assets/chatbot-icon-light.svg';

const tabClass = (selected: boolean) =>
  `flex items-center gap-2 px-4 h-11 text-sm font-semibold transition-colors outline-none ${
    selected
      ? 'text-[#7c3aed] dark:text-[#a78bfa] border-b-2 border-[#7c3aed] -mb-px'
      : 'text-[#6b7280] dark:text-[#9ca3af] hover:text-[#111827] dark:hover:text-[#f9fafb]'
  }`;

<TabGroup>
  <TabList className="flex border-b border-[#e5e7eb] dark:border-[#1f2937] bg-white dark:bg-[#111827]">
    <Tab className={({ selected }) => tabClass(selected)}>
      <MessageSquare size={16} /> {t('demands.tabs.comments')}
    </Tab>
    <Tab className={({ selected }) => tabClass(selected)}>
      <Paperclip size={16} /> {t('demands.tabs.files')}
    </Tab>
    <Tab className={({ selected }) => tabClass(selected)}>
      <FileText size={16} /> {t('demands.tabs.brief')}
    </Tab>
    <Tab className={({ selected }) => tabClass(selected)}>
      {/* D-15: chat tab uses chatbot SVG, not lucide */}
      <img src={chatbotIconLight} alt="" className="h-5 w-5 shrink-0 dark:hidden" />
      <img src={chatbotIconDark}  alt="" className="h-5 w-5 shrink-0 hidden dark:block" />
      {t('ai.chat.tab')}
    </Tab>
  </TabList>
  <TabPanels className="flex-1 overflow-hidden">
    <TabPanel className="h-full overflow-y-auto"><CommentsPanel demand={demand} /></TabPanel>
    <TabPanel className="h-full overflow-y-auto"><FilesPanel demand={demand} /></TabPanel>
    <TabPanel className="h-full overflow-hidden flex flex-col"><BriefTab demand={demand} /></TabPanel>
    <TabPanel className="h-full overflow-hidden flex flex-col"><ChatTab demand={demand} /></TabPanel>
  </TabPanels>
</TabGroup>
```

**Pitfall — `outline-none` on Tab:** Headless UI Tab emits `data-focus` when focused. Use Tailwind's `data-[focus]:ring-2 data-[focus]:ring-[#7c3aed]/40` instead of `outline-none` alone, so keyboard users see a focus ring. [CITED: headlessui.com/react/tabs#styling-the-selected-tab]

---

## Managed Agents Integration (PHP, raw HTTP)

### Critical finding: the PHP SDK does NOT yet wrap Managed Agents

As of `anthropic-ai/sdk@0.16.0` (Packagist, published **2026-04-16**), the PHP client does NOT expose `$client->beta->sessions->*` methods — those examples in the Anthropic MA quickstart [CITED: platform.claude.com/docs/en/managed-agents/quickstart] show forward-looking PHP calls that reflect the shape the SDK WILL eventually expose, but **are not currently available** in v0.16. [VERIFIED: Packagist API response — the lockfile includes `Anthropic\\` PSR-4 namespace only; no `Beta\\Sessions\\` namespace at this version]

**Action for planner:** write a thin PHP service class (`app/Services/Ai/ClientResearchAgent.php`) that calls the MA HTTP endpoints directly via `Http::withHeaders()`. When the PHP SDK ships MA support (v0.17+?), swap the Http calls for SDK calls in one commit.

### Endpoint reference (extracted from official MA docs 2026-04-22)

| Operation | Method + Path | Body shape |
|-----------|---------------|-----------|
| Create Agent | `POST /v1/agents` | `{ name, model, system, tools: [{type, ...}] }` → returns `{id, version}` |
| Create Environment | `POST /v1/environments` | `{ name, config: {type: 'cloud', networking: {type: 'unrestricted'\|...}} }` → returns `{id}` |
| Create Session | `POST /v1/sessions` | `{ agent, environment_id, title?, vault_ids? }` → returns `{id, status}` |
| Send Events | `POST /v1/sessions/{id}/events` | `{ events: [{type: 'user.message', content: [{type:'text', text:'...'}]}] }` (may include `user.interrupt`) |
| Stream Events | `GET /v1/sessions/{id}/stream` (SSE) | — (reads `Accept: text/event-stream`) |
| Retrieve | `GET /v1/sessions/{id}` | — returns session record with `status` |
| List | `GET /v1/sessions` | — paginated |
| Archive | `POST /v1/sessions/{id}/archive` | — preserves history, blocks new events |
| Delete | `DELETE /v1/sessions/{id}` | — (only permitted when status ≠ `running`) |

[CITED: platform.claude.com/docs/en/managed-agents/sessions — verified 2026-04-22]
[CITED: platform.claude.com/docs/en/managed-agents/events-and-streaming — verified 2026-04-22]

**Mandatory headers on every MA call:**
```
x-api-key: <user's BYOK key>
anthropic-version: 2023-06-01
anthropic-beta: managed-agents-2026-04-01
content-type: application/json   # on POST
Accept: text/event-stream         # on the /stream endpoint only
```

### Event schema (for the proxy to the React UI)

Event type strings follow the `{domain}.{action}` convention. [CITED: platform.claude.com/docs/en/managed-agents/events-and-streaming]

**User events** (sent TO the agent — the backend generates these, NEVER the browser):
- `user.message` — send text content
- `user.interrupt` — stop mid-execution
- `user.custom_tool_result` — respond to a custom-tool invocation
- `user.tool_confirmation` — approve/deny a tool call when policy requires
- `user.define_outcome` — define an outcome (research preview — out of scope for Phase 3)

**Agent events** (emitted BY the agent):
- `agent.message` — text content block
- `agent.thinking` — extended thinking trace (optional)
- `agent.tool_use` — pre-built tool invocation (bash, file ops, web_search, web_fetch)
- `agent.tool_result` — pre-built tool execution result
- `agent.mcp_tool_use` / `agent.mcp_tool_result` — MCP server tool
- `agent.custom_tool_use` — custom tool (requires `user.custom_tool_result` response)
- `agent.thread_context_compacted` — history compacted
- `agent.thread_message_{sent,received}` — multiagent (out of scope)

**Session events** (status changes):
- `session.status_running` — actively processing
- `session.status_idle` — waiting for input (this is the signal "done")
- `session.status_rescheduled` — transient error, retrying
- `session.status_terminated` — unrecoverable error
- `session.error` — typed error with `retry_status`

**Span events** (observability, timing — map to OTEL spans per D-40):
- `span.model_request_{start,end}` — includes `model_usage` with token counts on `end`

Every event has a `processed_at` timestamp; if null, the event is still queued.

### Skeleton `ClientResearchAgent` service (raw HTTP pattern)

```php
<?php
// app/Services/Ai/ClientResearchAgent.php
// Source: platform.claude.com/docs/en/managed-agents/quickstart (curl examples, 2026-04)
namespace App\Services\Ai;

use App\Models\Client;
use App\Models\ClientResearchSession;
use App\Models\Organization;
use Illuminate\Support\Facades\Http;

final class ClientResearchAgent
{
    public function __construct(
        private ClientResearchPromptBuilder $prompts,
    ) {}

    public function launch(Client $client): ClientResearchSession
    {
        $org = $client->organization;
        $key = $org->anthropic_api_key;                         // decrypted via `encrypted` cast
        abort_if(empty($key), 402, 'No Anthropic API key configured.');

        $headers = [
            'x-api-key'         => $key,
            'anthropic-version' => '2023-06-01',
            'anthropic-beta'    => config('services.anthropic.beta_ma'),
        ];

        // 1. Create (or fetch cached) Agent for this organization
        $agentId = $org->client_research_agent_id ?? $this->createAgent($org, $headers);

        // 2. Create (or fetch cached) Environment for this organization
        $envId = $org->client_research_environment_id ?? $this->createEnvironment($org, $headers);

        // 3. Create Session tied to this client
        $response = Http::withHeaders($headers)
            ->timeout(30)
            ->post('https://api.anthropic.com/v1/sessions', [
                'agent'          => $agentId,
                'environment_id' => $envId,
                'title'          => "Client Research — {$client->name}",
            ])->throw()->json();

        $session = ClientResearchSession::create([
            'client_id'                => $client->id,
            'managed_agent_session_id' => $response['id'],
            'status'                   => 'queued',
            'started_at'               => now(),
            'events_url'               => "https://api.anthropic.com/v1/sessions/{$response['id']}/stream",
        ]);

        // 4. Send initial user.message to kick off the research
        Http::withHeaders($headers)->post(
            "https://api.anthropic.com/v1/sessions/{$session->managed_agent_session_id}/events",
            ['events' => [[
                'type' => 'user.message',
                'content' => [['type' => 'text', 'text' => $this->prompts->initialTask($client)]],
            ]]]
        )->throw();

        $session->update(['status' => 'running']);
        return $session;
    }

    public function interrupt(ClientResearchSession $session): void
    {
        Http::withHeaders($this->headersForOrg($session->client->organization))
            ->post("https://api.anthropic.com/v1/sessions/{$session->managed_agent_session_id}/events",
                ['events' => [['type' => 'user.interrupt']]]);
    }
    // ... createAgent, createEnvironment, headersForOrg elided for brevity
}
```

### SSE proxy endpoint — never expose the user's API key to the browser

The browser needs session events (to drive the UI badge "🔍 Pesquisando — ~XX min restantes" and the timeline modal per D-37), but MUST NOT see the Anthropic API key. Pattern: **Laravel proxies the MA event stream, strips sensitive fields, and re-emits to the browser.**

```php
// routes/web.php
Route::get('/clients/{client}/research/{session}/events', [ClientResearchController::class, 'streamEvents'])
    ->name('clients.research.stream')->middleware(['auth', 'can:view,client']);

// app/Http/Controllers/ClientResearchController.php
public function streamEvents(Client $client, ClientResearchSession $session): StreamedResponse
{
    $this->authorize('view', $client);
    $org = $client->organization;
    $apiKey = $org->anthropic_api_key;

    return response()->eventStream(function () use ($session, $apiKey) {
        $response = Http::withHeaders([
            'x-api-key'         => $apiKey,
            'anthropic-version' => '2023-06-01',
            'anthropic-beta'    => config('services.anthropic.beta_ma'),
            'Accept'            => 'text/event-stream',
        ])->withOptions(['stream' => true])
          ->get($session->events_url);

        $body = $response->toPsrResponse()->getBody();
        $buffer = '';
        while (!$body->eof()) {
            $buffer .= $body->read(1024);
            while (($idx = strpos($buffer, "\n\n")) !== false) {
                $frame = substr($buffer, 0, $idx);
                $buffer = substr($buffer, $idx + 2);
                $parsed = $this->parseFrame($frame);
                if ($parsed === null) continue;
                // REDACT — drop anything that could contain the API key or system prompts
                $redacted = $this->redactEvent($parsed);
                if ($redacted !== null) {
                    yield new StreamedEvent(event: $redacted['type'], data: json_encode($redacted['data']));
                }
                // Mirror status changes into our DB so the polling UI sees them
                if (str_starts_with($parsed['type'], 'session.status_')) {
                    $session->update(['status' => str_replace('session.status_', '', $parsed['type'])]);
                }
            }
        }
    });
}
```

**What to redact in `redactEvent`:** drop `agent.thinking` entirely (may contain internal reasoning we don't want to show); keep only message *summaries* from `agent.tool_use` (tool name + truncated first 100 chars of input); convert `agent.message` text to a short "progress" string for the UI.

**Alternative (cheaper for hackathon):** skip the live proxy entirely. Poll `/v1/sessions/{id}` via a background job every 30s, update `client_research_sessions.progress_summary`, and have the frontend Inertia-reload the client list every 30s. Drops real-time events but cuts infrastructure in half. Recommended for hackathon scope.

### Pitfalls

- **Rate limit**: MA create endpoints are 60 req/min/org, read endpoints 600 req/min/org. [CITED: platform.claude.com/docs/en/managed-agents/overview]. A single client research session is one create + one event send → well within limits for normal use. Polling `GET /v1/sessions/{id}` every 10 seconds per active session is also safe.
- **Session statuses to check**: a session can be `idle` (done or waiting for input) vs. `running`. The signal "research is done" is `session.status_idle` with a `stop_reason`. Do NOT assume `idle` means "failed" — it means "agent has nothing more to do".
- **`running` sessions cannot be deleted** — must send `user.interrupt` first, then delete. [CITED: platform.claude.com/docs/en/managed-agents/sessions#deleting-a-session]
- **Event ordering**: `processed_at: null` = queued, not yet processed. Wait for a non-null timestamp before acting on the event in downstream logic.
- **Cost runaway**: D-34 mandates "warn before expensive ops". A 40-minute MA session can burn $5–$15 depending on crawl depth. The "confirm before research" modal per D-34 is mandatory.

---

## BYOK Infrastructure (Laravel)

### Column definition

```php
// database/migrations/xxxx_add_anthropic_api_key_to_organizations.php
Schema::table('organizations', function (Blueprint $t) {
    $t->text('anthropic_api_key_encrypted')->nullable()->after('name');
    $t->string('anthropic_api_key_mask', 32)->nullable()->after('anthropic_api_key_encrypted');
    // Optional: for MA caching — one Agent per org
    $t->string('client_research_agent_id')->nullable();
    $t->string('client_research_environment_id')->nullable();
});
```

**Why `text` not `string(N)`:** Laravel's `encrypted` cast outputs base64-encoded ciphertext ~2× longer than the plaintext plus MAC overhead. For a `sk-ant-api03-...` key of ~108 chars, ciphertext lands around 250–300 chars. `text` is forgiving.

**Why a separate `anthropic_api_key_mask` column:** so the API can return the mask without decrypting. Computed ONCE at set-time: `substr($key, 0, 10) . '...' . substr($key, -4)` → `sk-ant-api...XXXX`. This avoids decryption on every page load.

### Model cast

```php
// app/Models/Organization.php
protected $casts = [
    'anthropic_api_key_encrypted' => 'encrypted',
];

// Attribute accessor for convenience + never leak to JSON
protected $hidden = ['anthropic_api_key_encrypted'];

public function getAnthropicApiKeyAttribute(): ?string
{
    return $this->anthropic_api_key_encrypted;   // Laravel auto-decrypts on read via the cast
}

public function hasAnthropicKey(): bool
{
    return !empty($this->anthropic_api_key_encrypted);
}
```

**Why `encrypted` (not `encrypted:array`):** we're storing a single string. `encrypted` on a string column uses AES-256-GCM + HMAC, keyed by APP_KEY. [CITED: laravel.com/docs/13.x/encryption — "encrypted cast"]

**Why `protected $hidden = [...]`:** ensures the ciphertext is never serialized into Inertia props or JSON responses. The browser NEVER sees the encrypted blob, let alone the key. [CITED: laravel.com/docs/13.x/eloquent-serialization#hiding-attributes]

### Inertia shared props (for `has_anthropic_key` UX toggling per D-33)

```php
// app/Http/Middleware/HandleInertiaRequests.php
public function share(Request $request): array
{
    return [
        ...parent::share($request),
        'auth' => [
            'user' => $request->user(),
            'organization' => $request->user() ? [
                'id'              => $request->user()->organization->id,
                'name'            => $request->user()->organization->name,
                'has_anthropic_key' => $request->user()->organization->hasAnthropicKey(),
                'anthropic_api_key_mask' => $request->user()->organization->anthropic_api_key_mask,
            ] : null,
        ],
    ];
}
```

### "Test key" endpoint

Minimal call to validate the key is live (and detect typos / expired keys):

```php
// app/Http/Controllers/Settings/AiController.php
public function testKey(Request $request): JsonResponse
{
    $this->authorize('update', $request->user()->organization);
    $org = $request->user()->organization;
    abort_if(!$org->hasAnthropicKey(), 422, 'No key set.');

    try {
        $response = Http::withHeaders([
            'x-api-key'         => $org->anthropic_api_key,
            'anthropic-version' => '2023-06-01',
        ])->timeout(15)
          ->post('https://api.anthropic.com/v1/messages', [
              'model'      => 'claude-haiku-4-5',
              'max_tokens' => 1,
              'messages'   => [['role' => 'user', 'content' => 'Hi']],
          ]);

        if ($response->successful()) {
            return response()->json(['ok' => true, 'model' => 'claude-haiku-4-5']);
        }
        return response()->json(['ok' => false, 'error' => $response->json('error.message', 'Unknown')], 422);
    } catch (\Throwable $e) {
        // NEVER include $e->getMessage() directly if it could contain the key in a URL or header dump.
        // Log a SANITIZED summary only.
        Log::error('ai.test_key_failed', ['organization_id' => $org->id]);
        return response()->json(['ok' => false, 'error' => 'Connection failed'], 502);
    }
}
```

**Cost of a test call:** 1 input token + 1 output token ≈ $0.000006 (Haiku). Negligible.

### Logging and error redaction

**Never log the API key.** Even indirectly:
- Don't dump `$org->toArray()` into a log — it includes (hashed) ciphertext, which is not sensitive, but the habit of dumping models into logs is risky.
- Don't include HTTP headers in error logs when using `Http::*` — Laravel's `Http::fake()` and debug helpers CAN include headers.
- Use PHP 8.2+ `#[\SensitiveParameter]` on methods that accept the raw key:

```php
public function testKey(#[\SensitiveParameter] string $apiKey): bool { /* ... */ }
```

When an exception occurs during an AI call, PHP's default stack trace includes function arguments. `#[\SensitiveParameter]` makes `$apiKey` appear as `Object(SensitiveParameterValue)` in traces, never the raw string. [CITED: wiki.php.net/rfc/redact_parameters_in_back_traces — PHP 8.2 RFC]

**Alternative / complementary:** set `zend.exception_ignore_args=1` in php.ini for production — this strips ALL args from ALL stack traces, a nuclear option but sometimes worth it. [CITED: securinglaravel.com/security-tip-hide-sensitive-parameters]

**Custom Log channel filter (if paranoid):** publish a log processor that scans formatted log lines for patterns `sk-ant-[a-zA-Z0-9_-]{20,}` and replaces with `sk-ant-***REDACTED***`. The `yorcreative/laravel-scrubber` package does this declaratively — but for the hackathon, a single regex in the `HandleInertiaRequests`-style middleware for `reportable` exceptions is enough. [CITED: github.com/YorCreative/Laravel-Scrubber]

### ExceptionHandler render override

```php
// bootstrap/app.php (Laravel 13 structure)
->withExceptions(function (Exceptions $exceptions) {
    $exceptions->render(function (\Throwable $e, $request) {
        $message = $e->getMessage();
        // Redact anything that looks like an Anthropic key
        $message = preg_replace('/sk-ant-[a-zA-Z0-9_-]{20,}/', 'sk-ant-***REDACTED***', $message);
        if ($request->expectsJson()) {
            return response()->json(['message' => $message], 500);
        }
        return null;   // fall through to default handling
    });
});
```

---

## Client Monthly Plan Columns + Social Handles

### Migration

```php
// database/migrations/xxxx_add_monthly_plan_and_social_handles_to_clients_table.php
Schema::table('clients', function (Blueprint $t) {
    $t->unsignedSmallInteger('monthly_posts')->nullable()->after('avatar');
    $t->text('monthly_plan_notes')->nullable()->after('monthly_posts');
    $t->unsignedTinyInteger('planning_day')->nullable()->after('monthly_plan_notes');
    $t->json('social_handles')->nullable()->after('planning_day');
});
```

**Why `unsignedSmallInteger` for `monthly_posts` (max 65535)** — far more than we need (realistic range 0–500), but `unsignedTinyInteger` (max 255) might cramp a large agency client; `unsignedSmallInteger` is cheap (2 bytes vs 1) and futureproof.

**Why `unsignedTinyInteger` for `planning_day` (max 255)** — values are 1–31; tiny is correct.

**Why `json` not `text` for `social_handles`** — Postgres has native `jsonb` support, MySQL `json`. Laravel abstracts; the `json` column type maps to the right thing per driver. This lets us use `$t->whereJsonContains('social_handles->instagram', '@handle')` later if needed.

### Model casts

```php
// app/Models/Client.php
protected $casts = [
    // existing casts...
    'monthly_posts'       => 'integer',
    'planning_day'        => 'integer',
    'social_handles'      => 'array',   // decodes JSON to PHP array on access
];
```

### Social Handles — shape and validation

Per D-35, at least one of `website` OR a `social_handles.*` value must be filled for the MA research button to activate. Proposed shape:

```json
{
  "instagram": "@brandx",
  "linkedin":  "brand-x",
  "tiktok":    "@brandx",
  "facebook":  "brand.x.official",
  "twitter":   "@brandx"
}
```

**Store handles, not full URLs.** Agency users think in handles ("@brandx"); storing the handle lets the UI normalize for display and lets the MA crawler construct URLs per-platform.

**Validation rules** (FormRequest):
```php
// app/Http/Requests/StoreClientRequest.php
public function rules(): array
{
    return [
        // existing rules...
        'monthly_posts'       => ['nullable', 'integer', 'min:0', 'max:200'],
        'monthly_plan_notes'  => ['nullable', 'string', 'max:500'],
        'planning_day'        => ['nullable', 'integer', 'min:1', 'max:31'],
        'social_handles'                  => ['nullable', 'array'],
        'social_handles.instagram'        => ['nullable', 'string', 'regex:/^@?[a-zA-Z0-9_.]{1,30}$/'],
        'social_handles.linkedin'         => ['nullable', 'string', 'regex:/^[a-zA-Z0-9-]{1,100}$/'],   // company slug
        'social_handles.tiktok'           => ['nullable', 'string', 'regex:/^@?[a-zA-Z0-9_.]{1,24}$/'],
        'social_handles.facebook'         => ['nullable', 'string', 'regex:/^[a-zA-Z0-9.]{1,50}$/'],
        'social_handles.twitter'          => ['nullable', 'string', 'regex:/^@?[a-zA-Z0-9_]{1,15}$/'],
    ];
}
```

**Instagram handle regex:** up to 30 chars, `[a-zA-Z0-9_.]` — matches Meta's documented rules for IG usernames. [CITED: github.com/lorey/social-media-profiles-regexs; help.instagram.com]
**LinkedIn company slug regex:** `[a-zA-Z0-9-]` lowercase + dash — matches LinkedIn company vanity name format. [CITED: linkedin.com/help/linkedin/answer/a553169 — vanity name rules]
**Twitter/X handle:** up to 15 chars, `[a-zA-Z0-9_]` — classic rule.
**TikTok:** up to 24 chars, `[a-zA-Z0-9_.]`.

**UI pattern (one field per platform, not free-form):** a fixed set of 5 inputs in the ClientForm, each labeled with the platform icon (reuse `lucide-react` brand icons if available, or SVGs). Free-form JSON input ("type your social URLs") is a bad pattern — users will paste inconsistent formats, making the MA crawler's job harder.

---

## /planejamento Page Architecture

### URL query-string contract

- `?client_id={id}` — pre-selects the client filter (UI-SPEC §8 already specifies this for dashboard widget linking).
- `?month=YYYY-MM` — optional, scrolls to that month group on load.

### Filter state — server-driven, not client-driven

Filter lives in the URL. `router.get` with `preserveState: true` updates the URL without a full page reload, and Inertia fetches only the filtered list from the server.

```tsx
// resources/js/pages/Planejamento/Index.tsx (skeleton)
// Source: inertiajs.com/manual-visits, inertiajs.com/partial-reloads
import { router, usePage } from '@inertiajs/react';

function PlanejamentoIndex({ clients, plans, filters }: Props) {
  const onClientChange = (clientId: string) => {
    router.get(route('planejamento.index'), { client_id: clientId || undefined }, {
      preserveState: true,
      preserveScroll: true,
      only: ['plans', 'filters'],
      replace: false,  // push new history entry so back-button works
    });
  };
  // ...
}
```

**Why `only: ['plans', 'filters']`:** clients list is stable and doesn't need reloading — matches the Phase 2 `only: ['selectedDemand']` pattern.

**Why `replace: false`:** changing the filter is a meaningful navigation; back-button should return to the previous filter. [CITED: inertiajs.com/manual-visits#browser-history]

### Card state machine (for redesign UX per D-28)

```
         ┌────────────┐
         │  pending   │ (initial)
         └─────┬──────┘
               │
    ┌──────────┼────────────┬─────────────┐
    │          │            │             │
    ▼          ▼            ▼             ▼
[converted] [rejected]  [redesigning]   (bulk-select)
                            │
                            ▼
                     [pending] (new title/desc in place)
                     or [error]
```

Each card tracks a local state:
```ts
type CardState = 'pending' | 'redesigning' | 'redesign-applying' | 'converting' | 'rejected' | 'accepted';
```

**Optimistic update on redesign (verdict: NO)**: the user's feedback text implies the AI will produce a materially different item. Showing a fake "here's what you asked for" before the AI responds is misleading. Instead: show `redesign-applying` state (button label `Aplicando…` + rotating chatbot icon), keep the old card content visible, swap on server success with a 200ms opacity-fade (UI-SPEC already specifies this).

**Optimistic update on convert (verdict: YES)**: converting is deterministic (no AI call, just a DB insert). Flip to `converting` immediately, show success on 200, revert on error. Saves a perceived-latency tick.

### Mass-convert endpoint shape

```
POST /planning-suggestions/convert-bulk
Body: { suggestion_ids: [1, 2, 3, ...] }
Response (200):
{
  "converted": [
    { "suggestion_id": 1, "demand_id": 42 },
    { "suggestion_id": 2, "demand_id": 43 }
  ],
  "failed": [
    { "suggestion_id": 3, "reason": "Already converted" }
  ]
}
```

**Why partial-success response shape:** a bulk convert can legitimately half-succeed (e.g., one suggestion was deleted concurrently by another team member). The UI must show per-card status, not a single banner.

**Transaction scoping:** wrap each individual conversion in its own DB transaction; do NOT wrap the entire batch in one transaction. If one fails, the others should still commit. [CITED: laravel.com/docs/13.x/database#database-transactions — DB::transaction is a savepoint]

---

## Dashboard Planning Reminder Widget

### Visibility computation

UI-SPEC §9 locks: show when `today ∈ [planning_day - 1, planning_day + 2]`. Proposed handling:

**Option A: server-side Eloquent query** (single source of truth)
```php
// In DashboardController@index
$remindingClients = Client::whereNotNull('planning_day')
    ->where(function (Builder $q) {
        $today = now()->day;
        $q->whereRaw("MOD(planning_day - ? + 31, 31) <= 2 OR MOD(? - planning_day + 31, 31) <= 1", [$today, $today]);
        // Simpler: compute the window in PHP and filter by a single integer range,
        // handling month boundary explicitly:
    })
    ->get();
```

**Option B: client-side Date math** (cheaper server)
```tsx
function shouldShowReminder(planningDay: number, today: Date = new Date()): boolean {
  const d = today.getDate();
  // windowStart = planning_day - 1, windowEnd = planning_day + 2
  return d >= planningDay - 1 && d <= planningDay + 2;
}
```

**Verdict: Option B (client-side).** Reasons:
1. The calculation is trivial — no benefit from DB.
2. Cross-day transitions (reminder appears at midnight) work naturally if the user leaves the dashboard open.
3. Month boundaries (planning_day=31 in a 30-day month) are handled once in JS, not in Postgres + PHP + JS separately.

Server returns ALL clients with `planning_day` set; client filters. Trade-off: we serialize more data than needed — acceptable for agency sizes (up to a few hundred clients).

### Dismissal state

**Verdict: `localStorage`, keyed by `{client_id, YYYY-MM}`.**

```ts
const dismissalKey = (clientId: number) => {
  const now = new Date();
  return `planning_reminder_dismissed:${clientId}:${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

function isDismissed(clientId: number): boolean {
  return localStorage.getItem(dismissalKey(clientId)) === '1';
}
function dismiss(clientId: number) {
  localStorage.setItem(dismissalKey(clientId), '1');
}
```

Why localStorage not server: (1) dismissal is UI state, not data state; (2) dismissal should NOT sync across users in the same org (each user dismisses their own view); (3) server-side would need a new table or user-prefs JSON path + endpoint — 2 hours for zero user-visible benefit.

**Pitfall: localStorage is device-local.** A user on desktop who dismisses the reminder will see it again on mobile. Documented acceptable for Phase 3 per UI-SPEC §9 ("low stakes; auto-reappears next cycle").

### pt-BR date formatting

For `vence amanhã` / `vence hoje` / `venceu há N dias`:

```ts
import { useTranslation } from 'react-i18next';

function getReminderText(t: (k: string) => string, planningDay: number, today: Date = new Date()): string {
  const d = today.getDate();
  if (d === planningDay - 1) return t('planning.reminder.dueTomorrow');
  if (d === planningDay)     return t('planning.reminder.dueToday');
  return t('planning.reminder.overdue', { days: d - planningDay });
}
```

UI-SPEC already defines these i18n tokens. **No `date-fns` or `Intl.DateTimeFormat` needed** for relative strings — the three cases are enumerable. If we need absolute dates later (e.g., "vence 25/05"), `Intl.DateTimeFormat('pt-BR', {day: 'numeric', month: 'short'}).format(d)` is zero-dependency.

---

## AGPL-3.0 + Open Source Setup

### Minimum requirements for a compliant AGPL-3.0 release

1. **Full `LICENSE` file at repo root** — copy verbatim from https://www.gnu.org/licenses/agpl-3.0.txt (do NOT abbreviate).
2. **Per-file notice header** in each source file (`.php`, `.ts`, `.tsx`, `.js`). Minimum formally-sufficient text:
   ```
   /**
    * Briefy — AI-assisted content planning for marketing agencies
    * Copyright (C) 2026 Briefy contributors
    *
    * This program is free software: you can redistribute it and/or modify it
    * under the terms of the GNU Affero General Public License version 3 as
    * published by the Free Software Foundation.
    *
    * This program is distributed in the hope that it will be useful, but WITHOUT
    * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
    * FITNESS FOR A PARTICULAR PURPOSE. See the GNU AGPL v3 for more details.
    *
    * You should have received a copy of the GNU AGPL v3 along with this program.
    * If not, see <https://www.gnu.org/licenses/>.
    */
   ```
   [CITED: github.com/licenses/license-templates/blob/master/templates/agpl3-header.txt]

3. **Short alternative accepted by the CONTEXT.md specifics** — CONTEXT.md §D-29 / specifics allows a one-liner: `// (c) 2026 Briefy contributors - AGPL-3.0`. **This is legally sufficient ONLY IF the full LICENSE file is present in the same distribution** (per FSF guidance: "each file should have at least the 'copyright' line and a pointer to where the full notice is found"). [CITED: gnu.org/licenses/gpl-howto.html]

   **Recommendation: use the short one-liner for source files** (matches CONTEXT.md decision), but include the full 10-line notice in the three "entrance" files: `README.md`, `app/Providers/AppServiceProvider.php`, `resources/js/app.tsx`. This guarantees anyone landing on the first file they open sees the full notice.

4. **`NOTICE` file (optional but recommended)** — list of third-party components and their licenses. `composer show --format=json` + `npm ls --json` generates the data; a CI script can render a Markdown list.

5. **README must state:** (1) the license (badge at top), (2) SaaS requirement (AGPL §13: network-interacting users must be offered access to the source), (3) the BYOK requirement for AI features, (4) setup instructions.

6. **`SECURITY.md`** — contact for vulnerability disclosure. GitHub shows this in the Security tab. Minimum: "Email security@briefy.io" + expected response SLA.

7. **`CONTRIBUTING.md`** — DCO or CLA choice. **For AGPL projects, DCO (Developer Certificate of Origin) is standard** — contributors sign off commits with `git commit -s` asserting they have the right to contribute under AGPL. No CLA needed for AGPL. [CITED: developercertificate.org]

### Automation — prevent header drift via pre-commit hook

```bash
# scripts/check-agpl-headers.sh
# runs in pre-commit or CI
#!/usr/bin/env bash
missing=0
for f in $(git ls-files '*.php' '*.ts' '*.tsx' '*.js'); do
  if ! grep -qE '(AGPL-3\.0|GNU Affero)' "$f"; then
    echo "Missing AGPL header: $f"
    missing=$((missing+1))
  fi
done
exit $missing
```

Add to `composer.json` scripts or `husky` hooks so forgotten headers fail a commit.

### GitHub repo config

- **License file auto-detected** — GitHub will display the AGPL-3.0 badge in the repo header if `LICENSE` or `LICENSE.txt` contains the recognized text.
- **`.github/ISSUE_TEMPLATE/`** — at least two: `bug_report.md`, `feature_request.md`. Optional.
- **`.github/workflows/ci.yml`** — not license-related but obvious.
- **`FUNDING.yml`** — optional GitHub Sponsors.

### SaaS protection (why AGPL specifically)

AGPL §13 closes the "SaaS loophole" in GPL: if you run modified AGPL software as a network-accessible service, you must offer your network users the source. [CITED: gnu.org/licenses/agpl-3.0.html §13]. This means:
- A competitor forking Briefy and running their own hosted service is **required** to publish their modifications under AGPL.
- This does NOT apply to agencies running Briefy internally for their own team (no third-party network interaction) — though CONAR-like language about "users of the service" is worth clarifying in README.

**Common misconception:** AGPL does NOT require BYOK users to release their Anthropic prompts. They're "using the software", not modifying it. [CITED: danb.me/blog/common-agpl-misconceptions]

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Tab component with ARIA | Custom `role="tablist"` component | `@headlessui/react` Tab (already installed) | Correct ARIA + keyboard is well-trodden ground; rolling it is a known source of a11y bugs. |
| Markdown → HTML rendering | String-replace regex | `react-markdown@10.1.0 + remark-gfm + rehype-sanitize` | GFM features (tables, strikethrough, task lists) are nontrivial; security via rehype-sanitize is a one-liner we cannot skip. |
| SSE parser | Your own `split('\n')` regex | Keep inline for simplicity (20 lines), or swap to `eventsource-parser` | Inline is fine for Phase 3; upgrade if we hit an edge case with multi-line `data:` frames. |
| API key encryption | Custom `openssl_encrypt` wrapper | Laravel's native `encrypted` cast | The bug is always in the MAC verification or the IV generation, and Laravel gets both right. [CITED: laravel.com/docs/13.x/encryption] |
| Managed Agents client | Write a full SDK wrapper | `Http::withHeaders()` raw HTTP + thin service class | The current PHP SDK doesn't expose MA; waiting for it is unbounded. Swap when SDK catches up. |
| Typewriter animation | `setTimeout(setState, 5)` per char | ref-queue + `requestAnimationFrame` drain | `setTimeout` is a memory/battery drain; `rAF` pauses when the tab is backgrounded. |
| LGPD / CONAR compliance guardrails | Hand-written regex on AI output | None — enforce at the prompt level (see AI-SPEC §1b) + human review gate | These are content-policy concerns, not regex concerns. AI-SPEC already addresses them. |
| Filter state management | URL param parsing via `window.location` | `@inertiajs/react` `router.get` + `usePage().props.filters` | Inertia serializes filter state into the URL automatically. [CITED: inertiajs.com/manual-visits] |

**Key insight:** Phase 3 adds 5 new user-visible surfaces (Brief tab, Chat tab, /planejamento, dashboard widget, /settings/ai). Each brings its own temptations to hand-roll (tabs, markdown, SSE, filters). Every "let's just write our own" is hours burned that add zero user value. The hackathon timeline makes this a 10x risk.

---

## Common Pitfalls

### Pitfall 1: EventSource + Laravel CSRF = mysterious 419 errors

**What goes wrong:** Developer reaches for `new EventSource('/demands/X/brief/generate')`. Works in dev. In prod with stricter CSRF, gets 419.
**Why:** EventSource can't send `X-CSRF-TOKEN`. The `web` middleware group blocks the request.
**How to avoid:** Use `fetch` + `ReadableStream.getReader()` from the start; include CSRF header in every SSE request.
**Warning signs:** 419 responses from SSE endpoints in production; SSE working in `npm run dev` but failing when deployed behind a real web server.

### Pitfall 2: SSE streams buffered by nginx/Apache/Cloudflare

**What goes wrong:** Typewriter effect works locally but in prod the entire response appears at once after ~5 seconds.
**Why:** Reverse proxies buffer responses. Laravel sets `X-Accel-Buffering: no` but the proxy config must match.
**How to avoid:** Explicit nginx `proxy_buffering off` + `fastcgi_buffering off` on SSE locations; for Apache, disable `mod_deflate` on SSE routes; for Cloudflare, the only way is to disable "Rocket Loader" on the route or put the SSE endpoint on a subdomain with CDN bypass.
**Warning signs:** Streaming works on `php artisan serve` but not on staging; browser DevTools → Network shows the full response body arriving in one chunk with `(disk cache)` or near-zero time.

### Pitfall 3: Forgetting `set_time_limit(0)` on SSE routes

**What goes wrong:** Stream hits 30-second PHP default limit and dies mid-response.
**Why:** PHP default `max_execution_time=30`. Brief generation can take 40–60 seconds.
**How to avoid:** First line of SSE controller: `set_time_limit(0);`. AI-SPEC §3 pitfall 3 already mentions this — repeat here for emphasis.

### Pitfall 4: `@headlessui/react` TabPanel unmounts its children on tab switch

**What goes wrong:** User opens "Chat IA" tab mid-stream, switches to "Brief", switches back — stream is dead; messages are lost; `useAiStream` state reset.
**Why:** TabPanel unmounts by default. State in `ChatTab` children dies with it.
**How to avoid:** Use `<TabPanel unmount={false}>`. Panels render behind the scenes and preserve their React state. [CITED: headlessui.com/react/tabs#rendering-all-panels-at-once]
**Warning signs:** Open a chat with messages → switch tabs → switch back → chat is empty.

### Pitfall 5: Storing social handles as URLs instead of handles

**What goes wrong:** User pastes `https://www.instagram.com/brandx/`, another pastes `instagram.com/brandx`, a third pastes `@brandx`. MA crawler gets inconsistent inputs.
**Why:** No normalization at input time.
**How to avoid:** Strict validation + normalization — one field per platform, store handle-only (strip `https://`, `www.`, domain, trailing `/`). Display as `@handle` (with `@` prepended for platforms that use it).
**Warning signs:** MA sessions fail with "invalid URL" or crawl the homepage instead of the brand page.

### Pitfall 6: BYOK key leaks via Inertia props

**What goes wrong:** Developer adds `'organization' => $request->user()->organization` to shared Inertia props without hiding the encrypted column → the ciphertext appears in `window.__INERTIA__` on every page.
**Why:** Forgetting `protected $hidden = [...]` on the model.
**How to avoid:** Add a Feature test: `$response->assertDontSee($org->anthropic_api_key_encrypted)` on the `/dashboard` route.
**Warning signs:** `Organizations::all()->toArray()` output includes the key column in tinker/pest.

### Pitfall 7: AGPL notice missing on generated files

**What goes wrong:** Inertia auto-generates `resources/js/ssr.js` at build; migrations are copy-pasted; DevTools snapshots. Headers drift away.
**Why:** Humans add headers; machines don't.
**How to avoid:** CI check (shell script above); exclude `node_modules`, `vendor`, `public/build`, `.planning/` from the check to prevent false positives.

### Pitfall 8: `client_research_sessions` orphaned on client delete

**What goes wrong:** User deletes a Client while an MA session is `running`. Session keeps running; events pile up; cost accrues.
**Why:** No foreign-key cascade + no `deleting` model event hook.
**How to avoid:**
```php
// app/Models/Client.php
protected static function booted()
{
    static::deleting(function (Client $client) {
        $client->researchSessions()
            ->where('status', 'running')
            ->each(fn ($s) => app(ClientResearchAgent::class)->interrupt($s));
    });
}
```
+ `onDelete('cascade')` on the migration.

### Pitfall 9: Typewriter flushes leak across streams

**What goes wrong:** User hits "Regenerar", sees characters from the PREVIOUS brief flash at the start of the new stream.
**Why:** The rAF queue wasn't cleared when the new stream started.
**How to avoid:** In `useAiStream.start`, call `typewriter.reset()` BEFORE `setState('streaming')`.

---

## Code Examples

### Complete `BriefTab` component (brief generation + edit + regenerate)

```tsx
// resources/js/Components/DemandDetailModal/BriefTab.tsx
// Source: patterns synthesized from this RESEARCH.md sections above
import { useState } from 'react';
import { router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { Pencil, RefreshCw } from 'lucide-react';
import { useAiStream } from '@/hooks/useAiStream';
import { useTypewriter } from '@/hooks/useTypewriter';
import { AiMarkdown } from '@/Components/AiMarkdown';
import chatbotIconDark from '@/assets/chatbot-icon-dark.svg';
import chatbotIconLight from '@/assets/chatbot-icon-light.svg';

interface Props { demand: Demand; }

export function BriefTab({ demand }: Props) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(demand.ai_analysis?.brief ?? '');
  const stream = useAiStream();
  const typewriter = useTypewriter(stream.state === 'streaming');

  // Render rendered buffer (live stream) OR stored brief OR empty state
  const hasStoredBrief = !!demand.ai_analysis?.brief;
  const displayText = stream.state === 'streaming' ? typewriter.rendered : demand.ai_analysis?.brief ?? '';

  const generate = () => {
    typewriter.reset();                          // Pitfall 9
    stream.start(
      route('demands.brief.generate', demand.id),
      { method: 'POST' }
    );
    // the hook's chunk handler forwards text to typewriter.enqueue
    // when done event fires → Inertia refetch:
    //    router.reload({ only: ['selectedDemand'], preserveScroll: true });
  };

  if (stream.state === 'idle' && !hasStoredBrief) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-6 text-center h-full">
        <img src={chatbotIconLight} alt="" className="h-16 w-16 mb-4 dark:hidden" />
        <img src={chatbotIconDark}  alt="" className="h-16 w-16 mb-4 hidden dark:block" />
        <h3 className="text-base font-semibold mb-2">{t('ai.brief.empty.heading')}</h3>
        <p className="text-sm text-[#6b7280] dark:text-[#9ca3af] mb-6 max-w-sm mx-auto leading-[1.5]">
          {t('ai.brief.empty.body')}
        </p>
        <button onClick={generate} className="inline-flex items-center gap-2 rounded-[8px] bg-[#7c3aed] hover:bg-[#6d28d9] px-5 py-2.5 text-sm font-semibold text-white">
          <img src={chatbotIconLight} alt="" className="h-5 w-5 dark:hidden" />
          <img src={chatbotIconDark}  alt="" className="h-5 w-5 hidden dark:block" />
          {t('ai.brief.empty.cta')}
        </button>
      </div>
    );
  }

  if (editing) {
    return <BriefEditor demand={demand} initialText={editText} onCancel={() => setEditing(false)} onSaved={() => setEditing(false)} />;
  }

  return (
    <div className="h-full flex flex-col">
      <div className="sticky top-0 z-10 bg-white dark:bg-[#111827] border-b border-[#e5e7eb] dark:border-[#1f2937] px-6 py-2 flex justify-end gap-2">
        <button onClick={() => setEditing(true)} className="rounded-[8px] border border-[#e5e7eb] dark:border-[#1f2937] px-3 py-1.5 text-xs font-medium text-[#6b7280] hover:border-[#7c3aed] hover:text-[#7c3aed] inline-flex items-center gap-1">
          <Pencil size={14} /> {t('common.edit')}
        </button>
        <button onClick={generate} className="rounded-[8px] border border-[#e5e7eb] dark:border-[#1f2937] px-3 py-1.5 text-xs font-medium text-[#6b7280] hover:border-[#7c3aed] hover:text-[#7c3aed] inline-flex items-center gap-1">
          <RefreshCw size={14} /> {t('ai.brief.regenerate')}
        </button>
      </div>
      <div className="p-6 overflow-y-auto flex-1" aria-live="polite">
        <AiMarkdown>{displayText}</AiMarkdown>
        {stream.state === 'streaming' && (
          <span aria-hidden className="inline-block align-baseline text-[#7c3aed] animate-[blink_1s_step-end_infinite]">▎</span>
        )}
      </div>
      {stream.state === 'error' && (
        <div className="mx-6 mb-3 rounded-[8px] border border-[#ef4444]/30 bg-[#ef4444]/10 text-[#ef4444] px-3.5 py-2.5 text-sm">
          {t('ai.brief.errors.streamFailed')}
          <button onClick={generate} className="ml-2 underline">{t('common.tryAgain')}</button>
        </div>
      )}
    </div>
  );
}
```

---

## State of the Art

| Old Approach (pre-2025) | Current Approach (2026) | When Changed | Impact |
|--------------------------|-------------------------|--------------|--------|
| `EventSource` for SSE in React | `fetch` + `ReadableStream.getReader()` | Became the ecosystem default when AI SDKs (Vercel AI SDK, anthropic-sdk-ts) standardized on it | Custom headers, POST body, AbortController all work; one moving part instead of two |
| react-markdown v9 | **v10.1.0 (2025-03-07)** | v10 breaking changes: removed deprecated plugin options, React 18+ required | Minor — `components` prop API is stable; upgrade is a drop-in |
| `@tailwindcss/typography` for markdown | Per-element `components` mapping | When Tailwind JIT + arbitrary values made per-element control trivial | Finer control over dark-mode and token mapping; zero new deps |
| WebSocket-based AI streaming | SSE (unidirectional) | 2023–2024 — all major AI vendors converged on SSE | Simpler infra; works through any proxy that understands HTTP |
| Managed Agents "build your own" | Claude Managed Agents (beta) | 2026-04-01 beta release | 2–3 weeks of infra work avoided for long-running research agents |

**Deprecated / outdated (do NOT use):**
- `react-markdown@<9` — pre-ESM, deprecated `renderers` prop.
- `@anthropic-ai/client` (different package) — this is a community wrapper, not official.
- `guzzlehttp/guzzle` direct for SSE — use `Http::` facade (Laravel wraps Guzzle) for consistency.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `eventsource-parser@^3.0.0` is a viable swap for the inline SSE parser | Frontend Integration Patterns → Pattern A | LOW — the inline parser works; library is optional polish. |
| A2 | Apache/nginx prod config must match SSE buffering requirements | Pattern C | HIGH — if deployment skips this, typewriter appears as "all-at-once". Must verify in staging. |
| A3 | `@headlessui/react@^2.2.10` Tab supports `unmount={false}` | Pitfall 4 | LOW — documented in headless UI v1; kept in v2. If removed in v2.x, use `<TabPanel static>` instead. |
| A4 | PHP SDK v0.17+ will expose `$client->beta->sessions` matching the docs' pseudocode | Managed Agents Integration | MEDIUM — if the SDK API shape diverges, the raw-HTTP service class remains the fallback. |
| A5 | `rehype-sanitize` default schema is sufficient for AI-generated markdown | Markdown Rendering | LOW — default schema is conservative; verified against remark-react conventions. If Claude ever generates iframes or scripts (against system prompt), sanitize strips them. |
| A6 | `CHARS_PER_SECOND = 200` feels right for pt-BR reading | Typewriter Rendering | LOW — tunable at any time; no code change beyond the constant. |
| A7 | Storing social handles (not URLs) is the right UX choice | Social Handles | LOW — users accept normalization; tradeoff is documented. |
| A8 | Short per-file AGPL header is formally sufficient when LICENSE is present | AGPL Setup | LOW — confirmed by FSF's gpl-howto guidance; GitHub's license detector only requires `LICENSE` at root. |
| A9 | Managed Agents `agent_toolset_20260401` provides `web_search` + `web_fetch` (which are what Phase 3 needs) | Managed Agents | MEDIUM — the quickstart enables the full toolset by default; confirm at implementation time whether a restricted toolset (no bash, no file ops) is a better fit per LGPD. |
| A10 | Polling every 30s for MA session status (instead of live proxy) is acceptable for Phase 3 | MA Proxy | LOW — D-37 says "badge updates every N events"; polling is explicitly acceptable for hackathon scope. |

---

## Open Questions

1. **Should the MA `anthropic_api_key_mask` be computed in a DB trigger or a model event?**
   - What we know: Laravel model `saving` event is reliable; DB triggers are more bulletproof but harder to test.
   - What's unclear: whether the project's test infrastructure covers DB triggers.
   - Recommendation: compute in a model `saving` observer. Simpler to test (`php artisan test` runs sync).

2. **Does the user's Anthropic account need to "opt into" Managed Agents beta explicitly?**
   - What we know: docs say "Managed Agents is enabled by default for all API accounts."
   - What's unclear: whether BYOK users with freshly-generated keys need extra setup.
   - Recommendation: in the "Test key" endpoint, include a probe for MA access — if a `POST /v1/agents` returns 403, surface a friendly "Managed Agents not yet enabled for your account — contact Anthropic" message.

3. **Should `ClientResearchAgent` persist one agent+environment per organization, or create fresh per request?**
   - What we know: MA rate-limits create endpoints at 60/min. Agents are versioned.
   - What's unclear: whether reusing an agent+environment across hundreds of sessions has performance or cost implications.
   - Recommendation: **reuse** — cache `agent_id` and `environment_id` on the organization. Versioning lets us rotate the agent config later without session loss.

4. **Is localStorage-keyed dismissal accessible to tabbed users (opened the same org on two browsers)?**
   - What we know: localStorage is per-origin + per-browser. Two browsers = two independent keyspaces.
   - What's unclear: whether users will complain.
   - Recommendation: accept for Phase 3. If complaints surface, migrate to `users.preferences` JSON column in Phase 4.

5. **Should `social_handles` field have a per-platform toggle ("this client has no LinkedIn")?**
   - What we know: UI decision not locked in UI-SPEC; D-35 says "at least one required for MA launch".
   - What's unclear: whether a null value means "no such handle" or "forgot to enter".
   - Recommendation: **omit empty keys from the JSON on save** — `null` = no handle; UI shows an add-button per platform. MA only crawls platforms with non-empty values.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js + npm | Vite build for new frontend deps | ✓ | already used in project | — |
| PHP 8.3+ | Laravel 13 runtime | ✓ | declared in composer.json (`^8.3`) | — |
| Anthropic API access | All AI features | — (per-org BYOK) | — | D-33 graceful degradation: AI buttons disabled |
| Managed Agents beta access | D-35..D-40 "Conhecer cliente" | Default-enabled on API accounts [CITED: platform.claude.com/docs/en/managed-agents/overview] | — | If 403 on MA: feature hides, manual memory entry still works |
| Postgres `json` column support | `clients.social_handles` | ✓ (phpunit.xml shows pgsql in test env) | — | — |
| Redis queue (for `ExtractClientMemoryJob`, MA-polling jobs) | AI-SPEC §4b async-first | ✓ assumed per STATE.md "Redis" | — | `database` driver works; slower but functional |
| Reverb (WebSocket) | NOT REQUIRED in Phase 3 | ✓ (Phase 4 scope) | installed (`laravel/reverb ^1.10` in composer.json) | — |

**Missing dependencies with no fallback:** none — Phase 3 works on localhost with zero new system dependencies beyond npm installs.

**Missing dependencies with fallback:** none critical.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | **PHPUnit ^12.5.12** (declared in composer.json require-dev) — project does NOT use Pest (no `pest.php` found, `phpunit.xml` present) |
| Config file | `phpunit.xml` at repo root (pgsql test DB `briefy_test`, sync queue, array mail) |
| Quick run command | `php artisan test --filter={TestName}` |
| Full suite command | `php artisan test` (scripts section: `composer test`) |
| Frontend tests | **None detected** — no vitest/jest config, no `*.test.tsx` files exist in repo |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AI-01 | POST /demands/{id}/brief/generate streams a brief and persists to ai_analysis.brief | Feature (HTTP) | `php artisan test tests/Feature/AiBriefControllerTest.php` | ❌ Wave 0 |
| AI-02 | `AiMarkdown` component renders markdown with sanitization | Unit (frontend) | N/A — no frontend test infra; **manual QA** | ❌ Wave 0 (infra OR manual-only) |
| AI-03 | Regenerate reuses endpoint; SSE cancellation on abort | Feature (HTTP) | `php artisan test tests/Feature/AiBriefControllerTest.php::regenerate_cancels_previous` | ❌ Wave 0 |
| AI-04 | POST /demands/{id}/chat/{conv}/stream persists user + assistant turns | Feature (HTTP) | `php artisan test tests/Feature/AiChatControllerTest.php` | ❌ Wave 0 |
| AI-05 | ChatPromptBuilder includes all context (memory, demand, files, comments) | Unit | `php artisan test tests/Unit/Ai/ChatPromptBuilderTest.php` | ❌ Wave 0 |
| AI-06 | ExtractClientMemoryJob writes scoped, dedupe-keyed entries to client_ai_memory | Feature (Job) | `php artisan test tests/Feature/Jobs/ExtractClientMemoryJobTest.php` | ❌ Wave 0 |
| AI-07 | `response()->eventStream` emits SSE frames with correct Content-Type and X-Accel-Buffering | Feature (HTTP) | `php artisan test tests/Feature/SseHeadersTest.php` (assert response headers) | ❌ Wave 0 |
| MPLAN-01 | Clients migration adds monthly_posts, monthly_plan_notes, planning_day, social_handles | Feature (DB) | `php artisan test tests/Feature/ClientMonthlyPlanMigrationTest.php` | ❌ Wave 0 |
| MPLAN-02 | StoreClientRequest + UpdateClientRequest validate new fields | Feature (Validation) | `php artisan test tests/Feature/ClientFormValidationTest.php` | ❌ Wave 0 |
| MPLAN-03 | MonthlyPlanSchema enforces exact `monthly_posts` count via tool-use | Unit | `php artisan test tests/Unit/Ai/MonthlyPlanSchemaTest.php` | ❌ Wave 0 |
| MPLAN-04 | MonthlyPlanGenerator integration: fake Anthropic client returns plan; validator passes | Feature (Service) | `php artisan test tests/Feature/Ai/MonthlyPlanGeneratorTest.php` | ❌ Wave 0 |
| MPLAN-05 | POST /planning-suggestions/convert-bulk creates Demand per suggestion + updates status | Feature (HTTP) | `php artisan test tests/Feature/PlanningSuggestionConvertTest.php` | ❌ Wave 0 |
| BYOK guard | Org without key → 402/graceful on AI endpoints; with key → SDK call succeeds | Feature (HTTP) | `php artisan test tests/Feature/ByokGuardTest.php` | ❌ Wave 0 |
| BYOK encryption | `anthropic_api_key_encrypted` round-trips via cast; $hidden blocks JSON leak | Unit | `php artisan test tests/Unit/Models/OrganizationByokTest.php` | ❌ Wave 0 |
| MA session lifecycle | ClientResearchAgent::launch hits MA with fake Http; persists session record | Feature (Service) | `php artisan test tests/Feature/Ai/ClientResearchAgentTest.php` | ❌ Wave 0 |
| AGPL headers | CI check — every PHP/TS file has AGPL header | CI (shell) | `bash scripts/check-agpl-headers.sh` | ❌ Wave 0 |

**Streaming endpoint testing note:** Laravel's `response()->eventStream()` can be asserted via `$response->streamedContent()` or by hitting the endpoint in a live test with a Symfony `HttpClient` — both supported by `phpunit/phpunit ^12`. Mock the `Anthropic\Client` with Mockery (`mockery/mockery ^1.6` is installed) to control streamed chunks in tests.

### Sampling Rate

- **Per task commit:** `php artisan test --filter={ClassName}` (< 30 s for a single class)
- **Per wave merge:** `php artisan test --testsuite=Feature` (< 3 min estimate based on Phase 2 Feature suite)
- **Phase gate:** `composer test` (full Unit + Feature) green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] **ALL Phase 3 test files** (16 listed above) — none exist; this is a greenfield phase for tests
- [ ] `tests/Feature/Ai/` subdirectory — create
- [ ] `tests/Unit/Ai/` subdirectory — create
- [ ] `tests/Feature/Jobs/` subdirectory — create
- [ ] Mockery `Anthropic\Client` helper (fixture) — `tests/TestCase.php` adds `fakeAnthropic(): MockInterface`
- [ ] `Http::fake()` patterns for MA endpoints — document in `tests/TestCase.php`
- [ ] `scripts/check-agpl-headers.sh` — create + add to CI
- [ ] **NO frontend test framework currently installed.** Options for Wave 0:
  - Add **vitest** (`npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom`) — aligns with React 19 + Vite; tests for AiMarkdown, useAiStream parsing, useTypewriter timing.
  - OR accept "manual QA for frontend" and only test server endpoints. **Recommendation: add vitest** — a single `useAiStream` unit test prevents the SSE-parser regression-of-death scenario.

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Laravel Sanctum + session auth already in place (Phase 1); AI routes gated by `auth` middleware. |
| V3 Session Management | yes | Standard Laravel session; MA session IDs are server-side only (never exposed as URL slugs). |
| V4 Access Control | yes | Every AI controller MUST call `$this->authorize('update', $demand)` or `view`. Cross-org demand access is the primary risk. Feature test: user from Org A cannot trigger brief generation for Org B's demand. |
| V5 Input Validation | yes | FormRequests for all new fields (social_handles, monthly_posts, planning_day, `anthropic_api_key`). Zod-equivalent: Laravel validator. |
| V6 Cryptography | yes | **Laravel native `encrypted` cast** (AES-256-GCM + HMAC) for BYOK. No hand-rolled crypto. |
| V7 Error Handling | yes | ExceptionHandler redacts `sk-ant-...` patterns; PHP 8.2 `#[\SensitiveParameter]` on key-handling methods. |
| V8 Data Protection | yes | `$hidden` array blocks BYOK ciphertext leak via JSON; `anthropic_api_key_mask` served instead. LGPD: `client_ai_memory` MUST NOT store PII (enforced at prompt level, verified in `ExtractClientMemoryJob` post-hoc). |
| V13 API (REST) | yes | Input validation, rate limiting (Laravel throttle middleware), CSRF on all mutation endpoints. |

### Known Threat Patterns for Laravel + Inertia + BYOK + SSE stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Stored API key leak via logs | Information disclosure | `#[\SensitiveParameter]` + ExceptionHandler regex redaction + `$hidden` array |
| Stored API key leak via Inertia props | Information disclosure | `protected $hidden = ['anthropic_api_key_encrypted']` + assertion test |
| Cross-org demand access via SSE endpoint | Elevation of privilege | `$this->authorize('view', $demand)` before opening the stream |
| MA session hijack (user receives another org's stream) | Information disclosure | Session ID scoped via `$this->authorize('view', $session->client)`; route model binding enforces org scope |
| SQL injection via social_handles JSON | Tampering | Eloquent `array` cast serializes — never concatenates. Queries use `whereJsonContains`, not raw SQL. |
| XSS via AI-generated markdown | Tampering / XSS | `rehype-sanitize` on every AiMarkdown render |
| CSRF on POST /demands/{id}/brief/generate | Tampering | `X-CSRF-TOKEN` header required; `fetch` sends it; `EventSource` CAN'T — forces us to `fetch` |
| Cost runaway on MA session (malicious user or bug) | DoS (on user's wallet) | Pre-launch confirmation modal (D-34) + hard cap on session duration (configurable, default 60 min) + `user.interrupt` on timeout |
| Robots.txt violation by MA crawler | Reputation | System prompt for MA explicitly instructs to respect `robots.txt` (AI-SPEC §1 critical failure mode #6) |
| Prompt injection via `client_ai_memory.insight` | Tampering | `rehype-sanitize` at render; AI-SPEC §4b validated extraction schema at write-time |

---

## Sources

### Primary (HIGH confidence)
- **Context7 not available in this environment** (agent tools block MCP per upstream bug). Used CLI/web fallbacks.
- [platform.claude.com/docs/en/managed-agents/overview](https://platform.claude.com/docs/en/managed-agents/overview) — Core concepts, beta header, rate limits
- [platform.claude.com/docs/en/managed-agents/quickstart](https://platform.claude.com/docs/en/managed-agents/quickstart) — Full curl examples for create agent / env / session / stream
- [platform.claude.com/docs/en/managed-agents/sessions](https://platform.claude.com/docs/en/managed-agents/sessions) — Session CRUD + lifecycle
- [platform.claude.com/docs/en/managed-agents/events-and-streaming](https://platform.claude.com/docs/en/managed-agents/events-and-streaming) — Full event schema
- [laravel.com/docs/13.x/responses](https://laravel.com/docs/13.x/responses) — `eventStream()` method signature + `StreamedEvent` class + `</stream>` end marker behavior
- [laravel.com/docs/13.x/encryption](https://laravel.com/docs/13.x/encryption) — `encrypted` cast behavior
- [github.com/remarkjs/react-markdown](https://github.com/remarkjs/react-markdown) — v10.1.0 README, components prop, rehype-sanitize wiring
- [headlessui.com/react/tabs](https://headlessui.com/react/tabs) — Tab API reference
- [gnu.org/licenses/agpl-3.0.html](https://www.gnu.org/licenses/agpl-3.0.html) — AGPL-3.0 full text + §13 SaaS clause
- [gnu.org/licenses/gpl-howto.html](https://www.gnu.org/licenses/gpl-howto.html) — per-file notice guidance
- [npm registry verified 2026-04-22](https://www.npmjs.com) — version numbers for react-markdown, rehype-sanitize, remark-gfm, @headlessui/react
- [Packagist verified 2026-04-22](https://packagist.org/packages/anthropic-ai/sdk) — anthropic-ai/sdk v0.16.0 metadata + required PHP version

### Secondary (MEDIUM confidence)
- [serversideup.net/blog/sending-server-sent-events-with-laravel](https://serversideup.net/blog/sending-server-sent-events-with-laravel/) — nginx/apache buffering config
- [sitepoint.com/streaming-backends-react-controlling-re-render-chaos](https://www.sitepoint.com/streaming-backends-react-controlling-re-render-chaos/) — rAF-batched state update pattern
- [upstash.com/blog/smooth-streaming](https://upstash.com/blog/smooth-streaming) — AI SDK v5 smooth streaming approach
- [oneuptime.com/blog/post/2026-01-15-server-sent-events-sse-react/view](https://oneuptime.com/blog/post/2026-01-15-server-sent-events-sse-react/view) — EventSource vs fetch limitations
- [inertiajs.com/manual-visits](https://inertiajs.com/manual-visits) + [inertiajs.com/partial-reloads](https://inertiajs.com/partial-reloads) — router.get with preserveState; only prop
- [securinglaravel.com/security-tip-hide-sensitive-parameters](https://securinglaravel.com/security-tip-hide-sensitive-parameters/) — `#[\SensitiveParameter]` + php.ini `zend.exception_ignore_args`
- [github.com/YorCreative/Laravel-Scrubber](https://github.com/YorCreative/Laravel-Scrubber) — log scrubbing package (alternative to custom ExceptionHandler)
- [github.com/licenses/license-templates/blob/master/templates/agpl3-header.txt](https://github.com/licenses/license-templates/blob/master/templates/agpl3-header.txt) — canonical per-file header template
- [github.com/lorey/social-media-profiles-regexs](https://github.com/lorey/social-media-profiles-regexs) — Instagram/LinkedIn handle regexes
- [blog.tailwindcss.com/headless-ui-unstyled-accessible-ui-components](https://blog.tailwindcss.com/headless-ui-unstyled-accessible-ui-components) — Headless UI design philosophy + ARIA automation

### Tertiary (LOW confidence — flagged)
- Assumption A1 (eventsource-parser viable) — LOW until a dev tests it
- Assumption A4 (PHP SDK timeline for MA) — MEDIUM; track PHP SDK release notes

---

## Project Constraints (inferred; no CLAUDE.md present)

- **No `CLAUDE.md` at project root** — verified via filesystem check. Project conventions are implicit via existing code patterns:
  - Tailwind manual token system (`rounded-[8px]`, `#7c3aed`, etc.) — DO NOT introduce shadcn or component libraries that override this
  - Inertia partial reloads (`only: [...]`) — standard for modal and filter state
  - `useForm` + `editForm.put` — standard inline edit pattern (see DemandDetailModal.tsx)
  - Route name convention: `resource.action.subaction` (e.g., `demands.status.update`, `demands.inline.update`)
  - pt-BR is the source of truth for i18n; EN and ES mirror structure

- **No `.claude/skills/` directory** — no project skills to load.

- **No `.planning/config.json`** — absent, so `workflow.nyquist_validation` is treated as enabled by default → Validation Architecture section is included above.

- **No `security_enforcement` config** — treated as enabled → Security Domain section included.

---

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** — all versions verified against npm/Packagist registries this session (2026-04-22)
- Managed Agents integration: **HIGH** — raw HTTP endpoints verified directly from `platform.claude.com` docs fetched in this session
- BYOK infrastructure: **HIGH** — Laravel native features, well-documented
- AGPL packaging: **HIGH** — FSF guidance is the authoritative source; standard practice for 20+ years
- Frontend patterns (fetch+ReadableStream, typewriter): **MEDIUM-HIGH** — synthesized from multiple 2025–2026 sources; code examples are idiomatic but not copy-pasted from a single author
- Environment availability: **HIGH** — verified via repo inspection
- Test infrastructure: **HIGH** — phpunit.xml read, Pest absent confirmed, frontend test gap identified

**Research date:** 2026-04-22
**Valid until:** **2026-05-22** (30 days) for stable items (Laravel, AGPL, Inertia patterns). **2026-04-29** (7 days) for Managed Agents API — still in beta, the beta header value could change at short notice; planner should re-check `anthropic-beta: managed-agents-2026-04-01` against docs at implementation time.
