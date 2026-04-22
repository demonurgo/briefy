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

    Route::prefix('planning')->name('planning.')->group(function () {
        Route::get('/', [PlanningController::class, 'index'])->name('index');
    });

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
    });
});

require __DIR__.'/auth.php';
