// (c) 2026 Briefy contributors — AGPL-3.0
import AppLayout from '@/Layouts/AppLayout';
import { useTranslation } from 'react-i18next';
import { DashboardPlanningWidget } from '@/Components/DashboardPlanningWidget';

interface Props {
  planningReminderClients?: Array<{ id: number; name: string; planning_day: number }>;
}

export default function Dashboard({ planningReminderClients }: Props) {
  const { t } = useTranslation();
  return (
    <AppLayout title={t('nav.dashboard')}>
      {planningReminderClients && planningReminderClients.length > 0 && (
        <div className="mb-6">
          <DashboardPlanningWidget clients={planningReminderClients} />
        </div>
      )}
      <p className="text-[#9ca3af] dark:text-[#6b7280] text-sm">Em breve...</p>
    </AppLayout>
  );
}
