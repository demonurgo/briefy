// (c) 2026 Briefy contributors — AGPL-3.0
import { Head, Link, router, useForm } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import AppLayout from '@/Layouts/AppLayout';
import { DemandForm } from '@/Components/DemandForm';

interface Client { id: number; name: string; }
interface TeamMember { id: number; name: string; }

export default function DemandsCreate({ client, teamMembers }: { client: Client; teamMembers: TeamMember[] }) {
  const { t } = useTranslation();
  const { data, setData, post, processing, errors } = useForm({
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

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    post(route('clients.demands.store', client.id));
  };

  return (
    <AppLayout title={t('demands.new')}>
      <Head title={t('demands.new')} />

      <div className="mb-4 flex items-center gap-1.5 text-sm text-[#6b7280]">
        <Link href={route('clients.index')} className="hover:text-[#111827] dark:hover:text-[#f9fafb]">
          {t('clients.title')}
        </Link>
        <span>/</span>
        <Link href={route('clients.show', client.id)} className="hover:text-[#111827] dark:hover:text-[#f9fafb]">
          {client.name}
        </Link>
        <span>/</span>
        <span className="text-[#111827] dark:text-[#f9fafb]">{t('demands.new')}</span>
      </div>

      <div className="mx-auto max-w-2xl">
        <div className="rounded-[12px] bg-white p-6 shadow-sm dark:bg-[#111827]">
          <DemandForm
            data={data}
            errors={errors}
            processing={processing}
            setData={setData}
            onSubmit={submit}
            submitLabel={t('common.create')}
            onCancel={() => router.visit(route('clients.show', client.id))}
            teamMembers={teamMembers}
          />
        </div>
      </div>
    </AppLayout>
  );
}
