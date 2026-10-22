/**
 * Adaptive Gradient Confluence Scoring Engine
 * Replaces the binary 0/20 scoring with granular gradient evaluation
 * weighted by AssetProfile-specific parameters.
 */

import { ConfluenceWeights, AssetProfile } from "./assetProfile";

export interface ConfluenceInput {
  // Trend
  fastEmaAboveSlowEma: boolean;
  adxValue: number;
  adxThreshold: number;

  // Exhaustion
  consecutiveBars: number;
  maxConsecutiveThreshold: number;
  fastRsi: number;
  rsiOverbought: number;
  rsiOversold: number;
  entryDirection: "LONG" | "SHORT";

  // Liquidity Pool
  fractalPoolMapped: boolean;
  retailRRVisible: boolean;

  // Sweep Rejection
  wickRatio: number;
  minWickRatio: number;
  rvol: number;
  minRvol: number;

  // Structure Shift (FVG)
  hasFVGOverlap: boolean;
  hasOrderBlock: boolean;

  // Volume
  volumeDeltaAligned: boolean;
  rvolSpike: boolean;

  // Setup Context
  isTrendTrade?: boolean;
}

export interface ConfluenceBreakdown {
  trendAlignment: number;
  exhaustionZone: number;
  liquidityPool: number;
  sweepRejection: number;
  structureShift: number;
  volumeConfirm: number;
}

export interface ConfluenceEvaluation {
  score: number;
  max_score: number;
  is_high_probability: boolean;
  status: "HIGH_PROBABILITY_SWEEP_ENTRY" | "SETUP_DEVELOPING" | "FILTER_REJECTED";
  breakdown: ConfluenceBreakdown;
  summary: string;
  category: string;
}

/**
 * Scores each confluence pillar on a gradient scale, then weights by AssetProfile.
 */
export function evaluateConfluence(
  input: ConfluenceInput,
  profile: AssetProfile
): ConfluenceEvaluation {
  const w = profile.confluenceWeights;

  const trend = scoreTrend(input, w.trendAlignment);
  const exhaustion = scoreExhaustion(input, w.exhaustionZone);
  const pool = scorePool(input, w.liquidityPool);
  const sweep = scoreSweep(input, w.sweepRejection);
  const structure = scoreStructure(input, w.structureShift);
  const volume = scoreVolume(input, w.volumeConfirm);

  const breakdown: ConfluenceBreakdown = {
    trendAlignment: round(trend),
    exhaustionZone: round(exhaustion),
    liquidityPool: round(pool),
    sweepRejection: round(sweep),
    structureShift: round(structure),
    volumeConfirm: round(volume),
  };

  const total = round(trend + exhaustion + pool + sweep + structure + volume);
  const isHighProbability = total >= profile.confluenceMinScore;

  return {
    score: total,
    max_score: 100,
    is_high_probability: isHighProbability,
    status: isHighProbability
      ? "HIGH_PROBABILITY_SWEEP_ENTRY"
      : total >= profile.confluenceMinScore * 0.65
        ? "SETUP_DEVELOPING"
        : "FILTER_REJECTED",
    breakdown,
    summary: isHighProbability
      ? `Confluence ${total}/100 >= ${profile.confluenceMinScore} (${profile.category}). Valid entry.`
      : `Score ${total}/100 < ${profile.confluenceMinScore} (${profile.category}). Insufficient confirmation.`,
    category: profile.category,
  };
}

function scoreTrend(input: ConfluenceInput, maxPoints: number): number {
  let score = 0;

  if (input.isTrendTrade !== false) {
    // Trend continuation setup
    if (input.fastEmaAboveSlowEma) {
      score += maxPoints * 0.5;
    }
    if (input.adxValue >= input.adxThreshold) {
      score += maxPoints * 0.5;
    } else {
      const adxRatio = Math.max(0, input.adxValue / input.adxThreshold);
      score += maxPoints * 0.5 * adxRatio;
    }
  } else {
    // Counter-trend Exhaustion setup (mean-reversion)
    // Award 75% baseline for catching high-probability exhaustion reversals
    score += maxPoints * 0.75;
    if (input.adxValue < input.adxThreshold) {
      score += maxPoints * 0.25;
    }
  }

  return Math.min(maxPoints, score);
}

