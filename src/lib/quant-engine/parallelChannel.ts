/**
 * Quantitative Parallel Channel Engine
 * Algorithmic detection of Ascending, Descending, and Horizontal Parallel Channels
 * with deterministic Linear Regression Envelopes.
 *
 * Implements two distinct quantitative setups:
 * 1. Mantul / Bounce: Reversal within channel bounds when candle close fails to breach boundary.
 * 2. Break & Retest: Role reversal (S/R Flip) where a broken channel line acts as new Support or Supply.
 */

import { Candle } from "./indicators";

export interface ParallelChannel {
  slope: number;
  slope_type: "ASCENDING" | "DESCENDING" | "HORIZONTAL";
  upper_price: number;
  mid_price: number;
  lower_price: number;
  channel_height: number;
  r_squared: number;
  start_index: number;
  end_index: number;
  start_time: string | number;
  end_time: string | number;
  start_upper_price: number;
  start_lower_price: number;
  upper_intercept: number;
  lower_intercept: number;
  mid_intercept: number;
  anchor_high?: { price: number; time: string | number; index: number };
  anchor_low?: { price: number; time: string | number; index: number };
  anchor_mode?: "SWING_HIGHLOW" | "REGRESSION";
}

export interface SwingPivot {
  index: number;
  time: string | number;
  price: number;
  type: "SWING_HIGH" | "SWING_LOW";
}

export type ChannelSignalType =
  | "CHANNEL_BOUNCE_BUY"
  | "CHANNEL_BOUNCE_SELL"
  | "CHANNEL_BREAK_RETEST_BUY"
  | "CHANNEL_BREAK_RETEST_SELL"
  | "NONE";

export interface ChannelEvaluation {
  channel: ParallelChannel | null;
  signal: ChannelSignalType;
  entry_px: number;
  sl_px: number;
  tp_px: number;
  setup_type: string;
  notes: string;
  bounce_zone?: "SUPPORT_LOWER" | "RESISTANCE_UPPER" | null;
  retest_role?: "BREAKOUT_SUPPORT_RETEST" | "BREAKDOWN_SUPPLY_RETEST" | null;
}

/**
 * Detects swing high and swing low pivot points in a candle window
 */
export function findWindowSwingPivots(window: Candle[]): {
  swingHighs: SwingPivot[];
  swingLows: SwingPivot[];
} {
  const swingHighs: SwingPivot[] = [];
  const swingLows: SwingPivot[] = [];
  const N = window.length;

  for (let i = 1; i < N - 1; i++) {
    const isSH = window[i].high >= window[i - 1].high && window[i].high >= window[i + 1].high;
    const isSL = window[i].low <= window[i - 1].low && window[i].low <= window[i + 1].low;

    if (isSH) {
      swingHighs.push({
        index: i,
        time: window[i].time,
        price: window[i].high,
        type: "SWING_HIGH",
      });
    }
    if (isSL) {
      swingLows.push({
        index: i,
        time: window[i].time,
        price: window[i].low,
        type: "SWING_LOW",
      });
    }
  }

  return { swingHighs, swingLows };
}

function calculateLinearRegressionSlope(window: Candle[]): number {
  const N = window.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;

  for (let i = 0; i < N; i++) {
    const x = i;
    const y = (window[i].high + window[i].low + window[i].close) / 3;
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  }

  const denominator = N * sumXX - sumX * sumX;
  if (denominator === 0) return 0;
  return (N * sumXY - sumX * sumY) / denominator;
}

/**
 * Fits a parallel channel anchored by Swing High & Swing Low pivots or Linear Regression
 */
