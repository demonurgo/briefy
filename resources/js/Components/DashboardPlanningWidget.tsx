// (c) 2026 Briefy contributors — AGPL-3.0
import { useState } from 'react';
import { Link } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { X, Calendar } from 'lucide-react';
import { AiIcon } from '@/Components/AiIcon';

export interface PlanningReminderClient {
  id: number;
  name: string;
  planning_day: number;
}

interface DashboardPlanningWidgetProps {
  clients: PlanningReminderClient[];
}

/**
 * Dashboard reminder widget (D-27). Shown from planning_day-1 through planning_day+2.
 * Max 3 cards + overflow link. Each card is individually dismissible via localStorage.
 * Visibility managed by DashboardController (only passes relevant clients as prop).
 */
export function DashboardPlanningWidget({ clients }: DashboardPlanningWidgetProps) {
  const { t } = useTranslation();

  // Force re-render after localStorage dismiss (simplest correct approach — per Plan 11 decision)
  const [, forceUpdate] = useState(0);

  const storageKey = (client: PlanningReminderClient) => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    return `planning_reminder_dismissed:${client.id}:${yyyy}-${mm}`;
  };

  const isDismissed = (client: PlanningReminderClient) => {
    try {
      return localStorage.getItem(storageKey(client)) === 'true';
    } catch {
      return false;
    }
  };

  const dismiss = (client: PlanningReminderClient) => {
    try {
      localStorage.setItem(storageKey(client), 'true');
    } catch {
      // localStorage unavailable — silently ignore
    }
    forceUpdate(n => n + 1);
  };

  const today = new Date().getDate();

  const reminderLabel = (client: PlanningReminderClient): string => {
    const diff = client.planning_day - today;
    if (diff === 1) return t('planning.reminder.dueTomorrow', { clientName: client.name });
    if (diff === 0) return t('planning.reminder.dueToday', { clientName: client.name });
    const days = Math.abs(diff);
    return t('planning.reminder.overdue', { clientName: client.name, days });
  };

  const visible = clients.filter(c => !isDismissed(c));

  if (visible.length === 0) return null;

  const displayed = visible.slice(0, 3);
  const overflow = visible.length - displayed.length;

  return (
    <div className="rounded-xl border border-[#a78bfa]/30 bg-[#7c3aed]/5 dark:bg-[#7c3aed]/10 p-4 space-y-3">
      {/* Widget header */}
      <div className="flex items-center gap-2 mb-1">
        <AiIcon size={32} />
        <span className="text-sm font-semibold text-[#7c3aed] dark:text-[#a78bfa]">
          {t('planning.title')}
        </span>
      </div>

      {/* Reminder cards — max 3 */}
      {displayed.map(client => (
        <div
          key={client.id}
          className="flex items-start justify-between gap-3 rounded-lg border border-[#a78bfa]/20 bg-white dark:bg-[#1e1b2e] px-4 py-3 shadow-sm"
        >
          <div className="flex items-start gap-3 min-w-0">
            <Calendar className="mt-0.5 shrink-0 text-[#7c3aed]" size={16} />
            <div className="min-w-0">
              <p className="text-sm font-medium text-[#111827] dark:text-[#f3f4f6] truncate">
                {t('planning.reminder.title', { clientName: client.name })}
              </p>
              <p className="text-xs text-[#6b7280] dark:text-[#9ca3af] mt-0.5 line-clamp-2">
                {reminderLabel(client)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              href={`/planejamento?client_id=${client.id}`}
              className="text-xs font-medium text-[#7c3aed] hover:underline whitespace-nowrap"
            >
              {t('planning.openFromWidget')}
            </Link>
            <button
              onClick={() => dismiss(client)}
              className="p-1 rounded text-[#9ca3af] hover:text-[#374151] dark:hover:text-[#d1d5db] transition-colors"
              aria-label={t('common.dismiss')}
              type="button"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      ))}

      {/* Overflow link */}
      {overflow > 0 && (
        <p className="text-xs text-[#7c3aed] dark:text-[#a78bfa] font-medium px-1">
          {t('planning.reminder.moreClients', { count: overflow })}
        </p>
      )}
    </div>
  );
}
