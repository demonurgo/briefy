<?php
// (c) 2026 Briefy contributors — AGPL-3.0
namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureRole
{
    /**
     * Handle an incoming request.
     * Usage: ->middleware('role:admin,owner')
     *
     * Aborts with 403 if the authenticated user's pivot role for their current
     * organization is not in the list of allowed roles.
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (!$user) {
            abort(403, 'Acesso negado.');
        }

        $currentRole = $user->getCurrentRoleAttribute();

        if (!in_array($currentRole, $roles)) {
            abort(403, 'Permissão insuficiente.');
        }

        return $next($request);
    }
}
