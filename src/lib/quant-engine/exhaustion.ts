import { Candle, calculateATR, calculateRSI } from "./indicators";

export interface ExhaustionReport {
  consecutive_bars: number;
  direction: "BULLISH" | "BEARISH" | "NEUTRAL";
  daily_move_pct: number;
  atr_14: number;
  normalized_move_ratio: number;
  fast_rsi_5: number;
  status: "NORMAL" | "WARNING" | "CRITICAL_ALERT";
  recommendation: string;
}

/**
 * Evaluates 3 to 5 Bar Exhaustion Protocol with Dynamic ATR Calibration
 */
export function evaluateExhaustion(candles: Candle[], assetCategory: string): ExhaustionReport {
  if (candles.length < 15) {
    return {
      consecutive_bars: 0,
      direction: "NEUTRAL",
      daily_move_pct: 0,
      atr_14: 0,
      normalized_move_ratio: 0,
      status: "NORMAL",
      fast_rsi_5: 50,
      recommendation: "INSUFFICIENT_DATA",
    };
  }

  // Count consecutive directional bars from latest candle backwards
  let consecutive = 1;
  const lastIndex = candles.length - 1;
  const isLastBullish = candles[lastIndex].close >= candles[lastIndex].open;

  for (let i = lastIndex - 1; i >= 0; i--) {
    const isBull = candles[i].close >= candles[i].open;
    if (isBull === isLastBullish) {
      consecutive++;
    } else {
      break;
    }
  }

  const atrValues = calculateATR(candles, 14);
  const currentAtr = atrValues[atrValues.length - 1] || 1;
  const closes = candles.map((c) => c.close);
  const rsiValues = calculateRSI(closes, 5);
  const currentRsi = rsiValues[rsiValues.length - 1] || 50;

  // Calculate cumulative price change over the consecutive bars
  const startPrice = candles[Math.max(0, lastIndex - consecutive + 1)].open;
  const endPrice = candles[lastIndex].close;
  const movePct = ((endPrice - startPrice) / startPrice) * 100;
  const moveAbsolute = Math.abs(endPrice - startPrice);
  const normalizedRatio = moveAbsolute / currentAtr;

  // Determine threshold based on asset category (Forex vs Crypto vs Meme)
  let warningConsecutive = 4;
  let criticalConsecutive = 5;

  let status: "NORMAL" | "WARNING" | "CRITICAL_ALERT" = "NORMAL";
  let recommendation = "NORMAL_TRENDING_ZONE";

  if (consecutive >= criticalConsecutive || (consecutive >= 4 && (currentRsi > 82 || currentRsi < 18))) {
    status = "CRITICAL_ALERT";
    recommendation = "ALERT_EXHAUSTION_CLIMAX_DO_NOT_CHASE_LOOK_FOR_SWEEP";
  } else if (consecutive >= warningConsecutive || normalizedRatio > 2.8) {
    status = "WARNING";
    recommendation = "WARNING_ZONE_WATCH_LOWER_TIMEFRAME_SWEEP";
  }

  return {
    consecutive_bars: consecutive,
    direction: isLastBullish ? "BULLISH" : "BEARISH",
    daily_move_pct: parseFloat(movePct.toFixed(2)),
    atr_14: parseFloat(currentAtr.toFixed(4)),
    normalized_move_ratio: parseFloat(normalizedRatio.toFixed(2)),
    fast_rsi_5: parseFloat(currentRsi.toFixed(1)),
    status,
    recommendation,
  };
}
