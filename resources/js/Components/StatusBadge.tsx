// (c) 2026 Briefy contributors — AGPL-3.0
import { useTranslation } from 'react-i18next';

const STATUS_STYLES: Record<string, string> = {
  todo: 'bg-[#9ca3af]/10 text-[#9ca3af] border border-[#9ca3af]/20',
  in_progress: 'bg-[#3b82f6]/10 text-[#3b82f6] border border-[#3b82f6]/20',
  awaiting_feedback: 'bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/20',
  in_review: 'bg-[#8b5cf6]/10 text-[#8b5cf6] border border-[#8b5cf6]/20',
  approved: 'bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/20',
};

export function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[status] ?? ''}`}>
      {t(`demand.statuses.${status}`)}
    </span>
  );
}
