<?php
// (c) 2026 Briefy contributors — AGPL-3.0
namespace App\Services\Ai\Telemetry;

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Redis;
use Throwable;

/**
 * SpanEmitter — optional OpenTelemetry instrumentation for Briefy AI calls.
 *
 * Design principle: FULLY OPTIONAL. If the OTEL PHP SDK is absent OR
 * OTEL_EXPORTER_OTLP_ENDPOINT is not configured, emit() runs the callable
 * without any instrumentation — Briefy works normally. Never throws due to
 * telemetry failures.
 *
 * Usage:
 *   $result = $this->emitter->emit('brief', $orgId, ['model' => '...'], fn () => ...);
 *   $this->emitter->recordUsage('brief', $orgId, [...], $in, $out, $ms);
 */
final class SpanEmitter
{
    /** Cost per 1 million tokens (AI-SPEC §4). */
    private const PRICE_PER_MTOK = [
        'opus'   => ['input' => 15.00, 'output' => 75.00],
        'sonnet' => ['input' =>  3.00, 'output' => 15.00],
        'haiku'  => ['input' =>  1.00, 'output' =>  5.00],
    ];

    /** Redis key TTL — retain usage counters for 7 days. */
    private const REDIS_TTL_SECONDS = 86400 * 7;

    private bool $enabled;

    public function __construct()
    {
        $this->enabled = (bool) config('services.otel.enabled', false);
    }

    /**
     * Wraps a callable in an OTEL span. Silent no-op if OTEL is disabled or
     * the SDK is not installed. The span is ended in the finally block so it
     * always closes, even when the callable throws.
     *
     * @template T
     * @param  string       $capability   'brief'|'chat'|'monthly_plan'|'redesign'|'memory_extract'|'compact'|'client_research'
     * @param  int          $organizationId
     * @param  array        $attributes   Scalar attributes tagged on the span (model, client_id, demand_id …)
     * @param  callable(): T $callable
     * @return T
     */
    public function emit(
        string $capability,
        int $organizationId,
        array $attributes,
        callable $callable,
    ): mixed {
        $startedAt = microtime(true);
        $span      = null;

        // --- Attempt to open an OTEL span (silent no-op on any failure) ------
        try {
            if ($this->enabled && class_exists(\OpenTelemetry\API\Globals::class)) {
                $tracer = \OpenTelemetry\API\Globals::tracerProvider()
                    ->getTracer('briefy-ai');
                $span = $tracer->spanBuilder("ai.{$capability}")->startSpan();
                $span->setAttribute('ai.capability', $capability);
                $span->setAttribute('organization_id', $organizationId);
                foreach ($attributes as $k => $v) {
                    if (is_scalar($v) || is_null($v)) {
                        $span->setAttribute((string) $k, $v);
                    }
                }
            }
        } catch (Throwable $e) {
            // Telemetry must NEVER break the host call.
            Log::debug('otel.span_start_failed', ['error' => class_basename($e)]);
            $span = null;
        }

        // --- Execute the AI call ----------------------------------------------
        try {
            return $callable();
        } catch (Throwable $e) {
            if ($span !== null) {
                try {
                    $span->recordException($e);
                } catch (Throwable) {
                    // ignore
                }
            }
            throw $e;
        } finally {
            $durationMs = (microtime(true) - $startedAt) * 1000;

            // Close OTEL span.
            if ($span !== null) {
                try {
                    $span->setAttribute('duration_ms', (int) $durationMs);
                    $span->end();
                } catch (Throwable) {
                    // ignore
                }
            }

            // Always log locally regardless of OTEL — cheap and always available.
            Log::info('ai.call', array_merge([
                'capability'      => $capability,
                'organization_id' => $organizationId,
                'duration_ms'     => (int) $durationMs,
            ], $attributes));
        }
    }

    /**
     * Record token usage + estimated cost after an AI call. Intended to be
     * called separately from emit() because the Anthropic SDK returns usage
     * only on message_stop (streaming) or in the Response object (sync).
     *
     * Writes to Redis counters (ai:calls + ai:cost_usd) for soft rate-limit
     * surface. Redis failures are caught and logged — they do not surface to
     * the caller.
     *
     * @param  string  $capability
     * @param  int     $organizationId
     * @param  array   $attributes      Same attribute bag passed to emit()
     * @param  int     $inputTokens
     * @param  int     $outputTokens
     * @param  float   $durationMs
     */
    public function recordUsage(
        string $capability,
        int $organizationId,
        array $attributes,
        int $inputTokens,
        int $outputTokens,
        float $durationMs,
    ): void {
        // --- Estimate cost ---------------------------------------------------
        $model = (string) ($attributes['model'] ?? '');
        $tier  = match (true) {
            str_contains($model, 'opus')   => 'opus',
            str_contains($model, 'sonnet') => 'sonnet',
            str_contains($model, 'haiku')  => 'haiku',
            default                        => null,
        };

        $costUsd = null;
        if ($tier !== null && isset(self::PRICE_PER_MTOK[$tier])) {
            $p       = self::PRICE_PER_MTOK[$tier];
            $costUsd = ($inputTokens  / 1_000_000) * $p['input']
                     + ($outputTokens / 1_000_000) * $p['output'];
        }

        // --- Local log (always) ----------------------------------------------
        Log::info('ai.usage', array_merge([
            'capability'      => $capability,
            'organization_id' => $organizationId,
            'input_tokens'    => $inputTokens,
            'output_tokens'   => $outputTokens,
            'duration_ms'     => (int) $durationMs,
            'cost_usd'        => $costUsd !== null ? round($costUsd, 5) : null,
        ], $attributes));

        // --- Redis counters (soft rate-limit surface) -------------------------
        try {
            $date     = now()->format('Y-m-d');
            $callsKey = "ai:calls:{$organizationId}:{$date}";

            $count = (int) Redis::incr($callsKey);
            if ($count === 1) {
                Redis::expire($callsKey, self::REDIS_TTL_SECONDS);
            }

            if ($costUsd !== null) {
                $costKey = "ai:cost_usd:{$organizationId}:{$date}";
                Redis::incrbyfloat($costKey, (float) $costUsd);
                Redis::expire($costKey, self::REDIS_TTL_SECONDS);
            }
        } catch (Throwable $e) {
            Log::debug('ai.usage_redis_failed', ['error' => class_basename($e)]);
        }
    }
}
