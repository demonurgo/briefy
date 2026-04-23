<?php
// (c) 2026 Briefy contributors — AGPL-3.0

namespace App\Http\Middleware;

use App\Models\BriefyNotification;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that is loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determine the current asset version.
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $user = $request->user();

        return array_merge(parent::share($request), [
            'auth' => [
                'user' => $user ? [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->role,
                    'preferences' => $user->preferences,
                    'organization' => $user->organization ? array_merge(
                        $user->organization->only(['id', 'name', 'slug', 'logo']),
                        [
                            'has_anthropic_key'       => $user->organization->hasAnthropicKey(),
                            'anthropic_api_key_mask'  => $user->organization->anthropic_api_key_mask,
                            'key_valid'               => (bool) ($user->organization->anthropic_key_valid ?? false),          // M3
                            'managed_agents_enabled'  => (bool) ($user->organization->anthropic_managed_agents_ok ?? false),  // M3
                            'last_key_check_at'       => optional($user->organization->anthropic_key_checked_at)->toIso8601String(), // M3
                        ]
                    ) : null,
                ] : null,
            ],
            'locale' => $user?->getLocale() ?? 'pt-BR',
            'flash' => [
                'success' => $request->session()->get('success'),
                'error' => $request->session()->get('error'),
            ],
            'unread_notifications' => $user
                ? BriefyNotification::where('user_id', $user->id)->whereNull('read_at')->count()
                : 0,
            'trash_count' => $user
                ? \App\Models\Demand::onlyTrashed()->where('organization_id', $user->organization_id)->count()
                : 0,
        ]);
    }
}
