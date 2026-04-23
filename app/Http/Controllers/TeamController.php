<?php
// (c) 2026 Briefy contributors — AGPL-3.0

namespace App\Http\Controllers;

use App\Mail\InvitationMail;
use App\Models\{Invitation, User};
use Illuminate\Http\{RedirectResponse, Request};
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class TeamController extends Controller
{
    /**
     * GET /settings/team
     * Legacy redirect — unified settings now serves team data.
     */
    public function index(): RedirectResponse
    {
        return redirect()->route('settings.index');
    }

    /**
     * POST /team/invite
     * Create invitation + send email (TEAM-01, T-04-07: role validated IN admin|collaborator).
     */
    public function invite(Request $request): RedirectResponse
    {
        // T-04-10: only admin/owner can invite
        abort_unless($request->user()->isAdminOrOwner(), 403);

        $org = $request->user()->currentOrganization;
        abort_if(!$org, 403);

        $request->validate([
            'email' => 'required|email',
            'role'  => 'required|in:admin,collaborator',  // T-04-07: owner not assignable via invite
        ]);

        // T-04-11: reject if email is already a member of this org
        $alreadyMember = $org->users()->where('users.email', $request->email)->exists();
        if ($alreadyMember) {
            return back()->withErrors(['email' => 'Este e-mail já é membro desta organização.']);
        }

        // Prevent duplicate pending invitations
        $pendingExists = Invitation::where('organization_id', $org->id)
            ->where('email', $request->email)
            ->whereNull('accepted_at')
            ->where('expires_at', '>', now())
            ->exists();
        if ($pendingExists) {
            return back()->withErrors(['email' => 'Já existe um convite pendente para este e-mail.']);
        }

        $invitation = Invitation::create([
            'organization_id' => $org->id,
            'invited_by'      => $request->user()->id,
            'email'           => $request->email,
            'role'            => $request->role,
            'token'           => (string) Str::uuid(),  // T-04-08: UUID 128-bit random token
            'expires_at'      => now()->addDays(7),
        ]);

        Mail::to($invitation->email)->send(new InvitationMail($invitation, $org));

        return back()->with('success', "Convite enviado para {$request->email}.");
    }

    /**
     * DELETE /team/invitations/{invitation}
     * Cancel a pending invitation (D-05: admin/owner only).
     */
    public function cancelInvitation(Request $request, Invitation $invitation): RedirectResponse
    {
        abort_unless($request->user()->isAdminOrOwner(), 403);

        // T-04-11: ensure invitation belongs to the user's current org
        abort_if($invitation->organization_id !== $request->user()->current_organization_id, 403);

        $invitation->delete();

        return back()->with('success', 'Convite cancelado.');
    }

    /**
     * POST /team/invitations/{invitation}/resend
     * Resend invitation email and refresh token + extend expiry.
     */
    public function resendInvitation(Request $request, Invitation $invitation): RedirectResponse
    {
        abort_unless($request->user()->isAdminOrOwner(), 403);
        abort_if($invitation->organization_id !== $request->user()->current_organization_id, 403);

        // Fresh token + extended expiry on resend
        $invitation->update([
            'token'      => (string) Str::uuid(),
            'expires_at' => now()->addDays(7),
        ]);
        Mail::to($invitation->email)->send(new InvitationMail($invitation, $invitation->organization));

        return back()->with('success', 'Convite reenviado.');
    }

    /**
     * PATCH /team/{user}/role
     * Update member role with pivot write-through (TEAM-03, T-04-10: owner protected).
     */
    public function updateRole(Request $request, User $user): RedirectResponse
    {
        // T-04-10: only admin/owner can change roles
        abort_unless($request->user()->isAdminOrOwner(), 403);

        $org = $request->user()->currentOrganization;
        abort_if(!$org, 403);

        // T-04-11: verify target user is in the same org
        $membership = $org->users()->wherePivot('user_id', $user->id)->first();
        abort_if(!$membership, 403);

        // D-12: owner cannot be demoted by anyone
        abort_if($membership->pivot->role === 'owner', 403, 'O proprietário não pode ser rebaixado.');

        $request->validate(['role' => 'required|in:admin,collaborator']);

        // Update pivot role (canonical source of truth)
        $org->users()->updateExistingPivot($user->id, ['role' => $request->role]);

        // Pitfall 3: write-through to users.role for backward compatibility
        if ($user->current_organization_id === $org->id) {
            $user->update(['role' => $request->role]);
        }

        return back()->with('success', 'Função atualizada.');
    }

    /**
     * DELETE /team/{user}/remove
     * Detach member from org pivot (TEAM-03, D-12: owner blocked).
     */
    public function remove(Request $request, User $user): RedirectResponse
    {
        // T-04-10: only admin/owner can remove members
        abort_unless($request->user()->isAdminOrOwner(), 403);

        $org = $request->user()->currentOrganization;
        abort_if(!$org, 403);

        // T-04-11: verify target is in the same org
        $membership = $org->users()->wherePivot('user_id', $user->id)->first();
        abort_if(!$membership, 403);

        // D-12: owner cannot be removed
        abort_if($membership->pivot->role === 'owner', 403, 'O proprietário não pode ser removido.');

        $org->users()->detach($user->id);

        return back()->with('success', 'Membro removido.');
    }
}
