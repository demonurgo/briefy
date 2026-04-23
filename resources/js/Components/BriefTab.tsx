// (c) 2026 Briefy contributors — AGPL-3.0
import { useMemo, useState, useEffect } from 'react';
import { router, usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { Pencil, RefreshCw } from 'lucide-react';
import { AiIcon } from '@/Components/AiIcon';
import emptyLight from '@/assets/empty-state-light.svg';
import emptyDark from '@/assets/empty-state-dark.svg';
import { AiMarkdown } from '@/Components/AiMarkdown';
import { useAiStream } from '@/hooks/useAiStream';
import { useTypewriter } from '@/hooks/useTypewriter';

interface Demand {
  id: number;
  title: string;
  ai_analysis?: { brief?: string; brief_generated_at?: string; brief_edited_at?: string };
}

interface PageProps {
  auth: { user: { organization?: { has_anthropic_key: boolean } } };
  [key: string]: unknown;
}

interface BriefTabProps {
  demand: Demand;
  /** Parent-controlled generating flag — the header button also triggers this */
  generating: boolean;
  onGeneratingChange: (g: boolean) => void;
}

/**
 * Brief tab for DemandDetailModal.
 * 4 visual states: empty → streaming → ready → edit.
 *
 * The parent (DemandDetailModal) owns the `generating` boolean so the
 * header-level "✨ Gerar Brief" button can also trigger generation from
 * any tab, not only when the Brief tab is active.
 */
export default function BriefTab({ demand, generating, onGeneratingChange }: BriefTabProps) {
  const { t } = useTranslation();
  const { auth } = usePage<PageProps>().props;
  const hasKey = auth?.user?.organization?.has_anthropic_key ?? false;

  const existingBrief = demand.ai_analysis?.brief ?? '';
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(existingBrief);
  const [error, setError] = useState<string | null>(null);

  // Keep edit textarea in sync when demand reloads (partial reload after save).
  useEffect(() => {
    setEditValue(existingBrief);
  }, [existingBrief]);

  const stream = useAiStream({
    url: route('demands.brief.generate', demand.id),
    method: 'POST',
    onDone: () => {
      onGeneratingChange(false);
      // Reload only selectedDemand to get the persisted brief.
      router.reload({ only: ['selectedDemand'] });
    },
    onError: (m) => {
      setError(m);
      onGeneratingChange(false);
    },
  });

  // Start stream when parent toggles generating=true.
  useEffect(() => {
    if (generating && stream.state === 'idle') {
      setError(null);
      stream.start();
    }
    // Cancel on unmount while generating (e.g. modal close).
    return () => {
      if (generating) stream.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generating]);

  // Typewriter char-by-char reveal for the streaming buffer.
  const streamingBuffer = useTypewriter({ target: stream.buffer, charsPerFrame: 2 });

  const saveEdit = () => {
    router.patch(
      route('demands.brief.edit', demand.id),
      { brief: editValue },
      {
        preserveScroll: true,
        only: ['selectedDemand'],
        onSuccess: () => setIsEditing(false),
      },
    );
  };

  const cancelEdit = () => {
    if (editValue !== existingBrief && !confirm(t('common.discardChanges') ?? 'Descartar alterações?')) return;
    setEditValue(existingBrief);
    setIsEditing(false);
  };

  // Cmd/Ctrl+S inside edit → save; Esc → cancel.
  useEffect(() => {
    if (!isEditing) return;
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        saveEdit();
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        cancelEdit();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing, editValue]);

  const streaming = stream.state === 'streaming' || generating;

  // ──────────────────────────────────────────────────────────────────────
  // EMPTY STATE — no brief, not streaming, not yet done
  // ──────────────────────────────────────────────────────────────────────
  if (!existingBrief && !streaming && stream.state !== 'done') {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 py-12 text-center">
        <img src={emptyLight} alt="" className="mb-4 h-40 dark:hidden" aria-hidden />
        <img src={emptyDark} alt="" className="mb-4 h-40 hidden dark:block" aria-hidden />
        <h3 className="mt-0 text-base font-semibold text-[#111827] dark:text-[#f9fafb]">
          {t('ai.brief.empty.heading')}
        </h3>
        <p className="mt-2 mb-6 max-w-sm text-sm leading-[1.5] text-[#6b7280] dark:text-[#9ca3af]">
          {t('ai.brief.empty.body')}
        </p>
        <button
          type="button"
          onClick={() => hasKey && onGeneratingChange(true)}
          disabled={!hasKey}
          className="inline-flex items-center gap-2 rounded-[8px] bg-[#7c3aed] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#6d28d9] disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/40"
        >
          <AiIcon size={20} variant="dark" />
          {t('ai.brief.empty.cta')}
        </button>
        {!hasKey && (
          <p className="mt-4 text-xs text-[#9ca3af]">
            {t('ai.brief.errors.serviceUnavailable')}
          </p>
        )}
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────
  // EDIT STATE — textarea with raw markdown
  // ──────────────────────────────────────────────────────────────────────
  if (isEditing) {
    return (
      <div className="flex h-full flex-col">
        <textarea
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          className="m-6 min-h-[400px] flex-1 rounded-[8px] border border-[#7c3aed] bg-white p-4 font-mono text-sm leading-[1.5] focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/20 dark:bg-[#0b0f14] dark:text-[#f9fafb]"
        />
        <div className="flex justify-end gap-2 border-t border-[#e5e7eb] px-6 py-3 dark:border-[#1f2937]">
          <button
            onClick={cancelEdit}
            className="rounded-[8px] border border-[#e5e7eb] px-3 py-1.5 text-sm text-[#6b7280] hover:bg-[#f3f4f6] dark:border-[#1f2937] dark:hover:bg-[#1f2937]"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={saveEdit}
            className="rounded-[8px] bg-[#7c3aed] px-4 py-1.5 text-sm font-medium text-white hover:bg-[#6d28d9] focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/40"
          >
            {t('ai.brief.saveEdit')}
          </button>
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────
  // STREAMING + READY STATES — same panel; content is either typewritten
  // buffer (streaming) or the persisted brief (ready).
  // ──────────────────────────────────────────────────────────────────────
  const contentToRender = streaming ? streamingBuffer : existingBrief;

  return (
    <div className="flex h-full flex-col">
      {/* Sticky action row — visible only in READY state */}
      {!streaming && existingBrief && (
        <div className="sticky top-0 z-10 flex justify-end gap-2 border-b border-[#e5e7eb] bg-white px-6 py-2 dark:border-[#1f2937] dark:bg-[#111827]">
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-1 rounded-[8px] border border-[#e5e7eb] px-3 py-1.5 text-xs font-medium text-[#6b7280] hover:border-[#7c3aed] hover:text-[#7c3aed] dark:border-[#1f2937]"
          >
            <Pencil size={14} />
            {t('common.edit')}
          </button>
          <button
            onClick={() => hasKey && onGeneratingChange(true)}
            disabled={!hasKey}
            className="flex items-center gap-1 rounded-[8px] border border-[#e5e7eb] px-3 py-1.5 text-xs font-medium text-[#6b7280] hover:border-[#7c3aed] hover:text-[#7c3aed] disabled:opacity-50 dark:border-[#1f2937]"
          >
            <RefreshCw size={14} />
            {t('ai.brief.regenerate')}
          </button>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="mx-6 mt-4 rounded-[8px] border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-500">
          {error}
        </div>
      )}

      {/* Content area — streaming or rendered markdown */}
      <div
        className="flex-1 overflow-y-auto p-6 text-[#111827] dark:text-[#f9fafb]"
        aria-live="polite"
      >
        <AiMarkdown source={contentToRender} />
        {streaming && (
          <span className="ml-0.5 inline-block animate-pulse text-[#7c3aed] dark:text-[#a78bfa]">
            ▎
          </span>
        )}
      </div>
    </div>
  );
}
