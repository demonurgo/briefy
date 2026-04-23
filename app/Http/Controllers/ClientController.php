<?php
// (c) 2026 Briefy contributors — AGPL-3.0
namespace App\Http\Controllers;

use App\Http\Requests\StoreClientRequest;
use App\Http\Requests\UpdateClientRequest;
use App\Models\Client;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class ClientController extends Controller
{
    public function index(Request $request): Response
    {
        $orgId = auth()->user()->current_organization_id;

        $clients = Client::where('organization_id', $orgId)
            ->withCount('demands')
            ->with(['researchSessions' => fn ($q) => $q->latest()->limit(1)])
            ->when($request->search, fn($q, $s) => $q->where('name', 'ilike', "%{$s}%"))
            ->orderBy('name')
            ->get()
            ->map(function ($c) {
                $latest = $c->researchSessions->first();
                $active = $latest && in_array($latest->status, ['queued', 'running', 'idle']);
                return array_merge($c->toArray(), [
                    'active_research_session' => $active ? [
                        'id'     => $latest->id,
                        'status' => $latest->status,
                        'started_at' => optional($latest->started_at)->toIso8601String(),
                        'estimated_remaining_minutes' => $latest->started_at
                            ? max(0, 30 - (int) $latest->started_at->diffInMinutes(now()))
                            : 30,
                    ] : null,
                    'latest_research' => $latest ? [
                        'id'           => $latest->id,
                        'status'       => $latest->status,
                        'completed_at' => optional($latest->completed_at)->toIso8601String(),
                    ] : null,
                ]);
            });

        return Inertia::render('Clients/Index', [
            'clients' => $clients,
            'filters' => $request->only('search'),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Clients/Create');
    }

    public function store(StoreClientRequest $request): RedirectResponse
    {
        $data = $request->validated();
        $data['organization_id'] = auth()->user()->current_organization_id;

        if ($request->hasFile('avatar')) {
            $data['avatar'] = $request->file('avatar')->store('avatars', 'public');
        }

        $client = Client::create($data);

        return redirect()->route('clients.show', $client)
            ->with('success', __('app.client_created'));
    }

    public function show(Client $client): Response
    {
        $this->authorizeClient($client);

        $demands = $client->demands()
            ->with(['creator', 'assignee'])
            ->orderByDesc('created_at')
            ->get();

        $sessions = $client->researchSessions()
            ->orderByDesc('created_at')
            ->get()
            ->map(fn ($s) => [
                'id'           => $s->id,
                'status'       => $s->status,
                'started_at'   => optional($s->started_at)->toIso8601String(),
                'completed_at' => optional($s->completed_at)->toIso8601String(),
                'progress_summary' => $s->progress_summary,
            ]);

        return Inertia::render('Clients/Show', [
            'client'   => $client,
            'demands'  => $demands,
            'sessions' => $sessions,
        ]);
    }

    public function edit(Client $client): Response
    {
        $this->authorizeClient($client);
        $latest = $client->researchSessions()->latest()->first();
        return Inertia::render('Clients/Edit', [
            'client'         => $client,
            'latest_session' => $latest ? ['id' => $latest->id, 'status' => $latest->status] : null,
        ]);
    }

    public function update(UpdateClientRequest $request, Client $client): RedirectResponse
    {
        $this->authorizeClient($client);
        abort_unless(auth()->user()->isAdminOrOwner(), 403, 'Apenas admins podem editar clientes.');
        $data = $request->validated();

        if ($request->hasFile('avatar')) {
            if ($client->avatar) Storage::disk('public')->delete($client->avatar);
            $data['avatar'] = $request->file('avatar')->store('avatars', 'public');
        }

        $client->update($data);

        return redirect()->route('clients.show', $client)
            ->with('success', __('app.client_updated'));
    }

    public function updateImportantDates(Request $request, Client $client): \Illuminate\Http\JsonResponse
    {
        $this->authorizeClient($client);
        abort_unless($request->user()->isAdminOrOwner(), 403, 'Apenas admins podem editar datas importantes.');
        $request->validate([
            'important_dates'             => 'nullable|array|max:50',
            'important_dates.*.label'     => 'required|string|max:100',
            'important_dates.*.month'     => 'required|integer|min:1|max:12',
            'important_dates.*.day'       => 'required|integer|min:1|max:31',
        ]);
        $client->update(['important_dates' => $request->input('important_dates', [])]);
        return response()->json(['ok' => true, 'important_dates' => $client->fresh()->important_dates]);
    }

    public function destroy(Client $client): RedirectResponse
    {
        $this->authorizeClient($client);
        abort_unless(auth()->user()->isAdminOrOwner(), 403, 'Apenas admins podem excluir clientes.');
        if ($client->avatar) Storage::disk('public')->delete($client->avatar);
        $client->delete();

        return redirect()->route('clients.index')
            ->with('success', __('app.client_deleted'));
    }

    private function authorizeClient(Client $client): void
    {
        abort_if($client->organization_id !== auth()->user()->current_organization_id, 403);
    }
}
