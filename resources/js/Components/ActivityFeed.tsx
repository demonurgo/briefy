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
  verb: (event: ActivityEvent) => string;
}

const ACTION_CONFIG: Record<string, ActionConfig> = {
  'demand.status_changed': {
    icon: TrendingUp,
    color: '#3b82f6',
    verb: (e) => {
      const meta = e.metadata as { to?: string } | undefined;
      return `moveu "${e.subject_name}" para ${meta?.to ?? 'novo status'}`;
    },
  },
  'demand.created': {
    icon: Plus,
    color: '#10b981',
    verb: (e) => `criou "${e.subject_name}"`,
  },
  'demand.comment_added': {
    icon: MessageCircle,
    color: '#6b7280',
    verb: (e) => `comentou em "${e.subject_name}"`,
  },
  'demand.assigned': {
    icon: Users,
    color: '#8b5cf6',
    verb: (e) => `atribuiu "${e.subject_name}"`,
  },
  'demand.archived': {
    icon: Archive,
    color: '#9ca3af',
    verb: (e) => {
      const meta = e.metadata as { via?: string } | undefined;
      return meta?.via === 'trash'
        ? `moveu "${e.subject_name}" para a lixeira`
        : `arquivou "${e.subject_name}"`;
    },
  },
  'demand.restored': {
    icon: RotateCcw,
    color: '#f59e0b',
    verb: (e) => `restaurou "${e.subject_name}"`,
  },
  'client.created': {
    icon: Building2,
    color: '#7c3aed',
    verb: (e) => `adicionou o cliente "${e.subject_name}"`,
  },
  'member.invited': {
    icon: UserPlus,
    color: '#7c3aed',
    verb: (e) => `convidou ${e.subject_name}`,
  },
};

const FALLBACK_CONFIG: ActionConfig = {
  icon: Activity,
  color: '#9ca3af',
  verb: (e) => `agiu em "${e.subject_name}"`,
};

interface Props {
  events: ActivityEvent[];
}

export function ActivityFeed({ events }: Props) {
  return (
    <DashboardSectionCard title="Atividade recente">
      <div
        className="max-h-80 overflow-y-auto"
        role="feed"
        aria-label="Feed de atividade recente"
      >
        {events.length === 0 ? (
          <p className="text-sm text-[#9ca3af] text-center py-8">
            Nenhuma atividade recente.
          </p>
        ) : (
          events.map((event) => {
            const config = ACTION_CONFIG[event.action_type] ?? FALLBACK_CONFIG;
            const Icon = config.icon;

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
                    {config.verb(event)}
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
