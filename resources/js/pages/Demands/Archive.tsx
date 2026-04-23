// (c) 2026 Briefy contributors — AGPL-3.0
import { Head, router, usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { ArchiveRestore, CheckCircle2 } from 'lucide-react';
import AppLayout from '@/Layouts/AppLayout';
import emptyLight from '@/assets/empty-state-light.svg';
import emptyDark from '@/assets/empty-state-dark.svg';

interface ArchivedDemand {
  id: number;
  title: string;
  channel: string | null;
  deadline: string | null;
  archived_at: string;
  client: { id: number; name: string } | null;
  assignee: { name: string } | null;
}

interface Client { id: number; name: string; }

interface Props {
  demands: ArchivedDemand[];
  clients: Client[];
  filters: { client_id?: string; search?: string };
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

export default function DemandsArchive({ demands, clients, filters }: Props) {
  const { t } = useTranslation();
  const [search, setSearch] = useState(filters.search ?? '');
  const [clientId, setClientId] = useState(filters.client_id ?? '');

  const applyFilter = (key: string, value: string) => {
    const params: Record<string, string> = { ...filters };
    if (value) params[key] = value; else delete params[key];
    router.get(route('archive.index'), params, { preserveState: true, replace: true });
  };

  const unarchive = (id: number) =>
    router.post(route('demands.unarchive', id), {}, { preserveScroll: true });

  return (
    <AppLayout>
      <Head title="Concluídas" />
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3 flex-wrap">
          <CheckCircle2 size={20} className="text-[#10b981]" />
          <h1 className="text-lg font-semibold text-[#111827] dark:text-[#f9fafb]">Concluídas</h1>
          {demands.length > 0 && (
            <span className="rounded-full bg-[#f3f4f6] px-2 py-0.5 text-xs font-medium text-[#6b7280] dark:bg-[#1f2937] dark:text-[#9ca3af]">
              {demands.length}
            </span>
          )}
          <div className="ml-auto flex items-center gap-2">
            <select
              value={clientId}
              onChange={e => { setClientId(e.target.value); applyFilter('client_id', e.target.value); }}
              className="rounded-[8px] border border-[#e5e7eb] dark:border-[#1f2937] bg-white dark:bg-[#111827] px-3 py-1.5 text-sm text-[#111827] dark:text-[#f9fafb] focus:border-[#7c3aed] focus:outline-none"
            >
              <option value="">Todos os clientes</option>
              {clients.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
            </select>
            <input
              type="search"
              placeholder="Buscar..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && applyFilter('search', search)}
              className="rounded-[8px] border border-[#e5e7eb] dark:border-[#1f2937] bg-white dark:bg-[#111827] px-3 py-1.5 text-sm text-[#111827] dark:text-[#f9fafb] placeholder-[#9ca3af] focus:border-[#7c3aed] focus:outline-none w-40"
            />
          </div>
        </div>

        {demands.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-center">
            <img src={emptyLight} alt="" className="mb-4 h-40 dark:hidden" aria-hidden />
            <img src={emptyDark} alt="" className="mb-4 h-40 hidden dark:block" aria-hidden />
            <p className="text-base font-medium text-[#111827] dark:text-[#f9fafb]">Nenhuma demanda concluída</p>
            <p className="mt-1 text-sm text-[#6b7280]">Arraste demandas aprovadas para a zona ✓ no kanban para arquivá-las</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {demands.map(d => (
              <li key={d.id} className="flex items-center gap-4 rounded-[12px] border border-[#e5e7eb] bg-white px-5 py-3.5 dark:border-[#1f2937] dark:bg-[#111827]">
                <CheckCircle2 size={16} className="shrink-0 text-[#10b981]" />
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium text-[#111827] dark:text-[#f9fafb]">{d.title}</p>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-[#9ca3af]">
                    {d.client && <span>{d.client.name}</span>}
                    {d.assignee && <><span>·</span><span>{d.assignee.name}</span></>}
                    {d.deadline && <><span>·</span><span>{new Date(d.deadline).toLocaleDateString('pt-BR')}</span></>}
                  </div>
                </div>
                {d.channel && (
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${CHANNEL_COLORS[d.channel] ?? 'bg-[#f3f4f6] text-[#6b7280]'}`}>
                    {d.channel}
                  </span>
                )}
                <span className="shrink-0 text-xs text-[#9ca3af]">
                  {new Date(d.archived_at).toLocaleDateString('pt-BR')}
                </span>
                <button
                  onClick={() => unarchive(d.id)}
                  className="shrink-0 inline-flex items-center gap-1.5 rounded-[8px] border border-[#e5e7eb] px-3 py-1.5 text-xs font-medium text-[#6b7280] hover:border-[#7c3aed] hover:text-[#7c3aed] transition-colors dark:border-[#1f2937]"
                  title="Mover de volta para o kanban"
                >
                  <ArchiveRestore size={12} />
                  Reabrir
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppLayout>
  );
}
