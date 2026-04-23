// (c) 2026 Briefy contributors — AGPL-3.0
import { formatDate } from '@/utils/date';
import { useEffect, useRef, useState } from 'react';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Edit2, Link2, Paperclip, Pencil, Plus, Send, Trash2, X } from 'lucide-react';
import AppLayout from '@/Layouts/AppLayout';
import { StatusBadge } from '@/Components/StatusBadge';

interface User { id: number; name: string; }
interface Client { id: number; name: string; }
interface DemandFile {
  id: number;
  type: 'upload' | 'link';
  name: string;
  path_or_url: string;
  uploader: User | null;
}
interface Comment {
  id: number;
  body: string;
  user: User;
  created_at: string;
}
interface Demand {
  id: number;
  title: string;
  description: string | null;
  objective: string | null;
  tone: string | null;
  channel: string | null;
  deadline: string | null;
  status: string;
  type: string;
  client: Client;
  creator: User | null;
  assignee: User | null;
  files: DemandFile[];
  comments: Comment[];
}

const STATUSES = ['todo', 'in_progress', 'awaiting_feedback', 'in_review', 'approved'] as const;

function InlineStatusPicker({ demand }: { demand: Demand }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const changeStatus = (status: string) => {
    router.patch(route('demands.status.update', demand.id), { status }, { preserveScroll: true });
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="inline-flex items-center gap-1 rounded-full focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/30"
      >
        <StatusBadge status={demand.status} />
        <ChevronDown size={12} className="text-[#9ca3af]" />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-30 mt-1.5 min-w-[11rem] overflow-hidden rounded-[8px] border border-[#e5e7eb] bg-white shadow-lg dark:border-[#1f2937] dark:bg-[#111827]">
          {STATUSES.map(s => (
            <button
              key={s}
              onClick={() => changeStatus(s)}
              className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-[#f9fafb] dark:hover:bg-[#0b0f14] ${
                s === demand.status ? 'bg-[#f3f4f6] dark:bg-[#1f2937]' : ''
              }`}
            >
              <StatusBadge status={s} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const inputClass = 'w-full rounded-[8px] border border-[#e5e7eb] bg-white px-3 py-2 text-sm placeholder-[#9ca3af] focus:border-[#7c3aed] focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/20 dark:border-[#1f2937] dark:bg-[#0b0f14] dark:text-[#f9fafb]';

export default function DemandsShow({ demand, isAdmin }: { demand: Demand; isAdmin: boolean }) {
  const { t } = useTranslation();
  const { auth } = usePage<{ auth: { user: { id: number; name: string; email: string } }; [key: string]: unknown }>().props;

  const [showFileForm, setShowFileForm] = useState(false);
  const [fileType, setFileType] = useState<'upload' | 'link'>('upload');
  const [editingFileId, setEditingFileId] = useState<number | null>(null);
  const [editingFileName, setEditingFileName] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editingCommentBody, setEditingCommentBody] = useState('');

  const commentForm = useForm({ body: '' });
  const fileForm = useForm<{
    type: string; name: string; file: File | null; path_or_url: string;
  }>({ type: 'upload', name: '', file: null, path_or_url: '' });

  const submitComment = (e: React.FormEvent) => {
    e.preventDefault();
    commentForm.post(route('demands.comments.store', demand.id), {
      preserveScroll: true,
      onSuccess: () => commentForm.reset(),
    });
  };

  const submitFile = (e: React.FormEvent) => {
    e.preventDefault();
    fileForm.post(route('demands.files.store', demand.id), {
      preserveScroll: true,
      onSuccess: () => { fileForm.reset(); setShowFileForm(false); },
    });
  };

  const deleteFile = (fileId: number) => {
    router.delete(route('demands.files.destroy', [demand.id, fileId]), { preserveScroll: true });
  };

  const saveFileName = (fileId: number) => {
    router.patch(route('demands.files.update', [demand.id, fileId]), { name: editingFileName }, {
      preserveScroll: true,
      onSuccess: () => setEditingFileId(null),
    });
  };

  const saveComment = (commentId: number) => {
    router.patch(route('demands.comments.update', [demand.id, commentId]), { body: editingCommentBody }, {
      preserveScroll: true,
      onSuccess: () => setEditingCommentId(null),
    });
  };

  const deleteComment = (commentId: number) => {
    router.delete(route('demands.comments.destroy', [demand.id, commentId]), { preserveScroll: true });
  };

  return (
    <AppLayout
      title={demand.title}
      actions={
        <Link
          href={route('demands.edit', demand.id)}
          className="inline-flex items-center gap-1.5 rounded-[8px] border border-[#e5e7eb] px-3 py-1.5 text-sm font-medium text-[#6b7280] hover:border-[#7c3aed] hover:text-[#7c3aed] transition-colors dark:border-[#1f2937]"
        >
          <Edit2 size={14} />
          {t('common.edit')}
        </Link>
      }
    >
      <Head title={demand.title} />

      <div className="mb-4 flex items-center gap-1.5 text-sm text-[#6b7280]">
        <Link href={route('clients.index')} className="hover:text-[#111827] dark:hover:text-[#f9fafb]">
          {t('clients.title')}
        </Link>
        <span>/</span>
        <Link href={route('clients.show', demand.client.id)} className="hover:text-[#111827] dark:hover:text-[#f9fafb]">
          {demand.client.name}
        </Link>
        <span>/</span>
        <span className="max-w-[12rem] truncate text-[#111827] dark:text-[#f9fafb]">{demand.title}</span>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column: details + files */}
        <div className="space-y-4 lg:col-span-1">
          <div className="rounded-[12px] bg-white p-5 shadow-sm dark:bg-[#111827]">
            <h2 className="font-semibold text-[#111827] dark:text-[#f9fafb]">{demand.title}</h2>
            <div className="mt-2">
              <InlineStatusPicker demand={demand} />
            </div>

            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-[#9ca3af]">{t('demands.client')}</span>
                <Link href={route('clients.show', demand.client.id)} className="font-medium text-[#7c3aed] dark:text-[#a78bfa]">
                  {demand.client.name}
                </Link>
              </div>
              {demand.deadline && (
                <div className="flex items-center justify-between">
                  <span className="text-[#9ca3af]">{t('demands.deadline')}</span>
                  <span className="font-medium text-[#111827] dark:text-[#f9fafb]">
                    {formatDate(demand.deadline)}
                  </span>
                </div>
              )}
              {demand.assignee && (
                <div className="flex items-center justify-between">
                  <span className="text-[#9ca3af]">{t('demands.assignedTo')}</span>
                  <span className="font-medium text-[#111827] dark:text-[#f9fafb]">{demand.assignee.name}</span>
                </div>
              )}
              {demand.channel && (
                <div className="flex items-center justify-between">
                  <span className="text-[#9ca3af]">{t('demands.channel')}</span>
                  <span className="font-medium capitalize text-[#111827] dark:text-[#f9fafb]">{demand.channel}</span>
                </div>
              )}
              {demand.tone && (
                <div className="flex items-center justify-between">
                  <span className="text-[#9ca3af]">{t('demands.tone')}</span>
                  <span className="font-medium text-[#111827] dark:text-[#f9fafb]">{demand.tone}</span>
                </div>
              )}
            </div>

            {demand.objective && (
              <div className="mt-4 border-t border-[#e5e7eb] pt-4 dark:border-[#1f2937]">
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-[#9ca3af]">{t('demands.objective')}</p>
                <p className="text-sm text-[#6b7280]">{demand.objective}</p>
              </div>
            )}
            {demand.description && (
              <div className="mt-4 border-t border-[#e5e7eb] pt-4 dark:border-[#1f2937]">
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-[#9ca3af]">{t('demands.description')}</p>
                <p className="whitespace-pre-wrap text-sm text-[#6b7280]">{demand.description}</p>
              </div>
            )}
          </div>

          {/* Files */}
          <div className="rounded-[12px] bg-white shadow-sm dark:bg-[#111827]">
            <div className="flex items-center justify-between border-b border-[#e5e7eb] px-5 py-3.5 dark:border-[#1f2937]">
              <h3 className="font-semibold text-[#111827] dark:text-[#f9fafb]">{t('demands.files')}</h3>
              <button
                onClick={() => setShowFileForm(v => !v)}
                className="inline-flex items-center gap-1 text-sm font-medium text-[#7c3aed] hover:text-[#6d28d9] dark:text-[#a78bfa]"
              >
                <Plus size={14} />
                {t('demands.addFile')}
              </button>
            </div>

            {showFileForm && (
              <form onSubmit={submitFile} className="space-y-3 border-b border-[#e5e7eb] px-5 py-4 dark:border-[#1f2937]">
                <div className="flex gap-2">
                  {(['upload', 'link'] as const).map(ft => (
                    <button key={ft} type="button"
                      onClick={() => { setFileType(ft); fileForm.setData('type', ft); }}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${fileType === ft ? 'bg-[#7c3aed] text-white' : 'bg-[#f3f4f6] text-[#6b7280] dark:bg-[#1f2937] dark:text-[#9ca3af]'}`}
                    >
                      {ft === 'upload' ? t('demands.uploadFile') : t('demands.addLink')}
                    </button>
                  ))}
                </div>
                <input type="text" placeholder={t('demands.fileName')} value={fileForm.data.name}
                  onChange={e => fileForm.setData('name', e.target.value)} className={inputClass} />
                {fileType === 'upload' ? (
                  <input type="file" onChange={e => fileForm.setData('file', e.target.files?.[0] ?? null)}
                    className="block w-full text-sm text-[#6b7280] file:mr-3 file:rounded-[8px] file:border-0 file:bg-[#7c3aed] file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white hover:file:bg-[#6d28d9]" />
                ) : (
                  <input type="url" placeholder={t('demands.linkUrl')} value={fileForm.data.path_or_url}
                    onChange={e => fileForm.setData('path_or_url', e.target.value)} className={inputClass} />
                )}
                <div className="flex gap-2">
                  <button type="submit" disabled={fileForm.processing}
                    className="rounded-[8px] bg-[#7c3aed] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#6d28d9] disabled:opacity-60">
                    {t('demands.send')}
                  </button>
                  <button type="button" onClick={() => setShowFileForm(false)}
                    className="rounded-[8px] border border-[#e5e7eb] px-3 py-1.5 text-xs text-[#6b7280] dark:border-[#1f2937]">
                    {t('common.cancel')}
                  </button>
                </div>
              </form>
            )}

            {demand.files.length === 0 && !showFileForm ? (
              <p className="px-5 py-6 text-center text-sm text-[#9ca3af]">{t('demands.empty')}</p>
            ) : (
              <ul className="divide-y divide-[#e5e7eb] dark:divide-[#1f2937]">
                {demand.files.map(f => (
                  <li key={f.id} className="px-5 py-3">
                    {editingFileId === f.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          autoFocus
                          type="text"
                          value={editingFileName}
                          onChange={e => setEditingFileName(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') saveFileName(f.id); if (e.key === 'Escape') setEditingFileId(null); }}
                          className="flex-1 rounded-[6px] border border-[#7c3aed] bg-white px-2 py-1 text-sm focus:outline-none dark:bg-[#0b0f14] dark:text-[#f9fafb]"
                        />
                        <button onClick={() => saveFileName(f.id)}
                          className="rounded-[6px] bg-[#7c3aed] px-2 py-1 text-xs font-medium text-white hover:bg-[#6d28d9]">
                          {t('common.save')}
                        </button>
                        <button onClick={() => setEditingFileId(null)}
                          className="text-[#9ca3af] hover:text-[#6b7280]">
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        {f.type === 'link' ? <Link2 size={15} className="shrink-0 text-[#9ca3af]" /> : <Paperclip size={15} className="shrink-0 text-[#9ca3af]" />}
                        <a
                          href={f.type === 'link' ? f.path_or_url : `/storage/${f.path_or_url}`}
                          target="_blank" rel="noreferrer"
                          className="flex-1 truncate text-sm text-[#7c3aed] hover:underline dark:text-[#a78bfa]"
                        >
                          {f.name}
                        </a>
                        <button
                          onClick={() => { setEditingFileId(f.id); setEditingFileName(f.name); }}
                          className="shrink-0 text-[#9ca3af] transition-colors hover:text-[#7c3aed]"
                        >
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => deleteFile(f.id)}
                          className="shrink-0 text-[#9ca3af] transition-colors hover:text-red-500">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Right column: comments */}
        <div className="lg:col-span-2">
          <div className="rounded-[12px] bg-white shadow-sm dark:bg-[#111827]">
            <div className="border-b border-[#e5e7eb] px-6 py-4 dark:border-[#1f2937]">
              <h3 className="font-semibold text-[#111827] dark:text-[#f9fafb]">{t('demands.comments')}</h3>
            </div>

            {demand.comments.length === 0 ? (
              <p className="px-6 py-8 text-center text-sm text-[#9ca3af]">{t('demands.empty')}</p>
            ) : (
              <ul className="divide-y divide-[#e5e7eb] dark:divide-[#1f2937]">
                {demand.comments.map(c => (
                  <li key={c.id} className="px-6 py-4">
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-[#111827] dark:text-[#f9fafb]">{c.user.name}</span>
                        <span className="text-xs text-[#9ca3af]">{new Date(c.created_at).toLocaleString('pt-BR')}</span>
                      </div>
                      {editingCommentId !== c.id && (c.user.id === auth.user.id || isAdmin) && (
                        <div className="flex items-center gap-1.5 opacity-0 transition-opacity [li:hover_&]:opacity-100">
                          {c.user.id === auth.user.id && (
                            <button
                              onClick={() => { setEditingCommentId(c.id); setEditingCommentBody(c.body); }}
                              className="text-[#9ca3af] transition-colors hover:text-[#7c3aed]"
                            >
                              <Pencil size={13} />
                            </button>
                          )}
                          <button onClick={() => deleteComment(c.id)}
                            className="text-[#9ca3af] transition-colors hover:text-red-500">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )}
                    </div>

                    {editingCommentId === c.id ? (
                      <div className="space-y-2">
                        <textarea
                          autoFocus
                          value={editingCommentBody}
                          onChange={e => setEditingCommentBody(e.target.value)}
                          rows={3}
                          className="w-full resize-none rounded-[8px] border border-[#7c3aed] bg-white px-3 py-2 text-sm text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/20 dark:bg-[#111827] dark:text-[#f9fafb]"
                        />
                        <div className="flex gap-2">
                          <button onClick={() => saveComment(c.id)}
                            className="rounded-[8px] bg-[#7c3aed] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#6d28d9]">
                            {t('common.save')}
                          </button>
                          <button onClick={() => setEditingCommentId(null)}
                            className="rounded-[8px] border border-[#e5e7eb] px-3 py-1.5 text-xs text-[#6b7280] dark:border-[#1f2937]">
                            {t('common.cancel')}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap text-sm text-[#6b7280]">{c.body}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}

            <form onSubmit={submitComment} className="border-t border-[#e5e7eb] px-6 py-4 dark:border-[#1f2937]">
              <textarea
                value={commentForm.data.body}
                onChange={e => commentForm.setData('body', e.target.value)}
                placeholder={t('demands.writeComment')}
                rows={3}
                className="w-full resize-none rounded-[8px] border border-[#e5e7eb] bg-white px-3.5 py-2.5 text-sm text-[#111827] placeholder-[#9ca3af] focus:border-[#7c3aed] focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/20 dark:border-[#1f2937] dark:bg-[#111827] dark:text-[#f9fafb] dark:placeholder-[#6b7280]"
              />
              <div className="mt-3 flex justify-end">
                <button
                  type="submit"
                  disabled={commentForm.processing || !commentForm.data.body.trim()}
                  className="inline-flex items-center gap-1.5 rounded-[8px] bg-[#7c3aed] px-4 py-2 text-sm font-medium text-white hover:bg-[#6d28d9] transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Send size={13} />
                  {t('demands.send')}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
