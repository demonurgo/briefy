// (c) 2026 Briefy contributors — AGPL-3.0
import { Head, Link, router, useForm } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Brain, ExternalLink } from 'lucide-react';
import AppLayout from '@/Layouts/AppLayout';
import { ClientForm } from '@/Components/ClientForm';

interface Client {
  id: number;
  name: string;
  segment: string | null;
  channels: string[];
  tone_of_voice: string | null;
  target_audience: string | null;
  brand_references: string | null;
  briefing: string | null;
  avatar: string | null;
  monthly_posts: number | null;
  monthly_plan_notes: string | null;
  planning_day: number | null;
  social_handles: Record<string, string> | null;
  important_dates: Array<{ label: string; month: number; day: number }> | null;
}

export default function ClientsEdit({ client, latest_session }: { client: Client; latest_session?: { id: number; status: string } | null }) {
  const { t } = useTranslation();
  const { data, setData, post, processing, errors } = useForm({
    _method: 'PUT',
    name: client.name,
    segment: client.segment ?? '',
    channels: client.channels ?? [],
    tone_of_voice: client.tone_of_voice ?? '',
    target_audience: client.target_audience ?? '',
    brand_references: client.brand_references ?? '',
    briefing: client.briefing ?? '',
    avatar: null as File | null,
    monthly_posts: client.monthly_posts ?? null,
    monthly_plan_notes: client.monthly_plan_notes ?? '',
    planning_day: client.planning_day ?? null,
    social_handles: client.social_handles ?? ({} as Record<string, string>),
    important_dates: (client.important_dates ?? []) as Array<{ label: string; month: number; day: number }>,
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanedHandles = Object.fromEntries(
      Object.entries(data.social_handles ?? {}).filter(([, v]) => v && String(v).trim() !== '')
    );
    post(route('clients.update', client.id), {
      data: { ...data, social_handles: cleanedHandles },
    });
  };

  return (
    <AppLayout title={t('clients.edit')}>
      <Head title={t('clients.edit')} />

      {/* Breadcrumb */}
      <div className="mb-4">
        <Link href={route('clients.show', client.id)} className="inline-flex items-center gap-1 text-sm text-[#6b7280] hover:text-[#111827] dark:hover:text-[#f9fafb]">
          <ArrowLeft size={14} />
          {client.name}
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main form — 2/3 width on desktop */}
        <div className="lg:col-span-2">
          <div className="rounded-[12px] bg-white p-6 shadow-sm dark:bg-[#111827]">
            <ClientForm
              data={data}
              errors={errors}
              processing={processing}
              setData={setData}
              onSubmit={submit}
              submitLabel={t('common.save')}
              onCancel={() => router.visit(route('clients.show', client.id))}
              client={client}
              isEditMode={true}
            />
          </div>
        </div>

        {/* Sidebar — 1/3 width on desktop */}
        <div className="lg:col-span-1 space-y-4">
          {/* Deep Research status */}
          {latest_session && (
            <div className="rounded-[12px] border border-[#7c3aed]/20 bg-[#7c3aed]/5 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Brain size={15} className="text-[#7c3aed]" />
                <p className="text-sm font-medium text-[#7c3aed]">Deep Research</p>
              </div>
              <p className="text-xs text-[#6b7280] mb-3">
                {latest_session.status === 'completed'
                  ? 'Pesquisa profunda concluída. A memória do cliente foi populada com insights de tom, padrões e preferências.'
                  : latest_session.status === 'failed'
                    ? 'A última pesquisa falhou. Tente novamente.'
                    : 'Pesquisa em andamento...'}
              </p>
              <Link
                href={route('clients.research.show', [client.id, latest_session.id])}
                className="inline-flex items-center gap-1.5 rounded-[8px] border border-[#7c3aed]/30 px-3 py-1.5 text-xs font-medium text-[#7c3aed] hover:bg-[#7c3aed]/10 transition-colors"
              >
                <ExternalLink size={12} />
                Ver resultados
              </Link>
            </div>
          )}

          {/* Tips card */}
          <div className="rounded-[12px] border border-[#e5e7eb] bg-white p-4 dark:border-[#1f2937] dark:bg-[#111827]">
            <p className="text-xs font-medium text-[#9ca3af] uppercase tracking-wide mb-2">Dicas</p>
            <ul className="space-y-2 text-xs text-[#6b7280]">
              <li>• Preencha os social handles para habilitar o Deep Research</li>
              <li>• Defina posts/mês para gerar planejamentos mensais com IA</li>
              <li>• Tom de voz e briefing melhoram a qualidade dos briefs gerados</li>
            </ul>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
