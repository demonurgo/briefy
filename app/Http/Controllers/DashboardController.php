<?php
// (c) 2026 Briefy contributors — AGPL-3.0

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\Client;
use App\Models\Demand;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(Request $request): Response
    {
        $user      = auth()->user();
        $orgId     = $user->current_organization_id;
        $today     = Carbon::today();
        $yesterday = Carbon::yesterday();
        $weekStart = Carbon::now()->startOfWeek();
        $weekEnd   = Carbon::now()->endOfWeek();

        // ---------------------------------------------------------------
        // Personal props — todos os usuários (scoped a assigned_to = $user)
        // ---------------------------------------------------------------
        $personalBase = Demand::where('organization_id', $orgId)
            ->where('assigned_to', $user->id)
            ->whereNull('archived_at');
        // Nota: SoftDeletes aplica whereNull('deleted_at') automaticamente

        $statusCounts = (clone $personalBase)
            ->selectRaw('status, COUNT(*) as count')
            ->groupBy('status')
            ->pluck('count', 'status')
            ->toArray();

        // Overdue: deadline passado, status != approved, ativo
        $overdueCount = (clone $personalBase)
            ->where('deadline', '<', $today)
            ->whereNotIn('status', ['approved'])
            ->count();
        $statusCounts['overdue'] = $overdueCount;

        // Delta vs ontem: contagens de demandas que tiveram updated_at = ontem por status
        $yesterdayCounts = (clone $personalBase)
            ->whereDate('updated_at', $yesterday)
            ->selectRaw('status, COUNT(*) as count')
            ->groupBy('status')
            ->pluck('count', 'status')
            ->toArray();

        // Foco agora: atrasadas ou deadline hoje/amanhã, excluindo aprovadas, max 5
        $focusDemands = (clone $personalBase)
            ->whereNotIn('status', ['approved'])
            ->where(function ($q) use ($today) {
                $q->where('deadline', '<', $today)
                  ->orWhereDate('deadline', $today)
                  ->orWhereDate('deadline', $today->copy()->addDay());
            })
            ->with('client:id,name')
            ->orderByRaw("CASE WHEN deadline < NOW() THEN 0 ELSE 1 END")
            ->orderBy('deadline')
            ->limit(5)
            ->get(['id', 'title', 'status', 'priority', 'deadline', 'client_id'])
            ->map(fn ($d) => [
                'id'            => $d->id,
                'title'         => $d->title,
                'status'        => $d->status,
                'priority'      => $d->priority,
                'deadline'      => $d->deadline?->toDateString(),
                'client_name'   => $d->client?->name,
            ]);

        // Minhas demandas: todas (para tabs no frontend), max 20
        $myDemands = (clone $personalBase)
            ->with('client:id,name')
            ->orderByDesc('updated_at')
            ->limit(20)
            ->get(['id', 'title', 'status', 'priority', 'deadline', 'client_id', 'updated_at'])
            ->map(fn ($d) => [
                'id'          => $d->id,
                'title'       => $d->title,
                'status'      => $d->status,
                'priority'    => $d->priority,
                'deadline'    => $d->deadline?->toDateString(),
                'client_name' => $d->client?->name,
                'updated_at'  => $d->updated_at?->toDateString(),
            ]);

        // Bloqueios: demandas awaiting_feedback
        $blockers = (clone $personalBase)
            ->where('status', 'awaiting_feedback')
            ->get(['id', 'title', 'updated_at'])
            ->map(fn ($d) => [
                'id'         => $d->id,
                'title'      => $d->title,
                'since'      => $d->updated_at?->format('d/m/Y'),
            ]);

        // Progresso da semana: concluídas nesta semana vs total atribuídas
        $weekCompleted = (clone $personalBase)
            ->where('status', 'approved')
            ->whereBetween('updated_at', [$weekStart, $weekEnd])
            ->count();
        $totalAssigned = (clone $personalBase)->count();
        $weekProgress = ['completed' => $weekCompleted, 'total' => $totalAssigned];

        // Concluídas por dia da semana (para bar chart pessoal) — últimos 7 dias
        $completedByDay = Demand::where('organization_id', $orgId)
            ->where('assigned_to', $user->id)
            ->whereNull('archived_at')
            ->where('status', 'approved')
            ->whereBetween('updated_at', [$weekStart, $weekEnd])
            ->selectRaw("TO_CHAR(updated_at, 'Dy') as day, COUNT(*) as count")
            ->groupByRaw("TO_CHAR(updated_at, 'Dy'), EXTRACT(DOW FROM updated_at)")
            ->orderByRaw("EXTRACT(DOW FROM updated_at)")
            ->pluck('count', 'day')
            ->toArray();

        $personal = [
            'statusCounts'     => $statusCounts,
            'deltaVsYesterday' => $yesterdayCounts,
            'focusDemands'     => $focusDemands,
            'myDemands'        => $myDemands,
            'blockers'         => $blockers,
            'weekProgress'     => $weekProgress,
            'completedByDay'   => $completedByDay,
        ];

        // ---------------------------------------------------------------
        // Overview props — apenas admin/owner (scoped à organização inteira)
        // ---------------------------------------------------------------
        $overview = null;

        if ($user->isAdminOrOwner()) {
            // Validar date range inputs (T-5-04: sanitização antes de Carbon::parse)
            $start = $request->filled('start') && $this->isValidDate($request->start)
                ? Carbon::parse($request->start)->startOfDay()
                : $weekStart;
            $end = $request->filled('end') && $this->isValidDate($request->end)
                ? Carbon::parse($request->end)->endOfDay()
                : $weekEnd;

            $orgBase = Demand::where('organization_id', $orgId)->whereNull('archived_at');

            // Status breakdown para donut (D-15)
            $statusBreakdown = (clone $orgBase)
                ->selectRaw('status, COUNT(*) as count')
                ->groupBy('status')
                ->pluck('count', 'status')
                ->toArray();

            // Status delta vs ontem (org-wide)
            $orgYesterdayCounts = (clone $orgBase)
                ->whereDate('updated_at', $yesterday)
                ->selectRaw('status, COUNT(*) as count')
                ->groupBy('status')
                ->pluck('count', 'status')
                ->toArray();

            // Overdue org-wide
            $orgOverdueCount = (clone $orgBase)
                ->where('deadline', '<', $today)
                ->whereNotIn('status', ['approved'])
                ->count();

            // Priority breakdown para bar chart (D-16) — scoped pelo date range
            $priorityBreakdown = (clone $orgBase)
                ->whereBetween('created_at', [$start, $end])
                ->selectRaw('priority, COUNT(*) as count')
                ->groupBy('priority')
                ->pluck('count', 'priority')
                ->toArray();

            // Demandas ao longo do tempo: criadas vs concluídas por dia (D-17)
            $demandsCreatedByDay = (clone $orgBase)
                ->whereBetween('created_at', [$start, $end])
                ->selectRaw("TO_CHAR(created_at, 'MM-DD') as date, COUNT(*) as count")
                ->groupByRaw("TO_CHAR(created_at, 'MM-DD')")
                ->orderByRaw("TO_CHAR(created_at, 'MM-DD')")
                ->pluck('count', 'date')
                ->toArray();

            $demandsCompletedByDay = (clone $orgBase)
                ->where('status', 'approved')
                ->whereBetween('updated_at', [$start, $end])
                ->selectRaw("TO_CHAR(updated_at, 'MM-DD') as date, COUNT(*) as count")
                ->groupByRaw("TO_CHAR(updated_at, 'MM-DD')")
                ->orderByRaw("TO_CHAR(updated_at, 'MM-DD')")
                ->pluck('count', 'date')
                ->toArray();

            // Mesclar em array [{date, created, completed}]
            $allDates = array_unique(array_merge(
                array_keys($demandsCreatedByDay),
                array_keys($demandsCompletedByDay)
            ));
            sort($allDates);
            $demandsOverTime = array_map(fn ($date) => [
                'date'      => $date,
                'created'   => $demandsCreatedByDay[$date] ?? 0,
                'completed' => $demandsCompletedByDay[$date] ?? 0,
            ], $allDates);

            // Últimas demandas (D-18) — 5 mais recentes
            $latestDemands = (clone $orgBase)
                ->with(['client:id,name', 'assignee:id,name,avatar'])
                ->orderByDesc('updated_at')
                ->limit(5)
                ->get(['id', 'title', 'status', 'priority', 'updated_at', 'client_id', 'assigned_to'])
                ->map(fn ($d) => [
                    'id'              => $d->id,
                    'title'           => $d->title,
                    'status'          => $d->status,
                    'priority'        => $d->priority,
                    'updated_at'      => $d->updated_at?->format('d/m/Y'),
                    'client_name'     => $d->client?->name,
                    'assignee_name'   => $d->assignee?->name,
                    'assignee_avatar' => $d->assignee?->avatar,
                ]);

            // Workload por membro da equipe (DASH-02)
            $teamWorkload = Demand::where('organization_id', $orgId)
                ->whereNull('archived_at')
                ->whereNotNull('assigned_to')
                ->join('users', 'users.id', '=', 'demands.assigned_to')
                ->selectRaw('users.id, users.name, users.avatar, COUNT(*) as total,
                    SUM(CASE WHEN demands.status = \'approved\' THEN 1 ELSE 0 END) as completed,
                    SUM(CASE WHEN demands.deadline < NOW() AND demands.status != \'approved\' THEN 1 ELSE 0 END) as overdue')
                ->groupBy('users.id', 'users.name', 'users.avatar')
                ->orderByDesc('total')
                ->get()
                ->map(fn ($row) => [
                    'user_id'   => $row->id,
                    'name'      => $row->name,
                    'avatar'    => $row->avatar,
                    'total'     => (int) $row->total,
                    'completed' => (int) $row->completed,
                    'overdue'   => (int) $row->overdue,
                    'active'    => (int) $row->total - (int) $row->completed,
                ]);

            // Distribuição por cliente (DASH-03)
            $clientDistribution = Demand::where('demands.organization_id', $orgId)
                ->whereNull('demands.archived_at')
                ->join('clients', 'clients.id', '=', 'demands.client_id')
                ->selectRaw('clients.id, clients.name, COUNT(*) as total,
                    SUM(CASE WHEN demands.status = \'approved\' THEN 1 ELSE 0 END) as completed_this_week')
                ->groupBy('clients.id', 'clients.name')
                ->orderByDesc('total')
                ->limit(10)
                ->get()
                ->map(fn ($row) => [
                    'client_id' => $row->id,
                    'name'      => $row->name,
                    'total'     => (int) $row->total,
                    'completed' => (int) $row->completed_this_week,
                ]);

            // Desempenho da equipe (D-19)
            $orgTotal     = (clone $orgBase)->count();
            $orgCompleted = (clone $orgBase)->where('status', 'approved')->count();
            $teamPerformance = [
                'total'       => $orgTotal,
                'completed'   => $orgCompleted,
                'in_progress' => $orgTotal - $orgCompleted,
                'rate'        => $orgTotal > 0 ? round(($orgCompleted / $orgTotal) * 100) : 0,
            ];

            $overview = [
                'statusBreakdown'    => $statusBreakdown,
                'deltaVsYesterday'   => $orgYesterdayCounts,
                'overdueCount'       => $orgOverdueCount,
                'priorityBreakdown'  => $priorityBreakdown,
                'demandsOverTime'    => $demandsOverTime,
                'latestDemands'      => $latestDemands,
                'teamWorkload'       => $teamWorkload,
                'clientDistribution' => $clientDistribution,
                'teamPerformance'    => $teamPerformance,
                'dateRange'          => [
                    'start' => $start->toDateString(),
                    'end'   => $end->toDateString(),
                ],
            ];
        }

        // ---------------------------------------------------------------
        // Activity Feed (D-23: scoped por role)
        // ---------------------------------------------------------------
        $activityQuery = ActivityLog::where('organization_id', $orgId)
            ->with('user:id,name,avatar')
            ->orderByDesc('created_at')
            ->limit(15);

        if (! $user->isAdminOrOwner()) {
            // T-5-03: colaborador vê apenas eventos das suas demandas (assigned_to ou created_by)
            $myDemandIds = Demand::where('organization_id', $orgId)
                ->where(fn ($q) => $q
                    ->where('assigned_to', $user->id)
                    ->orWhere('created_by', $user->id)
                )
                ->pluck('id');

            $activityQuery->where(function ($q) use ($user, $myDemandIds) {
                $q->where(fn ($sub) => $sub
                    ->whereIn('subject_id', $myDemandIds)
                    ->where('subject_type', 'demand')
                )->orWhere('user_id', $user->id);
            });
        }

        $activityFeed = $activityQuery->get()->map(fn ($log) => [
            'id'           => $log->id,
            'action_type'  => $log->action_type,
            'subject_name' => $log->subject_name,
            'user_name'    => $log->user?->name ?? 'Sistema',
            'user_avatar'  => $log->user?->avatar,
            'metadata'     => $log->metadata,
            'created_at'   => $log->created_at?->diffForHumans(),
        ]);

        // ---------------------------------------------------------------
        // Onboarding (ONBRD-01)
        // ---------------------------------------------------------------
        $hasClients = Client::where('organization_id', $orgId)->exists();
        $hasDemands = Demand::where('organization_id', $orgId)
            ->whereNull('archived_at')
            ->exists();

        // Planning reminder clients (widget existente — manter)
        $planningReminderClients = Client::where('organization_id', $orgId)
            ->whereNotNull('planning_day')
            ->get(['id', 'name', 'planning_day']);

        return Inertia::render('Dashboard', [
            'personal'                => $personal,
            'overview'                => $overview, // null para colaboradores
            'activityFeed'            => $activityFeed,
            'hasClients'              => $hasClients,
            'hasDemands'              => $hasDemands,
            'planningReminderClients' => $planningReminderClients,
        ]);
    }

    /**
     * Valida que uma string de data é válida antes de passar ao Carbon::parse (T-5-04).
     */
    private function isValidDate(string $value): bool
    {
        return (bool) strtotime($value) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $value);
    }
}
