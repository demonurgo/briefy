// (c) 2026 Briefy contributors — AGPL-3.0
import { Head, Link, router, useForm } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { ExternalLink } from 'lucide-react';
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
      <div className="mx-auto max-w-2xl">
        {latest_session && (
          <div className="mb-4 flex items-center justify-between rounded-[12px] border border-[#7c3aed]/20 bg-[#7c3aed]/5 px-4 py-3">
            <p className="text-sm text-[#7c3aed]">
              {latest_session.status === 'completed'
                ? 'Pesquisa profunda concluída'
                : latest_session.status === 'failed'
                  ? 'Pesquisa falhou'
                  : 'Pesquisa em andamento...'}
            </p>
            <Link
              href={route('clients.research.show', [client.id, latest_session.id])}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[#7c3aed] hover:underline"
            >
              <ExternalLink size={14} />
              Ver resultados
            </Link>
          </div>
        )}
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
    </AppLayout>
  );
}
