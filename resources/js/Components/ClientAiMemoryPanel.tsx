// (c) 2026 Briefy contributors — AGPL-3.0
import { useState } from 'react';
import { router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { AiIcon } from '@/Components/AiIcon';

interface MemoryEntry {
  id: number;
  category: 'tone' | 'patterns' | 'preferences' | 'avoid' | 'terminology';
  insight: string;
  confidence: number;
  source: string;
  status: 'active' | 'suggested' | 'dismissed' | null;
}

interface Props {
  /** All memory entries for this client (active + suggested). Dismissed are excluded server-side. */
  entries: MemoryEntry[];
  /** Whether we are inside a read-only view (hides approve/dismiss actions). */
  readOnly?: boolean;
}

const CATEGORY_LABELS: Record<MemoryEntry['category'], string> = {
  tone: 'Tom',
  patterns: 'Padrões',
  preferences: 'Preferências',
  avoid: 'Evitar',
  terminology: 'Terminologia',
};

const CATEGORY_COLORS: Record<MemoryEntry['category'], string> = {
  tone:        'bg-[#7c3aed]/10 text-[#7c3aed]',
  patterns:    'bg-[#0891b2]/10 text-[#0891b2]',
  preferences: 'bg-[#059669]/10 text-[#059669]',
  avoid:       'bg-red-500/10 text-red-500',
  terminology: 'bg-[#d97706]/10 text-[#d97706]',
};

/**
 * Displays client AI memory insights in two tabs:
 *   Active   — confirmed insights (status='active' or null)
 *   Sugestões — low-confidence insights awaiting user review (status='suggested', D-38)
 *
 * The Sugestões tab shows a confidence chip and Aprovar / Descartar actions
 * that call the approve/dismiss endpoints wired in ClientAiMemoryController.
 */
export function ClientAiMemoryPanel({ entries, readOnly = false }: Props) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'active' | 'suggested'>('active');
  // Optimistic removal: IDs that have been acted on but not yet refreshed by Inertia.
  const [actedIds, setActedIds] = useState<Set<number>>(new Set());

  const activeEntries    = entries.filter(e => (e.status === 'active' || e.status == null) && !actedIds.has(e.id));
  const suggestedEntries = entries.filter(e => e.status === 'suggested' && !actedIds.has(e.id));
  const suggestedCount   = suggestedEntries.length;

  const handleApprove = (memory: MemoryEntry) => {
    setActedIds(prev => new Set([...prev, memory.id]));
    router.post(
      route('client-ai-memory.approve', memory.id),
      {},
      { preserveScroll: true }
    );
  };

  const handleDismiss = (memory: MemoryEntry) => {
    setActedIds(prev => new Set([...prev, memory.id]));
    router.post(
      route('client-ai-memory.dismiss', memory.id),
      {},
      { preserveScroll: true }
    );
  };

  return (
    <div className="w-full">
      {/* Tab switcher */}
      <div className="mb-4 flex items-center gap-3 border-b border-[#e5e7eb] dark:border-[#1f2937]">
        <button
          onClick={() => setActiveTab('active')}
          className={`pb-2 text-sm font-medium transition-colors ${
            activeTab === 'active'
              ? 'border-b-2 border-[#7c3aed] text-[#7c3aed]'
              : 'text-[#6b7280] hover:text-[#111827] dark:hover:text-[#f9fafb]'
          }`}
        >
          Memória ativa
          {activeEntries.length > 0 && (
            <span className="ml-1.5 rounded-full bg-[#7c3aed]/10 px-1.5 py-0.5 text-[10px] font-medium text-[#7c3aed]">
              {activeEntries.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('suggested')}
          className={`pb-2 text-sm font-medium transition-colors ${
            activeTab === 'suggested'
              ? 'border-b-2 border-[#f59e0b] text-[#b45309]'
              : 'text-[#6b7280] hover:text-[#111827] dark:hover:text-[#f9fafb]'
          }`}
        >
          Sugestões
          {suggestedCount > 0 && (
            <span className="ml-1.5 rounded-full bg-[#f59e0b]/10 px-1.5 py-0.5 text-[10px] font-medium text-[#b45309]">
              {suggestedCount}
            </span>
          )}
        </button>
      </div>

      {/* Active tab */}
      {activeTab === 'active' && (
        <div className="space-y-2">
          {activeEntries.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center">
              <AiIcon size={32} className="mb-3 opacity-40" />
              <p className="text-sm text-[#6b7280]">Nenhuma memória ativa ainda.</p>
              <p className="mt-1 text-xs text-[#9ca3af]">
                A memória é populada pelo Chat IA e pela pesquisa automática do cliente.
              </p>
            </div>
          ) : (
            activeEntries.map(entry => (
              <div
                key={entry.id}
                className="rounded-[8px] border border-[#e5e7eb] px-3 py-2.5 dark:border-[#1f2937]"
              >
                <div className="flex items-start gap-2">
                  <span className={`mt-0.5 rounded-full px-2 py-0.5 text-[10px] font-medium shrink-0 ${CATEGORY_COLORS[entry.category]}`}>
                    {CATEGORY_LABELS[entry.category]}
                  </span>
                  <p className="text-sm text-[#111827] dark:text-[#f9fafb]">{entry.insight}</p>
                </div>
                <p className="mt-1 text-[10px] text-[#9ca3af]">
                  confiança: {Math.round(entry.confidence * 100)}% · {entry.source}
                </p>
              </div>
            ))
          )}
        </div>
      )}

      {/* Sugestões tab — D-38 (WARNING 7 revision): low-confidence insights pending user review */}
      {activeTab === 'suggested' && (
        <div className="space-y-2">
          {suggestedEntries.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-[#6b7280]">Nenhuma sugestão pendente.</p>
            </div>
          ) : (
            <>
              <p className="mb-3 text-xs text-[#6b7280]">
                Esses insights têm confiança baixa (&lt;60%) e precisam da sua revisão antes de serem aplicados.
              </p>
              {suggestedEntries.map(entry => (
                <div
                  key={entry.id}
                  className="rounded-[8px] border border-[#f59e0b]/30 bg-[#fffbeb] px-3 py-2.5 opacity-90 dark:border-[#f59e0b]/20 dark:bg-[#1c1a0a]"
                >
                  <div className="flex items-start gap-2">
                    <span className={`mt-0.5 rounded-full px-2 py-0.5 text-[10px] font-medium shrink-0 ${CATEGORY_COLORS[entry.category]}`}>
                      {CATEGORY_LABELS[entry.category]}
                    </span>
                    <p className="text-sm text-[#111827] dark:text-[#f9fafb]">{entry.insight}</p>
                  </div>
                  {/* Confidence chip */}
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <span className="rounded-full bg-[#f59e0b]/10 px-2 py-0.5 text-[10px] font-medium text-[#b45309]">
                      confiança: {entry.confidence.toFixed(2)}
                    </span>
                    {!readOnly && (
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => handleApprove(entry)}
                          className="rounded-[6px] border border-[#10b981] px-2 py-0.5 text-[10px] font-medium text-[#10b981] hover:bg-[#10b981]/10 transition-colors"
                        >
                          Aprovar
                        </button>
                        <button
                          onClick={() => handleDismiss(entry)}
                          className="rounded-[6px] border border-red-400 px-2 py-0.5 text-[10px] font-medium text-red-400 hover:bg-red-400/10 transition-colors"
                        >
                          Descartar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
