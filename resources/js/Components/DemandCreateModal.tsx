// (c) 2026 Briefy contributors — AGPL-3.0
import { useEffect, useRef, useState } from 'react';
import { router, useForm } from '@inertiajs/react';
import { Link2, Paperclip, Trash2, X } from 'lucide-react';
import { DemandForm } from '@/Components/DemandForm';

interface Client { id: number; name: string; }
interface TeamMember { id: number; name: string; }

interface PendingFile {
  key: string;
  type: 'upload' | 'link';
  name: string;
  file?: File;
  url?: string;
}

interface Props {
  client: Client;
  teamMembers: TeamMember[];
  onClose: () => void;
  onSuccess: () => void;
}

const inputClass = 'w-full rounded-[8px] border border-[#e5e7eb] bg-white px-3 py-2 text-sm placeholder-[#9ca3af] focus:border-[#7c3aed] focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/20 dark:border-[#1f2937] dark:bg-[#111827] dark:text-[#f9fafb]';

export function DemandCreateModal({ client, teamMembers, onClose, onSuccess }: Props) {
  const { data, setData, post, processing, errors, reset } = useForm({
    title: '',
    description: '',
    objective: '',
    tone: '',
    channel: '',
    deadline: '',
    status: 'todo',
    type: 'demand',
    assigned_to: '',
  });

  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [addingType, setAddingType] = useState<'upload' | 'link' | null>(null);
  const [newFileName, setNewFileName] = useState('');
  const [newFileUrl, setNewFileUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const addFileEntry = () => {
    if (addingType === 'upload' && fileInputRef.current?.files?.[0]) {
      const file = fileInputRef.current.files[0];
      setPendingFiles(prev => [...prev, {
        key: crypto.randomUUID(),
        type: 'upload',
        name: newFileName || file.name,
        file,
      }]);
    } else if (addingType === 'link' && newFileUrl.trim()) {
      setPendingFiles(prev => [...prev, {
        key: crypto.randomUUID(),
        type: 'link',
        name: newFileName || newFileUrl,
        url: newFileUrl.trim(),
      }]);
    }
    setNewFileName('');
    setNewFileUrl('');
    setAddingType(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const uploadPendingFiles = async (demandId: number) => {
    for (const pf of pendingFiles) {
      await new Promise<void>((resolve) => {
        const formData = new FormData();
        formData.append('type', pf.type);
        formData.append('name', pf.name);
        if (pf.type === 'upload' && pf.file) {
          formData.append('file', pf.file);
        } else if (pf.type === 'link' && pf.url) {
          formData.append('path_or_url', pf.url);
        }
        router.post(route('demands.files.store', demandId), formData as unknown as Record<string, string>, {
          forceFormData: true,
          onFinish: () => resolve(),
        });
      });
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    post(route('clients.demands.store', client.id), {
      onSuccess: async (page) => {
        reset();
        // Extract new demand ID from redirect URL (?demand=ID)
        const url = new URL(page.url, window.location.origin);
        const demandId = Number(url.searchParams.get('demand'));

        if (pendingFiles.length > 0 && demandId) {
          setUploading(true);
          await uploadPendingFiles(demandId);
          setUploading(false);
        }

        onSuccess();
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto px-4 py-10">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 dark:bg-black/60"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-2xl rounded-[12px] bg-white shadow-xl dark:bg-[#111827]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#e5e7eb] dark:border-[#1f2937] px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-[#111827] dark:text-[#f9fafb]">Nova demanda</h2>
            <p className="text-xs text-[#6b7280] mt-0.5">{client.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-[6px] text-[#9ca3af] hover:text-[#374151] dark:hover:text-[#d1d5db] hover:bg-[#f3f4f6] dark:hover:bg-[#1f2937] transition-colors"
            aria-label="Fechar"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <div className="px-6 py-5 space-y-6">
          <DemandForm
            data={data}
            errors={errors}
            processing={processing || uploading}
            setData={setData}
            onSubmit={submit}
            submitLabel={uploading ? 'Enviando arquivos...' : pendingFiles.length > 0 ? `Criar demanda + ${pendingFiles.length} arquivo${pendingFiles.length > 1 ? 's' : ''}` : 'Criar demanda'}
            onCancel={onClose}
            teamMembers={teamMembers}
          />

          {/* Attachments section */}
          <div className="border-t border-[#e5e7eb] dark:border-[#1f2937] pt-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium uppercase tracking-wide text-[#9ca3af]">
                Anexos {pendingFiles.length > 0 && `(${pendingFiles.length})`}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setAddingType('upload')}
                  className="inline-flex items-center gap-1 text-xs font-medium text-[#7c3aed] hover:text-[#6d28d9] transition-colors"
                >
                  <Paperclip size={12} /> Arquivo
                </button>
                <button
                  type="button"
                  onClick={() => setAddingType('link')}
                  className="inline-flex items-center gap-1 text-xs font-medium text-[#7c3aed] hover:text-[#6d28d9] transition-colors"
                >
                  <Link2 size={12} /> Link
                </button>
              </div>
            </div>

            {/* Add file form */}
            {addingType && (
              <div className="mb-3 space-y-2 rounded-[8px] border border-[#e5e7eb] dark:border-[#1f2937] p-3">
                <input
                  type="text"
                  placeholder="Nome (opcional)"
                  value={newFileName}
                  onChange={e => setNewFileName(e.target.value)}
                  className={inputClass}
                />
                {addingType === 'upload' ? (
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="w-full text-sm text-[#6b7280] file:mr-3 file:rounded-[6px] file:border-0 file:bg-[#7c3aed]/10 file:px-3 file:py-1 file:text-xs file:font-medium file:text-[#7c3aed] hover:file:bg-[#7c3aed]/20"
                  />
                ) : (
                  <input
                    type="url"
                    placeholder="https://..."
                    value={newFileUrl}
                    onChange={e => setNewFileUrl(e.target.value)}
                    className={inputClass}
                  />
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={addFileEntry}
                    className="rounded-[6px] bg-[#7c3aed] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#6d28d9] transition-colors"
                  >
                    Adicionar
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAddingType(null); setNewFileName(''); setNewFileUrl(''); }}
                    className="rounded-[6px] px-3 py-1.5 text-xs text-[#6b7280] hover:text-[#374151] dark:hover:text-[#d1d5db] transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {/* Pending files list */}
            {pendingFiles.length > 0 && (
              <div className="space-y-1">
                {pendingFiles.map(pf => (
                  <div key={pf.key} className="flex items-center gap-2 rounded-[6px] border border-[#e5e7eb] dark:border-[#1f2937] px-3 py-2">
                    {pf.type === 'upload'
                      ? <Paperclip size={12} className="shrink-0 text-[#9ca3af]" />
                      : <Link2 size={12} className="shrink-0 text-[#9ca3af]" />
                    }
                    <span className="flex-1 truncate text-xs text-[#374151] dark:text-[#d1d5db]">{pf.name}</span>
                    <button
                      type="button"
                      onClick={() => setPendingFiles(prev => prev.filter(f => f.key !== pf.key))}
                      className="shrink-0 text-[#9ca3af] hover:text-[#ef4444] transition-colors"
                      aria-label="Remover"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
