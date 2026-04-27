// (c) 2026 Briefy contributors — AGPL-3.0
import { useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2 } from 'lucide-react';
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
  // Phase 3 — monthly plan + social handles + important dates
  monthly_posts?: number | null;
  monthly_plan_notes?: string;
  planning_day?: number | null;
  social_handles?: Record<string, string>;
  important_dates?: Array<{ label: string; month: number; day: number }>;
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
  client?: { id: number; avatar?: string | null } | null;
  isEditMode?: boolean;
}

export function ClientForm({ data, errors, processing, setData, onSubmit, submitLabel, onCancel, client, isEditMode = false }: Props) {
  const { t } = useTranslation();
  const page = usePage<any>();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const MONTHS = Array.from({ length: 12 }, (_, i) =>
    new Intl.DateTimeFormat(undefined, { month: 'short' }).format(new Date(2000, i, 1))
  );

  const existingAvatarUrl = client?.avatar
    ? (client.avatar.startsWith('http') ? client.avatar : `/storage/${client.avatar}`)
    : null;
  const displayAvatar = previewUrl ?? existingAvatarUrl;

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
      {/* Avatar first */}
      <div>
        <label className={labelClass}>{t('clients.avatar')}</label>
        <div className="flex items-center gap-4">
          {displayAvatar ? (
            <img
              src={displayAvatar}
              alt="Avatar"
              className="h-16 w-16 rounded-full object-cover border border-[#e5e7eb] dark:border-[#1f2937] shrink-0"
            />
          ) : (
            <div className="h-16 w-16 rounded-full bg-[#f3f4f6] dark:bg-[#1f2937] flex items-center justify-center text-[#9ca3af] text-xs shrink-0">
              {data.name ? data.name.charAt(0).toUpperCase() : '?'}
            </div>
          )}
          <div className="flex-1">
            <input
              type="file"
              accept="image/*"
              onChange={e => {
                const file = e.target.files?.[0] ?? null;
                setData('avatar', file);
                if (file) {
                  const url = URL.createObjectURL(file);
                  setPreviewUrl(url);
                } else {
                  setPreviewUrl(null);
                }
              }}
              className="block w-full text-sm text-[#6b7280] file:mr-4 file:rounded-[8px] file:border-0 file:bg-[#7c3aed] file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white hover:file:bg-[#6d28d9]"
            />
            <p className="mt-1 text-xs text-[#9ca3af]">PNG, JPG ou GIF. Recomendado: 200×200px.</p>
          </div>
        </div>
        <InputError message={errors.avatar} className="mt-1.5" />
      </div>

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

      {/* === Plano de Conteúdo Mensal — D-16/D-17 === */}
      <div className="border-t border-[#e5e7eb] dark:border-[#1f2937] pt-6 mt-6">
        <h3 className="mb-1 text-sm font-semibold text-[#111827] dark:text-[#f9fafb]">
          {t('clients.monthlyPlan.sectionTitle')}
        </h3>
        <p className="mb-4 text-xs text-[#9ca3af]">{t('clients.monthlyPlan.sectionSubtitle')}</p>

        <div className="space-y-5">
          {/* Posts/mês + Dia do planejamento — mesma linha */}
          <div className="grid grid-cols-2 gap-4">
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
              <label className={labelClass}>{t('clients.monthlyPlan.planningDayLabel')}</label>
              <input
                type="number" min={1} max={31} step={1}
                value={data.planning_day ?? ''}
                onChange={e => setData('planning_day', e.target.value === '' ? null : Number(e.target.value))}
                placeholder={t('clients.monthlyPlan.planningDayPlaceholder')}
                className={inputClass}
              />
              <p className="mt-1 text-xs text-[#9ca3af]">{t('clients.monthlyPlan.planningDayHint')}</p>
              <InputError message={errors.planning_day} className="mt-1.5" />
            </div>
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

      {/* === Datas Importantes === */}
      <div className="border-t border-[#e5e7eb] dark:border-[#1f2937] pt-6 mt-6">
        <h3 className="mb-1 text-sm font-semibold text-[#111827] dark:text-[#f9fafb]">Datas Importantes</h3>
        <p className="mb-4 text-xs text-[#9ca3af]">
          Datas que serão automaticamente incluídas no planejamento quando cairem no mês gerado.
          Ex: aniversário da empresa, aniversário do fundador, lançamento de produto.
        </p>

        <div className="space-y-2">
          {(data.important_dates ?? []).map((date, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                type="text"
                value={date.label}
                onChange={e => {
                  const next = [...(data.important_dates ?? [])];
                  next[idx] = { ...next[idx], label: e.target.value };
                  setData('important_dates', next);
                }}
                placeholder="Ex: Aniversário da empresa"
                className={`${inputClass} flex-1`}
              />
              <select
                value={date.month}
                onChange={e => {
                  const next = [...(data.important_dates ?? [])];
                  next[idx] = { ...next[idx], month: Number(e.target.value) };
                  setData('important_dates', next);
                }}
                className={`${inputClass} w-24`}
              >
                {MONTHS.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
              </select>
              <input
                type="number" min={1} max={31}
                value={date.day}
                onChange={e => {
                  const next = [...(data.important_dates ?? [])];
                  next[idx] = { ...next[idx], day: Number(e.target.value) };
                  setData('important_dates', next);
                }}
                placeholder="Dia"
                className={`${inputClass} w-20`}
              />
              <button
                type="button"
                onClick={() => {
                  const next = (data.important_dates ?? []).filter((_, i) => i !== idx);
                  setData('important_dates', next);
                }}
                className="shrink-0 rounded-[8px] border border-[#e5e7eb] p-2 text-[#9ca3af] hover:border-red-400 hover:text-red-500 transition-colors dark:border-[#1f2937]"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setData('important_dates', [...(data.important_dates ?? []), { label: '', month: 1, day: 1 }])}
            className="inline-flex items-center gap-1.5 rounded-[8px] border border-dashed border-[#d1d5db] px-3 py-1.5 text-xs text-[#6b7280] hover:border-[#7c3aed] hover:text-[#7c3aed] transition-colors dark:border-[#374151]"
          >
            <Plus size={13} />
            Adicionar data
          </button>
        </div>
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
