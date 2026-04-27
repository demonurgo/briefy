// (c) 2026 Briefy contributors — AGPL-3.0
import { useState, useCallback, useEffect } from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import {
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line, Legend,
} from 'recharts';
import {
  AlertCircle, Clock, MessageSquare, Eye, CheckCircle2,
  Plus,
} from 'lucide-react';
import AppLayout from '@/Layouts/AppLayout';
import { DashboardPlanningWidget } from '@/Components/DashboardPlanningWidget';
import { DashboardStatusCard } from '@/Components/DashboardStatusCard';
import { DashboardSectionCard } from '@/Components/DashboardSectionCard';
import { ActivityFeed, type ActivityEvent } from '@/Components/ActivityFeed';
import { OnboardingChecklist } from '@/Components/OnboardingChecklist';
import { StatusBadge } from '@/Components/StatusBadge';
import { UserAvatar } from '@/Components/UserAvatar';
import type { PageProps } from '@/types';

// -----------------------------------------------------------------------
// Tipos
// -----------------------------------------------------------------------
interface FocusDemand {
  id: number;
  title: string;
  status: string;
  priority: string;
  deadline: string | null;
  client_name: string | null;
}

interface MyDemand {
  id: number;
  title: string;
  status: string;
  priority: string;
  deadline: string | null;
  client_name: string | null;
  updated_at: string | null;
}

interface Blocker {
  id: number;
  title: string;
  since: string;
}

interface LatestDemand {
  id: number;
  title: string;
  status: string;
  priority: string;
  updated_at: string | null;
  client_name: string | null;
  assignee_name: string | null;
  assignee_avatar: string | null;
}

interface TeamMember {
  user_id: number;
  name: string;
  avatar: string | null;
  total: number;
  completed: number;
  overdue: number;
  active: number;
}

interface ClientRow {
  client_id: number;
  name: string;
  total: number;
  completed: number;
}

interface PersonalData {
  statusCounts: Record<string, number>;
  deltaVsYesterday: Record<string, number>;
  focusDemands: FocusDemand[];
  myDemands: MyDemand[];
  blockers: Blocker[];
  weekProgress: { completed: number; total: number };
  completedByDay: Record<string, number>;
}

interface OverviewData {
  statusBreakdown: Record<string, number>;
  deltaVsYesterday: Record<string, number>;
  overdueCount: number;
  priorityBreakdown: Record<string, number>;
  demandsOverTime: Array<{ date: string; created: number; completed: number }>;
  latestDemands: LatestDemand[];
  teamWorkload: TeamMember[];
  clientDistribution: ClientRow[];
  teamPerformance: { total: number; completed: number; in_progress: number; rate: number };
  dateRange: { start: string; end: string };
}

interface Props {
  planningReminderClients?: Array<{ id: number; name: string; planning_day: number }>;
  personal: PersonalData;
  overview: OverviewData | null;
  activityFeed: ActivityEvent[];
  hasClients: boolean;
  hasDemands: boolean;
  hasAnthropicKey: boolean;
}

// -----------------------------------------------------------------------
// Constantes de cor (D-03 — iguais ao StatusBadge)
// -----------------------------------------------------------------------
const STATUS_COLORS: Record<string, string> = {
  todo:              '#9ca3af',
  in_progress:       '#3b82f6',
  awaiting_feedback: '#f59e0b',
  in_review:         '#8b5cf6',
  approved:          '#10b981',
};


const PRIORITY_COLORS: Record<string, string> = {
  high:   '#ef4444',
  medium: '#f59e0b',
  low:    '#9ca3af',
};


const CHART_TOOLTIP_STYLE = {
  background: '#111827',
  border: '1px solid #1f2937',
  borderRadius: '8px',
  fontSize: '12px',
  color: '#f9fafb',
};

// -----------------------------------------------------------------------
// Componentes inline pequenos
// -----------------------------------------------------------------------

