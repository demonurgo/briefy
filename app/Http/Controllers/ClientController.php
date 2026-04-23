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
        $orgId = auth()->user()->organization_id;

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
                        // Heuristic: 30-min target; remaining = max(0, 30 - elapsed)
                        'estimated_remaining_minutes' => $latest->started_at
                            ? max(0, 30 - (int) $latest->started_at->diffInMinutes(now()))
                            : 30,
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
        $data['organization_id'] = auth()->user()->organization_id;

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

        return Inertia::render('Clients/Show', [
            'client'  => $client,
            'demands' => $demands,
        ]);
    }

    public function edit(Client $client): Response
    {
        $this->authorizeClient($client);
        return Inertia::render('Clients/Edit', ['client' => $client]);
    }

    public function update(UpdateClientRequest $request, Client $client): RedirectResponse
    {
        $this->authorizeClient($client);
        $data = $request->validated();

        if ($request->hasFile('avatar')) {
            if ($client->avatar) Storage::disk('public')->delete($client->avatar);
            $data['avatar'] = $request->file('avatar')->store('avatars', 'public');
        }

        $client->update($data);

        return redirect()->route('clients.show', $client)
            ->with('success', __('app.client_updated'));
    }

    public function destroy(Client $client): RedirectResponse
    {
        $this->authorizeClient($client);
        if ($client->avatar) Storage::disk('public')->delete($client->avatar);
        $client->delete();

        return redirect()->route('clients.index')
            ->with('success', __('app.client_deleted'));
    }

    private function authorizeClient(Client $client): void
    {
        abort_if($client->organization_id !== auth()->user()->organization_id, 403);
    }
}