export function detectParallelChannel(
  candles: Candle[],
  lookback: number = 25,
  anchorMode: "SWING_HIGHLOW" | "REGRESSION" = "SWING_HIGHLOW"
): ParallelChannel | null {
  if (candles.length < Math.min(15, lookback)) return null;

  const window = candles.slice(-lookback);
  const N = window.length;
  if (N < 10) return null;

  // 1. Detect Swing Highs and Swing Lows as anchor candidates
  const { swingHighs, swingLows } = findWindowSwingPivots(window);

  const anchorHigh: SwingPivot =
    swingHighs.length > 0
      ? swingHighs.reduce((max, s) => (s.price > max.price ? s : max))
      : window.reduce(
          (max, c, i) =>
            c.high > max.price
              ? { index: i, time: c.time, price: c.high, type: "SWING_HIGH" as const }
              : max,
          { index: 0, time: window[0].time, price: window[0].high, type: "SWING_HIGH" as const }
        );

  const anchorLow: SwingPivot =
    swingLows.length > 0
      ? swingLows.reduce((min, s) => (s.price < min.price ? s : min))
      : window.reduce(
          (min, c, i) =>
            c.low < min.price
              ? { index: i, time: c.time, price: c.low, type: "SWING_LOW" as const }
              : min,
          { index: 0, time: window[0].time, price: window[0].low, type: "SWING_LOW" as const }
        );

  let slope = 0;

  if (anchorMode === "SWING_HIGHLOW" && (swingLows.length >= 2 || swingHighs.length >= 2)) {
    let slopeLow: number | null = null;
    let slopeHigh: number | null = null;

    if (swingLows.length >= 2) {
      const firstL = swingLows[0];
      const lastL = swingLows[swingLows.length - 1];
      if (lastL.index > firstL.index) {
        slopeLow = (lastL.price - firstL.price) / (lastL.index - firstL.index);
      }
    }

    if (swingHighs.length >= 2) {
      const firstH = swingHighs[0];
      const lastH = swingHighs[swingHighs.length - 1];
      if (lastH.index > firstH.index) {
        slopeHigh = (lastH.price - firstH.price) / (lastH.index - firstH.index);
      }
    }

    if (slopeLow !== null && slopeHigh !== null) {
      slope = (slopeLow + slopeHigh) / 2;
    } else if (slopeLow !== null) {
      slope = slopeLow;
    } else if (slopeHigh !== null) {
      slope = slopeHigh;
    } else {
      slope = calculateLinearRegressionSlope(window);
    }
  } else {
    slope = calculateLinearRegressionSlope(window);
  }

  // 2. Compute R-Squared (Goodness of Fit)
  const typicalPrices = window.map((c) => (c.high + c.low + c.close) / 3);
  const meanY = typicalPrices.reduce((a, b) => a + b, 0) / N;
  let sumRegY = 0;
  for (let i = 0; i < N; i++) {
    sumRegY += typicalPrices[i] - slope * i;
  }
  const midBaseIntercept = sumRegY / N;

  let totalSS = 0;
  let residualSS = 0;
  for (let i = 0; i < N; i++) {
    const y = typicalPrices[i];
    const yPred = slope * i + midBaseIntercept;
    totalSS += (y - meanY) * (y - meanY);
    residualSS += (y - yPred) * (y - yPred);
  }
  const rSquared = totalSS > 0 ? Math.max(0, 1 - residualSS / totalSS) : 0;

  // 3. Anchor upper envelope to Swing High and lower envelope to Swing Low
  let maxUpperOffset = -Infinity;
  let minLowerOffset = Infinity;

  for (let i = 0; i < N; i++) {
    const baseline = slope * i;
    const highOffset = window[i].high - baseline;
    const lowOffset = window[i].low - baseline;

    if (highOffset > maxUpperOffset) maxUpperOffset = highOffset;
    if (lowOffset < minLowerOffset) minLowerOffset = lowOffset;
  }

  const upperIntercept = maxUpperOffset;
  const lowerIntercept = minLowerOffset;
  const midIntercept = (upperIntercept + lowerIntercept) / 2;
  const channelHeight = upperIntercept - lowerIntercept;

  if (channelHeight <= 0) return null;

  // Project prices at start (i=0) and end (i=N-1)
  const currentUpperPrice = fmt(slope * (N - 1) + upperIntercept);
  const currentLowerPrice = fmt(slope * (N - 1) + lowerIntercept);
  const currentMidPrice = fmt(slope * (N - 1) + midIntercept);

  const startUpperPrice = fmt(slope * 0 + upperIntercept);
  const startLowerPrice = fmt(slope * 0 + lowerIntercept);

  // Slope classification
  const normalizedSlope = ((slope * N) / window[N - 1].close) * 100;
  let slopeType: "ASCENDING" | "DESCENDING" | "HORIZONTAL" = "HORIZONTAL";
  if (normalizedSlope > 0.4) {
    slopeType = "ASCENDING";
  } else if (normalizedSlope < -0.4) {
    slopeType = "DESCENDING";
  }

  return {
    slope,
    slope_type: slopeType,
    upper_price: currentUpperPrice,
    mid_price: currentMidPrice,
    lower_price: currentLowerPrice,
    channel_height: fmt(channelHeight),
    r_squared: parseFloat(rSquared.toFixed(2)),
    start_index: candles.length - N,
    end_index: candles.length - 1,
    start_time: window[0].time,
    end_time: window[N - 1].time,
    start_upper_price: startUpperPrice,
    start_lower_price: startLowerPrice,
    upper_intercept: upperIntercept,
    lower_intercept: lowerIntercept,
    mid_intercept: midIntercept,
    anchor_high: { price: anchorHigh.price, time: anchorHigh.time, index: anchorHigh.index },
    anchor_low: { price: anchorLow.price, time: anchorLow.time, index: anchorLow.index },
    anchor_mode: anchorMode,
  };
}

