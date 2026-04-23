// (c) 2026 Briefy contributors — AGPL-3.0
import { Head, Link, router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { ArrowLeft, Brain, Calendar, CheckCircle2, ClipboardList, Edit2, Loader2, Trash2, XCircle } from 'lucide-react';
import AppLayout from '@/Layouts/AppLayout';
import { ClientAvatar } from '@/Components/ClientAvatar';

const STATUS_COLORS: Record<string, string> = {
  todo:               'bg-[#9ca3af]/10 text-[#9ca3af]',
  in_progress:        'bg-[#3b82f6]/10 text-[#3b82f6]',
  awaiting_feedback:  'bg-[#f59e0b]/10 text-[#f59e0b]',
  in_review:          'bg-[#8b5cf6]/10 text-[#8b5cf6]',
  approved:           'bg-[#10b981]/10 text-[#10b981]',
};

interface Demand { id: number; title: string; status: string; deadline: string | null; type: string; }
interface Session { id: number; status: string; started_at: string | null; completed_at: string | null; progress_summary: string | null; }
const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

interface ImportantDate { label: string; month: number; day: number; }

interface Client {
  id: number; name: string; segment: string | null; avatar: string | null;
  channels: string[]; tone_of_voice: string | null; target_audience: string | null; briefing: string | null;
  important_dates?: ImportantDate[] | null;
}

function SessionStatusIcon({ status }: { status: string }) {
  if (status === 'completed') return <CheckCircle2 size={14} className="text-[#10b981]" />;
  if (status === 'failed' || status === 'terminated') return <XCircle size={14} className="text-red-400" />;
  return <Loader2 size={14} className="animate-spin text-[#7c3aed]" />;
}

function sessionLabel(status: string) {
  if (status === 'completed') return 'Concluída';
  if (status === 'failed') return 'Falhou';
  if (status === 'terminated') return 'Cancelada';
  return 'Em andamento';
}

export default function ClientsShow({ client, demands, sessions = [] }: { client: Client; demands: Demand[]; sessions?: Session[] }) {
  const { t } = useTranslation();
  const [deletingSessionId, setDeletingSessionId] = useState<number | null>(null);

  const deleteSession = (sessionId: number) => {
    router.delete(route('clients.research.destroy', [client.id, sessionId]), {
      preserveScroll: true,
      onSuccess: () => setDeletingSessionId(null),
    });
  };

  return (
    <AppLayout title={client.name}>
      <Head title={client.name} />

      <div className="mb-4 flex items-center justify-between">
        <Link href={route('clients.index')} className="inline-flex items-center gap-1 text-sm text-[#6b7280] hover:text-[#111827] dark:hover:text-[#f9fafb]">
          <ArrowLeft size={14} />{t('clients.title')}
        </Link>
        <Link href={route('clients.edit', client.id)} className="inline-flex items-center gap-1.5 rounded-[8px] border border-[#e5e7eb] px-3 py-1.5 text-sm font-medium text-[#6b7280] hover:border-[#7c3aed] hover:text-[#7c3aed] transition-colors dark:border-[#1f2937]">
          <Edit2 size={14} />{t('common.edit')}
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: client info */}
        <div className="lg:col-span-1 space-y-5">
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

          {/* Research sessions */}
          {sessions.length > 0 && (
            <div className="rounded-[12px] bg-white shadow-sm dark:bg-[#111827]">
              <div className="flex items-center gap-2 border-b border-[#e5e7eb] px-5 py-3.5 dark:border-[#1f2937]">
                <Brain size={15} className="text-[#7c3aed]" />
                <h3 className="text-sm font-semibold text-[#111827] dark:text-[#f9fafb]">Deep Research</h3>
              </div>
              <ul className="divide-y divide-[#f3f4f6] dark:divide-[#1f2937]">
                {sessions.map(s => (
                  <li key={s.id} className="group flex items-center gap-2 px-5 py-3 hover:bg-[#f9fafb] dark:hover:bg-[#0b0f14] transition-colors">
                    <Link
                      href={route('clients.research.show', [client.id, s.id])}
                      className="flex flex-1 items-center gap-3 min-w-0"
                    >
                      <SessionStatusIcon status={s.status} />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-[#111827] dark:text-[#f9fafb]">
                          {sessionLabel(s.status)}
                        </p>
                        <p className="text-[11px] text-[#9ca3af]">
                          {s.completed_at
                            ? new Date(s.completed_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
                            : s.started_at
                              ? new Date(s.started_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
                              : '—'}
                        </p>
                      </div>
                    </Link>
                    {deletingSessionId === s.id ? (
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => deleteSession(s.id)} className="rounded-[6px] bg-red-500 px-2 py-1 text-[10px] font-medium text-white hover:bg-red-600">
                          Confirmar
                        </button>
                        <button onClick={() => setDeletingSessionId(null)} className="rounded-[6px] border border-[#e5e7eb] px-2 py-1 text-[10px] text-[#6b7280] dark:border-[#1f2937]">
                          {t('common.cancel')}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeletingSessionId(s.id)}
                        className="shrink-0 rounded-[6px] border border-[#e5e7eb] p-1 text-[#9ca3af] hover:border-red-400 hover:text-red-500 transition-colors dark:border-[#1f2937] opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Right: actions + important dates */}
        <div className="lg:col-span-2 space-y-5">

          {/* Demands button */}
          <div className="rounded-[12px] bg-white p-5 shadow-sm dark:bg-[#111827] flex items-center justify-between">
            <div>
              <p className="font-semibold text-[#111827] dark:text-[#f9fafb]">{t('nav.demands')}</p>
              <p className="text-xs text-[#9ca3af] mt-0.5">{demands.length} demanda{demands.length !== 1 ? 's' : ''} ativa{demands.length !== 1 ? 's' : ''}</p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={route('clients.demands.create', client.id)}
                className="inline-flex items-center gap-1.5 rounded-[8px] border border-[#e5e7eb] px-3 py-1.5 text-sm font-medium text-[#6b7280] hover:border-[#7c3aed] hover:text-[#7c3aed] transition-colors dark:border-[#1f2937]"
              >
                {t('demands.new')}
              </Link>
              <Link
                href={route('demands.index', { client_id: client.id })}
                className="inline-flex items-center gap-1.5 rounded-[8px] bg-[#7c3aed] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#6d28d9] transition-colors"
              >
                <ClipboardList size={14} />
                Ver quadro
              </Link>
            </div>
          </div>

          {/* Important dates */}
          {client.important_dates && client.important_dates.length > 0 && (
            <div className="rounded-[12px] bg-white shadow-sm dark:bg-[#111827]">
              <div className="flex items-center gap-2 border-b border-[#e5e7eb] px-5 py-3.5 dark:border-[#1f2937]">
                <Calendar size={15} className="text-[#f59e0b]" />
                <h3 className="text-sm font-semibold text-[#111827] dark:text-[#f9fafb]">Datas Importantes</h3>
                <span className="ml-auto text-xs text-[#9ca3af]">Incluídas automaticamente no planejamento</span>
              </div>
              <ul className="divide-y divide-[#f3f4f6] dark:divide-[#1f2937]">
                {client.important_dates.sort((a, b) => a.month - b.month || a.day - b.day).map((d, i) => (
                  <li key={i} className="flex items-center gap-3 px-5 py-3">
                    <span className="shrink-0 rounded-full bg-[#fef3c7] px-2.5 py-0.5 text-xs font-semibold text-[#92400e]">
                      {String(d.day).padStart(2, '0')} {MONTHS[d.month - 1]}
                    </span>
                    <span className="text-sm text-[#374151] dark:text-[#d1d5db]">{d.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
