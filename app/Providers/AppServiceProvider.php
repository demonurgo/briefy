<?php
// (c) 2026 Briefy contributors — AGPL-3.0

namespace App\Providers;

use App\Models\Client;
use App\Models\Demand;
use App\Observers\ClientObserver;
use App\Observers\DemandObserver;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // BYOK factory — singleton so the same instance is reused per request.
        // Do NOT bind Anthropic\Client as a global singleton (keys are per-org).
        $this->app->singleton(\App\Services\Ai\AnthropicClientFactory::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Vite::prefetch(concurrency: 3);

        // Activity logging observers (Phase 5 — D-25)
        Demand::observe(DemandObserver::class);
        Client::observe(ClientObserver::class);
    }
}
