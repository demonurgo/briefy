<?php
// (c) 2026 Briefy contributors — AGPL-3.0

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use Illuminate\Http\{RedirectResponse, Request};
use Illuminate\Support\Facades\Storage;
use Intervention\Image\ImageManager;
use Intervention\Image\Drivers\Gd\Driver;

class ProfileController extends Controller
{
    /**
     * PATCH /settings/profile
     * Update user name and preferences (locale, theme).
     */
    public function update(Request $request): RedirectResponse
    {
        $request->validate([
            'name'   => 'required|string|max:255',
            'locale' => 'nullable|in:pt-BR,en,es',
            'theme'  => 'nullable|in:light,dark',
        ]);

        $user = $request->user();
        $user->update(['name' => $request->name]);

        if ($request->has('locale') || $request->has('theme')) {
            $user->update([
                'preferences' => array_merge(
                    $user->preferences ?? [],
                    array_filter($request->only(['locale', 'theme']), fn ($v) => $v !== null)
                ),
            ]);
        }

        return back()->with('success', 'Perfil salvo.');
    }

    /**
     * POST /settings/profile/avatar
     * Upload and resize avatar to 256x256 (D-21, T-04-09: fixed path from user ID — no path traversal).
     */
    public function updateAvatar(Request $request): RedirectResponse
    {
        $request->validate([
            'avatar' => ['required', 'image', 'max:2048', 'mimes:jpeg,jpg,png,webp'],
        ]);

        $user = $request->user();

        // Anti-pattern guard: delete old avatar before storing new one (avoids orphaned files)
        if ($user->avatar) {
            Storage::disk('public')->delete($user->avatar);
        }

        // Resize to 256x256 with cover crop (Intervention Image v3 API, Pattern 4)
        $manager = new ImageManager(Driver::class);
        $image   = $manager->read($request->file('avatar'))
            ->cover(256, 256)
            ->toJpeg(quality: 90);

        // T-04-09: filename derived from authenticated user ID — never from user input
        $path = "avatars/users/{$user->id}.jpg";
        Storage::disk('public')->put($path, (string) $image);

        $user->update(['avatar' => $path]);

        return back()->with('success', 'Foto atualizada com sucesso.');
    }

    /**
     * PATCH /settings/organization
     * Update organization name (admin/owner only).
     */
    public function updateOrganization(Request $request): RedirectResponse
    {
        abort_unless($request->user()->isAdminOrOwner(), 403);

        $org = $request->user()->currentOrganization;
        abort_if(!$org, 403);

        $request->validate([
            'name' => 'required|string|max:255',
        ]);

        $org->update(['name' => $request->name]);

        return back()->with('success', 'Organização salva.');
    }
}