/** Donut chart reutilizável com label centralizado */
function DonutChart({
  data,
  centerLabel,
  ariaLabel,
}: {
  data: Array<{ name: string; value: number; color: string }>;
  centerLabel: string;
  ariaLabel: string;
}) {
  return (
    <div
      className="relative h-[160px]"
      role="img"
      aria-label={ariaLabel}
    >
      <ResponsiveContainer width="100%" height={160}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={48}
            outerRadius={72}
            paddingAngle={3}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <RechartsTooltip contentStyle={CHART_TOOLTIP_STYLE} />
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span className="text-lg font-bold text-[#111827] dark:text-[#f9fafb]">
          {centerLabel}
        </span>
      </div>
    </div>
  );
}

/** Badge de prioridade inline */
function PriorityBadge({ priority }: { priority: string }) {
  const { t } = useTranslation();
  const color = PRIORITY_COLORS[priority] ?? '#9ca3af';
  const label = t('demand.priorities.' + priority, { defaultValue: priority });
  return (
    <span
      className="inline-flex px-1.5 py-0.5 rounded text-xs font-medium"
      style={{ color, backgroundColor: `${color}1a` }}
    >
      {t('demand.priorities.' + priority, { defaultValue: priority })}
    </span>
  );
}

/** Toggle de view pessoal / visão geral */
function ViewToggle({
  view,
  onChange,
}: {
  view: 'personal' | 'overview';
  onChange: (v: 'personal' | 'overview') => void;
}) {
  const { t } = useTranslation();
  return (
    <div
      className="flex rounded-[8px] overflow-hidden border border-[#e5e7eb] dark:border-[#1f2937]"
      role="group"
      aria-label={t('dashboard.ariaViewToggle')}
    >
      {(['personal', 'overview'] as const).map((v) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className={`px-4 py-1.5 text-sm font-medium transition-colors ${
            view === v
              ? 'bg-[#7c3aed] text-white'
              : 'bg-white dark:bg-[#111827] text-[#6b7280] hover:text-[#111827] dark:hover:text-[#f9fafb]'
          }`}
          aria-pressed={view === v}
        >
          {v === 'personal' ? t('dashboard.personalView') : t('dashboard.overviewView')}
        </button>
      ))}
    </div>
  );
}

