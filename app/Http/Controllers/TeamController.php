<?php
// (c) 2026 Briefy contributors — AGPL-3.0

namespace App\Http\Controllers;

use App\Models\Invitation;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;

class TeamController extends Controller
{
    /** GET /settings/team */
    public function index(): \Inertia\Response
    {
        $orgId = auth()->user()->current_organization_id;
        $org   = Organization::find($orgId);

        $members = $org
            ? $org->users()->get(['users.id', 'users.name', 'users.email', 'users.avatar'])
                ->map(fn ($u) => [
                    'id'        => $u->id,
                    'name'      => $u->name,
                    'email'     => $u->email,
                    'avatar'    => $u->avatar,
                    'role'      => $u->pivot->role,
                    'joined_at' => $u->pivot->joined_at,
                ])
            : collect();

        $pendingInvitations = $org
            ? Invitation::where('organization_id', $orgId)
                ->whereNull('accepted_at')
                ->where('expires_at', '>', now())
                ->get(['id', 'email', 'role', 'created_at', 'expires_at'])
            : collect();

        return Inertia::render('Settings/Team', [
            'members'            => $members,
            'pendingInvitations' => $pendingInvitations,
        ]);
    }

    /** POST /team/invite — admin/owner only (guarded by role middleware) */
    public function invite(Request $request): RedirectResponse
    {
        $user  = auth()->user();
        $orgId = $user->current_organization_id;

        $request->validate([
            'email' => ['required', 'email', 'max:255'],
            'role'  => ['required', 'in:admin,collaborator'],
        ]);

        // Prevent duplicate pending invitations for the same email in the same org
        $existing = Invitation::where('organization_id', $orgId)
            ->where('email', $request->email)
            ->whereNull('accepted_at')
            ->where('expires_at', '>', now())
            ->first();

        if ($existing) {
            return back()->withErrors(['email' => 'Já existe um convite pendente para este email.']);
        }

        Invitation::create([
            'organization_id' => $orgId,
            'invited_by'      => $user->id,
            'email'           => $request->email,
            'role'            => $request->role,
            'token'           => (string) Str::uuid(),
            'expires_at'      => now()->addDays(7),
        ]);

        return back()->with('success', 'Convite enviado com sucesso.');
    }

    /** DELETE /team/invitations/{invitation} — cancel pending invite */
    public function cancelInvitation(Invitation $invitation): RedirectResponse
    {
        abort_if($invitation->organization_id !== auth()->user()->current_organization_id, 403);
        $invitation->delete();

        return back()->with('success', 'Convite cancelado.');
    }

    /** POST /team/invitations/{invitation}/resend — resend invite email */
    public function resendInvitation(Invitation $invitation): RedirectResponse
    {
        abort_if($invitation->organization_id !== auth()->user()->current_organization_id, 403);

        // Extend expiry and generate a fresh token
        $invitation->update([
            'token'      => (string) Str::uuid(),
            'expires_at' => now()->addDays(7),
        ]);

        return back()->with('success', 'Convite reenviado.');
    }

    /** PATCH /team/{user}/role — change member role */
    public function updateRole(Request $request, User $user): RedirectResponse
    {
        $orgId   = auth()->user()->current_organization_id;
        $request->validate(['role' => ['required', 'in:admin,collaborator']]);

        // Owners cannot be demoted (D-12)
        $membership = $user->organizations()->wherePivot('organization_id', $orgId)->first();
        abort_if(!$membership, 403);
        abort_if($membership->pivot->role === 'owner', 403, 'O owner não pode ser rebaixado.');

        $user->organizations()->updateExistingPivot($orgId, ['role' => $request->role]);
        // Keep users.role in sync (write-through)
        if ($user->current_organization_id === $orgId) {
            $user->update(['role' => $request->role]);
        }

        return back()->with('success', 'Papel atualizado.');
    }

    /** DELETE /team/{user}/remove — remove member from org */
    public function remove(User $user): RedirectResponse
    {
        $orgId = auth()->user()->current_organization_id;

        $membership = $user->organizations()->wherePivot('organization_id', $orgId)->first();
        abort_if(!$membership, 403);
        abort_if($membership->pivot->role === 'owner', 403, 'O owner não pode ser removido.');

        $user->organizations()->detach($orgId);

        return back()->with('success', 'Membro removido.');
    }
}
