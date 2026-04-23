<?php
// (c) 2026 Briefy contributors — AGPL-3.0
namespace App\Http\Controllers;

use App\Http\Requests\RedesignItemRequest;
use App\Jobs\GenerateMonthlyPlanJob;
use App\Models\Client;
use App\Models\Demand;
use App\Models\PlanningSuggestion;
use App\Services\Ai\AnthropicClientFactory;
use App\Services\Ai\ItemRedesigner;
use App\Services\Ai\MonthlyPlanGenerator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class MonthlyPlanningController extends Controller
{
    public function __construct(
        private AnthropicClientFactory $clientFactory,
        private MonthlyPlanGenerator $generator,
        private ItemRedesigner $redesigner,
    ) {}

    /** GET /planejamento */
    public function index(Request $request): Response
    {
        $orgId = auth()->user()->organization_id;

        $planningDemands = Demand::where('organization_id', $orgId)
            ->where('type', 'planning')
            ->when($request->client_id, fn ($q, $id) => $q->where('client_id', $id))
            ->with(['client', 'planningSuggestions' => fn ($q) => $q->orderBy('date')])
            ->orderByDesc('created_at')
            ->get();

        $clients = Client::where('organization_id', $orgId)->orderBy('name')
            ->get(['id', 'name', 'monthly_posts', 'monthly_plan_notes']);

        $teamMembers = \App\Models\User::where('organization_id', $orgId)->get(['id', 'name']);

        return Inertia::render('Planejamento/Index', [
            'plannings'   => $planningDemands,
            'clients'     => $clients,
            'filters'     => $request->only('client_id'),
            'teamMembers' => $teamMembers,
        ]);
    }

    /** POST /planejamento/generate */
    public function generate(Request $request): RedirectResponse
    {
        $request->validate([
            'client_id'    => ['required', 'exists:clients,id'],
            'year'         => ['required', 'integer', 'min:2024', 'max:2030'],
            'month'        => ['required', 'integer', 'min:1', 'max:12'],
            'instructions' => ['nullable', 'string', 'max:1000'],
        ]);

        $client = Client::findOrFail($request->client_id);
        abort_if($client->organization_id !== auth()->user()->organization_id, 403);

        $org = auth()->user()->organization;
        if (! $org->hasAnthropicKey()) {
            return back()->with('error', __('app.ai_key_missing'));
        }
        if (empty($client->monthly_posts)) {
            return back()->with('error', __('app.planning_quota_missing'));
        }

        $monthLabel = \Carbon\Carbon::create((int) $request->year, (int) $request->month, 1)
            ->locale('pt-BR')->isoFormat('MMMM YYYY');

        // Create demand immediately so the user sees it in the list while the job runs.
        $planningDemand = Demand::create([
            'organization_id' => auth()->user()->organization_id,
            'client_id'       => $client->id,
            'created_by'      => auth()->id(),
            'title'           => "Planejamento {$monthLabel}",
            'description'     => $client->monthly_plan_notes ?: null,
            'type'            => 'planning',
            'status'          => 'todo',
            'ai_analysis'     => ['status' => 'generating', 'target_year' => (int) $request->year, 'target_month' => (int) $request->month],
        ]);

        GenerateMonthlyPlanJob::dispatch(
            $planningDemand->id,
            $client->id,
            (int) $request->year,
            (int) $request->month,
            auth()->id(),
            $request->input('instructions'),
        );

        return back()->with('success', __('app.planning_generating'));
    }

    /** POST /planning-suggestions/{suggestion}/convert */
    public function convert(Request $request, PlanningSuggestion $suggestion): RedirectResponse
    {
        $this->authorizeSuggestion($suggestion);
        abort_if($suggestion->status !== 'pending', 422, 'Item já foi convertido ou rejeitado.');

        $orgId = auth()->user()->organization_id;
        $request->validate([
            'assigned_to' => ['nullable', Rule::exists('users', 'id')->where('organization_id', $orgId)],
        ]);

        DB::transaction(function () use ($request, $suggestion) {
            $planningDemand = $suggestion->demand;
            $newDemand = Demand::create([
                'organization_id' => $planningDemand->organization_id,
                'client_id'       => $planningDemand->client_id,
                'created_by'      => auth()->id(),
                'assigned_to'     => $request->input('assigned_to'),
                'title'       => $suggestion->title,
                'objective'   => $suggestion->description,
                'description' => null,
                'channel'     => $suggestion->channel,
                'deadline'    => $suggestion->date,
                'type'        => 'demand',
                'status'      => 'todo',
            ]);
            $suggestion->update([
                'status' => 'accepted',
                'converted_demand_id' => $newDemand->id,
            ]);
        });

        return back()->with('success', __('app.planning_converted'));
    }

    /** POST /planning-suggestions/convert-bulk */
    public function convertBulk(Request $request): RedirectResponse
    {
        $orgId = auth()->user()->organization_id;
        $request->validate([
            'ids'         => ['required', 'array', 'min:1', 'max:100'],
            'ids.*'       => ['integer', 'exists:planning_suggestions,id'],
            'assigned_to' => ['nullable', Rule::exists('users', 'id')->where('organization_id', $orgId)],
        ]);

        $count = 0;
        DB::transaction(function () use ($request, &$count) {
            $suggestions = PlanningSuggestion::whereIn('id', $request->ids)
                ->with('demand')->get();
            foreach ($suggestions as $s) {
                if ($s->demand->organization_id !== auth()->user()->organization_id) continue;
                if ($s->status !== 'pending') continue;
                $new = Demand::create([
                    'organization_id' => $s->demand->organization_id,
                    'client_id'       => $s->demand->client_id,
                    'created_by'      => auth()->id(),
                    'assigned_to'     => $request->input('assigned_to'),
                    'title'           => $s->title,
                    'objective'       => $s->description,
                    'description'     => null,
                    'channel'         => $s->channel,
                    'deadline'        => $s->date,
                    'type'            => 'demand',
                    'status'          => 'todo',
                ]);
                $s->update(['status' => 'accepted', 'converted_demand_id' => $new->id]);
                $count++;
            }
        });

        return back()->with('success', __('app.planning_bulk_converted', ['count' => $count]));
    }

    /** POST /planning-suggestions/{suggestion}/redesign */
    public function redesign(RedesignItemRequest $request, PlanningSuggestion $suggestion): JsonResponse|RedirectResponse
    {
        $this->authorizeSuggestion($suggestion);
        $org = auth()->user()->organization;
        if (! $org->hasAnthropicKey()) {
            return response()->json(['ok' => false, 'message' => __('app.ai_key_missing')], 422);
        }

        $anthropic = $this->clientFactory->forOrganization($org);
        try {
            $new = $this->redesigner->redesign($suggestion, $request->validated('feedback'), $anthropic);
            $suggestion->update([
                'title' => $new['title'],
                'description' => $new['description'],
                'channel' => $new['channel'],
                'date' => $new['date'],
            ]);
            return response()->json(['ok' => true, 'suggestion' => $suggestion->fresh()]);
        } catch (\Throwable $e) {
            report($e);
            return response()->json(['ok' => false, 'message' => __('app.planning_redesign_failed')], 422);
        }
    }

    /** POST /planning-suggestions/{suggestion}/reject */
    public function reject(PlanningSuggestion $suggestion): RedirectResponse
    {
        $this->authorizeSuggestion($suggestion);
        $suggestion->update(['status' => 'rejected']);
        return back()->with('success', __('app.planning_rejected'));
    }

    /** PATCH /planning-suggestions/{suggestion} */
    public function update(Request $request, PlanningSuggestion $suggestion): RedirectResponse
    {
        $this->authorizeSuggestion($suggestion);
        $data = $request->validate([
            'title' => ['sometimes', 'string', 'min:3', 'max:140'],
            'description' => ['sometimes', 'string', 'min:10', 'max:600'],
            'channel' => ['sometimes', 'string'],
            'date' => ['sometimes', 'date'],
            'status' => ['sometimes', 'in:pending,accepted,rejected'],
        ]);
        $suggestion->update($data);
        return back()->with('success', __('app.planning_updated'));
    }

    /** GET /planejamento/estimate-cost */
    public function estimateCost(Request $request, \App\Services\Ai\CostEstimator $estimator): JsonResponse
    {
        $request->validate(['client_id' => ['required', 'integer', 'exists:clients,id']]);
        $client = Client::findOrFail($request->client_id);
        abort_if($client->organization_id !== auth()->user()->organization_id, 403);

        $posts = (int) $client->monthly_posts;
        $cost = $estimator->monthlyPlan($posts);
        return response()->json([
            'cost_usd'         => round($cost, 4),
            'model'            => 'opus',
            'monthly_posts'    => $posts,
            'confirm_required' => $cost > 0.05, // threshold per D-34
        ]);
    }

    /** POST /planejamento/{demand}/regenerate */
    public function regenerate(Request $request, Demand $demand): RedirectResponse
    {
        abort_if($demand->organization_id !== auth()->user()->organization_id, 403);
        abort_if($demand->type !== 'planning', 422);

        $request->validate([
            'instructions' => ['nullable', 'string', 'max:1000'],
        ]);

        $org = auth()->user()->organization;
        if (! $org->hasAnthropicKey()) {
            return back()->with('error', __('app.ai_key_missing'));
        }

        $existing = $demand->ai_analysis ?? [];
        $year  = (int) ($existing['target_year']  ?? now()->year);
        $month = (int) ($existing['target_month'] ?? now()->month);

        // Delete existing suggestions and reset status.
        $demand->planningSuggestions()->delete();
        $demand->update([
            'ai_analysis' => array_merge($existing, [
                'status'       => 'generating',
                'target_year'  => $year,
                'target_month' => $month,
            ]),
        ]);

        GenerateMonthlyPlanJob::dispatch(
            $demand->id,
            $demand->client_id,
            $year,
            $month,
            auth()->id(),
            $request->input('instructions'),
        );

        return back()->with('success', __('app.planning_generating'));
    }

    /** DELETE /planejamento/{demand} */
    public function destroyPlan(Demand $demand): RedirectResponse
    {
        abort_if($demand->organization_id !== auth()->user()->organization_id, 403);
        abort_if($demand->type !== 'planning', 422);

        $demand->planningSuggestions()->delete();
        $demand->delete();

        return back()->with('success', 'Planejamento excluído.');
    }

    private function authorizeSuggestion(PlanningSuggestion $suggestion): void
    {
        abort_if(
            $suggestion->demand->organization_id !== auth()->user()->organization_id,
            403,
        );
    }
}
