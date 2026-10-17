export interface ConfluenceBreakdown {
  macro_trend_ema_adx: number;
  daily_exhaustion_atr_rsi5: number;
  retail_rr_pool_mapped: number;
  sweep_pinbar_rvol: number;
  divergence_or_oi_drop: number;
}

export interface ConfluenceEvaluation {
  score: number;
  max_score: number;
  is_high_probability: boolean;
  status: "HIGH_PROBABILITY_SWEEP_ENTRY" | "SETUP_DEVELOPING" | "FILTER_REJECTED";
  breakdown: ConfluenceBreakdown;
  summary: string;
}

/**
 * Calculates Composite Confluence Score according to C-QUANT-07 Protocol
 */
export function evaluateConfluence(
  macroTrendAligned: boolean,
  exhaustionActive: boolean,
  retailRRMapped: boolean,
  sweepConfirmed: boolean,
  hasDivergenceOrOiDrop: boolean = false
): ConfluenceEvaluation {
  const breakdown: ConfluenceBreakdown = {
    macro_trend_ema_adx: macroTrendAligned ? 20 : 0,
    daily_exhaustion_atr_rsi5: exhaustionActive ? 20 : 0,
    retail_rr_pool_mapped: retailRRMapped ? 20 : 0,
    sweep_pinbar_rvol: sweepConfirmed ? 25 : 0,
    divergence_or_oi_drop: hasDivergenceOrOiDrop ? 15 : 0,
  };

  const total =
    breakdown.macro_trend_ema_adx +
    breakdown.daily_exhaustion_atr_rsi5 +
    breakdown.retail_rr_pool_mapped +
    breakdown.sweep_pinbar_rvol +
    breakdown.divergence_or_oi_drop;

  const isHighProbability = total >= 80;

  return {
    score: total,
    max_score: 100,
    is_high_probability: isHighProbability,
    status: isHighProbability
      ? "HIGH_PROBABILITY_SWEEP_ENTRY"
      : total >= 50
      ? "SETUP_DEVELOPING"
      : "FILTER_REJECTED",
    breakdown,
    summary: isHighProbability
      ? "Confluence criteria satisfied (>= 80/100). Valid retail liquidity sweep entry triggered."
      : "Score below threshold (< 80/100). Do not take counter-trend entries without full confirmation.",
  };
}
