// (c) 2026 Briefy contributors — AGPL-3.0
import { formatDate } from '@/utils/date';
import { useState, useEffect } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import type { PageProps } from '@/types';
import { useTranslation } from 'react-i18next';
import { LayoutGrid, List, Loader2, Plus, Search, X } from 'lucide-react';
import AppLayout from '@/Layouts/AppLayout';
import { KanbanBoard } from '@/Components/KanbanBoard';
import { StatusBadge } from '@/Components/StatusBadge';
import { DemandDetailModal } from '@/Components/DemandDetailModal';
import { DemandCreateModal } from '@/Components/DemandCreateModal';
import emptyLight from '@/assets/empty-state-light.svg';
import emptyDark from '@/assets/empty-state-dark.svg';

interface Client { id: number; name: string; }
interface Demand {
  id: number;
  title: string;
  status: string;
  deadline: string | null;
  type: string;
  client: Client | null;
  assignee: { name: string } | null;
}
interface SelectedDemand {
  id: number; title: string; description: string | null; objective: string | null;
  tone: string | null; channel: string | null; deadline: string | null;
  status: string; type: string; client: Client;
  assignee: { id: number; name: string; email: string } | null;
  files: { id: number; type: 'upload' | 'link'; name: string; path_or_url: string }[];
  comments: { id: number; body: string; user: { id: number; name: string; email: string }; created_at: string }[];
}
interface TeamMember { id: number; name: string; }
interface Props {
  demands: Demand[];
  clients: Client[];
  filters: { client_id?: string; status?: string; search?: string };
  selectedDemand?: SelectedDemand | null;
  teamMembers?: TeamMember[];
  isAdmin?: boolean;
  autoCreate?: boolean;
}

const STATUSES = ['todo', 'in_progress', 'awaiting_feedback', 'in_review', 'approved'];

