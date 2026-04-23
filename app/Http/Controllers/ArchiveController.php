<?php
// (c) 2026 Briefy contributors — AGPL-3.0
namespace App\Http\Controllers;

use App\Models\Demand;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ArchiveController extends Controller
{
    /** GET /concluidas */
    public function index(Request $request): Response
    {
        $orgId = auth()->user()->organization_id;

        $demands = Demand::where('organization_id', $orgId)
            ->whereNotNull('archived_at')
            ->with(['client:id,name', 'assignee:id,name'])
            ->when($request->client_id, fn ($q, $id) => $q->where('client_id', $id))
            ->when($request->search, fn ($q, $s) => $q->where('title', 'ilike', "%{$s}%"))
            ->orderByDesc('archived_at')
            ->get()
            ->map(fn ($d) => [
                'id'          => $d->id,
                'title'       => $d->title,
                'channel'     => $d->channel,
                'deadline'    => $d->deadline?->toDateString(),
                'archived_at' => $d->archived_at->toIso8601String(),
                'client'      => $d->client ? ['id' => $d->client->id, 'name' => $d->client->name] : null,
                'assignee'    => $d->assignee ? ['name' => $d->assignee->name] : null,
            ]);

        $clients = \App\Models\Client::where('organization_id', $orgId)
            ->orderBy('name')->get(['id', 'name']);

        return Inertia::render('Demands/Archive', [
            'demands' => $demands,
            'clients' => $clients,
            'filters' => $request->only('client_id', 'search'),
        ]);
    }

    /** POST /demands/{demand}/archive */
    public function archive(Demand $demand): RedirectResponse
    {
        abort_if($demand->organization_id !== auth()->user()->organization_id, 403);
        $demand->update(['archived_at' => now()]);
        return back()->with('success', 'Demanda arquivada.');
    }

    /** POST /concluidas/{demand}/unarchive */
    public function unarchive(Demand $demand): RedirectResponse
    {
        abort_if($demand->organization_id !== auth()->user()->organization_id, 403);
        $demand->update(['archived_at' => null]);
        return back()->with('success', 'Demanda movida de volta para o kanban.');
    }
}
