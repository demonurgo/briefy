// (c) 2026 Briefy contributors — AGPL-3.0
import { Head, Link, router, useForm } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { ArrowLeft, Brain, Calendar, CheckCircle2, ClipboardList, Edit2, Loader2, Pencil, Plus, Trash2, XCircle } from 'lucide-react';
import AppLayout from '@/Layouts/AppLayout';
import { ClientAvatar } from '@/Components/ClientAvatar';

const MONTHS_FULL = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const MONTHS_SHORT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

interface Demand { id: number; title: string; status: string; deadline: string | null; type: string; }
interface Session { id: number; status: string; started_at: string | null; completed_at: string | null; progress_summary: string | null; }
interface ImportantDate { label: string; month: number; day: number; }
interface Client {
  id: number; name: string; segment: string | null; avatar: string | null;
  channels: string[]; tone_of_voice: string | null; target_audience: string | null; briefing: string | null;
  important_dates?: ImportantDate[] | null;
}

function SessionStatusIcon({ status }: { status: string }) {
  if (status === 'completed') return <CheckCircle2 size={13} className="text-[#10b981] shrink-0" />;
  if (status === 'failed' || status === 'terminated') return <XCircle size={13} className="text-red-400 shrink-0" />;
  return <Loader2 size={13} className="animate-spin text-[#7c3aed] shrink-0" />;
}
function sessionLabel(status: string) {
  if (status === 'completed') return 'Concluída';
  if (status === 'failed') return 'Falhou';
  if (status === 'terminated') return 'Cancelada';
  return 'Em andamento';
}

const inputCls = 'rounded-[8px] border border-[#e5e7eb] bg-white px-3 py-1.5 text-sm text-[#111827] placeholder-[#9ca3af] focus:border-[#7c3aed] focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/20 dark:border-[#1f2937] dark:bg-[#111827] dark:text-[#f9fafb]';

