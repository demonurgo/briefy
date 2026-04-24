<?php
// (c) 2026 Briefy contributors — AGPL-3.0
namespace App\Http\Controllers;

use App\Events\DemandAssigned;
use App\Events\DemandCommentCreated;
use App\Events\DemandStatusChanged;
use App\Http\Requests\StoreDemandRequest;
use App\Http\Requests\UpdateDemandRequest;
use App\Models\BriefyNotification;
use App\Models\Client;
use App\Models\Demand;
use App\Models\DemandComment;
use App\Models\DemandFile;
use App\Models\Organization;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class DemandController extends Controller
{
    public function index(Request $request): Response
    {
        $orgId = auth()->user()->current_organization_id;

        $demands = Demand::where('organization_id', $orgId)
            ->whereNull('archived_at')
            ->with(['client', 'assignee'])
            ->when($request->client_id, fn($q, $id) => $q->where('client_id', $id))
            ->when($request->status, fn($q, $s) => $q->where('status', $s))
            ->when($request->search, fn($q, $s) => $q->where('title', 'ilike', "%{$s}%"))
            ->orderByDesc('created_at')
            ->get();

        $clients = Client::where('organization_id', $orgId)
            ->orderBy('name')
            ->get(['id', 'name']);

        $selectedDemand = null;
        if ($request->filled('demand')) {
            $selectedDemand = Demand::where('organization_id', $orgId)
                ->with([
                    'client', 'creator', 'assignee', 'files.uploader', 'comments.user',
                    'aiConversations' => fn ($q) => $q->orderBy('created_at'),
                    'aiConversations.messages' => fn ($q) => $q->orderBy('id'),
                ])
                ->find($request->demand);

            // Alias aiConversations → conversations for frontend clarity (Plan 09).
            if ($selectedDemand) {
                $selectedDemand->conversations = $selectedDemand->aiConversations;
            }
        }

        $org = Organization::find($orgId);
        $teamMembers = $org ? $org->users()->get(['users.id', 'users.name']) : collect();

        return Inertia::render('Demands/Index', [
            'demands'        => $demands,
            'clients'        => $clients,
            'filters'        => $request->only('client_id', 'status', 'search'),
            'autoCreate'     => $request->boolean('create'),
            'selectedDemand' => $selectedDemand,
            'teamMembers'    => $teamMembers,
            'isAdmin'        => auth()->user()->isAdminOrOwner(),
        ]);
    }

    public function create(Client $client): Response
    {
        abort_if($client->organization_id !== auth()->user()->current_organization_id, 403);

        $orgId = auth()->user()->current_organization_id;
        $org = Organization::find($orgId);
        $teamMembers = $org ? $org->users()->get(['users.id', 'users.name']) : collect();

        return Inertia::render('Demands/Create', [
            'client'      => $client,
            'teamMembers' => $teamMembers,
        ]);
    }

    public function store(StoreDemandRequest $request, Client $client): RedirectResponse
    {
        abort_if($client->organization_id !== auth()->user()->current_organization_id, 403);

        $demand = Demand::create([
            ...$request->validated(),
            'organization_id' => auth()->user()->current_organization_id,
            'client_id'       => $client->id,
            'created_by'      => auth()->id(),
        ]);

        return redirect()->route('demands.index', ['demand' => $demand->id])
            ->with('success', __('app.demand_created'));
    }

    public function show(Demand $demand): Response
    {
        $this->authorizeDemand($demand);

        $demand->load([
            'client',
            'creator',
            'assignee',
            'files.uploader',
            'comments.user',
        ]);

        $orgId = auth()->user()->current_organization_id;
        $org = Organization::find($orgId);
        $teamMembers = $org ? $org->users()->get(['users.id', 'users.name']) : collect();

        return Inertia::render('Demands/Show', [
            'demand'      => $demand,
            'teamMembers' => $teamMembers,
            'isAdmin'     => auth()->user()->isAdmin(),
        ]);
    }

    public function edit(Demand $demand): Response
    {
        $this->authorizeDemand($demand);
        $demand->load('client');

        $orgId = auth()->user()->current_organization_id;
        $org = Organization::find($orgId);
        $teamMembers = $org ? $org->users()->get(['users.id', 'users.name']) : collect();

        return Inertia::render('Demands/Edit', [
            'demand'      => $demand,
            'teamMembers' => $teamMembers,
        ]);
    }

    public function update(UpdateDemandRequest $request, Demand $demand): RedirectResponse
    {
        $this->authorizeDemand($demand);
        $demand->update($request->validated());

        return redirect()->route('demands.show', $demand)
            ->with('success', __('app.demand_updated'));
    }

    public function destroy(Demand $demand): RedirectResponse
    {
        $this->authorizeDemand($demand);

        // Collaborators can only delete their OWN demands (D-14)
        $user = auth()->user();
        if (!$user->isAdminOrOwner() && $demand->created_by !== $user->id) {
            abort(403, 'Apenas admins podem excluir demandas de outros usuários.');
        }

        $demand->delete(); // soft delete — files preserved, restorable for 30 days

        return back()->with('success', __('app.demand_deleted'));
    }

    public function addFile(Request $request, Demand $demand): RedirectResponse
    {
        $this->authorizeDemand($demand);

        $request->validate([
            'type'        => 'required|in:upload,link',
            'name'        => 'required|string|max:255',
            'file'        => 'required_if:type,upload|file|max:10240',
            'path_or_url' => 'required_if:type,link|nullable|url',
        ]);

        $pathOrUrl = $request->type === 'upload'
            ? $request->file('file')->store('demand-files', 'public')
            : $request->path_or_url;

        DemandFile::create([
            'demand_id'   => $demand->id,
            'type'        => $request->type,
            'name'        => $request->name,
            'path_or_url' => $pathOrUrl,
            'uploaded_by' => auth()->id(),
        ]);

        return back()->with('success', __('app.file_added'));
    }

    public function deleteFile(Demand $demand, DemandFile $file): RedirectResponse
    {
        $this->authorizeDemand($demand);
        if ($file->type === 'upload') Storage::disk('public')->delete($file->path_or_url);
        $file->delete();

        return back()->with('success', __('app.file_deleted'));
    }

    public function addComment(Request $request, Demand $demand): RedirectResponse
    {
        $this->authorizeDemand($demand);
        $request->validate(['body' => 'required|string|max:5000']);

        $comment = DemandComment::create([
            'demand_id' => $demand->id,
            'user_id'   => auth()->id(),
            'body'      => $request->body,
            'source'    => 'user',
        ]);

        // Carregar relação user ANTES do dispatch — create() não carrega relações
        $comment->load('user');

        DemandCommentCreated::dispatch(
            $demand->organization_id,
            $demand->id,
            [
                'id'         => $comment->id,
                'body'       => $comment->body,
                'user'       => [
                    'id'   => $comment->user->id,
                    'name' => $comment->user->name,
                ],
                'created_at' => $comment->created_at->toJSON(),
            ]
        );

        return back()->with('success', __('app.comment_added'));
    }

    public function updateComment(Request $request, Demand $demand, DemandComment $comment): RedirectResponse
    {
        $this->authorizeDemand($demand);
        abort_if($comment->user_id !== auth()->id(), 403);
        $request->validate(['body' => 'required|string|max:5000']);
        $comment->update(['body' => $request->body]);

        return back()->with('success', __('app.comment_updated'));
    }

    public function deleteComment(Demand $demand, DemandComment $comment): RedirectResponse
    {
        $this->authorizeDemand($demand);
        abort_if($comment->user_id !== auth()->id() && !auth()->user()->isAdmin(), 403);
        $comment->delete();

        return back()->with('success', __('app.comment_deleted'));
    }

    public function updateFile(Request $request, Demand $demand, DemandFile $file): RedirectResponse
    {
        $this->authorizeDemand($demand);
        $request->validate(['name' => 'required|string|max:255']);
        $file->update(['name' => $request->name]);

        return back()->with('success', __('app.file_updated'));
    }

    public function updateInline(UpdateDemandRequest $request, Demand $demand): RedirectResponse
    {
        $this->authorizeDemand($demand);

        // Capture old values BEFORE update — Eloquent update() overwrites in-memory model
        $oldAssignedTo = $demand->assigned_to;
        $oldStatus     = $demand->status;

        $demand->update($request->validated());

        // RT-03 (D-01): assigned_to changed → notify only the new assignee
        // D-03: skip if new assignee is null
        // D-04: skip if actor is the new assignee (no self-notification)
        if ($demand->assigned_to
            && $demand->assigned_to !== $oldAssignedTo
            && $demand->assigned_to !== auth()->id()
        ) {
            $notification = BriefyNotification::create([
                'organization_id' => $demand->organization_id,
                'user_id'         => $demand->assigned_to,
                'type'            => 'demand_assigned',
                'title'           => 'Demanda atribuída a você',
                'body'            => $demand->title,
                'data'            => ['demand_id' => $demand->id, 'demand_title' => $demand->title],
            ]);
            DemandAssigned::dispatch(
                $demand->organization_id,
                $demand->assigned_to,
                $notification->title,
                $notification->body,
                $notification->data,
            );
        }

        // RT-04 (D-14): status can also change via updateInline — same dispatch logic as updateStatus
        if ($demand->status !== $oldStatus) {
            $this->dispatchStatusChangedNotifications($demand, $oldStatus);
        }

        return back()->with('success', __('app.demand_updated'));
    }

    public function updateStatus(Request $request, Demand $demand): RedirectResponse
    {
        $this->authorizeDemand($demand);
        $request->validate(['status' => 'required|in:todo,in_progress,awaiting_feedback,in_review,approved']);

        $oldStatus = $demand->status;   // capture BEFORE update
        $demand->update(['status' => $request->status]);

        // RT-04 (D-14): notify creator + assignee, excluding actor
        if ($demand->status !== $oldStatus) {
            $this->dispatchStatusChangedNotifications($demand, $oldStatus);
        }

        return back();
    }

    private function dispatchStatusChangedNotifications(Demand $demand, string $oldStatus): void
    {
        $actorId = auth()->id();

        // D-02: notify creator + assignee
        // D-03: filter nulls (collect()->filter() removes null values)
        // D-04: exclude the actor who triggered the change
        // D-11: deduplicate — if creator === assignee, send one notification
        $recipients = collect([$demand->created_by, $demand->assigned_to])
            ->filter()                                         // remove nulls
            ->filter(fn($id) => $id !== $actorId)             // no self-notification
            ->unique();                                        // deduplicate

        foreach ($recipients as $userId) {
            $notification = BriefyNotification::create([
                'organization_id' => $demand->organization_id,
                'user_id'         => $userId,
                'type'            => 'demand_status_changed',
                'title'           => 'Status de demanda alterado',
                'body'            => $demand->title,
                'data'            => [
                    'demand_id'    => $demand->id,
                    'demand_title' => $demand->title,
                    'old_status'   => $oldStatus,
                    'new_status'   => $demand->status,
                ],
            ]);
            DemandStatusChanged::dispatch(
                $demand->organization_id,
                $userId,
                $notification->title,
                $notification->body,
                $notification->data,
            );
        }
    }

    private function authorizeDemand(Demand $demand): void
    {
        abort_if($demand->organization_id !== auth()->user()->current_organization_id, 403);
    }
}
