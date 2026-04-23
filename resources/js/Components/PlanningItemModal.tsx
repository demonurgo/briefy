// (c) 2026 Briefy contributors — AGPL-3.0
import { useState } from 'react';
import { router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { Calendar, Check, RefreshCw, X } from 'lucide-react';
import { AiIcon } from '@/Components/AiIcon';
import type { Suggestion } from '@/Components/PlanningCard';

interface Props {
  suggestion: Suggestion;
  onClose: () => void;
  onLocalUpdate: (next: Suggestion) => void;
}

const CHANNEL_COLORS: Record<string, string> = {
  instagram: 'bg-[#e9d5ff] text-[#7c3aed]',
  linkedin:  'bg-[#dbeafe] text-[#1d4ed8]',
  tiktok:    'bg-[#fce7f3] text-[#be185d]',
  facebook:  'bg-[#dbeafe] text-[#1e40af]',
  youtube:   'bg-[#fee2e2] text-[#dc2626]',
  email:     'bg-[#d1fae5] text-[#065f46]',
  blog:      'bg-[#fef3c7] text-[#92400e]',
};

function getCsrf(): string {
  return (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '';
}

export function PlanningItemModal({ suggestion, onClose, onLocalUpdate }: Props) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<'details' | 'redesign'>('details');
  const [feedback, setFeedback] = useState('');
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<'reject' | null>(null);

  const { id, date, title, description, channel, status } = suggestion;

  const rawDate = date.includes('T') ? date : date + 'T12:00:00';
  const dateObj = new Date(rawDate);
  const dateLabel = isNaN(dateObj.getTime())
    ? date
    : dateObj.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

  const channelColor = channel ? (CHANNEL_COLORS[channel] ?? 'bg-[#f3f4f6] text-[#6b7280]') : '';

  const handleConvert = () => {
    router.post(route('planning-suggestions.convert', id), {}, {
      preserveScroll: true,
      onSuccess: () => { onLocalUpdate({ ...suggestion, status: 'accepted' }); onClose(); },
    });
  };

  const handleReject = () => {
    if (confirming !== 'reject') { setConfirming('reject'); return; }
    router.post(route('planning-suggestions.reject', id), {}, {
      preserveScroll: true,
      onSuccess: () => { onLocalUpdate({ ...suggestion, status: 'rejected' }); onClose(); },
    });
  };

  const handleRedesign = async () => {
    if (!feedback.trim()) { setError('Descreva o que deseja mudar.'); return; }
    setError(null);
    setApplying(true);
    try {
      const res = await fetch(route('planning-suggestions.redesign', id), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': getCsrf(), 'X-Requested-With': 'XMLHttpRequest' },
        credentials: 'same-origin',
        body: JSON.stringify({ feedback }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        onLocalUpdate({ ...suggestion, ...data.suggestion });
        setFeedback('');
        setTab('details');
      } else {
        setError(data.message ?? t('planning.convertError'));
      }
    } catch {
      setError(t('planning.convertError'));
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="relative w-full max-w-lg rounded-[16px] bg-white dark:bg-[#111827] shadow-2xl flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 p-5 border-b border-[#e5e7eb] dark:border-[#1f2937]">
          <div className="flex flex-col gap-1.5 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {channel && (
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${channelColor}`}>
                  {channel}
                </span>
              )}
              {status === 'accepted' && (
                <span className="rounded-full bg-[#d1fae5] px-2.5 py-0.5 text-[11px] font-semibold text-[#065f46]">
                  ✓ Convertida
                </span>
              )}
            </div>
            <h2 className="text-base font-semibold text-[#111827] dark:text-[#f9fafb] leading-snug">{title}</h2>
            <div className="flex items-center gap-1.5 text-xs text-[#9ca3af]">
              <Calendar size={12} />
              <span className="capitalize">{dateLabel}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-[8px] p-1.5 text-[#9ca3af] hover:bg-[#f3f4f6] dark:hover:bg-[#1f2937] hover:text-[#111827] dark:hover:text-[#f9fafb]"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tabs — only show when pending */}
        {status === 'pending' && (
          <div className="flex border-b border-[#e5e7eb] dark:border-[#1f2937] px-5">
            {(['details', 'redesign'] as const).map(t2 => (
              <button
                key={t2}
                onClick={() => { setTab(t2); setError(null); }}
                className={`py-2.5 px-3 text-sm font-medium border-b-2 transition-colors ${
                  tab === t2
                    ? 'border-[#7c3aed] text-[#7c3aed]'
                    : 'border-transparent text-[#9ca3af] hover:text-[#6b7280]'
                }`}
              >
                {t2 === 'details' ? 'Detalhes' : '✨ Redesenhar'}
              </button>
            ))}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {tab === 'details' && (
            <p className="text-sm leading-relaxed text-[#374151] dark:text-[#d1d5db] whitespace-pre-wrap">
              {description}
            </p>
          )}

          {tab === 'redesign' && (
            <div className="space-y-3">
              <p className="text-xs text-[#6b7280]">
                Descreva o que deve mudar — tom, tema, canal, abordagem. A IA vai reescrever o item.
              </p>
              <textarea
                value={feedback}
                onChange={e => setFeedback(e.target.value)}
                placeholder="Ex: tornar mais emocional, focar em família, usar formato carrossel..."
                className="w-full resize-none rounded-[10px] border border-[#e5e7eb] dark:border-[#1f2937] bg-white dark:bg-[#0b0f14] px-4 py-3 text-sm min-h-[120px] text-[#111827] dark:text-[#f9fafb] placeholder-[#9ca3af] focus:border-[#7c3aed] focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/20"
                autoFocus
              />
              {error && <p className="text-xs text-red-500">{error}</p>}
            </div>
          )}
        </div>

        {/* Footer actions */}
        {status === 'pending' && (
          <div className="flex items-center gap-2 p-5 border-t border-[#e5e7eb] dark:border-[#1f2937]">
            {tab === 'details' ? (
              <>
                <button
                  onClick={handleConvert}
                  className="flex-1 flex items-center justify-center gap-2 rounded-[10px] bg-[#7c3aed] hover:bg-[#6d28d9] px-4 py-2.5 text-sm font-semibold text-white transition-colors"
                >
                  <Check size={15} />
                  Converter em demanda
                </button>
                <button
                  onClick={handleReject}
                  className={`rounded-[10px] px-4 py-2.5 text-sm font-medium transition-colors ${
                    confirming === 'reject'
                      ? 'bg-red-500 text-white hover:bg-red-600'
                      : 'border border-[#e5e7eb] dark:border-[#1f2937] text-[#6b7280] hover:border-red-400 hover:text-red-500'
                  }`}
                >
                  {confirming === 'reject' ? 'Confirmar rejeição' : 'Rejeitar'}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => { setTab('details'); setFeedback(''); setError(null); }}
                  disabled={applying}
                  className="rounded-[10px] border border-[#e5e7eb] dark:border-[#1f2937] px-4 py-2.5 text-sm text-[#6b7280] hover:border-[#7c3aed] hover:text-[#7c3aed] disabled:opacity-50 transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleRedesign}
                  disabled={applying || !feedback.trim()}
                  className="flex-1 flex items-center justify-center gap-2 rounded-[10px] bg-[#7c3aed] hover:bg-[#6d28d9] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60 transition-colors"
                >
                  {applying ? <AiIcon size={14} variant="dark" spinning /> : <RefreshCw size={14} />}
                  {applying ? 'Redesenhando...' : 'Aplicar redesign'}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
