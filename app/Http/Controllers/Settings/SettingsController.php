<?php
// (c) 2026 Briefy contributors — AGPL-3.0

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\Invitation;
use Illuminate\Http\{RedirectResponse, Request};
use Inertia\{Inertia, Response};

class SettingsController extends Controller
{
    /**
     * GET /settings
     * Unified settings page with all sections (D-22: profile, org, team, AI).
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        $org  = $user->currentOrganization;
        abort_if(!$org, 403);

        $members = $org->users()
            ->withPivot('role', 'joined_at')
            ->get()
            ->map(fn ($u) => [
                'id'        => $u->id,
                'name'      => $u->name,
                'email'     => $u->email,
                'avatar'    => $u->avatar,
                'role'      => $u->pivot->role,
                'joined_at' => $u->pivot->joined_at
                    ? \Carbon\Carbon::parse($u->pivot->joined_at)->format('d/m/Y')
                    : null,
            ]);

        // Only admin/owner see pending invitations (T-04-07: role-based disclosure)
        $pendingInvites = $user->isAdminOrOwner()
            ? Invitation::where('organization_id', $org->id)
                ->whereNull('accepted_at')
                ->where('expires_at', '>', now())
                ->get(['id', 'email', 'role', 'created_at'])
                ->map(fn ($i) => [
                    'id'         => $i->id,
                    'email'      => $i->email,
                    'role'       => $i->role,
                    'created_at' => $i->created_at->format('d/m/Y'),
                ])
            : [];

        return Inertia::render('Settings/Index', [
            'members'         => $members,
            'pending_invites' => $pendingInvites,
            'organization'    => $org->only(['id', 'name', 'slug', 'logo']),
            'can_manage_team' => $user->isAdminOrOwner(),
        ]);
    }

    /**
     * PATCH /settings/current-org
     * Switch the user's active organization context (D-10).
     */
    public function switchOrg(Request $request): RedirectResponse
    {
        $request->validate(['organization_id' => 'required|integer']);

        $user = $request->user();

        // T-04-11: verify user actually belongs to the target org
        $belongs = $user->organizations()
            ->wherePivot('organization_id', $request->organization_id)
            ->exists();
        abort_if(!$belongs, 403);

        $user->update(['current_organization_id' => $request->organization_id]);

        return back()->with('success', 'Organização alterada.');
    }
}
