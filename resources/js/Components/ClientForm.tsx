// (c) 2026 Briefy contributors — AGPL-3.0
import { router, usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import InputError from '@/Components/InputError';
import { AiIcon } from '@/Components/AiIcon';

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
  // Phase 3 — monthly plan + social handles
  monthly_posts?: number | null;
  monthly_plan_notes?: string;
  planning_day?: number | null;
  social_handles?: Record<string, string>;
}

interface Props {
  data: FormData;
  errors: Partial<Record<keyof FormData, string>>;
  processing: boolean;
  setData: (key: keyof FormData, value: any) => void;
  onSubmit: (e: React.FormEvent) => void;
  submitLabel: string;
  onCancel: () => void;
  /** Pass the full client object in edit mode so the MA launch button can use the id */
  client?: { id: number } | null;
  isEditMode?: boolean;
}

export function ClientForm({ data, errors, processing, setData, onSubmit, submitLabel, onCancel, client, isEditMode = false }: Props) {
  const { t } = useTranslation();
  const page = usePage<any>();

  const toggleChannel = (channel: string) => {
    const channels = data.channels.includes(channel)
      ? data.channels.filter(c => c !== channel)
      : [...data.channels, channel];
    setData('channels', channels);
  };

  const org = (page.props.auth as any)?.user?.organization;
  const hasKey: boolean = org?.has_anthropic_key ?? false;
  const hasSources: boolean = Object.values(data.social_handles ?? {}).some(Boolean);
  const maDisabled = !hasKey || !hasSources;

  const handleLaunch = () => {
    if (!client?.id) return;
    router.post(route('clients.research.launch', client.id), {}, {
      preserveScroll: true,
    });
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

      {/* === Plano de Conteúdo Mensal — D-16/D-17 === */}
      <div className="border-t border-[#e5e7eb] dark:border-[#1f2937] pt-6 mt-6">
        <h3 className="mb-1 text-sm font-semibold text-[#111827] dark:text-[#f9fafb]">
          {t('clients.monthlyPlan.sectionTitle')}
        </h3>
        <p className="mb-4 text-xs text-[#9ca3af]">{t('clients.monthlyPlan.sectionSubtitle')}</p>

        <div className="space-y-5">
          <div>
            <label className={labelClass}>{t('clients.monthlyPlan.monthlyPostsLabel')}</label>
            <input
              type="number" min={0} max={200} step={1}
              value={data.monthly_posts ?? ''}
              onChange={e => setData('monthly_posts', e.target.value === '' ? null : Number(e.target.value))}
              placeholder={t('clients.monthlyPlan.monthlyPostsPlaceholder')}
              className={inputClass}
            />
            <p className="mt-1 text-xs text-[#9ca3af]">{t('clients.monthlyPlan.monthlyPostsHint')}</p>
            <InputError message={errors.monthly_posts} className="mt-1.5" />
          </div>

          <div>
            <label className={labelClass}>{t('clients.monthlyPlan.notesLabel')}</label>
            <textarea
              rows={3}
              value={data.monthly_plan_notes ?? ''}
              onChange={e => setData('monthly_plan_notes', e.target.value)}
              placeholder={t('clients.monthlyPlan.notesPlaceholder')}
              className={textareaClass}
            />
            <p className="mt-1 text-xs text-[#9ca3af]">{t('clients.monthlyPlan.notesHint')}</p>
            <InputError message={errors.monthly_plan_notes} className="mt-1.5" />
          </div>

          <div>
            <label className={labelClass}>{t('clients.monthlyPlan.planningDayLabel')}</label>
            <input
              type="number" min={1} max={31} step={1}
              value={data.planning_day ?? ''}
              onChange={e => setData('planning_day', e.target.value === '' ? null : Number(e.target.value))}
              placeholder={t('clients.monthlyPlan.planningDayPlaceholder')}
              className={`${inputClass} max-w-[120px]`}
            />
            <p className="mt-1 text-xs text-[#9ca3af]">{t('clients.monthlyPlan.planningDayHint')}</p>
            <InputError message={errors.planning_day} className="mt-1.5" />
          </div>
        </div>
      </div>

      {/* === Presença Digital / Social handles (for "Conhecer com IA") === */}
      <div className="border-t border-[#e5e7eb] dark:border-[#1f2937] pt-6 mt-6">
        <h3 className="mb-1 text-sm font-semibold text-[#111827] dark:text-[#f9fafb]">
          {t('clients.socialHandles.title', 'Presença Digital')}
        </h3>
        <p className="mb-4 text-xs text-[#9ca3af]">
          {t('clients.socialHandles.subtitle', 'Usados pela IA ao pesquisar o cliente. Pelo menos um é necessário para ativar a pesquisa automática.')}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(['website', 'instagram', 'linkedin', 'facebook', 'tiktok'] as const).map(platform => (
            <div key={platform}>
              <label className={labelClass}>{platform}</label>
              <input
                type="text"
                value={data.social_handles?.[platform] ?? ''}
                onChange={e => setData('social_handles', { ...(data.social_handles ?? {}), [platform]: e.target.value })}
                placeholder={platform === 'website' ? 'https://exemplo.com.br' : '@nome'}
                className={inputClass}
              />
            </div>
          ))}
        </div>
        <InputError message={errors.social_handles} className="mt-1.5" />
      </div>

      {/* === Deep Research — only in edit mode === */}
      {isEditMode && (
        <div className="border-t border-[#e5e7eb] dark:border-[#1f2937] pt-6 mt-6">
          <button
            type="button"
            onClick={handleLaunch}
            disabled={maDisabled}
            title={maDisabled ? (hasKey ? t('clients.research.disabledNoSources') : t('clients.research.disabledNoKey')) : undefined}
            className="inline-flex items-center gap-2 rounded-[8px] bg-[#7c3aed] hover:bg-[#6d28d9] px-4 py-2 text-sm font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <AiIcon size={16} variant="dark" />
            {t('clients.research.deepResearch')}
          </button>
          <p className="mt-2 text-xs text-[#9ca3af]">{t('clients.research.hint')}</p>
        </div>
      )}

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
