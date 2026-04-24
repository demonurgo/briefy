<?php
// (c) 2026 Briefy contributors — AGPL-3.0

namespace App\Http\Controllers;

use App\Models\Organization;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class OrganizationController extends Controller
{
    /**
     * Store a newly created organization.
     *
     * Creates the org, attaches the authenticated user as owner (D-05),
     * auto-switches to the new org (D-03), and redirects to dashboard.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'slug' => 'required|string|max:100|alpha_dash|unique:organizations,slug',
        ]);

        $org = Organization::create($validated);

        // Attach creator as owner — mirrors InvitationController pivot attach pattern (D-05)
        $org->users()->attach($request->user(), [
            'role'      => 'owner',
            'joined_at' => now(),
        ]);

        // Auto-switch to new org — same field write as SettingsController@switchOrg (D-03)
        $request->user()->update(['current_organization_id' => $org->id]);

        return redirect()->route('dashboard')->with('success', 'Organização criada com sucesso.');
    }
}
