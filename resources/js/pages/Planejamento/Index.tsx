// (c) 2026 Briefy contributors — AGPL-3.0
import { useEffect, useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import AppLayout from '@/Layouts/AppLayout';
import { AiIcon } from '@/Components/AiIcon';
import type { PageProps } from '@/types';
import { PlanningCard, Suggestion } from '@/Components/PlanningCard';
import { PlanningItemModal } from '@/Components/PlanningItemModal';
import { CostConfirmModal } from '@/Components/CostConfirmModal';
import emptyLight from '@/assets/empty-state-light.svg';
import emptyDark from '@/assets/empty-state-dark.svg';

interface PlanningDemand {
  id: number;
  title: string;
  client: { id: number; name: string };
  created_at: string;
  planning_suggestions: Suggestion[];
  ai_analysis: { status?: string; target_year?: number; target_month?: number } | null;
}

interface ClientLite {
  id: number;
  name: string;
  monthly_posts: number | null;
  monthly_plan_notes: string | null;
}

interface TeamMember { id: number; name: string; }

interface Props {
  plannings: PlanningDemand[];
  clients: ClientLite[];
  filters: { client_id?: string };
  teamMembers: TeamMember[];
}

// Returns the next month in YYYY-MM format
function nextMonthDefault(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// Group by the actual target month (first suggestion date, or ai_analysis.target_month, or created_at)
function getPlanningMonthLabel(p: PlanningDemand): string {
  // Prefer suggestion dates (most reliable)
  if (p.planning_suggestions.length > 0) {
    const raw = p.planning_suggestions[0].date;
    const d = new Date(raw.includes('T') ? raw : raw + 'T12:00:00');
    return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  }
  // Fallback: target month stored in ai_analysis
  const ty = p.ai_analysis?.target_year;
  const tm = p.ai_analysis?.target_month;
  if (ty && tm) {
    return new Date(ty as number, (tm as number) - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  }
  // Last resort: created_at
  return new Date(p.created_at).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

function groupByMonth(plannings: PlanningDemand[]): Array<{ label: string; items: PlanningDemand[] }> {
  const map = new Map<string, PlanningDemand[]>();
  for (const p of plannings) {
    const label = getPlanningMonthLabel(p);
    if (!map.has(label)) map.set(label, []);
    map.get(label)!.push(p);
  }
  return Array.from(map.entries()).map(([label, items]) => ({ label, items }));
}

export default function PlanejamentoIndex({ plannings, clients, filters, teamMembers }: Props) {
  const { t } = useTranslation();
  const { auth } = usePage<PageProps>().props;
  const hasKey = auth?.organization?.has_anthropic_key ?? false;

  // --- Detail modal state ---
  const [detailItem, setDetailItem] = useState<import('@/Components/PlanningCard').Suggestion | null>(null);

  // --- Regenerate / discard planning state ---
  const [regenerateTarget, setRegenerateTarget] = useState<PlanningDemand | null>(null);
  const [regenerateInstructions, setRegenerateInstructions] = useState('');
  const [confirmDeletePlan, setConfirmDeletePlan] = useState<number | null>(null);

  // --- Selection state ---
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkAssignedTo, setBulkAssignedTo] = useState<string>('');
  const toggleSelect = (id: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // --- Local suggestion updates (redesign in-place) ---
  const [localSuggestions, setLocalSuggestions] = useState<Record<number, Suggestion>>({});
  const handleLocalUpdate = (next: Suggestion) => {
    setLocalSuggestions(prev => ({ ...prev, [next.id]: next }));
  };
  const resolveSuggestion = (s: Suggestion): Suggestion => localSuggestions[s.id] ?? s;

  // --- Auto-poll while any demand is generating ---
  const hasGenerating = plannings.some(p => p.ai_analysis?.status === 'generating');
  useEffect(() => {
    if (!hasGenerating) return;
    const id = setInterval(() => router.reload({ only: ['plannings'] }), 5000);
    return () => clearInterval(id);
  }, [hasGenerating]);

  // --- Generation modal state ---
  const [generateOpen, setGenerateOpen] = useState(false);
  const [genClientId, setGenClientId] = useState<string>(filters.client_id ?? (clients[0]?.id?.toString() ?? ''));
  const [genMonth, setGenMonth] = useState<string>(nextMonthDefault());
  const [genInstructions, setGenInstructions] = useState('');
  const [generating, setGenerating] = useState(false);
  const [costOpen, setCostOpen] = useState(false);
  const [estimatedCost, setEstimatedCost] = useState<number>(0);

  const selectedClient = clients.find(c => String(c.id) === genClientId) ?? null;
  const hasNoQuota = selectedClient && selectedClient.monthly_posts === null;

  const openGenerateModal = () => {
    if (filters.client_id) setGenClientId(filters.client_id);
    setGenerateOpen(true);
  };

  const actuallyGenerate = () => {
    setGenerating(true);
    const [year, month] = genMonth.split('-');
    router.post(
      route('planejamento.generate'),
      { client_id: genClientId, year: Number(year), month: Number(month), instructions: genInstructions || null },
      {
        preserveScroll: true,
        onFinish: () => {
          setGenerating(false);
          setGenerateOpen(false);
          setCostOpen(false);
        },
      },
    );
  };

  const handleGenerateClick = async () => {
    if (!genClientId || hasNoQuota) return;
    try {
      const url = new URL(route('planejamento.estimate-cost'), window.location.origin);
      url.searchParams.set('client_id', genClientId);
      const res = await fetch(url.toString(), {
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
        credentials: 'same-origin',
      });
      const data = await res.json();
      if (data.confirm_required) {
        setEstimatedCost(data.cost_usd ?? 0);
        setCostOpen(true);
      } else {
        actuallyGenerate();
      }
    } catch {
      // Fallback: generate without cost check
      actuallyGenerate();
    }
  };

  const groups = groupByMonth(plannings);

  return (
    <AppLayout>
      <Head title={t('planning.title')} />

      {/* Sticky page header */}
      <div className="sticky top-0 z-10 -mx-6 -mt-6 mb-6 flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-[#e5e7eb] dark:border-[#1f2937] bg-white dark:bg-[#111827] px-6 py-3">
        <h1 className="text-lg font-semibold text-[#111827] dark:text-[#f9fafb] shrink-0">
          {t('planning.title')}
        </h1>

        {/* Spacer — pushes generate CTA to the right on desktop */}
        <div className="hidden sm:block flex-1" />

        {/* Generate CTA — always on first row */}
        <div className="relative group ml-auto sm:ml-0 shrink-0">
          <button
            onClick={hasKey ? openGenerateModal : undefined}
            disabled={!hasKey}
            title={!hasKey ? t('settings.ai.status.missing') : undefined}
            className="flex items-center gap-2 rounded-[8px] bg-[#7c3aed] hover:bg-[#6d28d9] px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <AiIcon size={16} variant="dark" />
            {t('planning.generate')}
          </button>
          {!hasKey && (
            <div className="pointer-events-none absolute right-0 top-full mt-1 hidden group-hover:block z-50 w-64 rounded-[8px] bg-[#111827] px-3 py-2 text-xs text-[#f9fafb] shadow-lg">
              Configure sua chave Anthropic em Configurações → IA
            </div>
          )}
        </div>

        {/* Client filter — full width on mobile (wraps to second row), auto on desktop */}
        <select
          value={filters.client_id ?? ''}
          onChange={e => {
            const client_id = e.target.value || undefined;
            router.get(route('planejamento.index'), { client_id }, { preserveState: true, replace: true });
          }}
          className="w-full sm:w-auto sm:max-w-[280px] order-last sm:order-none rounded-[8px] border border-[#e5e7eb] bg-white px-3 py-1.5 text-sm text-[#6b7280] focus:border-[#7c3aed] focus:outline-none dark:border-[#1f2937] dark:bg-[#111827] dark:text-[#9ca3af]"
        >
          <option value="">{t('planning.allClients')}</option>
          {clients.map(c => (
            <option key={c.id} value={String(c.id)}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Empty state */}
      {plannings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <img src={emptyLight} alt="" className="mb-4 h-40 dark:hidden" aria-hidden />
          <img src={emptyDark} alt="" className="mb-4 h-40 hidden dark:block" aria-hidden />
          <p className="mt-4 text-base font-semibold text-[#111827] dark:text-[#f9fafb]">
            {filters.client_id
              ? t('planning.empty.noPlans.heading', { clientName: clients.find(c => String(c.id) === filters.client_id)?.name ?? '' })
              : t('planning.empty.noClientSelected.heading')}
          </p>
          <p className="mt-1 text-sm text-[#6b7280] dark:text-[#9ca3af]">
            {filters.client_id
              ? t('planning.empty.noPlans.body')
              : t('planning.empty.noClientSelected.body')}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {groups.map(({ label, items }) => (
            <section key={label}>
              <h2 className="mb-3 text-base font-semibold capitalize text-[#111827] dark:text-[#f9fafb]">
                {label}
              </h2>
              {items.map(planning => (
                <div key={planning.id} className="mb-6">
                  {/* Planning header */}
                  <div className="mb-2 flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-[#6b7280] dark:text-[#9ca3af]">
                      {planning.client.name}
                    </span>
                    {planning.ai_analysis?.status === 'generating' ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#7c3aed]/10 px-2 py-0.5 text-[11px] font-medium text-[#7c3aed]">
                        <AiIcon size={12} variant="dark" spinning />
                        Gerando com IA...
                      </span>
                    ) : (
                      <span className="text-xs text-[#9ca3af] dark:text-[#6b7280]">
                        · {planning.planning_suggestions.length} {planning.planning_suggestions.length === 1 ? 'item' : 'itens'}
                      </span>
                    )}
                    <div className="ml-auto flex items-center gap-1.5">
                      {planning.ai_analysis?.status !== 'generating' && planning.planning_suggestions.length > 0 && (
                        <button
                          onClick={() => { setRegenerateTarget(planning); setRegenerateInstructions(''); }}
                          className="inline-flex items-center gap-1 rounded-[7px] border border-[#e5e7eb] dark:border-[#1f2937] px-2.5 py-1 text-xs text-[#6b7280] hover:border-[#7c3aed] hover:text-[#7c3aed] transition-colors"
                        >
                          <AiIcon size={11} />
                          Descartar e refazer
                        </button>
                      )}
                      <button
                        onClick={() => {
                          if (confirmDeletePlan === planning.id) {
                            router.delete(route('planejamento.destroy', planning.id), { preserveScroll: true });
                            setConfirmDeletePlan(null);
                          } else {
                            setConfirmDeletePlan(planning.id);
                          }
                        }}
                        onBlur={() => setTimeout(() => setConfirmDeletePlan(null), 300)}
                        className={`inline-flex items-center gap-1 rounded-[7px] px-2.5 py-1 text-xs transition-colors ${
                          confirmDeletePlan === planning.id
                            ? 'bg-red-500 text-white hover:bg-red-600'
                            : 'border border-[#e5e7eb] dark:border-[#1f2937] text-[#9ca3af] hover:border-red-400 hover:text-red-500'
                        }`}
                      >
                        {confirmDeletePlan === planning.id ? 'Confirmar exclusão' : '🗑'}
                      </button>
                    </div>
                  </div>
                  {/* Cards grid — 2 per row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {planning.planning_suggestions.map(s => (
                      <PlanningCard
                        key={s.id}
                        suggestion={resolveSuggestion(s)}
                        selected={selected.has(s.id)}
                        onToggleSelect={toggleSelect}
                        onOpen={setDetailItem}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </section>
          ))}
        </div>
      )}

      {/* Generation modal */}
      {generateOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={generating ? undefined : () => setGenerateOpen(false)}
        >
          <div
            className="max-w-md w-full rounded-[16px] bg-white dark:bg-[#111827] p-6 shadow-lg"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="mb-4 flex items-center gap-2">
              <AiIcon size={20} />
              <h2 className="text-base font-semibold text-[#111827] dark:text-[#f9fafb]">
                {t('planning.generateModalTitle')}
              </h2>
            </div>

            <div className="space-y-4">
              {/* Client select */}
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[#9ca3af]">
                  {t('clients.title')}
                </label>
                <select
                  value={genClientId}
                  onChange={e => setGenClientId(e.target.value)}
                  className="w-full rounded-[8px] border border-[#e5e7eb] bg-white dark:bg-[#0b0f14] dark:border-[#1f2937] px-3 py-2 text-sm text-[#111827] dark:text-[#f9fafb] focus:border-[#7c3aed] focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/20"
                >
                  <option value="">{t('planning.filterPlaceholder')}</option>
                  {clients.map(c => (
                    <option key={c.id} value={String(c.id)}>
                      {c.name}{c.monthly_posts ? ` (${c.monthly_posts}/mês)` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Month input */}
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[#9ca3af]">
                  Mês
                </label>
                <input
                  type="month"
                  value={genMonth}
                  onChange={e => setGenMonth(e.target.value)}
                  className="w-full rounded-[8px] border border-[#e5e7eb] bg-white dark:bg-[#0b0f14] dark:border-[#1f2937] px-3 py-2 text-sm text-[#111827] dark:text-[#f9fafb] focus:border-[#7c3aed] focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/20"
                />
              </div>

              {/* Instructions / insights */}
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[#9ca3af]">
                  Instruções para a IA <span className="normal-case font-normal text-[#9ca3af]">(opcional)</span>
                </label>
                <textarea
                  value={genInstructions}
                  onChange={e => setGenInstructions(e.target.value)}
                  placeholder="Ex: Incluir Dia das Mães (11/05), Dia dos Namorados (12/06), evitar temas políticos, focar em educação financeira..."
                  rows={3}
                  className="w-full resize-none rounded-[8px] border border-[#e5e7eb] dark:border-[#1f2937] bg-white dark:bg-[#0b0f14] px-3 py-2 text-sm text-[#111827] dark:text-[#f9fafb] placeholder-[#9ca3af] focus:border-[#7c3aed] focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/20"
                />
              </div>

              {/* No quota warning */}
              {hasNoQuota && (
                <div className="rounded-[8px] border border-[#f59e0b]/30 bg-[#f59e0b]/10 p-3 text-xs text-[#f59e0b]">
                  {t('planning.noQuotaWarning')}
                </div>
              )}
            </div>

            {/* Modal actions */}
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setGenerateOpen(false)}
                disabled={generating}
                className="rounded-[8px] border border-[#e5e7eb] dark:border-[#1f2937] px-4 py-2 text-sm text-[#6b7280] hover:border-[#7c3aed] hover:text-[#7c3aed] disabled:opacity-50 transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleGenerateClick}
                disabled={generating || !genClientId || !!hasNoQuota}
                className="flex items-center gap-2 rounded-[8px] bg-[#7c3aed] hover:bg-[#6d28d9] px-4 py-2 text-sm font-medium text-white disabled:opacity-60 transition-colors"
              >
                {generating && <AiIcon size={12} variant="dark" spinning />}
                {generating ? t('planning.generating') : t('planning.generate')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cost confirm modal */}
      <CostConfirmModal
        open={costOpen}
        costUsd={estimatedCost}
        title={t('planning.generateModalTitle')}
        body={selectedClient?.monthly_posts ? t('planning.costConfirmBody', { count: selectedClient.monthly_posts }) : undefined}
        busy={generating}
        onConfirm={actuallyGenerate}
        onCancel={() => setCostOpen(false)}
      />

      {/* Bulk convert floating bar */}
      {selected.size >= 1 && (
        <div className="fixed bottom-6 right-6 z-40 flex items-center gap-3 rounded-[12px] bg-white dark:bg-[#111827] border border-[#e5e7eb] dark:border-[#1f2937] px-4 py-3 shadow-lg">
          <span className="text-sm text-[#6b7280] dark:text-[#9ca3af]">
            {t('planning.bulkCount', { count: selected.size })}
          </span>
          {teamMembers.length > 0 && (
            <select
              value={bulkAssignedTo}
              onChange={e => setBulkAssignedTo(e.target.value)}
              className="rounded-[8px] border border-[#e5e7eb] dark:border-[#1f2937] bg-white dark:bg-[#0b0f14] px-2 py-1.5 text-sm text-[#6b7280] dark:text-[#9ca3af] focus:border-[#7c3aed] focus:outline-none"
            >
              <option value="">Responsável</option>
              {teamMembers.map(m => (
                <option key={m.id} value={String(m.id)}>{m.name}</option>
              ))}
            </select>
          )}
          <button
            onClick={() =>
              router.post(
                route('planning-suggestions.convertBulk'),
                { ids: Array.from(selected), assigned_to: bulkAssignedTo || null },
                { preserveScroll: true, onSuccess: () => { setSelected(new Set()); setBulkAssignedTo(''); } },
              )
            }
            className="flex items-center gap-1.5 rounded-[8px] bg-[#7c3aed] hover:bg-[#6d28d9] px-3 py-1.5 text-sm font-medium text-white transition-colors"
          >
            {t('planning.bulkConvert', { count: selected.size })}
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="text-[#9ca3af] hover:text-[#6b7280] transition-colors"
            aria-label={t('common.dismiss')}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Regenerate planning modal */}
      {regenerateTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setRegenerateTarget(null)}>
          <div className="w-full max-w-md rounded-[16px] bg-white dark:bg-[#111827] shadow-2xl p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-[#111827] dark:text-[#f9fafb] mb-1">
              Descartar e refazer planejamento
            </h3>
            <p className="text-sm text-[#6b7280] mb-4">
              O planejamento atual de <strong>{regenerateTarget.client.name}</strong> será descartado e gerado novamente. Deixe instruções específicas se quiser (ex: datas comemorativas, temas a incluir/evitar).
            </p>
            <textarea
              value={regenerateInstructions}
              onChange={e => setRegenerateInstructions(e.target.value)}
              placeholder="Ex: Incluir Dia das Mães (11/05), evitar posts sobre concorrentes, focar em educação financeira..."
              className="w-full resize-none rounded-[10px] border border-[#e5e7eb] dark:border-[#1f2937] bg-white dark:bg-[#0b0f14] px-4 py-3 text-sm min-h-[100px] text-[#111827] dark:text-[#f9fafb] placeholder-[#9ca3af] focus:border-[#7c3aed] focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/20"
              autoFocus
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setRegenerateTarget(null)}
                className="flex-1 rounded-[10px] border border-[#e5e7eb] dark:border-[#1f2937] py-2 text-sm text-[#6b7280] hover:border-[#7c3aed] hover:text-[#7c3aed] transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  router.post(
                    route('planejamento.regenerate', regenerateTarget.id),
                    { instructions: regenerateInstructions || null },
                    { preserveScroll: true, onSuccess: () => setRegenerateTarget(null) }
                  );
                }}
                className="flex-1 flex items-center justify-center gap-2 rounded-[10px] bg-[#7c3aed] hover:bg-[#6d28d9] py-2 text-sm font-semibold text-white transition-colors"
              >
                <AiIcon size={14} variant="dark" />
                Refazer planejamento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Planning item detail modal */}
      {detailItem && (
        <PlanningItemModal
          suggestion={detailItem}
          teamMembers={teamMembers}
          onClose={() => setDetailItem(null)}
          onLocalUpdate={(next) => { handleLocalUpdate(next); setDetailItem(next); }}
        />
      )}
    </AppLayout>
  );
}
