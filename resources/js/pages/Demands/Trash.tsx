// (c) 2026 Briefy contributors — AGPL-3.0
import { formatDate } from '@/utils/date';
import { Head, router, usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { RotateCcw, Trash2 } from 'lucide-react';
import AppLayout from '@/Layouts/AppLayout';
import emptyLight from '@/assets/empty-state-light.svg';
import emptyDark from '@/assets/empty-state-dark.svg';
import type { PageProps } from '@/types';

interface TrashedDemand {
  id: number;
  title: string;
  status: string;
  channel: string | null;
  deadline: string | null;
  deleted_at: string;
  expires_at: string;
  client: { id: number; name: string } | null;
  assignee: { name: string } | null;
}

interface Props {
  demands: TrashedDemand[];
}

function daysLeft(expiresAt: string): number {
  const diff = new Date(expiresAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86400000));
}

export default function DemandsTrash({ demands }: Props) {
  const { t } = useTranslation();
  const { auth } = usePage<PageProps>().props;
  const isAdmin = ['admin', 'owner'].includes(auth?.user?.role ?? '');

  const restore = (id: number) =>
    router.post(route('trash.restore', id), {}, { preserveScroll: true });

  const forceDelete = (id: number) =>
    router.delete(route('trash.force-delete', id), { preserveScroll: true });

  return (
    <AppLayout>
      <Head title="Lixeira" />
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center gap-3">
          <Trash2 size={20} className="text-[#9ca3af]" />
          <h1 className="text-lg font-semibold text-[#111827] dark:text-[#f9fafb]">Lixeira</h1>
          {demands.length > 0 && (
            <span className="rounded-full bg-[#f3f4f6] px-2 py-0.5 text-xs font-medium text-[#6b7280] dark:bg-[#1f2937] dark:text-[#9ca3af]">
              {demands.length}
            </span>
          )}
          <p className="ml-auto text-xs text-[#9ca3af]">Demandas são excluídas automaticamente após 30 dias</p>
        </div>

        {demands.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-center">
            <img src={emptyLight} alt="" className="mb-4 h-40 dark:hidden" aria-hidden />
            <img src={emptyDark} alt="" className="mb-4 h-40 hidden dark:block" aria-hidden />
            <p className="text-base font-medium text-[#111827] dark:text-[#f9fafb]">Lixeira vazia</p>
            <p className="mt-1 text-sm text-[#6b7280]">Demandas excluídas aparecem aqui por 30 dias</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {demands.map(d => {
              const days = daysLeft(d.expires_at);
              const urgent = days <= 7;
              return (
                <li key={d.id} className="flex items-center gap-4 rounded-[12px] border border-[#e5e7eb] bg-white px-5 py-3.5 dark:border-[#1f2937] dark:bg-[#111827]">
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-[#111827] dark:text-[#f9fafb]">{d.title}</p>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-[#9ca3af]">
                      {d.client && <span>{d.client.name}</span>}
                      {d.channel && <><span>·</span><span className="capitalize">{d.channel}</span></>}
                      {d.deadline && <><span>·</span><span>{formatDate(d.deadline)}</span></>}
                    </div>
                  </div>
                  <span className={`shrink-0 text-xs font-medium ${urgent ? 'text-red-500' : 'text-[#9ca3af]'}`}>
                    {days === 0 ? 'Expira hoje' : `${days}d restantes`}
                  </span>
                  <button
                    onClick={() => restore(d.id)}
                    className="shrink-0 inline-flex items-center gap-1.5 rounded-[8px] border border-[#e5e7eb] px-3 py-1.5 text-xs font-medium text-[#6b7280] hover:border-[#7c3aed] hover:text-[#7c3aed] transition-colors dark:border-[#1f2937]"
                  >
                    <RotateCcw size={12} />
                    Restaurar
                  </button>
                  {isAdmin && (
                    <button
                      onClick={() => forceDelete(d.id)}
                      className="shrink-0 inline-flex items-center gap-1 rounded-[8px] border border-[#e5e7eb] px-2.5 py-1.5 text-xs text-[#9ca3af] hover:border-red-400 hover:text-red-500 transition-colors dark:border-[#1f2937]"
                      title="Excluir permanentemente"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </AppLayout>
  );
}
