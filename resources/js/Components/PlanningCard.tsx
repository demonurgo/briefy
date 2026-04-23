// (c) 2026 Briefy contributors — AGPL-3.0
import { useState } from 'react';
import { router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { Check, RefreshCw, X } from 'lucide-react';
import { AiIcon } from '@/Components/AiIcon';

export interface Suggestion {
  id: number;
  date: string;
  title: string;
  description: string;
  channel?: string;
  status: 'pending' | 'accepted' | 'rejected';
  converted_demand_id?: number | null;
}

interface PlanningCardProps {
  suggestion: Suggestion;
  selected: boolean;
  onToggleSelect: (id: number) => void;
  onLocalUpdate?: (next: Suggestion) => void;
}

function getCsrfToken(): string {
  return (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '';
}

export function PlanningCard({ suggestion, selected, onToggleSelect, onLocalUpdate }: PlanningCardProps) {
  const { t } = useTranslation();
  const [redesigning, setRedesigning] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [applying, setApplying] = useState(false);
  const [redesignError, setRedesignError] = useState<string | null>(null);

  const { id, date, title, description, channel, status } = suggestion;

  const dateLabel = new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

  // --- container class based on status ---
  const containerClass = [
    'relative rounded-[12px] border p-4 transition-all',
    status === 'accepted'
      ? 'border-[#10b981]/40 bg-white dark:bg-[#111827]'
      : status === 'rejected'
        ? 'border-[#e5e7eb] dark:border-[#1f2937] bg-white dark:bg-[#111827] opacity-50'
        : selected
          ? 'border-[#7c3aed] ring-2 ring-[#7c3aed] bg-white dark:bg-[#111827] hover:border-[#7c3aed]/40'
          : 'border-[#e5e7eb] dark:border-[#1f2937] bg-white dark:bg-[#111827] hover:border-[#7c3aed]/40',
  ].join(' ');

  const handleApplyRedesign = async () => {
    if (!feedback.trim()) {
      setRedesignError(t('planning.redesignEmpty'));
      return;
    }
    setRedesignError(null);
    setApplying(true);
    try {
      const res = await fetch(route('planning-suggestions.redesign', id), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': getCsrfToken(),
          'X-Requested-With': 'XMLHttpRequest',
        },
        credentials: 'same-origin',
        body: JSON.stringify({ feedback }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        onLocalUpdate?.({ ...suggestion, ...data.suggestion });
        setRedesigning(false);
        setFeedback('');
      } else {
        setRedesignError(data.message ?? t('planning.convertError'));
      }
    } catch {
      setRedesignError(t('planning.convertError'));
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className={containerClass}>
      {/* Accepted checkmark top-right */}
      {status === 'accepted' && (
        <span className="absolute right-3 top-3 text-[#10b981]">
          <Check size={14} />
        </span>
      )}

      {/* Top row: checkbox + date chip */}
      <div className="flex items-center justify-between">
        <input
          type="checkbox"
          className="h-4 w-4 accent-[#7c3aed]"
          checked={selected}
          onChange={() => onToggleSelect(id)}
          disabled={status !== 'pending'}
          aria-label={title}
        />
        <span className="text-[11px] text-[#9ca3af]">{dateLabel}</span>
      </div>

      {/* Title */}
      <p className={`mt-2 text-sm font-semibold line-clamp-2 text-[#111827] dark:text-[#f9fafb] ${status === 'rejected' ? 'line-through' : ''}`}>
        {title}
      </p>

      {/* Channel chip */}
      {channel && (
        <span className="mt-2 inline-flex rounded-full bg-[#f3f4f6] dark:bg-[#1f2937] px-2 py-0.5 text-[11px] font-medium capitalize text-[#6b7280] dark:text-[#9ca3af]">
          {channel}
        </span>
      )}

      {/* Description */}
      <p className="mt-2 line-clamp-3 text-xs text-[#6b7280] dark:text-[#9ca3af]">
        {description}
      </p>

      {/* Action row — only when pending and not redesigning */}
      {status === 'pending' && !redesigning && (
        <div className="mt-3 flex items-center gap-1.5 border-t border-[#e5e7eb] dark:border-[#1f2937] pt-3">
          {/* Converter */}
          <button
            onClick={() => router.post(route('planning-suggestions.convert', id), {}, { preserveScroll: true })}
            className="flex items-center gap-1 rounded-[8px] border border-[#7c3aed] px-2 py-1 text-xs text-[#7c3aed] hover:bg-[#7c3aed]/10 transition-colors"
          >
            <Check size={13} />
            {t('planning.convert')}
          </button>

          {/* Rejeitar */}
          <button
            onClick={() => router.post(route('planning-suggestions.reject', id), {}, { preserveScroll: true })}
            className="flex items-center gap-1 rounded-[8px] border border-[#e5e7eb] dark:border-[#1f2937] px-2 py-1 text-xs text-[#9ca3af] hover:border-red-400 hover:text-red-500 transition-colors"
          >
            <X size={13} />
            {t('planning.reject')}
          </button>

          {/* Redesenhar */}
          <button
            onClick={() => setRedesigning(true)}
            className="flex items-center gap-1 rounded-[8px] border border-[#e5e7eb] dark:border-[#1f2937] px-2 py-1 text-xs text-[#6b7280] hover:border-[#7c3aed] hover:text-[#7c3aed] transition-colors"
          >
            <RefreshCw size={13} />
            {t('planning.redesign')}
          </button>
        </div>
      )}

      {/* Redesign inline state */}
      {redesigning && (
        <div className="mt-3 border-t border-[#e5e7eb] dark:border-[#1f2937] pt-3">
          <textarea
            value={feedback}
            onChange={e => setFeedback(e.target.value)}
            placeholder={t('planning.redesignPlaceholder')}
            className="w-full resize-none rounded-[8px] border border-[#7c3aed] bg-white dark:bg-[#0b0f14] px-3 py-2 text-sm min-h-[80px] text-[#111827] dark:text-[#f9fafb] placeholder-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/20"
          />
          {redesignError && (
            <p className="mt-1 text-xs text-red-500">{redesignError}</p>
          )}
          <div className="mt-2 flex items-center justify-end gap-2">
            <button
              onClick={() => { setRedesigning(false); setFeedback(''); setRedesignError(null); }}
              disabled={applying}
              className="rounded-[8px] border border-[#e5e7eb] dark:border-[#1f2937] px-3 py-1 text-xs text-[#6b7280] hover:border-[#7c3aed] hover:text-[#7c3aed] disabled:opacity-50 transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleApplyRedesign}
              disabled={applying}
              className="flex items-center gap-1 rounded-[8px] bg-[#7c3aed] hover:bg-[#6d28d9] px-3 py-1 text-xs font-medium text-white disabled:opacity-60 transition-colors"
            >
              {applying && <AiIcon size={12} variant="dark" spinning />}
              {applying ? t('planning.applyingRedesign') : t('planning.applyRedesign')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
