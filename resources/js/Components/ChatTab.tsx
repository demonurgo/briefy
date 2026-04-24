// (c) 2026 Briefy contributors — AGPL-3.0
import { useState, useEffect, useRef, FormEvent } from 'react';
import { router, usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { Plus, Send, ChevronDown, Check } from 'lucide-react';
import { AiIcon } from '@/Components/AiIcon';
import { AiMarkdown } from '@/Components/AiMarkdown';
import { useAiStream } from '@/hooks/useAiStream';
import { useTypewriter } from '@/hooks/useTypewriter';
import type { PageProps } from '@/types';

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
  /** Injected by DemandController — all conversations with their messages. */
  conversations?: Conversation[];
}

interface ChatTabProps {
  demand: Demand;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Chat IA tab inside DemandDetailModal.
 *
 * v1.2 (POLISH-03): Conversation picker dropdown added to header.
 * Users can browse previous AI conversations in read-only mode.
 * Only the latest conversation is writable.
 */
export default function ChatTab({ demand }: ChatTabProps) {
  const { t } = useTranslation();
  const { auth } = usePage<PageProps>().props;
  const hasKey = auth?.organization?.has_anthropic_key ?? false;

  // Use the latest conversation from the demand prop.
  const latestConv = demand.conversations?.length
    ? demand.conversations[demand.conversations.length - 1]
    : null;

  // selectedConvId pattern: store the ID instead of the full object.
  // This survives Inertia partial reloads without overwriting picker selection.
  const [selectedConvId, setSelectedConvId] = useState<number | null>(latestConv?.id ?? null);
  const conv = demand.conversations?.find(c => c.id === selectedConvId) ?? latestConv;
  const isLatest = !latestConv || conv?.id === latestConv.id;

  const [input, setInput] = useState('');
  const [confirmingNew, setConfirmingNew] = useState(false);
  const confirmTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  // Optimistic user message — shown immediately after send, cleared after reload brings server data.
  const [optimisticUserMsg, setOptimisticUserMsg] = useState<string | null>(null);
  // pendingReload: stream done but typewriter still animating — reload waits for it to finish.
  const [pendingReload, setPendingReload] = useState(false);

  // Conversation picker state
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Outside-click close for picker dropdown
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Sync guard — only advance selectedConvId to latest if user is already on latest or has no selection.
  // This prevents Inertia partial reloads from overwriting a manually-selected older conversation.
  useEffect(() => {
    const latest = demand.conversations?.length
      ? demand.conversations[demand.conversations.length - 1]
      : null;
    if (!latest) return;
    setSelectedConvId(prev => {
      if (prev === null) return latest.id;
      const isOnLatest = prev === demand.conversations?.[demand.conversations.length - 1]?.id;
      return isOnLatest ? latest.id : prev;
    });
  }, [demand.conversations]);

  // ─── Streaming hook ─────────────────────────────────────────────────────────

  const stream = useAiStream({
    url: conv ? route('demands.chat.stream', [demand.id, conv.id]) : '',
    method: 'POST',
    onDone: () => setPendingReload(true),
    onError: (m) => setError(m),
  });

  // Drive the assistant typing animation.
  const streamingText = useTypewriter({ target: stream.buffer, charsPerFrame: 2 });

  // Fire reload only after typewriter finishes animating — avoids mid-animation cutoff.
  // pendingReload stays true until onSuccess so isStreaming keeps the bubble visible
  // during the network round-trip, preventing scroll jump from DOM height change.
  useEffect(() => {
    if (!pendingReload || streamingText !== stream.buffer || !stream.buffer) return;
    router.reload({
      only: ['selectedDemand'],
      onSuccess: () => {
        setPendingReload(false);
        setOptimisticUserMsg(null);
        // Force scroll to bottom after DOM settles with server messages.
        requestAnimationFrame(() => {
          const el = scrollRef.current;
          if (el) el.scrollTop = el.scrollHeight;
        });
      },
    });
  }, [pendingReload, streamingText, stream.buffer]);

  // ─── Auto-scroll ─────────────────────────────────────────────────────────────

  // Force scroll to bottom when user sends (optimistic) — always, regardless of position.
  useEffect(() => {
    if (!optimisticUserMsg) return;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [optimisticUserMsg]);

  // Auto-scroll during streaming and when new server messages arrive.
  // Uses nearBottom guard so user can scroll up to read history without being yanked back.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
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
      // Reset selectedConvId to null so sync guard will advance it to the new latest on next reload
      setSelectedConvId(null);
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
    // Reset picker to follow latest before creating (sync guard will advance to new latest)
    setSelectedConvId(null);
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
    setOptimisticUserMsg(userMsg);

    // Start SSE stream with the user message body.
    await stream.start({
      url: route('demands.chat.stream', [demand.id, active.id]),
      body: { message: userMsg },
    });
  };

  // Keep streaming bubble visible while typewriter finishes (pendingReload = stream done, typewriter catching up).
  const isStreaming = stream.state === 'streaming' || pendingReload;

  // ─── Conversation label helper ────────────────────────────────────────────────

  const convLabel = (c: Conversation) =>
    c.title ??
    `${new Date(c.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} — ${c.messages.length} msgs`;

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full flex-col">
      {/* Header bar: conversation picker + Nova conversa button */}
      <div className="flex items-center justify-between border-b border-[#e5e7eb] px-6 py-2.5 dark:border-[#1f2937]">
        {/* Conversation picker — shows label always; dropdown only when 2+ convs */}
        <div ref={pickerRef} className="relative">
          <button
            type="button"
            onClick={() => setPickerOpen(v => !v)}
            className="flex items-center gap-1 text-xs text-[#9ca3af] hover:text-[#6b7280] transition-colors"
          >
            <span className="max-w-[140px] truncate">
              {conv ? convLabel(conv) : t('ai.chat.currentConversation', 'Conversa atual')}
            </span>
            <ChevronDown size={10} className={`shrink-0 transition-transform ${pickerOpen ? 'rotate-180' : ''}`} />
          </button>
          {pickerOpen && demand.conversations && demand.conversations.length > 1 && (
            <div className="absolute left-0 top-full mt-1 z-50 w-60 rounded-[12px] border border-[#e5e7eb] bg-white shadow-lg dark:border-[#1f2937] dark:bg-[#111827]">
              {demand.conversations.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => { setSelectedConvId(c.id); setPickerOpen(false); }}
                  className={`flex w-full items-center gap-2 px-4 py-2 text-left text-xs hover:bg-[#f3f4f6] dark:hover:bg-[#1f2937] ${
                    c.id === selectedConvId ? 'text-[#7c3aed]' : 'text-[#6b7280]'
                  }`}
                >
                  <span className="flex-1 truncate">{convLabel(c)}</span>
                  {c.id === latestConv?.id && (
                    <Check size={10} className="shrink-0 text-[#7c3aed]" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
        {/* Nova conversa button — unchanged */}
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
        {(!conv || conv.messages.length === 0) && !isStreaming && !optimisticUserMsg ? (
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

            {/* Optimistic user bubble — shown immediately after send, before server confirms */}
            {optimisticUserMsg && (
              <div className="flex justify-end">
                <div className="max-w-[80%]">
                  <div className="rounded-[12px] rounded-br-[4px] bg-[#7c3aed] px-4 py-2.5 text-sm leading-[1.5] text-white whitespace-pre-wrap opacity-90">
                    {optimisticUserMsg}
                  </div>
                </div>
              </div>
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
