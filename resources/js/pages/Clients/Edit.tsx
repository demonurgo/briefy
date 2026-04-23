// (c) 2026 Briefy contributors — AGPL-3.0
import { Head, router, useForm } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
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
}

export default function ClientsEdit({ client }: { client: Client }) {
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
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    post(route('clients.update', client.id));
  };

  return (
    <AppLayout title={t('clients.edit')}>
      <Head title={t('clients.edit')} />
      <div className="mx-auto max-w-2xl">
        <div className="rounded-[12px] bg-white p-6 shadow-sm dark:bg-[#111827]">
          <ClientForm
            data={data}
            errors={errors}
            processing={processing}
            setData={setData}
            onSubmit={submit}
            submitLabel={t('common.save')}
            onCancel={() => router.visit(route('clients.show', client.id))}
          />
        </div>
      </div>
    </AppLayout>
  );
}
