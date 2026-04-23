<?php
// (c) 2026 Briefy contributors — AGPL-3.0
namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Redis;

/**
 * AiUsageMeter — request-level instrumentation for AI endpoints.
 *
 * Increments a per-org per-day Redis counter on every AI HTTP request.
 * Logs a soft-limit warning at SOFT_DAILY_LIMIT calls/day/org (Phase 3:
 * log-only, never blocks). All Redis/log failures are caught silently.
 *
 * Rate-limit posture: log-only in Phase 3. Blocking enforcement is deferred
 * to a future tier-based billing phase (AI-SPEC §5, T-03-121).
 */
class AiUsageMeter
{
    /** Soft daily call threshold per org — log warning when reached. */
    private const SOFT_DAILY_LIMIT = 500;

    /** Retain Redis counters for 7 days. */
    private const REDIS_TTL_SECONDS = 86400 * 7;

    public function handle(Request $request, Closure $next): mixed
    {
        $startedAt = microtime(true);

        $response = $next($request);

        try {
            $user = $request->user();
            if (! $user || ! $user->organization_id) {
                return $response;
            }

            $orgId = (int) $user->organization_id;
            $date  = now()->format('Y-m-d');
            $key   = "ai:http_calls:{$orgId}:{$date}";

            $count = (int) Redis::incr($key);
            if ($count === 1) {
                // First call of the day — set TTL on the fresh key.
                Redis::expire($key, self::REDIS_TTL_SECONDS);
            }

            // Soft alert — log only, NEVER block in Phase 3 (AI-SPEC §5).
            if ($count === self::SOFT_DAILY_LIMIT) {
                Log::warning('ai.soft_limit_reached', [
                    'organization_id' => $orgId,
                    'count'           => $count,
                    'limit'           => self::SOFT_DAILY_LIMIT,
                ]);
            }

            $durationMs = (microtime(true) - $startedAt) * 1000;
            Log::info('ai.http', [
                'route'           => optional($request->route())->getName(),
                'organization_id' => $orgId,
                'user_id'         => $user->id,
                'duration_ms'     => (int) $durationMs,
                'status'          => $response->getStatusCode(),
                'daily_count'     => $count,
            ]);
        } catch (\Throwable $e) {
            // Telemetry must never break the actual response (T-03-121).
            Log::debug('ai_meter.failed', ['error' => class_basename($e)]);
        }

        return $response;
    }
}
