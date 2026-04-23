// (c) 2026 Briefy contributors — AGPL-3.0
import { useTranslation } from 'react-i18next';
import InputError from '@/Components/InputError';

const CHANNELS = ['instagram', 'facebook', 'linkedin', 'tiktok', 'twitter', 'youtube', 'email', 'whatsapp', 'website'];

const inputClass = 'w-full rounded-[8px] border border-[#e5e7eb] bg-white px-3.5 py-2.5 text-sm text-[#111827] placeholder-[#9ca3af] focus:border-[#7c3aed] focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/20 dark:border-[#1f2937] dark:bg-[#111827] dark:text-[#f9fafb] dark:placeholder-[#6b7280]';
const labelClass = 'mb-1.5 block text-sm font-medium text-[#111827] dark:text-[#f9fafb]';
const textareaClass = inputClass + ' resize-none';

interface FormData {
  name: string;
  segment: string;
  channels: string[];
  tone_of_voice: string;
  target_audience: string;
  brand_references: string;
  briefing: string;
  avatar: File | null;
}

interface Props {
  data: FormData;
  errors: Partial<Record<keyof FormData, string>>;
  processing: boolean;
  setData: (key: keyof FormData, value: any) => void;
  onSubmit: (e: React.FormEvent) => void;
  submitLabel: string;
  onCancel: () => void;
}

export function ClientForm({ data, errors, processing, setData, onSubmit, submitLabel, onCancel }: Props) {
  const { t } = useTranslation();

  const toggleChannel = (channel: string) => {
    const channels = data.channels.includes(channel)
      ? data.channels.filter(c => c !== channel)
      : [...data.channels, channel];
    setData('channels', channels);
  };

  return (
    <form onSubmit={onSubmit} className="space-y-5" encType="multipart/form-data">
      <div>
        <label className={labelClass}>{t('clients.name')} *</label>
        <input
          type="text"
          value={data.name}
          onChange={e => setData('name', e.target.value)}
          className={inputClass}
          placeholder="Nome do cliente"
          autoFocus
        />
        <InputError message={errors.name} className="mt-1.5" />
      </div>

      <div>
        <label className={labelClass}>{t('clients.segment')}</label>
        <input
          type="text"
          value={data.segment}
          onChange={e => setData('segment', e.target.value)}
          className={inputClass}
          placeholder="Ex: Tecnologia, Alimentação, Moda..."
        />
        <InputError message={errors.segment} className="mt-1.5" />
      </div>

      <div>
        <label className={labelClass}>{t('clients.channels')}</label>
        <div className="flex flex-wrap gap-2">
          {CHANNELS.map(ch => (
            <button
              key={ch}
              type="button"
              onClick={() => toggleChannel(ch)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors capitalize ${
                data.channels.includes(ch)
                  ? 'bg-[#7c3aed] text-white'
                  : 'bg-[#f3f4f6] text-[#6b7280] hover:bg-[#e5e7eb] dark:bg-[#1f2937] dark:text-[#9ca3af]'
              }`}
            >
              {ch}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className={labelClass}>{t('clients.toneOfVoice')}</label>
        <textarea
          value={data.tone_of_voice}
          onChange={e => setData('tone_of_voice', e.target.value)}
          className={textareaClass}
          rows={3}
          placeholder="Ex: Jovem, descontraído, próximo ao público..."
        />
        <InputError message={errors.tone_of_voice} className="mt-1.5" />
      </div>

      <div>
        <label className={labelClass}>{t('clients.targetAudience')}</label>
        <textarea
          value={data.target_audience}
          onChange={e => setData('target_audience', e.target.value)}
          className={textareaClass}
          rows={3}
          placeholder="Ex: Jovens de 18-30 anos interessados em tecnologia..."
        />
        <InputError message={errors.target_audience} className="mt-1.5" />
      </div>

      <div>
        <label className={labelClass}>{t('clients.brandReferences')}</label>
        <textarea
          value={data.brand_references}
          onChange={e => setData('brand_references', e.target.value)}
          className={textareaClass}
          rows={3}
          placeholder="Ex: Referências visuais, marcas similares, inspirações..."
        />
        <InputError message={errors.brand_references} className="mt-1.5" />
      </div>

      <div>
        <label className={labelClass}>{t('clients.briefing')}</label>
        <textarea
          value={data.briefing}
          onChange={e => setData('briefing', e.target.value)}
          className={textareaClass}
          rows={5}
          placeholder="Briefing completo do cliente..."
        />
        <InputError message={errors.briefing} className="mt-1.5" />
      </div>

      <div>
        <label className={labelClass}>{t('clients.avatar')}</label>
        <input
          type="file"
          accept="image/*"
          onChange={e => setData('avatar', e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-[#6b7280] file:mr-4 file:rounded-[8px] file:border-0 file:bg-[#7c3aed] file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white hover:file:bg-[#6d28d9]"
        />
        <InputError message={errors.avatar} className="mt-1.5" />
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-[8px] border border-[#e5e7eb] px-4 py-2 text-sm font-medium text-[#6b7280] hover:bg-[#f3f4f6] transition-colors dark:border-[#1f2937] dark:hover:bg-[#1f2937]"
        >
          {t('common.cancel')}
        </button>
        <button
          type="submit"
          disabled={processing}
          className="rounded-[8px] bg-[#7c3aed] px-4 py-2 text-sm font-semibold text-white hover:bg-[#6d28d9] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {processing ? t('common.loading') : submitLabel}
        </button>
      </div>
    </form>
  );
}
