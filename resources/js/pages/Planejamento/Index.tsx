// (c) 2026 Briefy contributors — AGPL-3.0
import { useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import AppLayout from '@/Layouts/AppLayout';
import { AiIcon } from '@/Components/AiIcon';
import { PlanningCard, Suggestion } from '@/Components/PlanningCard';
import { CostConfirmModal } from '@/Components/CostConfirmModal';

interface PlanningDemand {
  id: number;
  title: string;
  client: { id: number; name: string };
  created_at: string;
  planning_suggestions: Suggestion[];
}

interface ClientLite {
  id: number;
  name: string;
  monthly_posts: number | null;
  monthly_plan_notes: string | null;
}

interface Props {
  plannings: PlanningDemand[];
  clients: ClientLite[];
  filters: { client_id?: string };
}

// Returns the next month in YYYY-MM format
function nextMonthDefault(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// Group plannings by month label
function groupByMonth(plannings: PlanningDemand[]): Array<{ label: string; items: PlanningDemand[] }> {
  const map = new Map<string, PlanningDemand[]>();
  for (const p of plannings) {
    const label = new Date(p.created_at).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    if (!map.has(label)) map.set(label, []);
    map.get(label)!.push(p);
  }
  return Array.from(map.entries()).map(([label, items]) => ({ label, items }));
}

export default function PlanejamentoIndex({ plannings, clients, filters }: Props) {
  const { t } = useTranslation();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { auth } = usePage().props as any;
  const hasKey = (auth?.user?.organization?.has_anthropic_key as boolean) ?? false;

  // --- Selection state ---
  const [selected, setSelected] = useState<Set<number>>(new Set());
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

  // --- Generation modal state ---
  const [generateOpen, setGenerateOpen] = useState(false);
  const [genClientId, setGenClientId] = useState<string>(filters.client_id ?? (clients[0]?.id?.toString() ?? ''));
  const [genMonth, setGenMonth] = useState<string>(nextMonthDefault());
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
      { client_id: genClientId, year: Number(year), month: Number(month) },
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
    <AppLayout title={t('planning.title')}>
      <Head title={t('planning.title')} />

      {/* Sticky page header */}
      <div className="sticky top-0 z-10 -mx-6 -mt-6 mb-6 flex items-center gap-3 border-b border-[#e5e7eb] dark:border-[#1f2937] bg-white dark:bg-[#111827] px-6 py-3">
        <h1 className="text-lg font-semibold text-[#111827] dark:text-[#f9fafb] shrink-0">
          {t('planning.title')}
        </h1>

        {/* Client filter */}
        <select
          value={filters.client_id ?? ''}
          onChange={e => {
            const client_id = e.target.value || undefined;
            router.get(route('planejamento.index'), { client_id }, { preserveState: true, replace: true });
          }}
          className="max-w-[280px] rounded-[8px] border border-[#e5e7eb] bg-white px-3 py-1.5 text-sm text-[#6b7280] focus:border-[#7c3aed] focus:outline-none dark:border-[#1f2937] dark:bg-[#111827] dark:text-[#9ca3af]"
        >
          <option value="">{t('planning.allClients')}</option>
          {clients.map(c => (
            <option key={c.id} value={String(c.id)}>{c.name}</option>
          ))}
        </select>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Generate CTA */}
        <div className="relative group">
          <button
            onClick={hasKey ? openGenerateModal : undefined}
            disabled={!hasKey}
            title={!hasKey ? t('settings.ai.status.missing') : undefined}
            className="flex items-center gap-2 rounded-[8px] bg-[#7c3aed] hover:bg-[#6d28d9] px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <AiIcon size={16} />
            {t('planning.generate')}
          </button>
          {!hasKey && (
            <div className="pointer-events-none absolute right-0 top-full mt-1 hidden group-hover:block z-50 w-64 rounded-[8px] bg-[#111827] px-3 py-2 text-xs text-[#f9fafb] shadow-lg">
              Configure sua chave Anthropic em Configurações → IA
            </div>
          )}
        </div>
      </div>

      {/* Empty state */}
      {plannings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <AiIcon size={64} />
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
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-sm font-medium text-[#6b7280] dark:text-[#9ca3af]">
                      {planning.client.name}
                    </span>
                    <span className="text-xs text-[#9ca3af] dark:text-[#6b7280]">
                      · {planning.planning_suggestions.length} {planning.planning_suggestions.length === 1 ? 'item' : 'itens'}
                    </span>
                  </div>
                  {/* Cards grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {planning.planning_suggestions.map(s => (
                      <PlanningCard
                        key={s.id}
                        suggestion={resolveSuggestion(s)}
                        selected={selected.has(s.id)}
                        onToggleSelect={toggleSelect}
                        onLocalUpdate={handleLocalUpdate}
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
                {generating && <AiIcon size={12} spinning />}
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
          <button
            onClick={() =>
              router.post(
                route('planning-suggestions.convertBulk'),
                { ids: Array.from(selected) },
                { preserveScroll: true, onSuccess: () => setSelected(new Set()) },
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
    </AppLayout>
  );
}