function scoreExhaustion(input: ConfluenceInput, maxPoints: number): number {
  let score = 0;
  const threshold = input.maxConsecutiveThreshold;

  if (input.isTrendTrade !== false) {
    // In a trend continuation trade (buying dip in uptrend or selling rally in downtrend):
    // A clean, shallow pullback (1-3 bars) is ideal!
    if (input.consecutiveBars <= 3) {
      score += maxPoints * 0.5;
    }
    // RSI in healthy pullback zone (25 to 60 for longs, 40 to 75 for shorts)
    if (input.entryDirection === "LONG" && input.fastRsi >= 25 && input.fastRsi <= 60) {
      score += maxPoints * 0.5;
    } else if (input.entryDirection === "SHORT" && input.fastRsi >= 40 && input.fastRsi <= 75) {
      score += maxPoints * 0.5;
    }
  } else {
    // In counter-trend trades: Require extreme exhaustion!
    if (input.consecutiveBars >= threshold - 1) {
      score += maxPoints * 0.4;
    }
    if (input.consecutiveBars >= threshold) {
      score += maxPoints * 0.2;
    }

    if (input.entryDirection === "LONG" && input.fastRsi <= input.rsiOversold + 5) {
      score += maxPoints * 0.4;
    } else if (input.entryDirection === "SHORT" && input.fastRsi >= input.rsiOverbought - 5) {
      score += maxPoints * 0.4;
    } else {
      const oversoldDistance = input.rsiOversold - input.fastRsi;
      const overboughtDistance = input.fastRsi - input.rsiOverbought;

      if (input.entryDirection === "LONG" && oversoldDistance > -15) {
        score += maxPoints * 0.4 * Math.max(0, Math.min(1, (oversoldDistance + 15) / 20));
      } else if (input.entryDirection === "SHORT" && overboughtDistance > -15) {
        score += maxPoints * 0.4 * Math.max(0, Math.min(1, (overboughtDistance + 15) / 20));
      }
    }
  }

  return Math.min(maxPoints, score);
}

function scorePool(input: ConfluenceInput, maxPoints: number): number {
  let score = 0;

  if (input.fractalPoolMapped) {
    score += maxPoints * 0.5;
  }
  if (input.retailRRVisible) {
    score += maxPoints * 0.5;
  }

  return Math.min(maxPoints, score);
}

function scoreSweep(input: ConfluenceInput, maxPoints: number): number {
  let score = 0;

  if (input.wickRatio >= input.minWickRatio) {
    score += maxPoints * 0.4;

    if (input.wickRatio >= input.minWickRatio * 1.25) {
      score += maxPoints * 0.25;
    }
  }

  if (input.rvol >= input.minRvol) {
    score += maxPoints * 0.35;
  } else {
    score += maxPoints * 0.35 * Math.min(1, input.rvol / input.minRvol);
  }

  return Math.min(maxPoints, score);
}

function scoreStructure(input: ConfluenceInput, maxPoints: number): number {
  let score = 0;

  if (input.hasFVGOverlap) {
    score += maxPoints * 0.8;
  } else if (input.fractalPoolMapped) {
    // Structural support/resistance level from fractal high/low confirmed
    score += maxPoints * 0.5;
  }

  if (input.hasOrderBlock) {
    score += maxPoints * 0.2;
  }

  return Math.min(maxPoints, score);
}

function scoreVolume(input: ConfluenceInput, maxPoints: number): number {
  let score = 0;

  if (input.volumeDeltaAligned) {
    score += maxPoints * 0.6;
  }
  if (input.rvolSpike) {
    score += maxPoints * 0.4;
  } else {
    score += maxPoints * 0.4 * Math.min(1, input.rvol / input.minRvol);
  }

  return Math.min(maxPoints, score);
}

function round(n: number): number {
  return parseFloat(n.toFixed(1));
}

/**
 * Legacy wrapper for backward compatibility with existing callers.
 * Maps old boolean interface to new gradient input.
 */
export function evaluateConfluenceLegacy(
  macroTrendAligned: boolean,
  exhaustionActive: boolean,
  retailRRMapped: boolean,
  sweepConfirmed: boolean,
  hasDivergenceOrOiDrop: boolean = false
): ConfluenceEvaluation {
  const { getAssetProfile } = require("./assetProfile");
  const profile = getAssetProfile("BTCUSDT");

  const input: ConfluenceInput = {
    fastEmaAboveSlowEma: macroTrendAligned,
    adxValue: macroTrendAligned ? 30 : 10,
    adxThreshold: profile.adxThreshold,
    consecutiveBars: exhaustionActive ? 4 : 1,
    maxConsecutiveThreshold: profile.maxConsecutiveBars,
    fastRsi: exhaustionActive ? 20 : 50,
    rsiOverbought: profile.rsiOverbought,
    rsiOversold: profile.rsiOversold,
    entryDirection: "LONG",
    fractalPoolMapped: retailRRMapped,
    retailRRVisible: retailRRMapped,
    wickRatio: sweepConfirmed ? 0.35 : 0.1,
    minWickRatio: profile.minWickRatio,
    rvol: sweepConfirmed ? 2.0 : 0.8,
    minRvol: profile.minRvol,
    hasFVGOverlap: false,
    hasOrderBlock: false,
    volumeDeltaAligned: hasDivergenceOrOiDrop,
    rvolSpike: sweepConfirmed,
  };

  return evaluateConfluence(input, profile);
}
