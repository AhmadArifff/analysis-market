/**
 * Precision Sniper Engine [WillyAlgoTrader v2.1.0]
 * Mathematical adaptation of the TradingView Precision Sniper Pine Script.
 * 
 * Architecture:
 * 1. Dual EMA Crossover (Fast vs Slow) + Trend EMA (55)
 * 2. Mandatory Price Momentum Gate (Close > Fast & Slow EMA)
 * 3. Multi-Factor Evidence Confluence Scoring (Trend, RSI, MACD, ADX, Volume Spike, VWAP)
 * 4. Grade Classification (A+, A, B, C) with Hide-C Noise Filter
 * 5. Dynamic Volatility ATR & Window Structure Stop Loss (10-bar swing + 0.2 ATR buffer, capped at 1.5x)
 * 6. Multi-Target R-Multipliers (TP1: 1R, TP2: 2R, TP3: 3R) with Step Trailing Stop
 */

import {
  Candle,
  calculateEMA,
  calculateATR,
  calculateRSI,
  calculateMACD,
  calculateDMI,
  calculateSMA,
  calculateVWAP,
} from "./indicators";

export type PrecisionSniperPreset =
  | "Auto"
  | "Scalping"
  | "Aggressive"
  | "Default"
  | "Conservative"
  | "Swing"
  | "Crypto 24/7"
  | "Custom";

export type PrecisionSniperGrade = "A+" | "A" | "B" | "C";
export type PrecisionSniperGradeFilter = "All" | "A+ and A" | "A+ Only";

export interface PrecisionSniperConfig {
  preset?: PrecisionSniperPreset;
  timeframe?: string;
  gradeFilter?: PrecisionSniperGradeFilter;
  hideC?: boolean;
  minScore?: number; // 1 to 10 (default: 5)
  volMode?: "Off" | "Skip Signals" | "Widen SL";
  volThreshold?: number; // default: 1.3
  structureInput?: boolean; // default: true
  swingLookback?: number; // default: 10
  tp1R?: number; // default: 1.0
  tp2R?: number; // default: 2.0
  tp3R?: number; // default: 3.0
  customFast?: number;
  customSlow?: number;
  customTrend?: number;
  customRsi?: number;
  customAtr?: number;
  customSlMult?: number;
}

export interface PrecisionSniperSignal {
  signal: "BUY" | "SELL" | "NONE";
  entry_px: number;
  sl_px: number;
  tp1_px: number;
  tp2_px: number;
  tp3_px: number;
  risk: number;
  score: number;
  scoreMax: number;
  scoreRatio: number;
  grade: PrecisionSniperGrade;
  regime: string;
  origin: "ATR" | "Structure" | "ATR capped";
  trigger_reason: string;
  factors: {
    trendAligned: boolean;
    rsiInRange: boolean;
    macdPositive: boolean;
    macdAccelerating: boolean;
    adxTrending: boolean;
    volumeSpike: boolean;
    vwapAligned: boolean;
  };
}

/**
 * Resolves effective parameter profiles based on preset & timeframe
 */
