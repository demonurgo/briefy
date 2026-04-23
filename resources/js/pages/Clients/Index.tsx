// (c) 2026 Briefy contributors — AGPL-3.0
import { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { Plus, Search, Trash2, Edit2, Eye, Calendar } from 'lucide-react';
import AppLayout from '@/Layouts/AppLayout';
import { ClientAvatar } from '@/Components/ClientAvatar';
import { AiIcon } from '@/Components/AiIcon';
import emptyLight from '@/assets/empty-state-light.svg';
import emptyDark from '@/assets/empty-state-dark.svg';

interface ActiveResearchSession {
  id: number;
  status: string;
  started_at?: string;
  estimated_remaining_minutes: number;
}

interface Client {
  id: number;
  name: string;
  segment: string | null;
  avatar: string | null;
  demands_count: number;
  monthly_posts?: number | null;
  active_research_session?: ActiveResearchSession | null;
}

interface Props {
  clients: Client[];
  filters: { search?: string };
}

export default function ClientsIndex({ clients, filters }: Props) {
  const { t } = useTranslation();
  const [search, setSearch] = useState(filters.search ?? '');
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleSearch = (value: string) => {
    setSearch(value);
    router.get(route('clients.index'), { search: value }, { preserveState: true, replace: true });
  };

  const handleDelete = (id: number) => {
    router.delete(route('clients.destroy', id), {
      onSuccess: () => setDeletingId(null),
    });
  };

  return (
    <AppLayout
      title={t('clients.title')}
      actions={
        <Link
          href={route('clients.create')}
          className="inline-flex items-center gap-1.5 rounded-[8px] bg-[#7c3aed] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#6d28d9] transition-colors"
        >
          <Plus size={16} />
          {t('clients.new')}
        </Link>
      }
    >
      <Head title={t('clients.title')} />

      <div className="relative mb-6 max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9ca3af]" />
        <input
          type="text"
          value={search}
          onChange={e => handleSearch(e.target.value)}
          placeholder={t('common.search')}
          className="w-full rounded-[8px] border border-[#e5e7eb] bg-white pl-9 pr-3.5 py-2 text-sm text-[#111827] placeholder-[#9ca3af] focus:border-[#7c3aed] focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/20 dark:border-[#1f2937] dark:bg-[#111827] dark:text-[#f9fafb] dark:placeholder-[#6b7280]"
        />
      </div>

      {clients.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <img src={emptyLight} alt="" className="mb-4 h-40 dark:hidden" aria-hidden />
          <img src={emptyDark} alt="" className="mb-4 h-40 hidden dark:block" aria-hidden />
          <p className="text-base font-medium text-[#111827] dark:text-[#f9fafb]">{t('clients.empty')}</p>
          <p className="mt-1 text-sm text-[#6b7280]">{t('clients.emptyHint')}</p>
          <Link
            href={route('clients.create')}
            className="mt-4 inline-flex items-center gap-1.5 rounded-[8px] bg-[#7c3aed] px-4 py-2 text-sm font-medium text-white hover:bg-[#6d28d9] transition-colors"
          >
            <Plus size={16} />
            {t('clients.new')}
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {clients.map(client => (
            <div
              key={client.id}
              className="group relative rounded-[12px] bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:bg-[#111827]"
            >
              <div className="flex items-start gap-3">
                <ClientAvatar name={client.name} avatar={client.avatar} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-[#111827] dark:text-[#f9fafb]">{client.name}</p>
                  {client.segment && (
                    <p className="truncate text-xs text-[#6b7280]">{client.segment}</p>
                  )}
                  {/* Badges: posts/mês + pesquisa em andamento */}
                  <div className="mt-1 flex flex-wrap gap-2">
                    {client.monthly_posts != null && client.monthly_posts > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#f3edff] dark:bg-[#2e1065]/30 px-2 py-0.5 text-[11px] font-medium text-[#6d28d9] dark:text-[#a78bfa]">
                        <Calendar size={11} />
                        {t('clients.badges.postsPerMonth', { count: client.monthly_posts })}
                      </span>
                    )}
                    {client.active_research_session && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#7c3aed]/10 px-2 py-0.5 text-[11px] font-medium text-[#7c3aed]">
                        <AiIcon size={12} spinning />
                        {t('clients.monthlyPlan.researchingBadge', { minutes: client.active_research_session.estimated_remaining_minutes })}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-[#9ca3af]">
                    {t('clients.demandsCount', { count: client.demands_count })}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <Link
                  href={route('clients.show', client.id)}
                  className="flex-1 rounded-[8px] border border-[#e5e7eb] py-1.5 text-center text-xs font-medium text-[#6b7280] hover:border-[#7c3aed] hover:text-[#7c3aed] transition-colors dark:border-[#1f2937] dark:hover:border-[#a78bfa] dark:hover:text-[#a78bfa]"
                >
                  <Eye size={13} className="inline mr-1" />
                  {t('common.view')}
                </Link>
                <Link
                  href={route('clients.edit', client.id)}
                  className="rounded-[8px] border border-[#e5e7eb] p-1.5 text-[#6b7280] hover:border-[#7c3aed] hover:text-[#7c3aed] transition-colors dark:border-[#1f2937]"
                >
                  <Edit2 size={14} />
                </Link>
                {deletingId === client.id ? (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleDelete(client.id)}
                      className="rounded-[8px] bg-red-500 px-2 py-1.5 text-xs font-medium text-white hover:bg-red-600 transition-colors"
                    >
                      {t('common.confirm')}
                    </button>
                    <button
                      onClick={() => setDeletingId(null)}
                      className="rounded-[8px] border border-[#e5e7eb] px-2 py-1.5 text-xs text-[#6b7280] dark:border-[#1f2937]"
                    >
                      {t('common.cancel')}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeletingId(client.id)}
                    className="rounded-[8px] border border-[#e5e7eb] p-1.5 text-[#6b7280] hover:border-red-400 hover:text-red-500 transition-colors dark:border-[#1f2937]"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
