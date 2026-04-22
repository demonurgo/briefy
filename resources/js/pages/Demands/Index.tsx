import AppLayout from '../../layouts/AppLayout';
import { useTranslation } from 'react-i18next';

export default function DemandsIndex() {
  const { t } = useTranslation();
  return (
    <AppLayout title={t('nav.demands')}>
      <p className="text-[#9ca3af] dark:text-[#6b7280] text-sm">Em breve...</p>
    </AppLayout>
  );
}
