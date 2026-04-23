<?php
// (c) 2026 Briefy contributors — AGPL-3.0

namespace App\Http\Controllers;

use App\Models\Invitation;
use App\Models\User;
use Illuminate\Http\{RedirectResponse, Request};
use Illuminate\Support\Facades\{Auth, Hash};
use Illuminate\Validation\Rules;
use Inertia\{Inertia, Response};

class InvitationController extends Controller
{
    /**
     * GET /invite/{token}
     * Guest-accessible — shows the accept page or an expired/invalid state.
     */
    public function show(string $token): Response
    {
        $invitation = Invitation::where('token', $token)->first();

        if (!$invitation || $invitation->expires_at->isPast() || $invitation->accepted_at) {
            return Inertia::render('Invite/Accept', [
                'expired'      => true,
                'invitation'   => null,
                'organization' => null,
                'has_account'  => false,
            ]);
        }

        $hasAccount = (bool) User::where('email', $invitation->email)->exists();

        return Inertia::render('Invite/Accept', [
            'expired'      => false,
            'invitation'   => $invitation->only(['email', 'role']),
            'organization' => $invitation->organization->only(['name']),
            'has_account'  => $hasAccount,
        ]);
    }

    /**
     * POST /invite/{token}/accept
     * Handles both new user creation and existing user org attachment.
     */
    public function store(Request $request, string $token): RedirectResponse
    {
        $invitation = Invitation::where('token', $token)
            ->whereNull('accepted_at')
            ->where('expires_at', '>', now())
            ->firstOrFail();

        $existingUser = User::where('email', $invitation->email)->first();

        if ($existingUser) {
            // D-03: existing user — attach to new org without detaching current memberships
            $existingUser->organizations()->syncWithoutDetaching([
                $invitation->organization_id => [
                    'role'      => $invitation->role,
                    'joined_at' => now(),
                ],
            ]);

            // Pitfall 4: must update current_organization_id to the new org after acceptance
            $existingUser->update([
                'current_organization_id' => $invitation->organization_id,
                'role'                    => $invitation->role,  // write-through (Open Question 2)
            ]);

            // Only login if not already authenticated as this user
            if (!Auth::check() || Auth::id() !== $existingUser->id) {
                Auth::login($existingUser);
            }
        } else {
            // D-04: new user — create account and attach to org
            $request->validate([
                'name'     => 'required|string|max:255',
                'password' => ['required', 'confirmed', Rules\Password::defaults()],
            ]);

            $user = User::create([
                'name'                    => $request->name,
                'email'                   => $invitation->email,
                'password'                => Hash::make($request->password),
                'current_organization_id' => $invitation->organization_id,
                'role'                    => $invitation->role,
            ]);

            $user->organizations()->attach($invitation->organization_id, [
                'role'      => $invitation->role,
                'joined_at' => now(),
            ]);

            Auth::login($user);
        }

        // T-04-08: mark as accepted — single-use gate
        $invitation->update(['accepted_at' => now()]);

        return redirect()->route('dashboard');
    }
}
