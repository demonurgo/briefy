// (c) 2026 Briefy contributors — AGPL-3.0
import AppLayout from '@/Layouts/AppLayout';
import { useTranslation } from 'react-i18next';

export default function Dashboard() {
  const { t } = useTranslation();
  return (
    <AppLayout title={t('nav.dashboard')}>
      <p className="text-[#9ca3af] dark:text-[#6b7280] text-sm">Em breve...</p>
    </AppLayout>
  );
}
