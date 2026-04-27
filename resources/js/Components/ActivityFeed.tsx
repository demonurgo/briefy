// (c) 2026 Briefy contributors — AGPL-3.0
import {
  TrendingUp,
  Plus,
  MessageCircle,
  Users,
  Archive,
  RotateCcw,
  Building2,
  UserPlus,
  Activity,
  type LucideIcon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { DashboardSectionCard } from '@/Components/DashboardSectionCard';

export interface ActivityEvent {
  id: number;
  action_type: string;
  subject_name: string;
  user_name: string;
  user_avatar?: string | null;
  metadata?: Record<string, unknown>;
  created_at: string; // já formatado como diffForHumans() no backend
}

interface ActionConfig {
  icon: LucideIcon;
  color: string;
  verbKey: string;
  getExtra?: (event: ActivityEvent) => Record<string, string>;
}

const ACTION_CONFIG: Record<string, ActionConfig> = {
  'demand.status_changed': {
    icon: TrendingUp,
    color: '#3b82f6',
    verbKey: 'activity.verbs.moved',
    getExtra: (e) => {
      const meta = e.metadata as { to?: string } | undefined;
      return { subject: e.subject_name, status: meta?.to ?? '' };
    },
  },
  'demand.created': {
    icon: Plus,
    color: '#10b981',
    verbKey: 'activity.verbs.created',
  },
  'demand.comment_added': {
    icon: MessageCircle,
    color: '#6b7280',
    verbKey: 'activity.verbs.commented',
  },
  'demand.assigned': {
    icon: Users,
    color: '#8b5cf6',
    verbKey: 'activity.verbs.assigned',
  },
  'demand.archived_trash': {
    icon: Archive,
    color: '#9ca3af',
    verbKey: 'activity.verbs.trashed',
  },
  'demand.archived': {
    icon: Archive,
    color: '#9ca3af',
    verbKey: 'activity.verbs.archived',
  },
  'demand.restored': {
    icon: RotateCcw,
    color: '#f59e0b',
    verbKey: 'activity.verbs.restored',
  },
  'client.created': {
    icon: Building2,
    color: '#7c3aed',
    verbKey: 'activity.verbs.addedClient',
  },
  'member.invited': {
    icon: UserPlus,
    color: '#7c3aed',
    verbKey: 'activity.verbs.invited',
  },
};

const FALLBACK_CONFIG: ActionConfig = {
  icon: Activity,
  color: '#9ca3af',
  verbKey: 'activity.verbs.acted',
};

interface Props {
  events: ActivityEvent[];
}

export function ActivityFeed({ events }: Props) {
  const { t } = useTranslation();

  const resolveConfig = (event: ActivityEvent): ActionConfig => {
    if (event.action_type === 'demand.archived') {
      const meta = event.metadata as { via?: string } | undefined;
      return meta?.via === 'trash'
        ? ACTION_CONFIG['demand.archived_trash']
        : ACTION_CONFIG['demand.archived'];
    }
    return ACTION_CONFIG[event.action_type] ?? FALLBACK_CONFIG;
  };

  return (
    <DashboardSectionCard title={t('activity.title')}>
      <div
        className="max-h-80 overflow-y-auto"
        role="feed"
        aria-label={t('activity.ariaLabel')}
      >
        {events.length === 0 ? (
          <p className="text-sm text-[#9ca3af] text-center py-8">
            {t('activity.empty')}
          </p>
        ) : (
          events.map((event) => {
            const config = resolveConfig(event);
            const Icon = config.icon;
            const extra = config.getExtra
              ? config.getExtra(event)
              : { subject: event.subject_name };

            return (
              <div
                key={event.id}
                className="flex items-start gap-3 py-3 border-b border-[#e5e7eb] dark:border-[#1f2937] last:border-0"
                role="article"
              >
                {/* Icon circle */}
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${config.color}1a` }}
                  aria-hidden="true"
                >
                  <Icon size={16} style={{ color: config.color }} />
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#111827] dark:text-[#f9fafb]">
                    <span className="font-medium">{event.user_name}</span>{' '}
                    {t(config.verbKey, extra)}
                  </p>
                  <p className="text-xs text-[#9ca3af] mt-0.5">{event.created_at}</p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </DashboardSectionCard>
  );
}
