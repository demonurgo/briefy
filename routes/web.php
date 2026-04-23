<?php
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ClientController;
use App\Http\Controllers\DemandController;
use App\Http\Controllers\PlanningController;
use App\Http\Controllers\TeamController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', fn() => redirect()->route('dashboard'));

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');

    Route::resource('clients', ClientController::class);

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

    Route::prefix('planning')->name('planning.')->group(function () {
        Route::get('/', [PlanningController::class, 'index'])->name('index');
    });

    // Monthly Planning — planejamento mensal (Plan 06)
    Route::prefix('planejamento')->name('planejamento.')->group(function () {
        Route::get('/', [\App\Http\Controllers\MonthlyPlanningController::class, 'index'])->name('index');
        Route::post('/generate', [\App\Http\Controllers\MonthlyPlanningController::class, 'generate'])->name('generate');
        Route::get('/estimate-cost', [\App\Http\Controllers\MonthlyPlanningController::class, 'estimateCost'])->name('estimate-cost');
    });
    Route::post('/planning-suggestions/{suggestion}/convert', [\App\Http\Controllers\MonthlyPlanningController::class, 'convert'])->name('planning-suggestions.convert');
    Route::post('/planning-suggestions/convert-bulk', [\App\Http\Controllers\MonthlyPlanningController::class, 'convertBulk'])->name('planning-suggestions.convertBulk');
    Route::post('/planning-suggestions/{suggestion}/redesign', [\App\Http\Controllers\MonthlyPlanningController::class, 'redesign'])->name('planning-suggestions.redesign');
    Route::post('/planning-suggestions/{suggestion}/reject', [\App\Http\Controllers\MonthlyPlanningController::class, 'reject'])->name('planning-suggestions.reject');
    Route::patch('/planning-suggestions/{suggestion}', [\App\Http\Controllers\MonthlyPlanningController::class, 'update'])->name('planning-suggestions.update');
    Route::redirect('/planning', '/planejamento');

    // AI — Brief generation (SSE) + inline edit
    Route::post('/demands/{demand}/brief/generate', [\App\Http\Controllers\AiBriefController::class, 'generate'])
        ->name('demands.brief.generate');
    Route::patch('/demands/{demand}/brief', [\App\Http\Controllers\AiBriefController::class, 'saveEdit'])
        ->name('demands.brief.edit');

    // AI — Chat per demand (streaming)
    Route::post('/demands/{demand}/chat/conversations', [\App\Http\Controllers\AiChatController::class, 'startConversation'])
        ->name('demands.chat.start');
    Route::post('/demands/{demand}/chat/{conversation}/stream', [\App\Http\Controllers\AiChatController::class, 'stream'])
        ->name('demands.chat.stream');

    Route::prefix('settings')->name('settings.')->group(function () {
        Route::get('/', fn() => Inertia::render('Settings/Index'))->name('index');
        Route::get('/team', [TeamController::class, 'index'])->name('team');
        Route::patch('/preferences', function (Request $r) {
            $r->user()->update([
                'preferences' => array_merge(
                    $r->user()->preferences ?? [],
                    $r->only(['locale', 'theme'])
                ),
            ]);
            return back()->with('success', 'Preferências salvas.');
        })->name('preferences');

        // BYOK — AI settings (admin only; key health persist M3; throttled test endpoint M4)
        Route::get('/ai', [\App\Http\Controllers\Settings\AiController::class, 'edit'])->name('ai.edit');
        Route::patch('/ai', [\App\Http\Controllers\Settings\AiController::class, 'update'])->name('ai.update');
        // M4 — throttle test key probes to 3/min/user. 'throttle:3,1' = 3 attempts per 1 minute.
        Route::post('/ai/test', [\App\Http\Controllers\Settings\AiController::class, 'testKey'])
            ->middleware('throttle:3,1')
            ->name('ai.test');
    });
});

require __DIR__.'/auth.php';
