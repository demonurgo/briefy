<?php
// (c) 2026 Briefy contributors — AGPL-3.0
namespace App\Services\Ai;

final class CostEstimator
{
    // Opus 4.7 cost per 1M tokens (AI-SPEC §4).
    private const OPUS_INPUT_PER_MTOK  = 15.00;
    private const OPUS_OUTPUT_PER_MTOK = 75.00;

    // Managed Agents session (Opus-backed) — rough average per research pass.
    private const MA_SESSION_AVG_USD = 0.80;

    /**
     * Rough cost estimate (USD) for generating a monthly plan of N items.
     * Input budget: ~800 tokens (prompt + client context). Output: ~400 tokens per item.
     */
    public function monthlyPlan(int $monthlyPosts): float
    {
        $inputTok  = 800 + ($monthlyPosts * 40);
        $outputTok = max(400, $monthlyPosts * 400);
        return ($inputTok / 1_000_000) * self::OPUS_INPUT_PER_MTOK
             + ($outputTok / 1_000_000) * self::OPUS_OUTPUT_PER_MTOK;
    }

    /**
     * Managed Agents research session — averaged over 10-15 insights + 20-30 page crawl.
     * BYOK + highly variable; treat as "ballpark" for the confirmation modal.
     */
    public function clientResearchSession(): float
    {
        return self::MA_SESSION_AVG_USD;
    }
}
