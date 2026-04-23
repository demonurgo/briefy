// (c) 2026 Briefy contributors — AGPL-3.0
import { useTranslation } from 'react-i18next';
import InputError from '@/Components/InputError';

const CHANNELS = ['instagram', 'facebook', 'linkedin', 'tiktok', 'twitter', 'youtube', 'email', 'whatsapp', 'blog'];
const STATUSES = ['todo', 'in_progress', 'awaiting_feedback', 'in_review', 'approved'];

const inputClass = 'w-full rounded-[8px] border border-[#e5e7eb] bg-white px-3.5 py-2.5 text-sm text-[#111827] placeholder-[#9ca3af] focus:border-[#7c3aed] focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/20 dark:border-[#1f2937] dark:bg-[#111827] dark:text-[#f9fafb] dark:placeholder-[#6b7280]';
const labelClass = 'mb-1.5 block text-sm font-medium text-[#111827] dark:text-[#f9fafb]';

interface TeamMember { id: number; name: string; }

interface FormData {
  title: string;
  description: string;
  objective: string;
  tone: string;
  channel: string;
  deadline: string;
  status: string;
  type: string;
  assigned_to: string;
}

interface Props {
  data: FormData;
  errors: Partial<Record<keyof FormData, string>>;
  processing: boolean;
  setData: (key: keyof FormData, value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  submitLabel: string;
  onCancel: () => void;
  teamMembers: TeamMember[];
}

export function DemandForm({ data, errors, processing, setData, onSubmit, submitLabel, onCancel, teamMembers }: Props) {
  const { t } = useTranslation();

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <label className={labelClass}>{t('demands.title_field')} *</label>
        <input type="text" value={data.title} onChange={e => setData('title', e.target.value)} className={inputClass} autoFocus />
        <InputError message={errors.title} className="mt-1.5" />
      </div>

      <div>
        <label className={labelClass}>{t('demands.description')}</label>
        <textarea value={data.description} onChange={e => setData('description', e.target.value)} className={inputClass + ' resize-none'} rows={4} />
        <InputError message={errors.description} className="mt-1.5" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>{t('demands.objective')}</label>
          <textarea value={data.objective} onChange={e => setData('objective', e.target.value)} className={inputClass + ' resize-none'} rows={4} />
          <InputError message={errors.objective} className="mt-1.5" />
        </div>

        <div>
          <label className={labelClass}>{t('demands.tone')}</label>
          <input type="text" value={data.tone} onChange={e => setData('tone', e.target.value)} className={inputClass} placeholder="Ex: Formal, Descontraído..." />
          <InputError message={errors.tone} className="mt-1.5" />
        </div>

        <div>
          <label className={labelClass}>{t('demands.channel')}</label>
          <select value={data.channel} onChange={e => setData('channel', e.target.value)} className={inputClass}>
            <option value="">Selecione...</option>
            {CHANNELS.map(ch => <option key={ch} value={ch} className="capitalize">{ch}</option>)}
          </select>
          <InputError message={errors.channel} className="mt-1.5" />
        </div>

        <div>
          <label className={labelClass}>{t('demands.deadline')}</label>
          <input type="date" value={data.deadline} onChange={e => setData('deadline', e.target.value)} className={inputClass} />
          <InputError message={errors.deadline} className="mt-1.5" />
        </div>

        <div>
          <label className={labelClass}>{t('demands.status')}</label>
          <select value={data.status} onChange={e => setData('status', e.target.value)} className={inputClass}>
            {STATUSES.map(s => <option key={s} value={s}>{t(`demand.statuses.${s}`)}</option>)}
          </select>
        </div>

        <div>
          <label className={labelClass}>{t('demands.assignedTo')}</label>
          <select value={data.assigned_to} onChange={e => setData('assigned_to', e.target.value)} className={inputClass}>
            <option value="">Nenhum</option>
            {teamMembers.map(m => <option key={m.id} value={String(m.id)}>{m.name}</option>)}
          </select>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="rounded-[8px] border border-[#e5e7eb] px-4 py-2 text-sm font-medium text-[#6b7280] hover:bg-[#f3f4f6] transition-colors dark:border-[#1f2937] dark:hover:bg-[#1f2937]">
          {t('common.cancel')}
        </button>
        <button type="submit" disabled={processing} className="rounded-[8px] bg-[#7c3aed] px-4 py-2 text-sm font-semibold text-white hover:bg-[#6d28d9] transition-colors disabled:opacity-60">
          {processing ? t('common.loading') : submitLabel}
        </button>
      </div>
    </form>
  );
}
