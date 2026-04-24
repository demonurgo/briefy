<?php
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ClientController;
use App\Http\Controllers\DemandController;
use App\Http\Controllers\PlanningController;
use App\Http\Controllers\TeamController;
use App\Http\Controllers\ArchiveController;
use App\Http\Controllers\TrashController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', fn() => redirect()->route('dashboard'));

// Guest-accessible invitation acceptance routes (T-04-08: UUID token + expiry + single-use gate)
Route::get('/invite/{token}', [\App\Http\Controllers\InvitationController::class, 'show'])->name('invitations.show');
Route::post('/invite/{token}/accept', [\App\Http\Controllers\InvitationController::class, 'store'])->name('invitations.store');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');

    Route::resource('clients', ClientController::class);
    Route::patch('/clients/{client}/important-dates', [ClientController::class, 'updateImportantDates'])->name('clients.important-dates.update');

    Route::get('/demands', [DemandController::class, 'index'])->name('demands.index');
    Route::resource('clients.demands', DemandController::class)
        ->shallow()
        ->except(['index']);

    // Demand file, comment, and status actions
    Route::post('/demands/{demand}/files', [DemandController::class, 'addFile'])->name('demands.files.store');
    Route::delete('/demands/{demand}/files/{file}', [DemandController::class, 'deleteFile'])->name('demands.files.destroy');
    Route::post('/demands/{demand}/comments', [DemandController::class, 'addComment'])->name('demands.comments.store');
    Route::patch('/demands/{demand}/comments/{comment}', [DemandController::class, 'updateComment'])->name('demands.comments.update');
    Route::delete('/demands/{demand}/comments/{comment}', [DemandController::class, 'deleteComment'])->name('demands.comments.destroy');
    Route::patch('/demands/{demand}/files/{file}', [DemandController::class, 'updateFile'])->name('demands.files.update');
    Route::patch('/demands/{demand}/status', [DemandController::class, 'updateStatus'])->name('demands.status.update');
    Route::put('/demands/{demand}/inline', [DemandController::class, 'updateInline'])->name('demands.inline.update');

    // Trash
    Route::get('/lixeira', [TrashController::class, 'index'])->name('trash.index');
    Route::post('/demands/{demand}/trash', [TrashController::class, 'trash'])->name('demands.trash');
    Route::post('/lixeira/{id}/restore', [TrashController::class, 'restore'])->name('trash.restore');
    Route::delete('/lixeira/{id}/force', [TrashController::class, 'forceDelete'])->name('trash.force-delete');

    // Archive (Concluídas)
    Route::get('/concluidas', [ArchiveController::class, 'index'])->name('archive.index');
    Route::post('/demands/{demand}/archive', [ArchiveController::class, 'archive'])->name('demands.archive');
    Route::post('/demands/{demand}/unarchive', [ArchiveController::class, 'unarchive'])->name('demands.unarchive');

    Route::prefix('planning')->name('planning.')->group(function () {
        Route::get('/', [PlanningController::class, 'index'])->name('index');
    });

    // Monthly Planning — planejamento mensal (Plan 06)
    Route::prefix('planejamento')->name('planejamento.')->group(function () {
        Route::get('/', [\App\Http\Controllers\MonthlyPlanningController::class, 'index'])->name('index');
        Route::post('/generate', [\App\Http\Controllers\MonthlyPlanningController::class, 'generate'])->middleware('ai.meter')->name('generate');
        Route::get('/estimate-cost', [\App\Http\Controllers\MonthlyPlanningController::class, 'estimateCost'])->name('estimate-cost');
        Route::post('/{demand}/regenerate', [\App\Http\Controllers\MonthlyPlanningController::class, 'regenerate'])->middleware('ai.meter')->name('regenerate');
        Route::delete('/{demand}', [\App\Http\Controllers\MonthlyPlanningController::class, 'destroyPlan'])->name('destroy');
    });
    Route::post('/planning-suggestions/{suggestion}/convert', [\App\Http\Controllers\MonthlyPlanningController::class, 'convert'])->name('planning-suggestions.convert');
    Route::post('/planning-suggestions/convert-bulk', [\App\Http\Controllers\MonthlyPlanningController::class, 'convertBulk'])->name('planning-suggestions.convertBulk');
    Route::post('/planning-suggestions/{suggestion}/redesign', [\App\Http\Controllers\MonthlyPlanningController::class, 'redesign'])->middleware('ai.meter')->name('planning-suggestions.redesign');
    Route::post('/planning-suggestions/{suggestion}/reject', [\App\Http\Controllers\MonthlyPlanningController::class, 'reject'])->name('planning-suggestions.reject');
    Route::patch('/planning-suggestions/{suggestion}', [\App\Http\Controllers\MonthlyPlanningController::class, 'update'])->name('planning-suggestions.update');
    Route::redirect('/planning', '/planejamento');

    // AI — Brief generation (SSE) + inline edit
    Route::post('/demands/{demand}/brief/generate', [\App\Http\Controllers\AiBriefController::class, 'generate'])
        ->middleware('ai.meter')
        ->name('demands.brief.generate');
    Route::patch('/demands/{demand}/brief', [\App\Http\Controllers\AiBriefController::class, 'saveEdit'])
        ->name('demands.brief.edit');

    // AI — Chat per demand (streaming)
    Route::post('/demands/{demand}/chat/conversations', [\App\Http\Controllers\AiChatController::class, 'startConversation'])
        ->name('demands.chat.start');
    Route::post('/demands/{demand}/chat/{conversation}/stream', [\App\Http\Controllers\AiChatController::class, 'stream'])
        ->middleware('ai.meter')
        ->name('demands.chat.stream');

    // Client Research — Managed Agents (Plan 12)
    Route::post('/clients/{client}/research', [\App\Http\Controllers\ClientResearchController::class, 'launch'])
        ->name('clients.research.launch');
    Route::get('/clients/{client}/research/estimate-cost', [\App\Http\Controllers\ClientResearchController::class, 'estimateCost'])
        ->name('clients.research.estimateCost');
    Route::get('/clients/{client}/research', [\App\Http\Controllers\ClientResearchController::class, 'latest'])
        ->name('clients.research.latest');
    Route::get('/clients/{client}/research/{session}', [\App\Http\Controllers\ClientResearchController::class, 'show'])
        ->name('clients.research.show');
    Route::get('/clients/{client}/research/{session}/events', [\App\Http\Controllers\ClientResearchController::class, 'streamEvents'])
        ->name('clients.research.stream');
    Route::post('/clients/{client}/research/{session}/cancel', [\App\Http\Controllers\ClientResearchController::class, 'cancel'])
        ->name('clients.research.cancel');
    Route::delete('/clients/{client}/research/{session}', [\App\Http\Controllers\ClientResearchController::class, 'destroy'])
        ->name('clients.research.destroy');

    // Client AI Memory — approve/dismiss suggested insights (D-38 / Plan 12)
    Route::post('/client-ai-memory/{memory}/approve', [\App\Http\Controllers\ClientAiMemoryController::class, 'approve'])
        ->name('client-ai-memory.approve');
    Route::post('/client-ai-memory/{memory}/dismiss', [\App\Http\Controllers\ClientAiMemoryController::class, 'dismiss'])
        ->name('client-ai-memory.dismiss');

    // Organization creation (MORG-01) — creates a new org for an existing user
    Route::post('/organizations', [\App\Http\Controllers\OrganizationController::class, 'store'])
        ->name('organizations.store');

    // Team management — admin/owner only routes (protected by EnsureRole middleware)
    // Named without 'settings.' prefix so tests can use route('team.invite') etc.
    Route::post('/team/invite', [TeamController::class, 'invite'])
        ->middleware('role:admin,owner')
        ->name('team.invite');
    Route::delete('/team/invitations/{invitation}', [TeamController::class, 'cancelInvitation'])
        ->middleware('role:admin,owner')
        ->name('team.invitation.cancel');
    Route::post('/team/invitations/{invitation}/resend', [TeamController::class, 'resendInvitation'])
        ->middleware('role:admin,owner')
        ->name('team.invitation.resend');
    Route::patch('/team/{user}/role', [TeamController::class, 'updateRole'])
        ->middleware('role:admin,owner')
        ->name('team.updateRole');
    Route::delete('/team/{user}/remove', [TeamController::class, 'remove'])
        ->middleware('role:admin,owner')
        ->name('team.remove');

    Route::prefix('settings')->name('settings.')->group(function () {
        // Unified settings page (D-22: single /settings page with anchor sections)
        Route::get('/', [\App\Http\Controllers\Settings\SettingsController::class, 'index'])->name('index');

        // Profile management (TEAM-04)
        Route::patch('/profile', [\App\Http\Controllers\Settings\ProfileController::class, 'update'])->name('profile.update');
        Route::post('/profile/avatar', [\App\Http\Controllers\Settings\ProfileController::class, 'updateAvatar'])->name('profile.avatar');

        // Organization settings
        Route::patch('/organization', [\App\Http\Controllers\Settings\ProfileController::class, 'updateOrganization'])->name('organization.update');

        // Org switcher (D-10)
        Route::patch('/current-org', [\App\Http\Controllers\Settings\SettingsController::class, 'switchOrg'])->name('current-org');

        Route::patch('/preferences', function (Request $r) {
            $r->user()->update([
                'preferences' => array_merge(
                    $r->user()->preferences ?? [],
                    $r->only(['locale', 'theme', 'onboarding_dismissed'])
                ),
            ]);
            return back()->with('success', 'Preferências salvas.');
        })->name('preferences');

        // D-26: /settings/ai now redirects to /settings#ai; AI routes kept for PATCH/POST
        Route::get('/ai', fn() => redirect('/settings#ai', 301))->name('ai.edit');
        Route::patch('/ai', [\App\Http\Controllers\Settings\AiController::class, 'update'])->name('ai.update');
        // M4 — throttle test key probes to 3/min/user. 'throttle:3,1' = 3 attempts per 1 minute.
        Route::post('/ai/test', [\App\Http\Controllers\Settings\AiController::class, 'testKey'])
            ->middleware(['throttle:3,1', 'ai.meter'])
            ->name('ai.test');
    });

    // Notifications
    Route::get('/notifications', function () {
        $notes = \App\Models\BriefyNotification::where('user_id', auth()->id())
            ->orderByDesc('created_at')->limit(20)->get();
        return response()->json($notes);
    })->name('notifications.index');
    Route::post('/notifications/{notification}/read', function (\App\Models\BriefyNotification $notification) {
        abort_if($notification->user_id !== auth()->id(), 403);
        $notification->update(['read_at' => now()]);
        return response()->json(['ok' => true]);
    })->name('notifications.read');
    Route::post('/notifications/read-all', function () {
        \App\Models\BriefyNotification::where('user_id', auth()->id())
            ->whereNull('read_at')->update(['read_at' => now()]);
        return response()->json(['ok' => true]);
    })->name('notifications.read-all');
});

require __DIR__.'/auth.php';