export function resolvePrecisionSniperProfile(
  config: PrecisionSniperConfig
): {
  fastLen: number;
  slowLen: number;
  trendLen: number;
  rsiLen: number;
  atrLen: number;
  minScore: number;
  slMult: number;
  presetName: string;
} {
  const tf = (config.timeframe || "1h").toLowerCase();
  let resolvedPreset = config.preset || "Default";

  if (resolvedPreset === "Auto") {
    if (tf.includes("1m") || tf.includes("3m") || tf.includes("5m")) {
      resolvedPreset = "Scalping";
    } else if (tf.includes("15m") || tf.includes("30m") || tf.includes("1h")) {
      resolvedPreset = "Default";
    } else if (tf.includes("2h") || tf.includes("4h")) {
      resolvedPreset = "Conservative";
    } else {
      resolvedPreset = "Swing";
    }
  }

  switch (resolvedPreset) {
    case "Scalping":
      return { fastLen: 5, slowLen: 13, trendLen: 34, rsiLen: 8, atrLen: 10, minScore: 4, slMult: 0.8, presetName: "Scalping" };
    case "Aggressive":
      return { fastLen: 8, slowLen: 18, trendLen: 50, rsiLen: 11, atrLen: 12, minScore: 3, slMult: 1.2, presetName: "Aggressive" };
    case "Default":
      return { fastLen: 9, slowLen: 21, trendLen: 55, rsiLen: 13, atrLen: 14, minScore: 5, slMult: 1.5, presetName: "Default" };
    case "Conservative":
      return { fastLen: 12, slowLen: 26, trendLen: 89, rsiLen: 14, atrLen: 14, minScore: 7, slMult: 2.0, presetName: "Conservative" };
    case "Swing":
      return { fastLen: 13, slowLen: 34, trendLen: 89, rsiLen: 21, atrLen: 20, minScore: 6, slMult: 2.5, presetName: "Swing" };
    case "Crypto 24/7":
      return { fastLen: 9, slowLen: 21, trendLen: 55, rsiLen: 14, atrLen: 20, minScore: 5, slMult: 2.0, presetName: "Crypto 24/7" };
    case "Custom":
      return {
        fastLen: config.customFast || 9,
        slowLen: config.customSlow || 21,
        trendLen: config.customTrend || 55,
        rsiLen: config.customRsi || 13,
        atrLen: config.customAtr || 14,
        minScore: config.minScore || 5,
        slMult: config.customSlMult || 1.5,
        presetName: "Custom",
      };
    default:
      return { fastLen: 9, slowLen: 21, trendLen: 55, rsiLen: 13, atrLen: 14, minScore: 5, slMult: 1.5, presetName: "Default" };
  }
}

/**
 * Maps evidence ratio to Grade (A+, A, B, C)
 */
export function getPrecisionSniperGrade(ratio: number): PrecisionSniperGrade {
  if (ratio >= 0.80) return "A+";
  if (ratio >= 0.65) return "A";
  if (ratio >= 0.50) return "B";
  return "C";
}

/**
 * Evaluates Precision Sniper indicator signal at a specific candle index
 */