/**
 * Evaluates Parallel Channel entry setups on the current candle:
 * 1. Mantul / Bounce: Reversal within channel bounds when candle close fails to breach boundary.
 * 2. Break & Retest: Role reversal where a broken channel line acts as new Support or Supply.
 */
export function evaluateChannelSetups(
  candles: Candle[],
  currentIndex: number,
  lookback: number = 25,
  riskRewardRatio: number = 2.0,
  anchorMode: "SWING_HIGHLOW" | "REGRESSION" = "SWING_HIGHLOW"
): ChannelEvaluation {
  const defaultResult: ChannelEvaluation = {
    channel: null,
    signal: "NONE",
    entry_px: 0,
    sl_px: 0,
    tp_px: 0,
    setup_type: "",
    notes: "",
  };

  if (currentIndex < 12 || currentIndex >= candles.length) return defaultResult;

  // Use candles strictly up to currentIndex to maintain zero look-ahead bias
  const pastCandles = candles.slice(0, currentIndex + 1);
  const currentBar = pastCandles[pastCandles.length - 1];
  const prevBar = pastCandles[pastCandles.length - 2];
  const prev2Bar = pastCandles.length >= 3 ? pastCandles[pastCandles.length - 3] : null;

  // Detect channel on candles ending at currentIndex with chosen anchorMode
  const channel = detectParallelChannel(pastCandles, lookback, anchorMode);
  if (!channel) return defaultResult;

  const H = channel.channel_height;
  const upper = channel.upper_price;
  const lower = channel.lower_price;
  const mid = channel.mid_price;

  // Calculate previous bar channel prices using the fitted regression
  const prevX = channel.end_index - channel.start_index - 1;
  const prevUpper = channel.slope * prevX + channel.upper_intercept;
  const prevLower = channel.slope * prevX + channel.lower_intercept;

  const candleRange = Math.max(0.0001, currentBar.high - currentBar.low);
  const lowerWick = Math.min(currentBar.open, currentBar.close) - currentBar.low;
  const upperWick = currentBar.high - Math.max(currentBar.open, currentBar.close);
  const lowerWickRatio = lowerWick / candleRange;
  const upperWickRatio = upperWick / candleRange;

  const buffer = Math.max(H * 0.08, currentBar.close * 0.002);

  // -------------------------------------------------------------
  // SETUP 1: MANTUL / BOUNCE DALAM PARALLEL CHANNEL
  // "jika chart atau body close tidak melewati garis pararel chanel maka market pergerakannya akan mantul"
  // -------------------------------------------------------------

  // 1A. Mantul di Garis Support Bawah (Buy Bounce)
  // Low mendekati atau menyentuh garis bawah, namun candle close tidak tembus (tetap di atas/dalam kanal)
  const touchedLower = currentBar.low <= lower + H * 0.12;
  const closedInsideLower = currentBar.close >= lower - buffer * 0.5;
  const bullishBounce = (currentBar.close >= currentBar.open || lowerWickRatio >= 0.20);

  if (touchedLower && closedInsideLower && bullishBounce) {
    const entryPx = fmt(currentBar.close);
    const slPx = fmt(Math.min(currentBar.low, lower) - buffer);
    const riskDist = Math.max(entryPx - slPx, entryPx * 0.003);
    const targetMid = mid;
    const targetUpper = upper;
    const minTarget = entryPx + riskDist * riskRewardRatio;
    const finalTP = fmt(targetUpper >= minTarget ? targetUpper : targetMid >= minTarget ? targetMid : minTarget);

    return {
      channel,
      signal: "CHANNEL_BOUNCE_BUY",
      entry_px: entryPx,
      sl_px: slPx,
      tp_px: finalTP,
      setup_type: `CHANNEL_BOUNCE_BUY [${channel.slope_type}]`,
      notes: `Mantul di Support Bawah Kanal ($${lower}). Body close gagal tembus garis. Target Midline ($${mid}) / Upper ($${upper}).`,
      bounce_zone: "SUPPORT_LOWER",
    };
  }

  // 1B. Mantul di Garis Resistance Atas (Sell Bounce)
  // High mendekati atau menyentuh garis atas, namun candle close tidak tembus (tetap di bawah/dalam kanal)
  const touchedUpper = currentBar.high >= upper - H * 0.12;
  const closedInsideUpper = currentBar.close <= upper + buffer * 0.5;
  const bearishBounce = (currentBar.close <= currentBar.open || upperWickRatio >= 0.20);

  if (touchedUpper && closedInsideUpper && bearishBounce) {
    const entryPx = fmt(currentBar.close);
    const slPx = fmt(Math.max(currentBar.high, upper) + buffer);
    const riskDist = Math.max(slPx - entryPx, entryPx * 0.003);
    const targetMid = mid;
    const targetLower = lower;
    const minTarget = entryPx - riskDist * riskRewardRatio;
    const finalTP = fmt(targetLower <= minTarget ? targetLower : targetMid <= minTarget ? targetMid : minTarget);

    return {
      channel,
      signal: "CHANNEL_BOUNCE_SELL",
      entry_px: entryPx,
      sl_px: slPx,
      tp_px: finalTP,
      setup_type: `CHANNEL_BOUNCE_SELL [${channel.slope_type}]`,
      notes: `Mantul di Resistance Atas Kanal ($${upper}). Body close gagal tembus garis. Target Midline ($${mid}) / Lower ($${lower}).`,
      bounce_zone: "RESISTANCE_UPPER",
    };
  }

  // -------------------------------------------------------------
  // SETUP 2: BREAK & RETEST SEBAGAI SUPPORT / SUPPLY
  // "dan jika break maka dia akan menyentuh garis pararel chanel yang sudah di break dan dijadikan entri buy atau sel sebagai support atau suply!"
  // -------------------------------------------------------------

  // Pre-breakout channel: fitted on candles prior to the breakout bar (i-2)
  const preBreakCandles = pastCandles.slice(0, -2);
  const preChannel = detectParallelChannel(preBreakCandles, lookback, anchorMode);

  if (preChannel && preBreakCandles.length >= 10) {
    const preH = preChannel.channel_height;
    // Project channel line forward 1 bar (to prevBar) and 2 bars (to currentBar)
    const prevBarUpper = preChannel.upper_price + preChannel.slope;
    const prevBarLower = preChannel.lower_price + preChannel.slope;
    const currentBarUpper = preChannel.upper_price + preChannel.slope * 2;
    const currentBarLower = preChannel.lower_price + preChannel.slope * 2;

    // 2A. Bullish Breakout & Retest (Broken Upper Line diuji sebagai Support Baru)
    // Candle sebelumnya (prevBar) break ke atas upper line preChannel
    const prevBrokeAbove = prevBar.close > prevBarUpper;
    const currentRetestsUpper = currentBar.low <= currentBarUpper + preH * 0.15;
    const holdsAboveUpper = currentBar.close >= currentBarUpper - buffer * 0.5;

    if (prevBrokeAbove && currentRetestsUpper && holdsAboveUpper) {
      const entryPx = fmt(currentBar.close);
      const slPx = fmt(currentBarUpper - buffer * 1.5);
      const riskDist = Math.max(entryPx - slPx, entryPx * 0.003);
      const projectedTarget = fmt(currentBarUpper + preH * 1.0); // Channel Height Expansion projection
      const minTarget = entryPx + riskDist * riskRewardRatio;
      const finalTP = fmt(Math.max(projectedTarget, minTarget));

      return {
        channel: preChannel,
        signal: "CHANNEL_BREAK_RETEST_BUY",
        entry_px: entryPx,
        sl_px: slPx,
        tp_px: finalTP,
        setup_type: `CHANNEL_BREAK_RETEST_BUY [${preChannel.slope_type}]`,
        notes: `Breakout Kanal Atas ($${fmt(prevBarUpper)}) terkonfirmasi! Retest garis berhasil & dijadikan Support Baru (Demand). Target Ekspansi: $${finalTP}.`,
        retest_role: "BREAKOUT_SUPPORT_RETEST",
      };
    }

    // 2B. Bearish Breakdown & Retest (Broken Lower Line diuji sebagai Supply / Resistance Baru)
    // Candle sebelumnya (prevBar) break ke bawah lower line preChannel
    const prevBrokeBelow = prevBar.close < prevBarLower;
    const currentRetestsLower = currentBar.high >= currentBarLower - preH * 0.15;
    const holdsBelowLower = currentBar.close <= currentBarLower + buffer * 0.5;

    if (prevBrokeBelow && currentRetestsLower && holdsBelowLower) {
      const entryPx = fmt(currentBar.close);
      const slPx = fmt(currentBarLower + buffer * 1.5);
      const riskDist = Math.max(slPx - entryPx, entryPx * 0.003);
      const projectedTarget = fmt(currentBarLower - preH * 1.0); // Channel Height Expansion projection
      const minTarget = entryPx - riskDist * riskRewardRatio;
      const finalTP = fmt(Math.min(projectedTarget, minTarget));

      return {
        channel: preChannel,
        signal: "CHANNEL_BREAK_RETEST_SELL",
        entry_px: entryPx,
        sl_px: slPx,
        tp_px: finalTP,
        setup_type: `CHANNEL_BREAK_RETEST_SELL [${preChannel.slope_type}]`,
        notes: `Breakdown Kanal Bawah ($${fmt(prevBarLower)}) terkonfirmasi! Retest garis berhasil & dijadikan Supply/Resistance Baru. Target Ekspansi: $${finalTP}.`,
        retest_role: "BREAKDOWN_SUPPLY_RETEST",
      };
    }
  }

  return {
    channel,
    signal: "NONE",
    entry_px: 0,
    sl_px: 0,
    tp_px: 0,
    setup_type: "",
    notes: "",
  };
}

function fmt(n: number): number {
  return parseFloat(n.toFixed(n < 1 ? 6 : 2));
}
