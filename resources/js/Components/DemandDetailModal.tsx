// (c) 2026 Briefy contributors — AGPL-3.0
import { useEffect, useRef, useState } from 'react';
import { Link, router, useForm, usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { TabGroup, TabList, Tab, TabPanels, TabPanel } from '@headlessui/react';
import { ChevronDown, Download, Edit2, FileText, Link2, MessageSquare, Paperclip, Pencil, Plus, Save, Send, Trash2, X } from 'lucide-react';
import { StatusBadge } from '@/Components/StatusBadge';
import { AiIcon } from '@/Components/AiIcon';
import BriefTab from '@/Components/BriefTab';
import ChatTab from '@/Components/ChatTab';
import type { AiConversation } from '@/types';

interface User { id: number; name: string; email: string; }
interface Client { id: number; name: string; }
interface TeamMember { id: number; name: string; }
interface DemandFile { id: number; type: 'upload' | 'link'; name: string; path_or_url: string; }
interface Comment { id: number; body: string; user: User; created_at: string; }
interface Demand {
  id: number; title: string; description: string | null; objective: string | null;
  tone: string | null; channel: string | null; deadline: string | null;
  status: string; type: string; client: Client;
  assignee: User | null; files: DemandFile[]; comments: Comment[];
  ai_analysis?: { brief?: string; brief_generated_at?: string; brief_edited_at?: string };
  /** Eager-loaded by DemandController (Plan 09) — latest AiConversation for this demand. */
  conversations?: AiConversation[];
}

const STATUSES = ['todo', 'in_progress', 'awaiting_feedback', 'in_review', 'approved'] as const;
const CHANNELS = ['instagram', 'facebook', 'linkedin', 'tiktok', 'twitter', 'youtube', 'email', 'whatsapp', 'blog'];

const inputClass = 'w-full rounded-[8px] border border-[#e5e7eb] bg-white px-3 py-2 text-sm placeholder-[#9ca3af] focus:border-[#7c3aed] focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/20 dark:border-[#1f2937] dark:bg-[#0b0f14] dark:text-[#f9fafb]';
const labelClass = 'mb-1 block text-xs font-medium uppercase tracking-wide text-[#9ca3af]';

function InlineStatusPicker({ demand }: { demand: Demand }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  const changeStatus = (status: string) => {
    router.patch(route('demands.status.update', demand.id), { status }, { preserveScroll: true, only: ['demands', 'selectedDemand'] });
    setOpen(false);
  };
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(v => !v)} className="inline-flex items-center gap-1 rounded-full focus:outline-none">
        <StatusBadge status={demand.status} />
        <ChevronDown size={12} className="text-[#9ca3af]" />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-30 mt-1.5 min-w-[11rem] overflow-hidden rounded-[8px] border border-[#e5e7eb] bg-white shadow-lg dark:border-[#1f2937] dark:bg-[#111827]">
          {STATUSES.map(s => (
            <button key={s} onClick={() => changeStatus(s)}
              className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-[#f9fafb] dark:hover:bg-[#0b0f14] ${s === demand.status ? 'bg-[#f3f4f6] dark:bg-[#1f2937]' : ''}`}>
              <StatusBadge status={s} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface Props { demand: Demand; isAdmin: boolean; teamMembers: TeamMember[]; onClose: () => void; }

export function DemandDetailModal({ demand, isAdmin, teamMembers, onClose }: Props) {
  const { t } = useTranslation();
  const { auth } = usePage<{ auth: { user: User; organization?: { has_anthropic_key: boolean } }; [key: string]: unknown }>().props;

  const [isEditing, setIsEditing] = useState(false);
  const [showFileForm, setShowFileForm] = useState(false);
  const [fileType, setFileType] = useState<'upload' | 'link'>('upload');
  const [editingFileId, setEditingFileId] = useState<number | null>(null);
  const [editingFileName, setEditingFileName] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editingCommentBody, setEditingCommentBody] = useState('');

  /** Shared state for Brief generation — owned here so header button can trigger from any tab */
  const [generatingBrief, setGeneratingBrief] = useState(false);

  const hasKey = auth?.organization?.has_anthropic_key ?? false;

  const commentForm = useForm({ body: '' });
  const fileForm = useForm<{ type: string; name: string; file: File | null; path_or_url: string }>(
    { type: 'upload', name: '', file: null, path_or_url: '' }
  );
  const editForm = useForm({
    title: demand.title,
    description: demand.description ?? '',
    objective: demand.objective ?? '',
    tone: demand.tone ?? '',
    channel: demand.channel ?? '',
    deadline: demand.deadline ? demand.deadline.substring(0, 10) : '',
    assigned_to: demand.assignee ? String(demand.assignee.id) : '',
  });

  // Keep form in sync when demand reloads (e.g. after comment/file actions)
  useEffect(() => {
    if (!isEditing) {
      editForm.setData({
        title: demand.title,
        description: demand.description ?? '',
        objective: demand.objective ?? '',
        tone: demand.tone ?? '',
        channel: demand.channel ?? '',
        deadline: demand.deadline ? demand.deadline.substring(0, 10) : '',
        assigned_to: demand.assignee ? String(demand.assignee.id) : '',
      });
    }
  }, [demand]);

  const submitEdit = (e: React.FormEvent) => {
    e.preventDefault();
    editForm.put(route('demands.inline.update', demand.id), {
      preserveScroll: true,
      only: ['selectedDemand'],
      onSuccess: () => setIsEditing(false),
    });
  };

  const cancelEdit = () => {
    editForm.reset();
    setIsEditing(false);
  };

  const submitComment = (e: React.FormEvent) => {
    e.preventDefault();
    commentForm.post(route('demands.comments.store', demand.id), {
      preserveScroll: true,
      only: ['selectedDemand'],
      onSuccess: () => commentForm.reset(),
    });
  };

  const submitFile = (e: React.FormEvent) => {
    e.preventDefault();
    fileForm.post(route('demands.files.store', demand.id), {
      preserveScroll: true,
      only: ['selectedDemand'],
      onSuccess: () => { fileForm.reset(); setShowFileForm(false); },
    });
  };

  const deleteFile = (id: number) => router.delete(route('demands.files.destroy', [demand.id, id]), { preserveScroll: true, only: ['selectedDemand'] });
  const saveFileName = (id: number) => router.patch(route('demands.files.update', [demand.id, id]), { name: editingFileName }, { preserveScroll: true, only: ['selectedDemand'], onSuccess: () => setEditingFileId(null) });
  const saveComment = (id: number) => router.patch(route('demands.comments.update', [demand.id, id]), { body: editingCommentBody }, { preserveScroll: true, only: ['selectedDemand'], onSuccess: () => setEditingCommentId(null) });
  const deleteComment = (id: number) => router.delete(route('demands.comments.destroy', [demand.id, id]), { preserveScroll: true, only: ['selectedDemand'] });

  // ── Tab definitions ────────────────────────────────────────────────────────
  const tabs = [
    { key: 'comments', label: t('demands.tabs.comments'), icon: <MessageSquare size={16} /> },
    { key: 'files',    label: t('demands.tabs.files'),    icon: <Paperclip size={16} /> },
    { key: 'brief',    label: t('demands.tabs.brief'),    icon: <FileText size={16} /> },
    { key: 'chat',     label: t('ai.chat.tab'),           icon: <AiIcon size={20} alt={t('ai.assistantIcon')} /> },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative z-10 flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-[16px] bg-[#f9fafb] shadow-2xl dark:bg-[#0b0f14]"
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4 border-b border-[#e5e7eb] bg-white px-6 py-4 dark:border-[#1f2937] dark:bg-[#111827]">
          <div className="min-w-0 flex-1">
            {isEditing ? (
              <input
                autoFocus
                type="text"
                value={editForm.data.title}
                onChange={e => editForm.setData('title', e.target.value)}
                className="w-full rounded-[8px] border border-[#7c3aed] bg-white px-3 py-1.5 text-base font-semibold text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/20 dark:bg-[#0b0f14] dark:text-[#f9fafb]"
              />
            ) : (
              <h2 className="truncate text-base font-semibold text-[#111827] dark:text-[#f9fafb]">{demand.title}</h2>
            )}
            <div className="mt-1.5">
              <InlineStatusPicker demand={demand} />
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {isEditing ? (
              <>
                <button
                  onClick={submitEdit}
                  disabled={editForm.processing}
                  className="inline-flex items-center gap-1.5 rounded-[8px] bg-[#7c3aed] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#6d28d9] transition-colors disabled:opacity-60"
                >
                  <Save size={14} />
                  {t('common.save')}
                </button>
                <button
                  onClick={cancelEdit}
                  className="inline-flex items-center gap-1.5 rounded-[8px] border border-[#e5e7eb] px-3 py-1.5 text-sm font-medium text-[#6b7280] hover:bg-[#f3f4f6] transition-colors dark:border-[#1f2937] dark:hover:bg-[#1f2937]"
                >
                  {t('common.cancel')}
                </button>
              </>
            ) : (
              <>
                {/* "Gerar Brief" / "Regenerar" header button — visible on all tabs (D-02) */}
                <button
                  type="button"
                  onClick={() => hasKey && setGeneratingBrief(true)}
                  disabled={!hasKey || generatingBrief}
                  title={!hasKey ? t('ai.brief.errors.serviceUnavailable') : undefined}
                  className="inline-flex items-center gap-1.5 rounded-[8px] bg-[#7c3aed] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#6d28d9] disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/40 transition-colors"
                >
                  <AiIcon size={16} spinning={generatingBrief} />
                  {generatingBrief
                    ? t('ai.brief.generating')
                    : demand.ai_analysis?.brief
                      ? t('ai.brief.regenerate')
                      : t('ai.brief.generate')
                  }
                </button>
                <button
                  onClick={() => setIsEditing(true)}
                  className="inline-flex items-center gap-1.5 rounded-[8px] border border-[#e5e7eb] px-3 py-1.5 text-sm font-medium text-[#6b7280] hover:border-[#7c3aed] hover:text-[#7c3aed] transition-colors dark:border-[#1f2937]"
                >
                  <Edit2 size={14} />
                  {t('common.edit')}
                </button>
                <button onClick={onClose} className="rounded-[8px] p-1.5 text-[#9ca3af] hover:bg-[#f3f4f6] hover:text-[#6b7280] transition-colors dark:hover:bg-[#1f2937]">
                  <X size={18} />
                </button>
              </>
            )}
          </div>
        </div>

        {/* ── Body ────────────────────────────────────────────────────────── */}
        <div className="grid flex-1 grid-cols-1 gap-0 overflow-hidden md:grid-cols-3">

          {/* Left column: metadata details + edit form */}
          <div className="overflow-y-auto border-r border-[#e5e7eb] dark:border-[#1f2937] md:col-span-1 no-scrollbar">
            {isEditing ? (
              <form onSubmit={submitEdit} className="space-y-4 p-5">
                <div>
                  <label className={labelClass}>{t('demands.description')}</label>
                  <textarea value={editForm.data.description} onChange={e => editForm.setData('description', e.target.value)}
                    rows={4} className={inputClass + ' resize-none'} />
                </div>
                <div>
                  <label className={labelClass}>{t('demands.objective')}</label>
                  <input type="text" value={editForm.data.objective} onChange={e => editForm.setData('objective', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>{t('demands.tone')}</label>
                  <input type="text" value={editForm.data.tone} onChange={e => editForm.setData('tone', e.target.value)} className={inputClass} placeholder="Ex: Formal, Descontraído..." />
                </div>
                <div>
                  <label className={labelClass}>{t('demands.channel')}</label>
                  <select value={editForm.data.channel} onChange={e => editForm.setData('channel', e.target.value)} className={inputClass}>
                    <option value="">Selecione...</option>
                    {CHANNELS.map(ch => <option key={ch} value={ch} className="capitalize">{ch}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>{t('demands.deadline')}</label>
                  <input type="date" value={editForm.data.deadline} onChange={e => editForm.setData('deadline', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>{t('demands.assignedTo')}</label>
                  <select value={editForm.data.assigned_to} onChange={e => editForm.setData('assigned_to', e.target.value)} className={inputClass}>
                    <option value="">Nenhum</option>
                    {teamMembers.map(m => <option key={m.id} value={String(m.id)}>{m.name}</option>)}
                  </select>
                </div>
                {Object.values(editForm.errors).map((msg, i) => (
                  <p key={i} className="text-xs text-red-500">{msg}</p>
                ))}
              </form>
            ) : (
              <div className="p-5 space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#9ca3af]">{t('demands.client')}</span>
                  <Link href={route('clients.show', demand.client.id)} onClick={onClose} className="font-medium text-[#7c3aed] dark:text-[#a78bfa]">{demand.client.name}</Link>
                </div>
                {demand.deadline && (
                  <div className="flex justify-between">
                    <span className="text-[#9ca3af]">{t('demands.deadline')}</span>
                    <span className="font-medium text-[#111827] dark:text-[#f9fafb]">{new Date(demand.deadline).toLocaleDateString('pt-BR')}</span>
                  </div>
                )}
                {demand.assignee && (
                  <div className="flex justify-between">
                    <span className="text-[#9ca3af]">{t('demands.assignedTo')}</span>
                    <span className="font-medium text-[#111827] dark:text-[#f9fafb]">{demand.assignee.name}</span>
                  </div>
                )}
                {demand.channel && (
                  <div className="flex justify-between">
                    <span className="text-[#9ca3af]">{t('demands.channel')}</span>
                    <span className="font-medium capitalize text-[#111827] dark:text-[#f9fafb]">{demand.channel}</span>
                  </div>
                )}
                {demand.tone && (
                  <div className="flex justify-between">
                    <span className="text-[#9ca3af]">{t('demands.tone')}</span>
                    <span className="font-medium text-[#111827] dark:text-[#f9fafb]">{demand.tone}</span>
                  </div>
                )}
                {demand.objective && (
                  <div className="border-t border-[#e5e7eb] pt-3 dark:border-[#1f2937]">
                    <p className="mb-1 text-xs font-medium uppercase tracking-wide text-[#9ca3af]">{t('demands.objective')}</p>
                    <p className="text-[#6b7280]">{demand.objective}</p>
                  </div>
                )}
                {demand.description && (
                  <div className="border-t border-[#e5e7eb] pt-3 dark:border-[#1f2937]">
                    <p className="mb-1 text-xs font-medium uppercase tracking-wide text-[#9ca3af]">{t('demands.description')}</p>
                    <p className="whitespace-pre-wrap text-[#6b7280]">{demand.description}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Right column: 4-tab panel ──────────────────────────────────── */}
          <div className="flex flex-col overflow-hidden md:col-span-2">
            <TabGroup as="div" className="flex h-full flex-col overflow-hidden">

              {/* Tab bar */}
              <TabList className="flex shrink-0 border-b border-[#e5e7eb] bg-white dark:border-[#1f2937] dark:bg-[#111827]">
                {tabs.map(({ key, label, icon }) => (
                  <Tab
                    key={key}
                    className={({ selected }: { selected: boolean }) =>
                      `flex h-11 items-center gap-2 px-4 text-sm font-semibold transition-colors focus:outline-none ${
                        selected
                          ? 'border-b-2 border-[#7c3aed] -mb-px text-[#7c3aed] dark:text-[#a78bfa]'
                          : 'text-[#6b7280] dark:text-[#9ca3af] hover:text-[#111827] dark:hover:text-[#f9fafb]'
                      }`
                    }
                  >
                    {icon}
                    {label}
                  </Tab>
                ))}
              </TabList>

              {/* Tab panels */}
              <TabPanels className="flex flex-1 overflow-hidden">

                {/* Tab 1: Comentários */}
                <TabPanel className="flex h-full w-full flex-col overflow-hidden focus:outline-none">
                  <div className="flex-1 overflow-y-auto no-scrollbar">
                    {demand.comments.length === 0
                      ? <p className="px-6 py-8 text-center text-sm text-[#9ca3af]">{t('demands.empty')}</p>
                      : <ul className="divide-y divide-[#e5e7eb] dark:divide-[#1f2937]">
                          {demand.comments.map(c => (
                            <li key={c.id} className="group px-6 py-4">
                              <div className="mb-1.5 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-[#111827] dark:text-[#f9fafb]">{c.user.name}</span>
                                  <span className="text-xs text-[#9ca3af]">{new Date(c.created_at).toLocaleString('pt-BR')}</span>
                                </div>
                                {editingCommentId !== c.id && (c.user.id === auth.user.id || isAdmin) && (
                                  <div className="flex items-center gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                                    {c.user.id === auth.user.id && (
                                      <button onClick={() => { setEditingCommentId(c.id); setEditingCommentBody(c.body); }} className="text-[#9ca3af] hover:text-[#7c3aed]"><Pencil size={13} /></button>
                                    )}
                                    <button onClick={() => deleteComment(c.id)} className="text-[#9ca3af] hover:text-red-500"><Trash2 size={13} /></button>
                                  </div>
                                )}
                              </div>
                              {editingCommentId === c.id ? (
                                <div className="space-y-2">
                                  <textarea autoFocus value={editingCommentBody} onChange={e => setEditingCommentBody(e.target.value)} rows={3}
                                    className="w-full resize-none rounded-[8px] border border-[#7c3aed] bg-white px-3 py-2 text-sm text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/20 dark:bg-[#111827] dark:text-[#f9fafb]" />
                                  <div className="flex gap-2">
                                    <button onClick={() => saveComment(c.id)} className="rounded-[8px] bg-[#7c3aed] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#6d28d9]">{t('common.save')}</button>
                                    <button onClick={() => setEditingCommentId(null)} className="rounded-[8px] border border-[#e5e7eb] px-3 py-1.5 text-xs text-[#6b7280] dark:border-[#1f2937]">{t('common.cancel')}</button>
                                  </div>
                                </div>
                              ) : (
                                <p className="whitespace-pre-wrap text-sm text-[#6b7280]">{c.body}</p>
                              )}
                            </li>
                          ))}
                        </ul>
                    }
                  </div>
                  <form onSubmit={submitComment} className="shrink-0 border-t border-[#e5e7eb] px-6 py-4 dark:border-[#1f2937]">
                    <textarea value={commentForm.data.body} onChange={e => commentForm.setData('body', e.target.value)}
                      placeholder={t('demands.writeComment')} rows={3}
                      className="w-full resize-none rounded-[8px] border border-[#e5e7eb] bg-white px-3.5 py-2.5 text-sm text-[#111827] placeholder-[#9ca3af] focus:border-[#7c3aed] focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/20 dark:border-[#1f2937] dark:bg-[#111827] dark:text-[#f9fafb] dark:placeholder-[#6b7280]" />
                    <div className="mt-3 flex justify-end">
                      <button type="submit" disabled={commentForm.processing || !commentForm.data.body.trim()}
                        className="inline-flex items-center gap-1.5 rounded-[8px] bg-[#7c3aed] px-4 py-2 text-sm font-medium text-white hover:bg-[#6d28d9] transition-colors disabled:cursor-not-allowed disabled:opacity-60">
                        <Send size={13} />{t('demands.send')}
                      </button>
                    </div>
                  </form>
                </TabPanel>

                {/* Tab 2: Arquivos */}
                <TabPanel className="flex h-full w-full flex-col overflow-hidden focus:outline-none">
                  <div className="overflow-y-auto no-scrollbar">
                    <div className="flex items-center justify-between px-5 py-3">
                      <span className="text-sm font-semibold text-[#111827] dark:text-[#f9fafb]">{t('demands.files')}</span>
                      <button onClick={() => setShowFileForm(v => !v)} className="inline-flex items-center gap-1 text-xs font-medium text-[#7c3aed] hover:text-[#6d28d9]">
                        <Plus size={13} />{t('demands.addFile')}
                      </button>
                    </div>
                    {showFileForm && (
                      <form onSubmit={submitFile} className="space-y-2 border-t border-[#e5e7eb] px-5 py-3 dark:border-[#1f2937]">
                        <div className="flex gap-2">
                          {(['upload', 'link'] as const).map(ft => (
                            <button key={ft} type="button" onClick={() => { setFileType(ft); fileForm.setData('type', ft); }}
                              className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${fileType === ft ? 'bg-[#7c3aed] text-white' : 'bg-[#f3f4f6] text-[#6b7280] dark:bg-[#1f2937] dark:text-[#9ca3af]'}`}>
                              {ft === 'upload' ? t('demands.uploadFile') : t('demands.addLink')}
                            </button>
                          ))}
                        </div>
                        <input type="text" placeholder={t('demands.fileName')} value={fileForm.data.name} onChange={e => fileForm.setData('name', e.target.value)} className={inputClass} />
                        {fileType === 'upload'
                          ? <input type="file" onChange={e => fileForm.setData('file', e.target.files?.[0] ?? null)} className="block w-full text-xs text-[#6b7280] file:mr-2 file:rounded-[6px] file:border-0 file:bg-[#7c3aed] file:px-2 file:py-1 file:text-xs file:text-white" />
                          : <input type="url" placeholder={t('demands.linkUrl')} value={fileForm.data.path_or_url} onChange={e => fileForm.setData('path_or_url', e.target.value)} className={inputClass} />
                        }
                        <div className="flex gap-2">
                          <button type="submit" disabled={fileForm.processing} className="rounded-[6px] bg-[#7c3aed] px-2.5 py-1 text-xs font-medium text-white hover:bg-[#6d28d9] disabled:opacity-60">{t('demands.send')}</button>
                          <button type="button" onClick={() => setShowFileForm(false)} className="rounded-[6px] border border-[#e5e7eb] px-2.5 py-1 text-xs text-[#6b7280] dark:border-[#1f2937]">{t('common.cancel')}</button>
                        </div>
                      </form>
                    )}
                    {demand.files.length === 0 && !showFileForm
                      ? <p className="px-5 pb-4 text-xs text-[#9ca3af]">{t('demands.empty')}</p>
                      : <ul className="divide-y divide-[#e5e7eb] dark:divide-[#1f2937]">
                          {demand.files.map(f => (
                            <li key={f.id} className="px-5 py-2.5">
                              {editingFileId === f.id ? (
                                <div className="flex items-center gap-1.5">
                                  <input autoFocus type="text" value={editingFileName} onChange={e => setEditingFileName(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') saveFileName(f.id); if (e.key === 'Escape') setEditingFileId(null); }}
                                    className="flex-1 rounded-[6px] border border-[#7c3aed] px-2 py-1 text-xs focus:outline-none dark:bg-[#0b0f14] dark:text-[#f9fafb]" />
                                  <button onClick={() => saveFileName(f.id)} className="rounded-[6px] bg-[#7c3aed] px-2 py-1 text-xs text-white hover:bg-[#6d28d9]">{t('common.save')}</button>
                                  <button onClick={() => setEditingFileId(null)} className="text-[#9ca3af]"><X size={13} /></button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  {f.type === 'link' ? <Link2 size={13} className="shrink-0 text-[#9ca3af]" /> : <Paperclip size={13} className="shrink-0 text-[#9ca3af]" />}
                                  <a href={f.type === 'link' ? f.path_or_url : `/storage/${f.path_or_url}`} target="_blank" rel="noreferrer"
                                    className="flex-1 truncate text-xs text-[#7c3aed] hover:underline dark:text-[#a78bfa]">{f.name}</a>
                                  {f.type === 'upload' && (
                                    <a href={`/storage/${f.path_or_url}`} download={f.name} className="shrink-0 text-[#9ca3af] hover:text-[#7c3aed]"><Download size={12} /></a>
                                  )}
                                  <button onClick={() => { setEditingFileId(f.id); setEditingFileName(f.name); }} className="shrink-0 text-[#9ca3af] hover:text-[#7c3aed]"><Pencil size={12} /></button>
                                  <button onClick={() => deleteFile(f.id)} className="shrink-0 text-[#9ca3af] hover:text-red-500"><Trash2 size={12} /></button>
                                </div>
                              )}
                            </li>
                          ))}
                        </ul>
                    }
                  </div>
                </TabPanel>

                {/* Tab 3: Brief */}
                <TabPanel className="h-full w-full focus:outline-none">
                  <BriefTab
                    demand={demand}
                    generating={generatingBrief}
                    onGeneratingChange={setGeneratingBrief}
                  />
                </TabPanel>

                {/* Tab 4: Chat IA */}
                <TabPanel className="h-full w-full focus:outline-none">
                  <ChatTab demand={demand} />
                </TabPanel>

              </TabPanels>
            </TabGroup>
          </div>

        </div>
      </div>
    </div>
  );
}
