// (c) 2026 Briefy contributors — AGPL-3.0
import { useEffect } from 'react';
import { useForm } from '@inertiajs/react';
import { X } from 'lucide-react';
import { DemandForm } from '@/Components/DemandForm';

interface Client { id: number; name: string; }
interface TeamMember { id: number; name: string; }

interface Props {
  client: Client;
  teamMembers: TeamMember[];
  onClose: () => void;
  onSuccess: () => void;
}

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

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    post(route('clients.demands.store', client.id), {
      onSuccess: () => { reset(); onSuccess(); },
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
            <h2 className="text-base font-semibold text-[#111827] dark:text-[#f9fafb]">
              Nova demanda
            </h2>
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
        <div className="px-6 py-5">
          <DemandForm
            data={data}
            errors={errors}
            processing={processing}
            setData={setData}
            onSubmit={submit}
            submitLabel="Criar demanda"
            onCancel={onClose}
            teamMembers={teamMembers}
          />
        </div>
      </div>
    </div>
  );
}
