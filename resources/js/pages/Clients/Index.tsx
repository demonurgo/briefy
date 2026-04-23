// (c) 2026 Briefy contributors — AGPL-3.0
import { useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { Archive, Brain, Calendar, MessageSquare, Plus, Search, Trash2 } from 'lucide-react';
import AppLayout from '@/Layouts/AppLayout';
import { ClientAvatar } from '@/Components/ClientAvatar';
import { AiIcon } from '@/Components/AiIcon';
import { CostConfirmModal } from '@/Components/CostConfirmModal';
import emptyLight from '@/assets/empty-state-light.svg';
import emptyDark from '@/assets/empty-state-dark.svg';

interface ActiveResearchSession {
  id: number;
  status: string;
  started_at?: string;
  estimated_remaining_minutes: number;
}

interface LatestResearch {
  id: number;
  status: string;
  completed_at: string | null;
}

interface Client {
  id: number;
  name: string;
  segment: string | null;
  avatar: string | null;
  tone_of_voice: string | null;
  channels: string[] | null;
  demands_count: number;
  monthly_posts?: number | null;
  briefing: string | null;
  active_research_session?: ActiveResearchSession | null;
  latest_research?: LatestResearch | null;
}

interface Props {
  clients: Client[];
  filters: { search?: string };
}

const CHANNEL_COLORS: Record<string, string> = {
  instagram: 'bg-[#e9d5ff] text-[#7c3aed]',
  linkedin:  'bg-[#dbeafe] text-[#1d4ed8]',
  tiktok:    'bg-[#fce7f3] text-[#be185d]',
  facebook:  'bg-[#dbeafe] text-[#1e40af]',
  youtube:   'bg-[#fee2e2] text-[#dc2626]',
  email:     'bg-[#d1fae5] text-[#065f46]',
  blog:      'bg-[#fef3c7] text-[#92400e]',
  whatsapp:  'bg-[#d1fae5] text-[#065f46]',
};

export default function ClientsIndex({ clients, filters }: Props) {
  const { t } = useTranslation();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { auth } = usePage().props as any;
  const hasKey = (auth?.user?.organization?.has_anthropic_key as boolean) ?? false;
  const [search, setSearch] = useState(filters.search ?? '');
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [pendingLaunchClientId, setPendingLaunchClientId] = useState<number | null>(null);
  const [pendingCost, setPendingCost] = useState<{ cost_usd: number; duration_minutes: string } | null>(null);
  const [launchBusy, setLaunchBusy] = useState(false);

  const handleSearch = (value: string) => {
    setSearch(value);
    router.get(route('clients.index'), { search: value }, { preserveState: true, replace: true });
  };

  const handleDelete = (id: number) => {
    router.delete(route('clients.destroy', id), { onSuccess: () => setDeletingId(null) });
  };

  const openResearchWithConfirm = async (clientId: number) => {
    try {
      const res = await fetch(route('clients.research.estimateCost', clientId), {
        credentials: 'same-origin', headers: { 'Accept': 'application/json' },
      });
      const data = await res.json();
      setPendingLaunchClientId(clientId);
      setPendingCost({ cost_usd: data.cost_usd, duration_minutes: data.duration_minutes });
    } catch {
      setPendingLaunchClientId(clientId);
      setPendingCost({ cost_usd: 0, duration_minutes: '20-40' });
    }
  };

  const confirmLaunch = () => {
    if (pendingLaunchClientId == null) return;
    setLaunchBusy(true);
    router.post(route('clients.research.launch', pendingLaunchClientId), {}, {
      preserveScroll: true,
      onFinish: () => { setLaunchBusy(false); setPendingLaunchClientId(null); setPendingCost(null); },
    });
  };

  return (
    <AppLayout>
      <Head title={t('clients.title')} />

      {/* Search + New client on same row */}
      <div className="mb-6 flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9ca3af]" />
          <input
            type="text"
            value={search}
            onChange={e => handleSearch(e.target.value)}
            placeholder={t('common.search')}
            className="w-full rounded-[8px] border border-[#e5e7eb] bg-white pl-9 pr-3.5 py-2 text-sm text-[#111827] placeholder-[#9ca3af] focus:border-[#7c3aed] focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/20 dark:border-[#1f2937] dark:bg-[#111827] dark:text-[#f9fafb] dark:placeholder-[#6b7280]"
          />
        </div>
        <Link
          href={route('clients.create')}
          className="inline-flex items-center gap-1.5 rounded-[8px] bg-[#7c3aed] px-4 py-2 text-sm font-medium text-white hover:bg-[#6d28d9] transition-colors"
        >
          <Plus size={15} />
          {t('clients.new')}
        </Link>
      </div>

      {clients.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <img src={emptyLight} alt="" className="mb-4 h-40 dark:hidden" aria-hidden />
          <img src={emptyDark} alt="" className="mb-4 h-40 hidden dark:block" aria-hidden />
          <p className="text-base font-medium text-[#111827] dark:text-[#f9fafb]">{t('clients.empty')}</p>
          <p className="mt-1 text-sm text-[#6b7280]">{t('clients.emptyHint')}</p>
          <Link href={route('clients.create')} className="mt-4 inline-flex items-center gap-1.5 rounded-[8px] bg-[#7c3aed] px-4 py-2 text-sm font-medium text-white hover:bg-[#6d28d9] transition-colors">
            <Plus size={16} />{t('clients.new')}
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {clients.map(client => (
            <Link
              key={client.id}
              href={route('clients.show', client.id)}
              className="group block rounded-[16px] bg-white p-6 shadow-sm hover:shadow-md transition-shadow dark:bg-[#111827]"
            >
              {/* Header row */}
              <div className="flex items-start gap-4">
                <ClientAvatar name={client.name} avatar={client.avatar} size="lg" />
                <div className="min-w-0 flex-1">
                  <p className="text-base font-semibold text-[#111827] dark:text-[#f9fafb] truncate">{client.name}</p>
                  {client.segment && (
                    <p className="text-sm text-[#6b7280] truncate">{client.segment}</p>
                  )}

                  {/* Channel badges */}
                  {client.channels && client.channels.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {client.channels.slice(0, 4).map(ch => (
                        <span key={ch} className={`rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${CHANNEL_COLORS[ch] ?? 'bg-[#f3f4f6] text-[#6b7280]'}`}>
                          {ch}
                        </span>
                      ))}
                      {client.channels.length > 4 && (
                        <span className="rounded-full bg-[#f3f4f6] px-2 py-0.5 text-[11px] text-[#9ca3af] dark:bg-[#1f2937]">
                          +{client.channels.length - 4}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Delete button */}
                <div onClick={e => e.preventDefault()}>
                  {deletingId === client.id ? (
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleDelete(client.id)} className="rounded-[6px] bg-red-500 px-2 py-1 text-[11px] font-medium text-white hover:bg-red-600">
                        {t('common.confirm')}
                      </button>
                      <button onClick={() => setDeletingId(null)} className="rounded-[6px] border border-[#e5e7eb] px-2 py-1 text-[11px] text-[#6b7280] dark:border-[#1f2937]">
                        {t('common.cancel')}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeletingId(client.id)}
                      className="rounded-[8px] border border-[#e5e7eb] p-1.5 text-[#9ca3af] hover:border-red-400 hover:text-red-500 transition-colors dark:border-[#1f2937] opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Tone of voice */}
              {client.tone_of_voice && (
                <p className="mt-3 text-xs text-[#9ca3af] line-clamp-2 leading-relaxed">
                  {client.tone_of_voice}
                </p>
              )}

              {/* Stats row */}
              <div className="mt-4 flex items-center gap-4 text-xs text-[#6b7280]">
                <span className="inline-flex items-center gap-1">
                  <MessageSquare size={12} />
                  {t('clients.demandsCount', { count: client.demands_count })}
                </span>
                {client.monthly_posts != null && client.monthly_posts > 0 && (
                  <span className="inline-flex items-center gap-1 text-[#7c3aed]">
                    <Calendar size={12} />
                    {t('clients.badges.postsPerMonth', { count: client.monthly_posts })}
                  </span>
                )}
                {client.latest_research && (
                  <span className={`inline-flex items-center gap-1 ${client.latest_research.status === 'completed' ? 'text-[#10b981]' : 'text-[#7c3aed]'}`}>
                    {client.latest_research.status === 'completed'
                      ? <><Brain size={12} /> Memória IA</>
                      : <><AiIcon size={12} spinning /> Pesquisando</>
                    }
                  </span>
                )}
              </div>

              {/* Active research badge */}
              {client.active_research_session && (
                <div
                  onClick={e => { e.preventDefault(); router.visit(route('clients.research.show', [client.id, client.active_research_session!.id])); }}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#7c3aed]/10 px-2.5 py-1 text-[11px] font-medium text-[#7c3aed] hover:bg-[#7c3aed]/20 transition-colors cursor-pointer"
                >
                  <AiIcon size={11} spinning />
                  {t('clients.monthlyPlan.researchingBadge', {
                    minutes: client.active_research_session.estimated_remaining_minutes,
                  })}
                </div>
              )}

              {/* Deep research CTA — shown when no active session */}
              {!client.active_research_session && (
                <div onClick={e => e.preventDefault()} className="mt-3 relative group/research">
                  <button
                    disabled={!hasKey}
                    onClick={() => hasKey && openResearchWithConfirm(client.id)}
                    className="inline-flex items-center gap-1.5 rounded-[8px] border border-[#e5e7eb] dark:border-[#1f2937] px-3 py-1.5 text-xs font-medium text-[#6b7280] hover:border-[#7c3aed] hover:text-[#7c3aed] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <AiIcon size={12} />
                    {t('clients.research.deepResearch')}
                  </button>
                  {!hasKey && (
                    <div className="pointer-events-none absolute left-0 top-full mt-1 hidden group-hover/research:block z-50 w-56 rounded-[8px] bg-[#111827] px-3 py-2 text-xs text-[#f9fafb] shadow-lg">
                      Configure sua chave Anthropic em Configurações → IA
                    </div>
                  )}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}

      {/* Pre-launch cost confirmation modal */}
      {pendingCost && (
        <CostConfirmModal
          open={true}
          costUsd={pendingCost.cost_usd}
          title={t('clients.research.confirmTitle')}
          body={t('clients.research.confirmBody', { minutes: pendingCost.duration_minutes })}
          confirmLabel={t('clients.research.confirmCta')}
          busy={launchBusy}
          onConfirm={confirmLaunch}
          onCancel={() => { setPendingLaunchClientId(null); setPendingCost(null); }}
        />
      )}
    </AppLayout>
  );
}
