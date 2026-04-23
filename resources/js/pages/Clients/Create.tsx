// (c) 2026 Briefy contributors — AGPL-3.0
import { Head, router, useForm } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import AppLayout from '@/Layouts/AppLayout';
import { ClientForm } from '@/Components/ClientForm';

export default function ClientsCreate() {
  const { t } = useTranslation();
  const { data, setData, post, processing, errors } = useForm({
    name: '',
    segment: '',
    channels: [] as string[],
    tone_of_voice: '',
    target_audience: '',
    brand_references: '',
    briefing: '',
    avatar: null as File | null,
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    post(route('clients.store'));
  };

  return (
    <AppLayout title={t('clients.new')}>
      <Head title={t('clients.new')} />
      <div className="mx-auto max-w-2xl">
        <div className="rounded-[12px] bg-white p-6 shadow-sm dark:bg-[#111827]">
          <ClientForm
            data={data}
            errors={errors}
            processing={processing}
            setData={setData}
            onSubmit={submit}
            submitLabel={t('common.create')}
            onCancel={() => router.visit(route('clients.index'))}
          />
        </div>
      </div>
    </AppLayout>
  );
}
