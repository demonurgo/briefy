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

        // Eager-load organizations once per request to avoid N+1 in the map below.
        if ($user && ! $user->relationLoaded('organizations')) {
            $user->load('organizations');
        }

        // Build the full organization payload once — shared between auth.user.organization and auth.organization.
        $orgPayload = ($user && $user->currentOrganization) ? array_merge(
            $user->currentOrganization->only(['id', 'name', 'slug', 'logo']),
            [
                'has_anthropic_key'              => $user->currentOrganization->hasAnthropicKey(),
                'anthropic_api_key_mask'         => $user->currentOrganization->anthropic_api_key_mask,
                'key_valid'                      => (bool) ($user->currentOrganization->anthropic_key_valid ?? false),
                'managed_agents_enabled'         => (bool) ($user->currentOrganization->anthropic_managed_agents_ok ?? false),
                'last_key_check_at'              => optional($user->currentOrganization->anthropic_key_checked_at)->toIso8601String(),
                'client_research_agent_id'       => $user->currentOrganization->client_research_agent_id,
                'client_research_environment_id' => $user->currentOrganization->client_research_environment_id,
            ]
        ) : null;

        return array_merge(parent::share($request), [
            'auth' => [
                // auth.organization — top-level, matches PageProps TypeScript type.
                // Components that need AI fields (ChatTab, Settings) read from here.
                'organization' => $orgPayload,
                'user' => $user ? [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'avatar' => $user->avatar,
                    'role' => $user->getCurrentRoleAttribute(),
                    'preferences' => $user->preferences,
                    'current_organization_id' => $user->current_organization_id,
                    'organization' => $orgPayload,
                    'organizations' => $user->organizations->map(fn ($o) => [
                        'id'   => $o->id,
                        'name' => $o->name,
                        'slug' => $o->slug,
                        'logo' => $o->logo,
                        'role' => $o->pivot->role,
                    ]),
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
                ? \App\Models\Demand::onlyTrashed()->where('organization_id', $user->current_organization_id)->count()
                : 0,
            'archive_count' => $user
                ? \App\Models\Demand::where('organization_id', $user->current_organization_id)->whereNotNull('archived_at')->count()
                : 0,
        ]);
    }
}
