// (c) 2026 Briefy contributors — AGPL-3.0
import { Head, Link } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { Edit2, Plus, ArrowLeft } from 'lucide-react';
import AppLayout from '@/Layouts/AppLayout';
import { ClientAvatar } from '@/Components/ClientAvatar';

const STATUS_COLORS: Record<string, string> = {
  todo: 'bg-[#9ca3af]/10 text-[#9ca3af]',
  in_progress: 'bg-[#3b82f6]/10 text-[#3b82f6]',
  awaiting_feedback: 'bg-[#f59e0b]/10 text-[#f59e0b]',
  in_review: 'bg-[#8b5cf6]/10 text-[#8b5cf6]',
  approved: 'bg-[#10b981]/10 text-[#10b981]',
};

interface Demand {
  id: number;
  title: string;
  status: string;
  deadline: string | null;
  type: string;
}

interface Client {
  id: number;
  name: string;
  segment: string | null;
  avatar: string | null;
  channels: string[];
  tone_of_voice: string | null;
  target_audience: string | null;
  briefing: string | null;
}

export default function ClientsShow({ client, demands }: { client: Client; demands: Demand[] }) {
  const { t } = useTranslation();

  return (
    <AppLayout
      title={client.name}
      actions={
        <Link
          href={route('clients.edit', client.id)}
          className="inline-flex items-center gap-1.5 rounded-[8px] border border-[#e5e7eb] px-3 py-1.5 text-sm font-medium text-[#6b7280] hover:border-[#7c3aed] hover:text-[#7c3aed] transition-colors dark:border-[#1f2937]"
        >
          <Edit2 size={14} />
          {t('common.edit')}
        </Link>
      }
    >
      <Head title={client.name} />

      <div className="mb-4">
        <Link href={route('clients.index')} className="inline-flex items-center gap-1 text-sm text-[#6b7280] hover:text-[#111827] dark:hover:text-[#f9fafb]">
          <ArrowLeft size={14} />
          {t('clients.title')}
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <div className="rounded-[12px] bg-white p-6 shadow-sm dark:bg-[#111827]">
            <div className="flex flex-col items-center text-center">
              <ClientAvatar name={client.name} avatar={client.avatar} size="lg" />
              <h2 className="mt-3 text-lg font-semibold text-[#111827] dark:text-[#f9fafb]">{client.name}</h2>
              {client.segment && <p className="text-sm text-[#6b7280]">{client.segment}</p>}
            </div>

            {client.channels?.length > 0 && (
              <div className="mt-5">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[#9ca3af]">{t('clients.channels')}</p>
                <div className="flex flex-wrap gap-1.5">
                  {client.channels.map(ch => (
                    <span key={ch} className="rounded-full bg-[#f3f4f6] px-2.5 py-0.5 text-xs capitalize text-[#6b7280] dark:bg-[#1f2937] dark:text-[#9ca3af]">{ch}</span>
                  ))}
                </div>
              </div>
            )}

            {client.tone_of_voice && (
              <div className="mt-5">
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-[#9ca3af]">{t('clients.toneOfVoice')}</p>
                <p className="text-sm text-[#6b7280]">{client.tone_of_voice}</p>
              </div>
            )}

            {client.target_audience && (
              <div className="mt-5">
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-[#9ca3af]">{t('clients.targetAudience')}</p>
                <p className="text-sm text-[#6b7280]">{client.target_audience}</p>
              </div>
            )}

            {client.briefing && (
              <div className="mt-5">
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-[#9ca3af]">{t('clients.briefing')}</p>
                <p className="text-sm text-[#6b7280] whitespace-pre-wrap">{client.briefing}</p>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="rounded-[12px] bg-white shadow-sm dark:bg-[#111827]">
            <div className="flex items-center justify-between border-b border-[#e5e7eb] px-6 py-4 dark:border-[#1f2937]">
              <h3 className="font-semibold text-[#111827] dark:text-[#f9fafb]">{t('nav.demands')}</h3>
              <Link
                href={route('clients.demands.create', client.id)}
                className="inline-flex items-center gap-1 text-sm font-medium text-[#7c3aed] hover:text-[#6d28d9] dark:text-[#a78bfa]"
              >
                <Plus size={15} />
                {t('demands.new')}
              </Link>
            </div>

            {demands.length === 0 ? (
              <div className="px-6 py-10 text-center text-sm text-[#9ca3af]">
                {t('demands.empty')}
              </div>
            ) : (
              <ul className="divide-y divide-[#e5e7eb] dark:divide-[#1f2937]">
                {demands.map(demand => (
                  <li key={demand.id}>
                    <Link
                      href={route('demands.index', { client_id: client.id, demand: demand.id })}
                      className="flex items-center gap-3 px-6 py-3.5 hover:bg-[#f9fafb] transition-colors dark:hover:bg-[#0b0f14]"
                    >
                      <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[demand.status]}`}>
                        {t(`demand.statuses.${demand.status}`)}
                      </span>
                      <span className="flex-1 truncate text-sm text-[#111827] dark:text-[#f9fafb]">{demand.title}</span>
                      {demand.deadline && (
                        <span className="shrink-0 text-xs text-[#9ca3af]">{new Date(demand.deadline).toLocaleDateString('pt-BR')}</span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