export function evaluatePrecisionSniper(
  candles: Candle[],
  currentIndex: number,
  config: PrecisionSniperConfig = {}
): PrecisionSniperSignal {
  const emptySignal: PrecisionSniperSignal = {
    signal: "NONE",
    entry_px: 0,
    sl_px: 0,
    tp1_px: 0,
    tp2_px: 0,
    tp3_px: 0,
    risk: 0,
    score: 0,
    scoreMax: 7,
    scoreRatio: 0,
    grade: "C",
    regime: "Range",
    origin: "ATR",
    trigger_reason: "",
    factors: {
      trendAligned: false,
      rsiInRange: false,
      macdPositive: false,
      macdAccelerating: false,
      adxTrending: false,
      volumeSpike: false,
      vwapAligned: false,
    },
  };

  if (currentIndex < 45 || candles.length < 45) {
    return emptySignal;
  }

  const profile = resolvePrecisionSniperProfile(config);
  const currentBar = candles[currentIndex];
  const prevBar = candles[currentIndex - 1];

  // Slices up to currentIndex for anti look-ahead bias
  const relevantCandles = candles.slice(0, currentIndex + 1);
  const closes = relevantCandles.map((c) => c.close);
  const volumes = relevantCandles.map((c) => c.volume || 0);

  // 1. Moving Averages
  const emaFast = calculateEMA(closes, profile.fastLen);
  const emaSlow = calculateEMA(closes, profile.slowLen);
  const emaTrend = calculateEMA(closes, profile.trendLen);

  if (emaFast.length < 2 || emaSlow.length < 2 || emaTrend.length < 1) {
    return emptySignal;
  }

  const currFast = emaFast[emaFast.length - 1];
  const prevFast = emaFast[emaFast.length - 2];
  const currSlow = emaSlow[emaSlow.length - 1];
  const prevSlow = emaSlow[emaSlow.length - 2];
  const currTrend = emaTrend[emaTrend.length - 1];

  // 2. Crossovers
  const bullCross = prevFast <= prevSlow && currFast > currSlow;
  const bearCross = prevFast >= prevSlow && currFast < currSlow;

  if (!bullCross && !bearCross) {
    return emptySignal;
  }

  // 3. Mandatory Momentum Gate
  const bullMomentum = currentBar.close > currFast && currentBar.close > currSlow;
  const bearMomentum = currentBar.close < currFast && currentBar.close < currSlow;

  const targetDir: 1 | -1 = bullCross ? 1 : -1;
  if (targetDir === 1 && !bullMomentum) return emptySignal;
  if (targetDir === -1 && !bearMomentum) return emptySignal;

  // 4. Volatility Filter (ATR & ATR Mean 42)
  const atrArr = calculateATR(relevantCandles, profile.atrLen);
  if (atrArr.length < 2) return emptySignal;
  const currentAtr = atrArr[atrArr.length - 1];

  const atrMeanArr = calculateSMA(atrArr, 42);
  const currentAtrMean = atrMeanArr.length > 0 ? atrMeanArr[atrMeanArr.length - 1] : currentAtr;
  const volRatio = currentAtrMean > 0 ? currentAtr / currentAtrMean : 1;

  const volMode = config.volMode || "Skip Signals";
  const volThreshold = config.volThreshold || 1.3;
  const isHighVol = volRatio > volThreshold;

  if (volMode === "Skip Signals" && isHighVol) {
    return emptySignal; // High volatility blocks entry
  }

  const stopMultiplier = volMode === "Widen SL" && isHighVol ? 1.5 : 1.0;

  // 5. RSI (13 default)
  const rsiArr = calculateRSI(closes, profile.rsiLen);
  const currentRsi = rsiArr.length > 0 ? rsiArr[rsiArr.length - 1] : 50;
  // Overbought/oversold extreme rejection gates
  if (targetDir === 1 && currentRsi >= 75) return emptySignal;
  if (targetDir === -1 && currentRsi <= 25) return emptySignal;

  // 6. MACD (12, 26, 9)
  const macdData = calculateMACD(closes, 12, 26, 9);
  const currHist = macdData.hist.length > 0 ? macdData.hist[macdData.hist.length - 1] : 0;
  const prevHist = macdData.hist.length > 1 ? macdData.hist[macdData.hist.length - 2] : 0;

  // 7. ADX & DMI
  const dmiData = calculateDMI(relevantCandles, 14);
  const currentADX = dmiData.adx.length > 0 ? dmiData.adx[dmiData.adx.length - 1] : 20;
  const currPlusDI = dmiData.plusDI.length > 0 ? dmiData.plusDI[dmiData.plusDI.length - 1] : 25;
  const currMinusDI = dmiData.minusDI.length > 0 ? dmiData.minusDI[dmiData.minusDI.length - 1] : 25;
  const isTrending = currentADX >= 20;

  // 8. Volume Spike (1.2x of 20-bar SMA)
  const hasVolume = volumes.some((v) => v > 0);
  const volSmaArr = calculateSMA(volumes, 20);
  const currentVolMean = volSmaArr.length > 0 ? volSmaArr[volSmaArr.length - 1] : 0;
  const isVolSpike = hasVolume && currentVolMean > 0 ? (currentBar.volume || 0) > currentVolMean * 1.2 : false;

  // 9. VWAP
  const vwapArr = calculateVWAP(relevantCandles);
  const currentVwap = vwapArr[vwapArr.length - 1];

  // ── Multi-Factor Evidence Scoring ──
  let score = 0;
  let scoreMax = 5 + (hasVolume ? 1 : 0) + 1; // Base 5 + volume(1) + vwap(1) = 7

  let factorTrend = false;
  let factorRsi = false;
  let factorMacdPos = false;
  let factorMacdAccel = false;
  let factorAdx = false;
  let factorVwap = false;

  if (targetDir === 1) {
    if (currentBar.close > currTrend) { score += 1; factorTrend = true; }
    if (currentRsi > 50 && currentRsi < 75) { score += 1; factorRsi = true; }
    if (currHist > 0) { score += 1; factorMacdPos = true; }
    if (currHist > prevHist) { score += 1; factorMacdAccel = true; }
    if (isTrending && currPlusDI > currMinusDI) { score += 1; factorAdx = true; }
    if (isVolSpike) { score += 1; }
    if (currentBar.close > currentVwap) { score += 1; factorVwap = true; }
  } else {
    if (currentBar.close < currTrend) { score += 1; factorTrend = true; }
    if (currentRsi < 50 && currentRsi > 25) { score += 1; factorRsi = true; }
    if (currHist < 0) { score += 1; factorMacdPos = true; }
    if (currHist < prevHist) { score += 1; factorMacdAccel = true; }
    if (isTrending && currMinusDI > currPlusDI) { score += 1; factorAdx = true; }
    if (isVolSpike) { score += 1; }
    if (currentBar.close < currentVwap) { score += 1; factorVwap = true; }
  }

  const scoreRatio = score / scoreMax;
  const grade = getPrecisionSniperGrade(scoreRatio);

  // Filter 1: Hide C Grade (requires ratio >= 0.50)
  const hideC = config.hideC !== false;
  if (hideC && scoreRatio < 0.50) return emptySignal;

  // Filter 2: Grade Filter
  const gradeFilter = config.gradeFilter || "All";
  if (gradeFilter === "A+ Only" && grade !== "A+") return emptySignal;
  if (gradeFilter === "A+ and A" && grade !== "A+" && grade !== "A") return emptySignal;

  // Filter 3: Minimum Score Threshold (normalized to profile.minScore)
  if (score < (profile.minScore / 10) * scoreMax) return emptySignal;

  // ── Execution Plan (makePlan) ──
  const e = currentBar.close;
  const atrDistance = currentAtr * profile.slMult * stopMultiplier;
  const atrStop = targetDir === 1 ? e - atrDistance : e + atrDistance;

  // Window Structure (Swing Lookback default 10 bars)
  const swingLookback = config.swingLookback || 10;
  const structureWindow = relevantCandles.slice(-Math.min(swingLookback + 1, relevantCandles.length));
  const swingLow = Math.min(...structureWindow.map((c) => c.low));
  const swingHigh = Math.max(...structureWindow.map((c) => c.high));

  const structStop = targetDir === 1 ? swingLow - currentAtr * 0.2 : swingHigh + currentAtr * 0.2;

  const structureInput = config.structureInput !== false;
  const rawStop = structureInput
    ? (targetDir === 1 ? Math.min(atrStop, structStop) : Math.max(atrStop, structStop))
    : atrStop;

  const STRUCTURE_CAP = 1.5;
  const isCapped = structureInput && Math.abs(e - rawStop) > atrDistance * STRUCTURE_CAP;
  const boundedStop = isCapped ? e - targetDir * atrDistance * STRUCTURE_CAP : rawStop;

  const finalStop = boundedStop;
  const initialRisk = Math.abs(e - finalStop);

  if (initialRisk <= 0) return emptySignal;

  const tp1Mult = config.tp1R || 1.0;
  const tp2Mult = config.tp2R || 2.0;
  const tp3Mult = config.tp3R || 3.0;

  const tp1 = e + targetDir * initialRisk * tp1Mult;
  const tp2 = e + targetDir * initialRisk * tp2Mult;
  const tp3 = e + targetDir * initialRisk * tp3Mult;

  const origin: "ATR" | "Structure" | "ATR capped" = !structureInput
    ? "ATR"
    : isCapped
    ? "ATR capped"
    : rawStop !== atrStop
    ? "Structure"
    : "ATR";

  const regimeName = !isTrending
    ? `Range (ADX ${currentADX.toFixed(0)})`
    : targetDir === 1
    ? "Trend Bullish"
    : "Trend Bearish";

  const sideStr = targetDir === 1 ? "LONG" : "SHORT";
  const factorList = [
    factorTrend ? "Trend55" : null,
    factorRsi ? "RSI" : null,
    factorMacdPos ? "MACD" : null,
    factorMacdAccel ? "Accel" : null,
    factorAdx ? `ADX(${currentADX.toFixed(0)})` : null,
    isVolSpike ? "VolSpike" : null,
    factorVwap ? "VWAP" : null,
  ].filter(Boolean).join("+");

  const reason = `[${grade}] EMA ${profile.fastLen}/${profile.slowLen} Cross + Momentum | Score ${score.toFixed(1)}/${scoreMax} | ${factorList} | ${origin} SL`;

  return {
    signal: targetDir === 1 ? "BUY" : "SELL",
    entry_px: e,
    sl_px: finalStop,
    tp1_px: tp1,
    tp2_px: tp2,
    tp3_px: tp3,
    risk: initialRisk,
    score,
    scoreMax,
    scoreRatio,
    grade,
    regime: regimeName,
    origin,
    trigger_reason: reason,
    factors: {
      trendAligned: factorTrend,
      rsiInRange: factorRsi,
      macdPositive: factorMacdPos,
      macdAccelerating: factorMacdAccel,
      adxTrending: factorAdx,
      volumeSpike: isVolSpike,
      vwapAligned: factorVwap,
    },
  };
}
