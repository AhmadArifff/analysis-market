/**
 * Fair Value Gap (FVG) Detection
 * Identifies price imbalances left by aggressive institutional candles.
 * Entry at an FVG zone signals high probability of institutional interest.
 */

import { Candle } from "./indicators";

export interface FairValueGap {
  index: number;
  time: string | number;
  type: "BULLISH_FVG" | "BEARISH_FVG";
  top: number;
  bottom: number;
  midpoint: number;
  gapSize: number;
  filled: boolean;
}

/**
 * Detects Fair Value Gaps in candle data.
 * Bullish FVG: candle[i-2].high < candle[i].low (gap up imbalance)
 * Bearish FVG: candle[i-2].low > candle[i].high (gap down imbalance)
 *
 * The FVG zone is the gap between candle[i-2] and candle[i], centered on candle[i-1].
 */
export function detectFVGs(candles: Candle[]): FairValueGap[] {
  const fvgs: FairValueGap[] = [];

  for (let i = 2; i < candles.length; i++) {
    const c0 = candles[i - 2];
    const c1 = candles[i - 1];
    const c2 = candles[i];

    // Bullish FVG: gap between c0.high and c2.low
    if (c0.high < c2.low) {
      const top = c2.low;
      const bottom = c0.high;
      fvgs.push({
        index: i - 1,
        time: c1.time,
        type: "BULLISH_FVG",
        top,
        bottom,
        midpoint: (top + bottom) / 2,
        gapSize: top - bottom,
        filled: false,
      });
    }

    // Bearish FVG: gap between c2.high and c0.low
    if (c0.low > c2.high) {
      const top = c0.low;
      const bottom = c2.high;
      fvgs.push({
        index: i - 1,
        time: c1.time,
        type: "BEARISH_FVG",
        top,
        bottom,
        midpoint: (top + bottom) / 2,
        gapSize: top - bottom,
        filled: false,
      });
    }
  }

  return fvgs;
}

/**
 * Marks FVGs as filled if price has traded through the entire gap zone.
 * Unfilled FVGs remain active as potential entry zones.
 */
export function updateFVGStatus(
  fvgs: FairValueGap[],
  candles: Candle[]
): FairValueGap[] {
  return fvgs.map((fvg) => {
    if (fvg.filled) return fvg;

    for (let i = fvg.index + 2; i < candles.length; i++) {
      if (fvg.type === "BULLISH_FVG") {
        if (candles[i].low <= fvg.bottom) {
          return { ...fvg, filled: true };
        }
      } else {
        if (candles[i].high >= fvg.top) {
          return { ...fvg, filled: true };
        }
      }
    }

    return fvg;
  });
}

/**
 * Checks if a candle's price action overlaps with any active (unfilled) FVG.
 * Returns the matching FVG or null.
 */
export function findOverlappingFVG(
  candle: Candle,
  fvgs: FairValueGap[],
  direction: "LONG" | "SHORT"
): FairValueGap | null {
  const activeFVGs = fvgs.filter((f) => !f.filled);

  for (const fvg of activeFVGs) {
    if (direction === "LONG" && fvg.type === "BULLISH_FVG") {
      if (candle.low <= fvg.top && candle.close >= fvg.bottom) {
        return fvg;
      }
    }
    if (direction === "SHORT" && fvg.type === "BEARISH_FVG") {
      if (candle.high >= fvg.bottom && candle.close <= fvg.top) {
        return fvg;
      }
    }
  }

  return null;
}

/**
 * Gets recent unfilled FVGs within a lookback window for chart overlay rendering.
 */
export function getActiveFVGs(
  candles: Candle[],
  maxLookback: number = 50
): FairValueGap[] {
  const recentCandles = candles.slice(-maxLookback);
  const raw = detectFVGs(recentCandles);
  return updateFVGStatus(raw, recentCandles).filter((f) => !f.filled);
}