export default function ClientsShow({ client, demands, sessions = [] }: { client: Client; demands: Demand[]; sessions?: Session[] }) {
  const { t } = useTranslation();

  // Session delete
  const [deletingSessionId, setDeletingSessionId] = useState<number | null>(null);
  const deleteSession = (id: number) =>
    router.delete(route('clients.research.destroy', [client.id, id]), { preserveScroll: true, onSuccess: () => setDeletingSessionId(null) });

  // Important dates — inline CRUD managed via a patch to clients.update
  const [dates, setDates] = useState<ImportantDate[]>(client.important_dates ?? []);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editBuf, setEditBuf] = useState<ImportantDate>({ label: '', month: 1, day: 1 });
  const [addingNew, setAddingNew] = useState(false);
  const [newDate, setNewDate] = useState<ImportantDate>({ label: '', month: 1, day: 1 });
  const [savingDates, setSavingDates] = useState(false);

  const persistDates = async (next: ImportantDate[]) => {
    setSavingDates(true);
    try {
      const csrf = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';
      const res = await fetch(route('clients.important-dates.update', client.id), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrf, 'Accept': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ important_dates: next }),
      });
      if (res.ok) setDates(next);
    } finally {
      setSavingDates(false);
    }
  };

  const saveEdit = () => {
    if (editingIdx === null) return;
    const next = dates.map((d, i) => i === editingIdx ? { ...editBuf } : d);
    persistDates(next);
    setEditingIdx(null);
  };

  const saveNew = () => {
    if (!newDate.label.trim()) return;
    const next = [...dates, { ...newDate }];
    persistDates(next);
    setAddingNew(false);
    setNewDate({ label: '', month: 1, day: 1 });
  };

  const removeDate = (idx: number) => persistDates(dates.filter((_, i) => i !== idx));

  const sorted = [...dates].sort((a, b) => a.month - b.month || a.day - b.day);

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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

        {/* Left column: client info + Deep Research */}
        <div className="space-y-5">
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
                  {client.channels.map(ch => <span key={ch} className="rounded-full bg-[#f3f4f6] px-2.5 py-0.5 text-xs capitalize text-[#6b7280] dark:bg-[#1f2937] dark:text-[#9ca3af]">{ch}</span>)}
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

          {/* Deep Research (compact) */}
          {sessions.length > 0 && (
            <div className="rounded-[12px] bg-white shadow-sm dark:bg-[#111827]">
              <div className="flex items-center gap-2 border-b border-[#e5e7eb] px-4 py-3 dark:border-[#1f2937]">
                <Brain size={14} className="text-[#7c3aed]" />
                <h3 className="text-sm font-semibold text-[#111827] dark:text-[#f9fafb]">Deep Research</h3>
              </div>
              <ul className="divide-y divide-[#f3f4f6] dark:divide-[#1f2937]">
                {sessions.slice(0, 5).map(s => (
                  <li key={s.id} className="group flex items-center gap-2 px-4 py-2.5 hover:bg-[#f9fafb] dark:hover:bg-[#0b0f14] transition-colors">
                    <Link href={route('clients.research.show', [client.id, s.id])} className="flex flex-1 items-center gap-2 min-w-0">
                      <SessionStatusIcon status={s.status} />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-[#111827] dark:text-[#f9fafb]">{sessionLabel(s.status)}</p>
                        <p className="text-[11px] text-[#9ca3af]">
                          {(s.completed_at || s.started_at)
                            ? new Date(s.completed_at ?? s.started_at!).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
                            : '—'}
                        </p>
                      </div>
                    </Link>
                    {deletingSessionId === s.id ? (
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => deleteSession(s.id)} className="rounded bg-red-500 px-1.5 py-0.5 text-[10px] text-white">OK</button>
                        <button onClick={() => setDeletingSessionId(null)} className="rounded border border-[#e5e7eb] px-1.5 py-0.5 text-[10px] text-[#6b7280]">×</button>
                      </div>
                    ) : (
                      <button onClick={() => setDeletingSessionId(s.id)} className="shrink-0 p-1 text-[#9ca3af] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 size={11} />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Right column: demands + important dates */}
        <div className="space-y-5">

          {/* Demands card */}
          <div className="rounded-[12px] bg-white p-5 shadow-sm dark:bg-[#111827]">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-[#111827] dark:text-[#f9fafb]">{t('nav.demands')}</p>
                <p className="text-xs text-[#9ca3af] mt-0.5">
                  {demands.length} demanda{demands.length !== 1 ? 's' : ''} ativa{demands.length !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={route('demands.index', { client_id: client.id, create: '1' })}
                  className="inline-flex items-center gap-1.5 rounded-[8px] border border-[#e5e7eb] px-3 py-1.5 text-sm font-medium text-[#6b7280] hover:border-[#7c3aed] hover:text-[#7c3aed] transition-colors dark:border-[#1f2937]"
                >
                  <Plus size={13} />
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
          </div>

          {/* Important dates card */}
          <div className="rounded-[12px] bg-white shadow-sm dark:bg-[#111827]">
            <div className="flex items-center gap-2 border-b border-[#e5e7eb] px-5 py-3.5 dark:border-[#1f2937]">
              <Calendar size={15} className="text-[#f59e0b]" />
              <h3 className="text-sm font-semibold text-[#111827] dark:text-[#f9fafb]">Datas Importantes</h3>
              <span className="ml-auto text-xs text-[#9ca3af]">Inseridas automaticamente no planejamento do mês</span>
            </div>

            {/* Date rows */}
            <div className="divide-y divide-[#f3f4f6] dark:divide-[#1f2937]">
              {sorted.length === 0 && !addingNew && (
                <p className="px-5 py-4 text-sm text-[#9ca3af]">Nenhuma data adicionada ainda.</p>
              )}
              {sorted.map((d, i) => {
                const origIdx = dates.findIndex(x => x.label === d.label && x.month === d.month && x.day === d.day);
                return editingIdx === origIdx ? (
                  <div key={i} className="flex items-center gap-2 px-5 py-3">
                    <input value={editBuf.label} onChange={e => setEditBuf(b => ({ ...b, label: e.target.value }))}
                      placeholder="Descrição" className={`${inputCls} flex-1`} autoFocus />
                    <select value={editBuf.month} onChange={e => setEditBuf(b => ({ ...b, month: Number(e.target.value) }))} className={`${inputCls} w-28`}>
                      {MONTHS_FULL.map((m, mi) => <option key={mi+1} value={mi+1}>{m}</option>)}
                    </select>
                    <input type="number" min={1} max={31} value={editBuf.day}
                      onChange={e => setEditBuf(b => ({ ...b, day: Number(e.target.value) }))}
                      placeholder="Dia" className={`${inputCls} w-16`} />
                    <button onClick={saveEdit} disabled={savingDates} className="rounded-[8px] bg-[#7c3aed] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#6d28d9] disabled:opacity-60">Salvar</button>
                    <button onClick={() => setEditingIdx(null)} className="rounded-[8px] border border-[#e5e7eb] px-3 py-1.5 text-xs text-[#6b7280] dark:border-[#1f2937]">{t('common.cancel')}</button>
                  </div>
                ) : (
                  <div key={i} className="group flex items-center gap-3 px-5 py-3 hover:bg-[#f9fafb] dark:hover:bg-[#0b0f14] transition-colors">
                    <span className="shrink-0 w-20 text-center rounded-full bg-[#fef3c7] px-2.5 py-1 text-xs font-semibold text-[#92400e]">
                      {String(d.day).padStart(2,'0')} {MONTHS_SHORT[d.month-1]}
                    </span>
                    <span className="flex-1 text-sm text-[#374151] dark:text-[#d1d5db]">{d.label}</span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setEditingIdx(origIdx); setEditBuf({ ...d }); }}
                        className="rounded p-1 text-[#9ca3af] hover:text-[#7c3aed]"><Pencil size={13} /></button>
                      <button onClick={() => removeDate(origIdx)}
                        className="rounded p-1 text-[#9ca3af] hover:text-red-500"><Trash2 size={13} /></button>
                    </div>
                  </div>
                );
              })}

              {/* Add new row */}
              {addingNew ? (
                <div className="flex items-center gap-2 px-5 py-3">
                  <input value={newDate.label} onChange={e => setNewDate(b => ({ ...b, label: e.target.value }))}
                    placeholder="Ex: Aniversário da empresa" className={`${inputCls} flex-1`} autoFocus />
                  <select value={newDate.month} onChange={e => setNewDate(b => ({ ...b, month: Number(e.target.value) }))} className={`${inputCls} w-28`}>
                    {MONTHS_FULL.map((m, mi) => <option key={mi+1} value={mi+1}>{m}</option>)}
                  </select>
                  <input type="number" min={1} max={31} value={newDate.day}
                    onChange={e => setNewDate(b => ({ ...b, day: Number(e.target.value) }))}
                    placeholder="Dia" className={`${inputCls} w-16`} />
                  <button onClick={saveNew} disabled={savingDates || !newDate.label.trim()} className="rounded-[8px] bg-[#7c3aed] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#6d28d9] disabled:opacity-60">Adicionar</button>
                  <button onClick={() => setAddingNew(false)} className="rounded-[8px] border border-[#e5e7eb] px-3 py-1.5 text-xs text-[#6b7280] dark:border-[#1f2937]">{t('common.cancel')}</button>
                </div>
              ) : (
                <div className="px-5 py-3">
                  <button onClick={() => setAddingNew(true)}
                    className="inline-flex items-center gap-1.5 rounded-[8px] border border-dashed border-[#d1d5db] px-3 py-1.5 text-xs text-[#6b7280] hover:border-[#7c3aed] hover:text-[#7c3aed] transition-colors dark:border-[#374151]">
                    <Plus size={13} />
                    Adicionar data importante
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
