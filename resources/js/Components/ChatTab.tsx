// (c) 2026 Briefy contributors — AGPL-3.0
import { useState, useEffect, useRef, FormEvent } from 'react';
import { router, usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { Plus, Send } from 'lucide-react';
import { AiIcon } from '@/Components/AiIcon';
import { AiMarkdown } from '@/Components/AiMarkdown';
import { useAiStream } from '@/hooks/useAiStream';
import { useTypewriter } from '@/hooks/useTypewriter';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChatMessage {
  id: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
}

interface Conversation {
  id: number;
  title?: string;
  compacted_at?: string | null;
  messages: ChatMessage[];
  created_at: string;
}

interface Demand {
  id: number;
  /** Injected by DemandController after Plan 09 — latest conversation with its messages. */
  conversations?: Conversation[];
}

interface PageProps {
  auth: { organization: { has_anthropic_key: boolean } };
  [key: string]: unknown;
}

interface ChatTabProps {
  demand: Demand;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Chat IA tab inside DemandDetailModal.
 *
 * v1.1 UX Constraint (FLAG 11): Only the LATEST ai_conversation is loaded and
 * shown. Older conversations persist in DB but are not accessible via UI in
 * v1.1. A conversation picker dropdown is deferred to the v1.2 backlog.
 */
export default function ChatTab({ demand }: ChatTabProps) {
  const { t } = useTranslation();
  const { auth } = usePage<PageProps>().props;
  const hasKey = (auth?.organization as { has_anthropic_key?: boolean } | null)?.has_anthropic_key ?? false;

  // Use the latest conversation from the demand prop (v1.1: only latest shown).
  const latestConv = demand.conversations?.length
    ? demand.conversations[demand.conversations.length - 1]
    : null;

  const [conv, setConv] = useState<Conversation | null>(latestConv);
  const [input, setInput] = useState('');
  const [confirmingNew, setConfirmingNew] = useState(false);
  const confirmTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  // Keep local conv in sync when demand reloads (Inertia partial reload after stream done).
  useEffect(() => {
    const updated = demand.conversations?.length
      ? demand.conversations[demand.conversations.length - 1]
      : null;
    setConv(updated);
  }, [demand.conversations]);

  // ─── Streaming hook ─────────────────────────────────────────────────────────

  const stream = useAiStream({
    url: conv ? route('demands.chat.stream', [demand.id, conv.id]) : '',
    method: 'POST',
    onDone: () => {
      router.reload({ only: ['selectedDemand'] });
    },
    onError: (m) => setError(m),
  });

  // Drive the assistant typing animation.
  const streamingText = useTypewriter({ target: stream.buffer, charsPerFrame: 2 });

  // ─── Auto-scroll ─────────────────────────────────────────────────────────────

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    // Only auto-scroll if the user is within 40px of the bottom (not manually scrolled up).
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    if (nearBottom) el.scrollTop = el.scrollHeight;
  }, [conv?.messages.length, streamingText]);

  // ─── Conversation management ─────────────────────────────────────────────────

  const startConversation = async (): Promise<Conversation | null> => {
    try {
      const res = await fetch(route('demands.chat.start', demand.id), {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'X-CSRF-TOKEN':
            document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '',
          'X-Requested-With': 'XMLHttpRequest',
        },
        credentials: 'same-origin',
      });
      if (!res.ok) {
        setError(t('ai.chat.errors.streamFailed'));
        return null;
      }
      const data = (await res.json()) as { id: number; created_at: string };
      const newConv: Conversation = { id: data.id, created_at: data.created_at, messages: [] };
      setConv(newConv);
      return newConv;
    } catch {
      setError(t('ai.chat.errors.streamFailed'));
      return null;
    }
  };

  const handleNovaConversa = async () => {
    // First click: enter confirm state for 3s (only if conversation has messages).
    if (!confirmingNew && conv && conv.messages.length > 0) {
      setConfirmingNew(true);
      if (confirmTimeoutRef.current) clearTimeout(confirmTimeoutRef.current);
      confirmTimeoutRef.current = setTimeout(() => setConfirmingNew(false), 3000);
      return;
    }
    // Second click (or conv has no messages): create new conversation.
    setConfirmingNew(false);
    if (confirmTimeoutRef.current) clearTimeout(confirmTimeoutRef.current);
    await startConversation();
    // After creating, reload to persist the new conv in selectedDemand.
    router.reload({ only: ['selectedDemand'] });
  };

  // ─── Send message ────────────────────────────────────────────────────────────

  const sendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !hasKey || stream.state === 'streaming') return;

    setError(null);

    // If no active conversation yet, create one first.
    let active = conv;
    if (!active) {
      active = await startConversation();
    }
    if (!active) return;

    const userMsg = input.trim();
    setInput('');

    // Optimistic render: add user message bubble immediately.
    setConv((prev) => {
      const base = prev ?? active!;
      return {
        ...base,
        messages: [
          ...base.messages,
          { id: -Date.now(), role: 'user', content: userMsg, created_at: new Date().toISOString() },
        ],
      };
    });

    // Start SSE stream with the user message body.
    await stream.start({
      url: route('demands.chat.stream', [demand.id, active.id]),
      body: { message: userMsg },
    });
  };

  const isStreaming = stream.state === 'streaming';

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full flex-col">
      {/* Header bar: conversation meta + Nova conversa button */}
      <div className="flex items-center justify-between border-b border-[#e5e7eb] px-6 py-2.5 dark:border-[#1f2937]">
        <p className="text-xs text-[#9ca3af]">
          {conv
            ? t('ai.chat.startedAt', { date: new Date(conv.created_at).toLocaleDateString('pt-BR') })
            : ''}
        </p>
        <button
          type="button"
          onClick={handleNovaConversa}
          className={`inline-flex items-center gap-1 rounded-[8px] border px-2.5 py-1 text-xs font-medium transition-colors ${
            confirmingNew
              ? 'border-red-500 text-red-500'
              : 'border-[#e5e7eb] text-[#6b7280] hover:border-[#7c3aed] hover:text-[#7c3aed] dark:border-[#1f2937]'
          }`}
        >
          <Plus size={12} />
          {confirmingNew ? t('ai.chat.newConversationConfirm') : t('ai.chat.newConversation')}
        </button>
      </div>

      {/* Auto-compaction banner (D-13): shown when conversation was compacted */}
      {conv?.compacted_at && (
        <div className="sticky top-0 z-10 flex items-center justify-between bg-[#f59e0b]/10 px-4 py-2 text-xs font-medium text-[#f59e0b]">
          <span>{t('ai.chat.compactedBanner')}</span>
          <button
            type="button"
            onClick={handleNovaConversa}
            className="text-[#6d28d9] underline dark:text-[#a78bfa]"
          >
            {t('ai.chat.compactedCta')}
          </button>
        </div>
      )}

      {/* Messages scroll area */}
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-6 py-4 no-scrollbar">
        {(!conv || conv.messages.length === 0) && !isStreaming ? (
          /* Empty state */
          <div className="flex h-full flex-col items-center justify-center py-12 text-center">
            <AiIcon size={48} alt={t('ai.assistantIcon')} />
            <h3 className="mt-4 text-base font-semibold text-[#111827] dark:text-[#f9fafb]">
              {t('ai.chat.empty.heading')}
            </h3>
            <p className="mt-2 max-w-sm text-sm text-[#6b7280] dark:text-[#9ca3af]">
              {t('ai.chat.empty.body')}
            </p>
          </div>
        ) : (
          <>
            {/* Persisted messages */}
            {conv?.messages.map((m) =>
              m.role === 'user' ? (
                /* User bubble */
                <div key={m.id} className="flex justify-end">
                  <div className="max-w-[80%]">
                    <div className="rounded-[12px] rounded-br-[4px] bg-[#7c3aed] px-4 py-2.5 text-sm leading-[1.5] text-white whitespace-pre-wrap">
                      {m.content}
                    </div>
                    <p className="mt-1 text-right text-[11px] text-[#9ca3af]">
                      {new Date(m.created_at).toLocaleTimeString('pt-BR')}
                    </p>
                  </div>
                </div>
              ) : (
                /* Assistant bubble */
                <div key={m.id} className="flex items-start gap-3">
                  <AiIcon size={24} alt={t('ai.assistantIcon')} />
                  <div className="max-w-[80%]">
                    <div className="rounded-[12px] rounded-tl-[4px] bg-[#f3f4f6] px-4 py-2.5 text-sm leading-[1.5] text-[#111827] dark:bg-[#1f2937] dark:text-[#f9fafb]">
                      <AiMarkdown source={m.content} />
                    </div>
                    <p className="mt-1 ml-9 text-[11px] text-[#9ca3af]">
                      {new Date(m.created_at).toLocaleTimeString('pt-BR')}
                    </p>
                  </div>
                </div>
              ),
            )}

            {/* Live streaming assistant bubble */}
            {isStreaming && (
              <div className="flex items-start gap-3">
                <AiIcon size={24} alt={t('ai.assistantIcon')} />
                <div
                  className="max-w-[80%] rounded-[12px] rounded-tl-[4px] bg-[#f3f4f6] px-4 py-2.5 text-sm leading-[1.5] text-[#111827] dark:bg-[#1f2937] dark:text-[#f9fafb]"
                  aria-live="polite"
                >
                  <AiMarkdown source={streamingText} />
                  <span className="ml-0.5 inline-block animate-pulse text-[#7c3aed] dark:text-[#a78bfa]">
                    ▎
                  </span>
                </div>
              </div>
            )}
          </>
        )}

        {/* Inline error banner */}
        {error && (
          <div className="rounded-[8px] border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-500">
            {error}
          </div>
        )}
      </div>

      {/* Input bar */}
      <form
        onSubmit={sendMessage}
        className="flex items-end gap-2 border-t border-[#e5e7eb] px-6 py-4 dark:border-[#1f2937]"
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              sendMessage(e as unknown as FormEvent);
            }
          }}
          placeholder={t('ai.chat.placeholder')}
          disabled={!hasKey}
          rows={1}
          className="min-h-[44px] max-h-[160px] flex-1 resize-none rounded-[8px] border border-[#e5e7eb] bg-white px-3.5 py-2.5 text-sm focus:border-[#7c3aed] focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#1f2937] dark:bg-[#111827] dark:text-[#f9fafb]"
        />
        <button
          type="submit"
          disabled={!input.trim() || isStreaming || !hasKey}
          aria-label={t('demands.send') ?? 'Enviar'}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#7c3aed] text-white hover:bg-[#6d28d9] disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/40"
        >
          <Send size={16} />
        </button>
      </form>

      {/* Streaming status label */}
      {isStreaming && (
        <div className="flex items-center gap-1.5 px-6 pb-2 text-xs text-[#9ca3af]">
          <AiIcon size={12} spinning />
          <span>{t('ai.chat.responding')}</span>
        </div>
      )}
    </div>
  );
}
