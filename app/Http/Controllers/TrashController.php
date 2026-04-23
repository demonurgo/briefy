<?php
// (c) 2026 Briefy contributors — AGPL-3.0
namespace App\Http\Controllers;

use App\Models\Demand;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class TrashController extends Controller
{
    /** GET /lixeira */
    public function index(Request $request): Response
    {
        $orgId = auth()->user()->current_organization_id;

        $demands = Demand::onlyTrashed()
            ->where('organization_id', $orgId)
            ->with(['client:id,name', 'assignee:id,name'])
            ->orderByDesc('deleted_at')
            ->get()
            ->map(fn ($d) => [
                'id'           => $d->id,
                'title'        => $d->title,
                'status'       => $d->status,
                'channel'      => $d->channel,
                'deadline'     => $d->deadline?->toDateString(),
                'deleted_at'   => $d->deleted_at->toIso8601String(),
                'expires_at'   => $d->deleted_at->addDays(30)->toIso8601String(),
                'client'       => $d->client ? ['id' => $d->client->id, 'name' => $d->client->name] : null,
                'assignee'     => $d->assignee ? ['name' => $d->assignee->name] : null,
            ]);

        return Inertia::render('Demands/Trash', [
            'demands' => $demands,
        ]);
    }

    /** POST /demands/{demand}/trash — soft delete (move to trash) */
    public function trash(Demand $demand): RedirectResponse
    {
        abort_if($demand->organization_id !== auth()->user()->current_organization_id, 403);
        $demand->delete();
        return back()->with('success', 'Demanda movida para a lixeira.');
    }

    /** POST /lixeira/{demand}/restore */
    public function restore(int $id): RedirectResponse
    {
        $demand = Demand::onlyTrashed()
            ->where('organization_id', auth()->user()->current_organization_id)
            ->findOrFail($id);
        $demand->restore();
        return back()->with('success', 'Demanda restaurada.');
    }

    /** DELETE /lixeira/{demand}/force — permanent delete (admin only) */
    public function forceDelete(int $id): RedirectResponse
    {
        abort_unless(auth()->user()->isAdmin(), 403);
        $demand = Demand::onlyTrashed()
            ->where('organization_id', auth()->user()->current_organization_id)
            ->findOrFail($id);
        $demand->files->each(fn ($f) => \Storage::disk('public')->delete($f->path_or_url));
        $demand->forceDelete();
        return back()->with('success', 'Demanda excluída permanentemente.');
    }
}