// -----------------------------------------------------------------------
// View Pessoal (todos os usuários — D-07 a D-11)
// -----------------------------------------------------------------------
function PersonalView({ personal }: { personal: PersonalData }) {
  const { t } = useTranslation();
  const [demandTab, setDemandTab] = useState<'all' | 'in_progress' | 'overdue' | 'completed'>('all');
  const today = new Date().toISOString().substring(0, 10);

  // Status card config (D-07)
  const statusCards = [
    {
      label: t('dashboard.statusCards.overdue'),
      count: personal.statusCounts['overdue'] ?? 0,
      delta: personal.deltaVsYesterday['overdue'] ?? null,
      deltaInverted: true, // subir = ruim
      icon: AlertCircle,
      iconColor: '#ef4444',
    },
    {
      label: t('dashboard.statusCards.inProgress'),
      count: personal.statusCounts['in_progress'] ?? 0,
      delta: personal.deltaVsYesterday['in_progress'] ?? null,
      icon: Clock,
      iconColor: '#3b82f6',
    },
    {
      label: t('dashboard.statusCards.awaitingReturn'),
      count: personal.statusCounts['awaiting_feedback'] ?? 0,
      delta: personal.deltaVsYesterday['awaiting_feedback'] ?? null,
      icon: MessageSquare,
      iconColor: '#f59e0b',
    },
    {
      label: t('dashboard.statusCards.inReview'),
      count: personal.statusCounts['in_review'] ?? 0,
      delta: personal.deltaVsYesterday['in_review'] ?? null,
      icon: Eye,
      iconColor: '#8b5cf6',
    },
    {
      label: t('dashboard.statusCards.completed'),
      count: personal.statusCounts['approved'] ?? 0,
      delta: personal.deltaVsYesterday['approved'] ?? null,
      icon: CheckCircle2,
      iconColor: '#10b981',
    },
  ];

  // Filtrar "Minhas demandas" por tab (client-side — todos os dados já carregados)
  const filteredDemands = personal.myDemands.filter((d) => {
    if (demandTab === 'all') return true;
    if (demandTab === 'in_progress') return d.status === 'in_progress';
    if (demandTab === 'overdue') return d.deadline !== null && d.deadline < today && d.status !== 'approved';
    if (demandTab === 'completed') return d.status === 'approved';
    return true;
  }).slice(0, 5);

  // Bar chart: concluídas por dia (D-02)
  const dayOrder = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(2023, 0, i + 1);
    return new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(date);
  });
  const completedBarData = dayOrder.map((day) => ({
    name: day,
    value: personal.completedByDay[day] ?? 0,
  }));

  // Donut: progresso da semana (D-11)
  const progressDonutData = [
    { name: t('dashboard.chartCompleted'), value: personal.weekProgress.completed, color: '#10b981' },
    {
      name: t('dashboard.chartPending'),
      value: Math.max(0, personal.weekProgress.total - personal.weekProgress.completed),
      color: '#1f2937',
    },
  ];
  const progressPercent = personal.weekProgress.total > 0
    ? `${Math.round((personal.weekProgress.completed / personal.weekProgress.total) * 100)}%`
    : '0%';

  return (
    <div className="space-y-6">
      {/* Region 4: 5 status cards (D-07) — mobile: 3+2 centered via grid-cols-6 */}
      <div className="grid grid-cols-6 lg:grid-cols-5 gap-3 sm:gap-4">
        {statusCards.map((card, i) => (
          <div
            key={card.label}
            className={
              i < 3
                ? 'col-span-2 lg:col-span-1'
                : i === 3
                  ? 'col-span-2 col-start-2 lg:col-span-1 lg:col-start-auto'
                  : 'col-span-2 lg:col-span-1'
            }
          >
            <DashboardStatusCard {...card} animationDelay={i * 50} />
          </div>
        ))}
      </div>

      {/* Region 5: 3-column grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Seu foco agora (D-08) */}
        <DashboardSectionCard title={t('dashboard.sections.focusNow')}>
          {personal.focusDemands.length === 0 ? (
            <p className="text-sm text-[#9ca3af] text-center py-6">
              {t('dashboard.noUrgentDemands')}
            </p>
          ) : (
            <div>
              {personal.focusDemands.map((d) => (
                <Link
                  key={d.id}
                  href={`/demands?demand=${d.id}`}
                  className="flex items-center gap-3 py-2.5 border-b border-[#e5e7eb] dark:border-[#1f2937] last:border-0 hover:bg-[#f9fafb] dark:hover:bg-[#0d1117] rounded transition-colors"
                >
                  <PriorityBadge priority={d.priority} />
                  <span className="text-sm text-[#111827] dark:text-[#f9fafb] truncate flex-1">
                    {d.title}
                  </span>
                  <span
                    className={`text-xs whitespace-nowrap font-medium ${
                      d.deadline && d.deadline < today
                        ? 'text-[#ef4444]'
                        : 'text-[#9ca3af]'
                    }`}
                  >
                    {d.deadline ?? t('dashboard.noDeadline')}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </DashboardSectionCard>

        {/* Concluídas por dia (D-02 DASH-02 simplificado para pessoal) */}
        <DashboardSectionCard title={t('dashboard.statusCards.completedThisWeek')}>
          <div role="img" aria-label={t('dashboard.completedChartAria')}>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={completedBarData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} />
                <RechartsTooltip contentStyle={CHART_TOOLTIP_STYLE} />
                <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} name={t('dashboard.chartCompleted')} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </DashboardSectionCard>

        {/* Seu progresso (D-11) */}
        <DashboardSectionCard title={t('dashboard.sections.yourProgress')}>
          <DonutChart
            data={progressDonutData}
            centerLabel={progressPercent}
            ariaLabel={t('dashboard.sections.yourProgress')}
          />
          <p className="text-xs text-[#6b7280] text-center mt-2">
            {t('dashboard.progressWeek', { completed: personal.weekProgress.completed, total: personal.weekProgress.total })}
          </p>
        </DashboardSectionCard>
      </div>

      {/* Region 6: 2-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Minhas demandas com tabs (D-09) */}
        <DashboardSectionCard
          title={t('dashboard.sections.myDemands')}
          action={
            <Link href="/demands" className="text-xs text-[#7c3aed] hover:underline font-medium" aria-label={t('dashboard.viewAll')}>
              {t('dashboard.viewAll')}
            </Link>
          }
        >
          {/* Tab bar */}
          <div className="flex gap-1 mb-4 border-b border-[#e5e7eb] dark:border-[#1f2937]" role="tablist">
            {[
              { id: 'all' as const, label: t('dashboard.demandTabs.all') },
              { id: 'in_progress' as const, label: t('dashboard.demandTabs.inProgress') },
              { id: 'overdue' as const, label: t('dashboard.demandTabs.overdue') },
              { id: 'completed' as const, label: t('dashboard.demandTabs.completed') },
            ].map((tab) => (
              <button
                key={tab.id}
                role="tab"
                aria-selected={demandTab === tab.id}
                onClick={() => setDemandTab(tab.id)}
                className={`px-3 py-2 text-xs font-medium transition-colors -mb-px border-b-2 ${
                  demandTab === tab.id
                    ? 'border-[#7c3aed] text-[#7c3aed]'
                    : 'border-transparent text-[#6b7280] hover:text-[#111827] dark:hover:text-[#f9fafb]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Mobile: compact list + ver todas button */}
          <div className="md:hidden">
            {filteredDemands.length === 0 ? (
              <p className="text-sm text-[#9ca3af] text-center py-4">{t('dashboard.noDemandFilter')}</p>
            ) : (
              <div>
                {filteredDemands.slice(0, 4).map((d) => (
                  <div
                    key={d.id}
                    onClick={() => router.visit(`/demands?demand=${d.id}`)}
                    className="flex items-center gap-2 py-2.5 border-b border-[#e5e7eb] dark:border-[#1f2937] last:border-0 cursor-pointer hover:bg-[#f9fafb] dark:hover:bg-[#0b0f14] transition-colors rounded"
                  >
                    <span className="flex-1 text-sm text-[#111827] dark:text-[#f9fafb] truncate">{d.title}</span>
                    <StatusBadge status={d.status} />
                  </div>
                ))}
                {filteredDemands.length > 4 && (
                  <p className="text-xs text-[#9ca3af] text-center pt-2">+{filteredDemands.length - 4} demandas</p>
                )}
              </div>
            )}
            <Link
              href="/demands"
              className="mt-3 flex items-center justify-center gap-1 w-full rounded-[8px] border border-[#e5e7eb] dark:border-[#1f2937] py-2.5 text-sm font-medium text-[#7c3aed] hover:bg-[#f3f4f6] dark:hover:bg-[#1f2937] transition-colors"
            >
              {t('dashboard.viewAll')}
            </Link>
          </div>

          {/* Desktop: full table */}
          {filteredDemands.length === 0 ? (
            <p className="hidden md:block text-sm text-[#9ca3af] text-center py-4">{t('dashboard.noDemandFilter')}</p>
          ) : (
            <table className="hidden md:table w-full text-sm">
              <thead>
                <tr className="text-left">
                  <th scope="col" className="text-xs text-[#6b7280] font-medium pb-2">{t('dashboard.tableTitle')}</th>
                  <th scope="col" className="text-xs text-[#6b7280] font-medium pb-2">{t('dashboard.tableStatus')}</th>
                  <th scope="col" className="text-xs text-[#6b7280] font-medium pb-2">{t('dashboard.tablePriority')}</th>
                  <th scope="col" className="text-xs text-[#6b7280] font-medium pb-2">{t('dashboard.tableDeadline')}</th>
                  <th scope="col" className="text-xs text-[#6b7280] font-medium pb-2">{t('dashboard.tableClient')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredDemands.map((d) => (
                  <tr key={d.id} onClick={() => router.visit(`/demands?demand=${d.id}`)} className="hover:bg-[#f3f4f6] dark:hover:bg-[#1f2937] transition-colors cursor-pointer">
                    <td className="py-2 pr-2 text-[#111827] dark:text-[#f9fafb] truncate max-w-[140px]">{d.title}</td>
                    <td className="py-2 pr-2"><StatusBadge status={d.status} /></td>
                    <td className="py-2 pr-2"><PriorityBadge priority={d.priority} /></td>
                    <td className="py-2 pr-2 text-xs text-[#6b7280] whitespace-nowrap">{d.deadline ?? '—'}</td>
                    <td className="py-2 text-xs text-[#6b7280] truncate max-w-[100px]">{d.client_name ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </DashboardSectionCard>

        {/* Bloqueios / Aguardando (D-10) */}
        <DashboardSectionCard title={t('dashboard.statusCards.blockers')}>
          {personal.blockers.length === 0 ? (
            <p className="text-sm text-[#9ca3af] text-center py-4">{t('dashboard.noBlockers')}</p>
          ) : (
            <div>
              {personal.blockers.map((b) => (
                <Link
                  key={b.id}
                  href={`/demands?demand=${b.id}`}
                  className="flex items-start gap-2 py-2.5 border-b border-[#e5e7eb] dark:border-[#1f2937] last:border-0 hover:bg-[#f9fafb] dark:hover:bg-[#0d1117] rounded transition-colors"
                >
                  <AlertCircle size={14} className="text-[#f59e0b] mt-0.5 shrink-0" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-medium text-[#111827] dark:text-[#f9fafb]">{b.title}</p>
                    <p className="text-xs text-[#9ca3af]">{t('dashboard.blockerSince', { date: b.since })}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </DashboardSectionCard>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------
// View Gerencial (admin/owner — D-14 a D-19)
// -----------------------------------------------------------------------
function OverviewView({
  overview,
}: {
  overview: OverviewData;
  onDateRangeChange: (start: string, end: string) => void;
}) {
  const { t } = useTranslation();
  const today = new Date().toISOString().substring(0, 10);

  // Status cards org-wide (D-14) — reusar mesma estrutura da view pessoal
  const statusCards = [
    { label: t('dashboard.statusCards.overdue'), count: overview.overdueCount, delta: overview.deltaVsYesterday['overdue'] ?? null, deltaInverted: true, icon: AlertCircle, iconColor: '#ef4444' },
    { label: t('dashboard.statusCards.inProgress'), count: overview.statusBreakdown['in_progress'] ?? 0, delta: overview.deltaVsYesterday['in_progress'] ?? null, icon: Clock, iconColor: '#3b82f6' },
    { label: t('dashboard.statusCards.awaitingReturn'), count: overview.statusBreakdown['awaiting_feedback'] ?? 0, delta: overview.deltaVsYesterday['awaiting_feedback'] ?? null, icon: MessageSquare, iconColor: '#f59e0b' },
    { label: t('dashboard.statusCards.inReview'), count: overview.statusBreakdown['in_review'] ?? 0, delta: overview.deltaVsYesterday['in_review'] ?? null, icon: Eye, iconColor: '#8b5cf6' },
    { label: t('dashboard.statusCards.completed'), count: overview.statusBreakdown['approved'] ?? 0, delta: overview.deltaVsYesterday['approved'] ?? null, icon: CheckCircle2, iconColor: '#10b981' },
  ];

  // Panorama geral donut (D-15)
  const statusDonutData = Object.entries(overview.statusBreakdown).map(([status, count]) => ({
    name: t('demand.statuses.' + status, { defaultValue: status }),
    value: count as number,
    color: STATUS_COLORS[status] ?? '#9ca3af',
  }));
  const orgTotal = statusDonutData.reduce((s, d) => s + d.value, 0);

  // Prioridade bar chart (D-16)
  const priorityBarData = [
    { name: t('demand.priorities.high'),   value: overview.priorityBreakdown['high']   ?? 0, color: '#ef4444' },
    { name: t('demand.priorities.medium'), value: overview.priorityBreakdown['medium'] ?? 0, color: '#f59e0b' },
    { name: t('demand.priorities.low'),    value: overview.priorityBreakdown['low']    ?? 0, color: '#9ca3af' },
  ];

  // Desempenho donut (D-19)
  const perfDonutData = [
    { name: t('dashboard.teamPerf.completed'),   value: overview.teamPerformance.completed,   color: '#10b981' },
    { name: t('dashboard.teamPerf.inProgress'), value: overview.teamPerformance.in_progress, color: '#3b82f6' },
  ];

  // suppress unused variable
  void today;

  return (
    <div className="space-y-6">
      {/* Region 2: 5 status cards org-wide — mobile: 3+2 centered via grid-cols-6 */}
      <div className="grid grid-cols-6 lg:grid-cols-5 gap-3 sm:gap-4">
        {statusCards.map((card, i) => (
          <div
            key={card.label}
            className={
              i < 3
                ? 'col-span-2 lg:col-span-1'
                : i === 3
                  ? 'col-span-2 col-start-2 lg:col-span-1 lg:col-start-auto'
                  : 'col-span-2 lg:col-span-1'
            }
          >
            <DashboardStatusCard {...card} animationDelay={i * 50} />
          </div>
        ))}
      </div>

      {/* Region 3: 3-column grid — charts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Panorama geral — donut (D-15) */}
        <DashboardSectionCard title={t('dashboard.sections.overview')}>
          <DonutChart
            data={statusDonutData}
            centerLabel={String(orgTotal)}
            ariaLabel={t('dashboard.sections.overview')}
          />
          {/* Legenda com count + % */}
          <div className="mt-3 space-y-1">
            {statusDonutData.map((d) => (
              <div key={d.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: d.color }} />
                  <span className="text-[#6b7280]">{d.name}</span>
                </div>
                <span className="text-[#111827] dark:text-[#f9fafb] font-medium">
                  {d.value} ({orgTotal > 0 ? Math.round((d.value / orgTotal) * 100) : 0}%)
                </span>
              </div>
            ))}
          </div>
        </DashboardSectionCard>

        {/* Demandas por prioridade — bar chart (D-16) */}
        <DashboardSectionCard title={t('dashboard.sections.demandsByPriority')}>
          <div role="img" aria-label={t('dashboard.ariaChartPrefix') + t('dashboard.sections.demandsByPriority')}>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={priorityBarData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} />
                <RechartsTooltip contentStyle={CHART_TOOLTIP_STYLE} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} name={t('dashboard.chartDemands')}>
                  {priorityBarData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </DashboardSectionCard>

        {/* Demanda ao longo do tempo — line chart (D-17) */}
        <DashboardSectionCard title={t('dashboard.sections.demandsOverTime')}>
          <div role="img" aria-label={t('dashboard.ariaChartPrefix') + t('dashboard.sections.demandsOverTime')}>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={overview.demandsOverTime} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} />
                <RechartsTooltip contentStyle={CHART_TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ fontSize: '12px', color: '#6b7280' }} />
                <Line type="monotone" dataKey="created"   stroke="#3b82f6" strokeWidth={2} dot={false} activeDot={{ r: 4 }} name={t('dashboard.chartCreated')} />
                <Line type="monotone" dataKey="completed" stroke="#10b981" strokeWidth={2} dot={false} activeDot={{ r: 4 }} name={t('dashboard.chartCompleted')} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </DashboardSectionCard>
      </div>

      {/* Region 4: 2-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Últimas demandas (D-18) */}
        <DashboardSectionCard
          title={t('dashboard.sections.latestDemands')}
          action={
            <Link href="/demands" className="text-xs text-[#7c3aed] hover:underline font-medium" aria-label="Ver todas as demandas">
              Ver todas →
            </Link>
          }
        >
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left">
                <th scope="col" className="text-xs text-[#6b7280] font-medium pb-2">{t('dashboard.tableTitle')}</th>
                <th scope="col" className="text-xs text-[#6b7280] font-medium pb-2">{t('dashboard.tableStatus')}</th>
                <th scope="col" className="text-xs text-[#6b7280] font-medium pb-2">{t('dashboard.tablePriority')}</th>
                <th scope="col" className="text-xs text-[#6b7280] font-medium pb-2">{t('dashboard.tableUpdatedAt')}</th>
                <th scope="col" className="text-xs text-[#6b7280] font-medium pb-2">{t('dashboard.tableAssignee')}</th>
              </tr>
            </thead>
            <tbody>
              {overview.latestDemands.map((d) => (
                <tr key={d.id} className="hover:bg-[#f3f4f6] dark:hover:bg-[#1f2937] transition-colors">
                  <td className="py-2 pr-2 text-[#111827] dark:text-[#f9fafb] truncate max-w-[120px]">{d.title}</td>
                  <td className="py-2 pr-2"><StatusBadge status={d.status} /></td>
                  <td className="py-2 pr-2"><PriorityBadge priority={d.priority} /></td>
                  <td className="py-2 pr-2 text-xs text-[#6b7280] whitespace-nowrap">{d.updated_at ?? '—'}</td>
                  <td className="py-2">
                    {d.assignee_name ? (
                      <div className="flex items-center gap-2">
                        <UserAvatar name={d.assignee_name} avatar={d.assignee_avatar} size="sm" />
                        <span className="text-xs text-[#6b7280] truncate max-w-[80px]">{d.assignee_name}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-[#9ca3af]">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </DashboardSectionCard>

        {/* Desempenho da equipe — donut (D-19) */}
        <DashboardSectionCard title={t('dashboard.sections.teamPerformance')}>
          <DonutChart
            data={perfDonutData}
            centerLabel={`${overview.teamPerformance.rate}%`}
            ariaLabel={t('dashboard.sections.teamPerformance')}
          />
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-lg font-bold text-[#111827] dark:text-[#f9fafb]">{overview.teamPerformance.total}</p>
              <p className="text-xs text-[#6b7280]">{t('dashboard.total')}</p>
            </div>
            <div>
              <p className="text-lg font-bold text-[#10b981]">{overview.teamPerformance.completed}</p>
              <p className="text-xs text-[#6b7280]">{t('dashboard.teamPerf.completed')}</p>
            </div>
            <div>
              <p className="text-lg font-bold text-[#3b82f6]">{overview.teamPerformance.in_progress}</p>
              <p className="text-xs text-[#6b7280]">{t('dashboard.teamPerf.inProgress')}</p>
            </div>
          </div>

          {/* Workload da equipe (DASH-02) — tabela abaixo do donut */}
          {overview.teamWorkload.length > 0 && (
            <div className="mt-4 pt-4 border-t border-[#e5e7eb] dark:border-[#1f2937]">
              <h4 className="text-xs font-medium text-[#6b7280] mb-3 uppercase tracking-wide">{t('dashboard.sections.teamWorkload')}</h4>
              <div className="space-y-2">
                {overview.teamWorkload.slice(0, 5).map((m) => (
                  <div key={m.user_id} className="flex items-center gap-2">
                    <UserAvatar name={m.name} avatar={m.avatar} size="sm" />
                    <span className="text-xs text-[#111827] dark:text-[#f9fafb] flex-1 truncate">{m.name}</span>
                    <span className="text-xs text-[#6b7280]">{m.active} {t('dashboard.active')}</span>
                    {m.overdue > 0 && (
                      <span className="text-xs text-[#ef4444] font-medium">{m.overdue} {t('dashboard.overdueShort')}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Distribuição por cliente (DASH-03) */}
          {overview.clientDistribution.length > 0 && (
            <div className="mt-4 pt-4 border-t border-[#e5e7eb] dark:border-[#1f2937]">
              <h4 className="text-xs font-medium text-[#6b7280] mb-3 uppercase tracking-wide">{t('dashboard.sections.clientActivity')}</h4>
              <div className="space-y-2">
                {overview.clientDistribution.slice(0, 5).map((c) => (
                  <div key={c.client_id} className="flex items-center justify-between text-xs">
                    <span className="text-[#111827] dark:text-[#f9fafb] truncate max-w-[140px]">{c.name}</span>
                    <div className="flex gap-3">
                      <span className="text-[#6b7280]">{c.total} {t('dashboard.active')}</span>
                      <span className="text-[#10b981]">{c.completed} {t('dashboard.completedShort')}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DashboardSectionCard>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------
// Componente principal
// -----------------------------------------------------------------------
export default function Dashboard({
  planningReminderClients,
  personal,
  overview,
  activityFeed,
  hasClients,
  hasDemands,
  hasAnthropicKey,
}: Props) {
  const { t } = useTranslation();
  const { auth } = usePage<PageProps>().props;
  const isAdmin = ['admin', 'owner'].includes((auth?.user as { role?: string } | undefined)?.role ?? '');

  const [view, setView] = useState<'personal' | 'overview'>('personal');

  // Calcular semana atual para o date range picker (default)
  const getWeekBounds = useCallback(() => {
    const now = new Date();
    const day = now.getDay(); // 0=Dom, 1=Seg...
    const diffToMonday = (day === 0 ? -6 : 1 - day);
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return {
      start: monday.toISOString().substring(0, 10),
      end: sunday.toISOString().substring(0, 10),
    };
  }, []);

  const weekBounds = overview?.dateRange ?? getWeekBounds();
  const [dateStart, setDateStart] = useState(weekBounds.start);
  const [dateEnd, setDateEnd] = useState(weekBounds.end);

  const handleDateChange = useCallback(
    (newStart: string, newEnd: string) => {
      setDateStart(newStart);
      setDateEnd(newEnd);
      // Partial reload — apenas prop 'overview' (Pattern 2 RESEARCH.md)
      router.get(
        route('dashboard'),
        { start: newStart, end: newEnd },
        { preserveScroll: true, preserveState: true, only: ['overview'] }
      );
    },
    []
  );

  // Auto-refresh a cada 30s (pausa quando aba está em background)
  useEffect(() => {
    const tick = () => {
      if (!document.hidden) {
        router.reload({
          only: isAdmin && view === 'overview'
            ? ['personal', 'overview', 'activityFeed']
            : ['personal', 'activityFeed'],
        });
      }
    };
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [isAdmin, view]);

  const greeting = t('dashboard.greeting', { name: auth?.user?.name?.split(' ')[0] ?? '' });
  const subtitle =
    view === 'personal'
      ? t('dashboard.subtitlePersonal')
      : t('dashboard.subtitleOverview');

  // Preferences para onboarding
  const prefs = (auth?.user as { preferences?: { onboarding_dismissed?: boolean } } | undefined)?.preferences;

  return (
    <AppLayout title={t('nav.dashboard')}>
      <div className="px-4 md:px-6 py-6 space-y-6">
        {/* Region 1: Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-lg font-semibold text-[#111827] dark:text-[#f9fafb]">{greeting}</p>
            <p className="text-sm text-[#6b7280] mt-0.5">{subtitle}</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {isAdmin && (
              <ViewToggle view={view} onChange={setView} />
            )}
            {isAdmin && view === 'overview' && (
              <div className="flex items-center gap-2" aria-label="Filtro de período">
                <label htmlFor="date-start" className="text-xs text-[#6b7280]">{t('dashboard.dateFrom')}</label>
                <input
                  id="date-start"
                  type="date"
                  value={dateStart}
                  onChange={(e) => handleDateChange(e.target.value, dateEnd)}
                  className="h-9 px-3 rounded-[8px] border border-[#e5e7eb] dark:border-[#1f2937] bg-white dark:bg-[#111827] text-sm focus:ring-2 focus:ring-[#7c3aed]/20 focus:border-[#7c3aed] outline-none"
                />
                <span className="text-[#9ca3af]">–</span>
                <label htmlFor="date-end" className="text-xs text-[#6b7280]">{t('dashboard.dateTo')}</label>
                <input
                  id="date-end"
                  type="date"
                  value={dateEnd}
                  onChange={(e) => handleDateChange(dateStart, e.target.value)}
                  className="h-9 px-3 rounded-[8px] border border-[#e5e7eb] dark:border-[#1f2937] bg-white dark:bg-[#111827] text-sm focus:ring-2 focus:ring-[#7c3aed]/20 focus:border-[#7c3aed] outline-none"
                />
              </div>
            )}
            <Link
              href="/demands"
              className="inline-flex items-center gap-2 bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-sm font-semibold px-4 py-2 rounded-[8px] transition-colors"
            >
              <Plus size={16} aria-hidden="true" />
              {t('dashboard.newDemand')}
            </Link>
          </div>
        </div>

        {/* Region 2: Onboarding checklist (condicional — topo) */}
        <OnboardingChecklist
          hasClients={hasClients}
          hasDemands={hasDemands}
          hasAnthropicKey={hasAnthropicKey}
          isAdmin={isAdmin}
          onboardingDismissed={prefs?.onboarding_dismissed}
        />

        {/* Region 3: Planning widget (existente — não remover) */}
        {planningReminderClients && planningReminderClients.length > 0 && (
          <DashboardPlanningWidget clients={planningReminderClients} />
        )}

        {/* Regions 4-7: Conteúdo por view */}
        {view === 'personal' && (
          <PersonalView personal={personal} />
        )}

        {view === 'overview' && isAdmin && overview && (
          <OverviewView
            overview={overview}
            onDateRangeChange={handleDateChange}
          />
        )}

        {/* Region Activity Feed — ambas as views */}
        <ActivityFeed events={activityFeed} />
      </div>
    </AppLayout>
  );
}
