<?php
// (c) 2026 Briefy contributors — AGPL-3.0
namespace App\Http\Controllers;

use App\Http\Requests\StoreDemandRequest;
use App\Http\Requests\UpdateDemandRequest;
use App\Models\Client;
use App\Models\Demand;
use App\Models\DemandComment;
use App\Models\DemandFile;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class DemandController extends Controller
{
    public function index(Request $request): Response
    {
        $orgId = auth()->user()->organization_id;

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

        $teamMembers = \App\Models\User::where('organization_id', $orgId)->get(['id', 'name']);

        return Inertia::render('Demands/Index', [
            'demands'        => $demands,
            'clients'        => $clients,
            'filters'        => $request->only('client_id', 'status', 'search'),
            'autoCreate'     => $request->boolean('create'),
            'selectedDemand' => $selectedDemand,
            'teamMembers'    => $teamMembers,
            'isAdmin'        => auth()->user()->isAdmin(),
        ]);
    }

    public function create(Client $client): Response
    {
        abort_if($client->organization_id !== auth()->user()->organization_id, 403);

        $teamMembers = \App\Models\User::where('organization_id', auth()->user()->organization_id)
            ->get(['id', 'name']);

        return Inertia::render('Demands/Create', [
            'client'      => $client,
            'teamMembers' => $teamMembers,
        ]);
    }

    public function store(StoreDemandRequest $request, Client $client): RedirectResponse
    {
        abort_if($client->organization_id !== auth()->user()->organization_id, 403);

        $demand = Demand::create([
            ...$request->validated(),
            'organization_id' => auth()->user()->organization_id,
            'client_id'       => $client->id,
            'created_by'      => auth()->id(),
        ]);

        return redirect()->route('demands.show', $demand)
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

        $teamMembers = \App\Models\User::where('organization_id', auth()->user()->organization_id)
            ->get(['id', 'name']);

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

        $teamMembers = \App\Models\User::where('organization_id', auth()->user()->organization_id)
            ->get(['id', 'name']);

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

        DemandComment::create([
            'demand_id' => $demand->id,
            'user_id'   => auth()->id(),
            'body'      => $request->body,
            'source'    => 'user',
        ]);

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
        $demand->update($request->validated());

        return back()->with('success', __('app.demand_updated'));
    }

    public function updateStatus(Request $request, Demand $demand): RedirectResponse
    {
        $this->authorizeDemand($demand);
        $request->validate(['status' => 'required|in:todo,in_progress,awaiting_feedback,in_review,approved']);
        $demand->update(['status' => $request->status]);

        return back();
    }

    private function authorizeDemand(Demand $demand): void
    {
        abort_if($demand->organization_id !== auth()->user()->organization_id, 403);
    }
}