export default function DemandsIndex({ demands, clients, filters, selectedDemand, teamMembers = [], isAdmin = false, autoCreate = false }: Props) {
  const { t } = useTranslation();
  const [view, setView] = useState<'kanban' | 'list'>('kanban');
  const [search, setSearch] = useState(filters.search ?? '');
  const [loadingDemandId, setLoadingDemandId] = useState<number | null>(null);
  const [showClientPicker, setShowClientPicker] = useState(false);
  const [pickedClientId, setPickedClientId] = useState<string>('');
  const [createClient, setCreateClient] = useState<{ id: number; name: string } | null>(null);

  const openCreateModal = (clientId: number) => {
    const client = clients.find(c => c.id === clientId) ?? null;
    setShowClientPicker(false);
    setCreateClient(client);
  };

  // Real-time: recarregar demandas quando outro usuário da org fizer uma alteração
  const { auth } = usePage<PageProps>().props;
  const orgId = (auth?.user as { current_organization_id?: number } | undefined)?.current_organization_id;

  useEffect(() => {
    if (!orgId || !window.Echo) return;

    const channel = window.Echo.private(`organization.${orgId}`);
    channel.listen('.demand.board.updated', () => {
      router.reload({ only: ['demands'] });
    });

    return () => {
      window.Echo.leave(`organization.${orgId}`);
    };
  }, [orgId]);

  const handleNewDemand = () => {
    if (filters.client_id) {
      openCreateModal(Number(filters.client_id));
    } else if (clients.length === 1) {
      openCreateModal(clients[0].id);
    } else {
      setPickedClientId(clients[0]?.id ? String(clients[0].id) : '');
      setShowClientPicker(true);
    }
  };

  // When navigating from client profile "Nova demanda", redirect to create page preserving client filter
  useEffect(() => {
    if (autoCreate && filters.client_id) {
      router.visit(route('clients.demands.create', filters.client_id), { replace: true });
    }
  }, []);

  const openDemand = (id: number) => {
    setLoadingDemandId(id);
    router.get(route('demands.index'), { ...filters, demand: id }, {
      preserveState: true,
      replace: true,
      only: ['selectedDemand'],
      onFinish: () => setLoadingDemandId(null),
    });
  };

  const closeDemand = () => {
    router.get(route('demands.index'), { ...filters }, { preserveState: true, replace: true, only: ['selectedDemand'] });
  };

  const applyFilter = (key: string, value: string) => {
    router.get(route('demands.index'), { ...filters, [key]: value || undefined, search: search || undefined }, {
      preserveState: true,
      replace: true,
    });
  };

  const handleSearch = (value: string) => {
    setSearch(value);
    router.get(route('demands.index'), { ...filters, search: value || undefined }, {
      preserveState: true,
      replace: true,
    });
  };

  return (
    <AppLayout title={t('demands.title')}>
      <Head title={t('demands.title')} />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9ca3af]" />
          <input
            type="text"
            value={search}
            onChange={e => handleSearch(e.target.value)}
            placeholder={t('common.search')}
            className="rounded-[8px] border border-[#e5e7eb] bg-white pl-8 pr-3 py-1.5 text-sm text-[#111827] placeholder-[#9ca3af] focus:border-[#7c3aed] focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/20 dark:border-[#1f2937] dark:bg-[#111827] dark:text-[#f9fafb] dark:placeholder-[#6b7280]"
          />
        </div>

        <select
          value={filters.client_id ?? ''}
          onChange={e => applyFilter('client_id', e.target.value)}
          className="rounded-[8px] border border-[#e5e7eb] bg-white px-3 py-1.5 text-sm text-[#6b7280] focus:border-[#7c3aed] focus:outline-none dark:border-[#1f2937] dark:bg-[#111827] dark:text-[#9ca3af]"
        >
          <option value="">{t('common.all')} {t('clients.title')}</option>
          {clients.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
        </select>

        <select
          value={filters.status ?? ''}
          onChange={e => applyFilter('status', e.target.value)}
          className="rounded-[8px] border border-[#e5e7eb] bg-white px-3 py-1.5 text-sm text-[#6b7280] focus:border-[#7c3aed] focus:outline-none dark:border-[#1f2937] dark:bg-[#111827] dark:text-[#9ca3af]"
        >
          <option value="">{t('common.all')} status</option>
          {STATUSES.map(s => <option key={s} value={s}>{t(`demand.statuses.${s}`)}</option>)}
        </select>

        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center overflow-hidden rounded-[8px] border border-[#e5e7eb] dark:border-[#1f2937]">
            <button
              onClick={() => setView('kanban')}
              className={`px-3 py-1.5 transition-colors ${view === 'kanban' ? 'bg-[#7c3aed] text-white' : 'text-[#6b7280] hover:bg-[#f3f4f6] dark:hover:bg-[#1f2937]'}`}
            >
              <LayoutGrid size={15} />
            </button>
            <button
              onClick={() => setView('list')}
              className={`px-3 py-1.5 transition-colors ${view === 'list' ? 'bg-[#7c3aed] text-white' : 'text-[#6b7280] hover:bg-[#f3f4f6] dark:hover:bg-[#1f2937]'}`}
            >
              <List size={15} />
            </button>
          </div>

          <button
            onClick={handleNewDemand}
            className="inline-flex items-center gap-1.5 rounded-[8px] bg-[#7c3aed] px-4 py-1.5 text-sm font-semibold text-white hover:bg-[#6d28d9] transition-colors"
          >
            <Plus size={15} aria-hidden="true" />
            Nova demanda
          </button>
        </div>
      </div>

      {/* Client picker — aparece quando há múltiplos clientes e nenhum está filtrado */}
      {showClientPicker && (
        <div className="mb-4 flex items-center gap-3 rounded-[10px] border border-[#a78bfa]/30 bg-[#7c3aed]/5 dark:bg-[#7c3aed]/10 px-4 py-3">
          <span className="text-sm text-[#6b7280] shrink-0">Para qual cliente?</span>
          <select
            value={pickedClientId}
            onChange={e => setPickedClientId(e.target.value)}
            className="flex-1 rounded-[8px] border border-[#e5e7eb] bg-white px-3 py-1.5 text-sm focus:border-[#7c3aed] focus:outline-none dark:border-[#1f2937] dark:bg-[#111827] dark:text-[#f9fafb]"
            autoFocus
          >
            {clients.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
          </select>
          <button
            onClick={() => { if (pickedClientId) openCreateModal(Number(pickedClientId)); }}
            disabled={!pickedClientId}
            className="rounded-[8px] bg-[#7c3aed] px-4 py-1.5 text-sm font-semibold text-white hover:bg-[#6d28d9] disabled:opacity-50 transition-colors"
          >
            Continuar
          </button>
          <button onClick={() => setShowClientPicker(false)} className="p-1 text-[#9ca3af] hover:text-[#374151] dark:hover:text-[#d1d5db] transition-colors" aria-label="Cancelar">
            <X size={15} />
          </button>
        </div>
      )}

      {demands.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <img src={emptyLight} alt="" className="mb-4 h-40 dark:hidden" aria-hidden />
          <img src={emptyDark} alt="" className="mb-4 h-40 hidden dark:block" aria-hidden />
          <p className="text-base font-medium text-[#111827] dark:text-[#f9fafb]">{t('demands.empty')}</p>
          <p className="mt-1 text-sm text-[#6b7280]">{t('demands.emptyHint')}</p>
        </div>
      ) : view === 'kanban' ? (
        <div className="h-[calc(100vh-10rem)]">
          <KanbanBoard demands={demands} onDemandClick={openDemand} loadingDemandId={loadingDemandId} />
        </div>
      ) : (
        <div className="overflow-hidden rounded-[12px] bg-white shadow-sm dark:bg-[#111827]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#e5e7eb] dark:border-[#1f2937]">
                <th className="px-4 py-3 text-left font-medium text-[#6b7280]">{t('demands.title_field')}</th>
                <th className="hidden px-4 py-3 text-left font-medium text-[#6b7280] sm:table-cell">{t('demands.client')}</th>
                <th className="px-4 py-3 text-left font-medium text-[#6b7280]">{t('demands.status')}</th>
                <th className="hidden px-4 py-3 text-left font-medium text-[#6b7280] md:table-cell">{t('demands.deadline')}</th>
                <th className="hidden px-4 py-3 text-left font-medium text-[#6b7280] lg:table-cell">{t('demands.assignedTo')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e5e7eb] dark:divide-[#1f2937]">
              {demands.map(d => (
                <tr key={d.id} onClick={() => openDemand(d.id)} className="cursor-pointer hover:bg-[#f9fafb] dark:hover:bg-[#0b0f14] transition-colors">
                  <td className="px-4 py-3">
                    <button className="font-medium text-[#111827] hover:text-[#7c3aed] dark:text-[#f9fafb] dark:hover:text-[#a78bfa] text-left">
                      {d.title}
                    </button>
                  </td>
                  <td className="hidden px-4 py-3 text-[#6b7280] sm:table-cell">{d.client?.name ?? '—'}</td>
                  <td className="px-4 py-3"><StatusBadge status={d.status} /></td>
                  <td className="hidden px-4 py-3 text-[#6b7280] md:table-cell">
                    {d.deadline ? formatDate(d.deadline) : <span className="text-[#d1d5db]">{t('demands.noDeadline')}</span>}
                  </td>
                  <td className="hidden px-4 py-3 text-[#6b7280] lg:table-cell">{d.assignee?.name ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {loadingDemandId !== null && !selectedDemand && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative z-10 flex h-16 w-16 items-center justify-center rounded-[16px] bg-white shadow-2xl dark:bg-[#111827]">
            <Loader2 size={28} className="animate-spin text-[#7c3aed]" />
          </div>
        </div>
      )}
      {selectedDemand && (
        <DemandDetailModal demand={selectedDemand} isAdmin={isAdmin} teamMembers={teamMembers} onClose={closeDemand} />
      )}

      {createClient && (
        <DemandCreateModal
          client={createClient}
          teamMembers={teamMembers}
          onClose={() => setCreateClient(null)}
          onSuccess={() => {
            setCreateClient(null);
            router.reload({ only: ['demands'] });
          }}
        />
      )}
    </AppLayout>
  );
}
