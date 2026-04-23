// (c) 2026 Briefy contributors — AGPL-3.0
import { Head, Link, router, useForm } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import AppLayout from '@/Layouts/AppLayout';
import { DemandForm } from '@/Components/DemandForm';

interface Client { id: number; name: string; }
interface TeamMember { id: number; name: string; }
interface Demand {
  id: number;
  title: string;
  description: string | null;
  objective: string | null;
  tone: string | null;
  channel: string | null;
  deadline: string | null;
  status: string;
  type: string;
  assigned_to: number | null;
  client: Client;
}

export default function DemandsEdit({ demand, teamMembers }: { demand: Demand; teamMembers: TeamMember[] }) {
  const { t } = useTranslation();
  const { data, setData, post, processing, errors } = useForm({
    _method: 'PUT' as const,
    title: demand.title,
    description: demand.description ?? '',
    objective: demand.objective ?? '',
    tone: demand.tone ?? '',
    channel: demand.channel ?? '',
    deadline: demand.deadline ? demand.deadline.substring(0, 10) : '',
    status: demand.status,
    type: demand.type,
    assigned_to: demand.assigned_to ? String(demand.assigned_to) : '',
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    post(route('demands.update', demand.id));
  };

  return (
    <AppLayout title={t('demands.edit')}>
      <Head title={t('demands.edit')} />

      <div className="mb-4 flex items-center gap-1.5 text-sm text-[#6b7280]">
        <Link href={route('clients.show', demand.client.id)} className="hover:text-[#111827] dark:hover:text-[#f9fafb]">
          {demand.client.name}
        </Link>
        <span>/</span>
        <Link href={route('demands.show', demand.id)} className="max-w-[12rem] truncate hover:text-[#111827] dark:hover:text-[#f9fafb]">
          {demand.title}
        </Link>
        <span>/</span>
        <span className="text-[#111827] dark:text-[#f9fafb]">{t('common.edit')}</span>
      </div>

      <div className="mx-auto max-w-2xl">
        <div className="rounded-[12px] bg-white p-6 shadow-sm dark:bg-[#111827]">
          <DemandForm
            data={data}
            errors={errors}
            processing={processing}
            setData={setData}
            onSubmit={submit}
            submitLabel={t('common.save')}
            onCancel={() => router.visit(route('demands.show', demand.id))}
            teamMembers={teamMembers}
          />
        </div>
      </div>
    </AppLayout>
  );
}
