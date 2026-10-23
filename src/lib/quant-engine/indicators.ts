/**
 * Quantitative Technical Indicators Engine
 * Deterministic mathematical formulas for ATR, EMA, ADX, RSI, and Williams Fractals.
 */

export interface Candle {
  time: string | number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface FractalPoint {
  index: number;
  time: string | number;
  type: "SWING_HIGH" | "SWING_LOW";
  price: number;
}

/**
 * Calculates Wilder's Average True Range (ATR)
 */
export function calculateATR(candles: Candle[], period: number = 14): number[] {
  if (candles.length < 2) return [];

  const tr: number[] = [candles[0].high - candles[0].low];

  for (let i = 1; i < candles.length; i++) {
    const current = candles[i];
    const prevClose = candles[i - 1].close;
    const trueRange = Math.max(
      current.high - current.low,
      Math.abs(current.high - prevClose),
      Math.abs(current.low - prevClose)
    );
    tr.push(trueRange);
  }

  // Calculate smoothed ATR
  const atr: number[] = [];
  let sumFirst = 0;

  for (let i = 0; i < Math.min(period, tr.length); i++) {
    sumFirst += tr[i];
  }

  let prevAtr = sumFirst / period;
  atr.push(prevAtr);

  for (let i = period; i < tr.length; i++) {
    const currentAtr = (prevAtr * (period - 1) + tr[i]) / period;
    atr.push(currentAtr);
    prevAtr = currentAtr;
  }

  return atr;
}

/**
 * Calculates Exponential Moving Average (EMA)
 */
export function calculateEMA(data: number[], period: number): number[] {
  if (data.length < period) return [];

  const k = 2 / (period + 1);
  const ema: number[] = [];

  // Initial SMA
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += data[i];
  }
  let prevEma = sum / period;
  ema.push(prevEma);

  for (let i = period; i < data.length; i++) {
    const currentEma = data[i] * k + prevEma * (1 - k);
    ema.push(currentEma);
    prevEma = currentEma;
  }

  return ema;
}

/**
 * Calculates Fast RSI (Default Period 5 for Exhaustion Detection)
 */
export function calculateRSI(closes: number[], period: number = 5): number[] {
  if (closes.length <= period) return [];

  const gains: number[] = [];
  const losses: number[] = [];

  for (let i = 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    gains.push(diff > 0 ? diff : 0);
    losses.push(diff < 0 ? Math.abs(diff) : 0);
  }

  let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;

  const rsi: number[] = [];
  let rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  rsi.push(100 - 100 / (1 + rs));

  for (let i = period; i < gains.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
    rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    rsi.push(100 - 100 / (1 + rs));
  }

  return rsi;
}

/**
 * Calculates Average Directional Index (ADX) using Wilder's smoothing.
 * ADX measures trend strength regardless of direction:
 *   < 20: ranging/choppy, 20-40: trending, > 40: strong trend
 */
export function calculateADX(candles: Candle[], period: number = 14): number[] {
  if (candles.length < period * 2 + 1) return [];

  const plusDM: number[] = [];
  const minusDM: number[] = [];
  const tr: number[] = [];

  for (let i = 1; i < candles.length; i++) {
    const highDiff = candles[i].high - candles[i - 1].high;
    const lowDiff = candles[i - 1].low - candles[i].low;

    plusDM.push(highDiff > lowDiff && highDiff > 0 ? highDiff : 0);
    minusDM.push(lowDiff > highDiff && lowDiff > 0 ? lowDiff : 0);

    const trueRange = Math.max(
      candles[i].high - candles[i].low,
      Math.abs(candles[i].high - candles[i - 1].close),
      Math.abs(candles[i].low - candles[i - 1].close)
    );
    tr.push(trueRange);
  }

  const wilderSmooth = (data: number[], p: number): number[] => {
    const smoothed: number[] = [];
    let sum = 0;
    for (let i = 0; i < p; i++) sum += data[i];
    smoothed.push(sum);
    for (let i = p; i < data.length; i++) {
      smoothed.push(smoothed[smoothed.length - 1] - smoothed[smoothed.length - 1] / p + data[i]);
    }
    return smoothed;
  };

  const smoothTR = wilderSmooth(tr, period);
  const smoothPlusDM = wilderSmooth(plusDM, period);
  const smoothMinusDM = wilderSmooth(minusDM, period);

  const dx: number[] = [];
  for (let i = 0; i < smoothTR.length; i++) {
    if (smoothTR[i] === 0) {
      dx.push(0);
      continue;
    }
    const plusDI = (smoothPlusDM[i] / smoothTR[i]) * 100;
    const minusDI = (smoothMinusDM[i] / smoothTR[i]) * 100;
    const diSum = plusDI + minusDI;
    dx.push(diSum === 0 ? 0 : (Math.abs(plusDI - minusDI) / diSum) * 100);
  }

  if (dx.length < period) return [];

  const adx: number[] = [];
  let adxSum = 0;
  for (let i = 0; i < period; i++) adxSum += dx[i];
  let prevADX = adxSum / period;
  adx.push(prevADX);

  for (let i = period; i < dx.length; i++) {
    const currentADX = (prevADX * (period - 1) + dx[i]) / period;
    adx.push(currentADX);
    prevADX = currentADX;
  }

  return adx;
}

/**
 * Approximates Volume Delta (buying vs selling pressure) from OHLC data.
 * Positive delta = buying pressure dominant, Negative = selling dominant.
 */
export function calculateVolumeDelta(candles: Candle[]): number[] {
  return candles.map((c) => {
    const range = c.high - c.low;
    if (range <= 0 || !c.volume) return 0;
    const buyRatio = (c.close - c.low) / range;
    const buyVolume = c.volume * buyRatio;
    const sellVolume = c.volume * (1 - buyRatio);
    return buyVolume - sellVolume;
  });
}

/**
 * Cumulative Volume Delta over a lookback window
 */
export function cumulativeVolumeDelta(candles: Candle[], lookback: number = 10): number {
  const deltas = calculateVolumeDelta(candles.slice(-lookback));
  return deltas.reduce((sum, d) => sum + d, 0);
}

/**
 * Detects Williams 5-Bar Fractals (Swing High and Swing Low)
 * Rule: High[i] > High[i-1], High[i-2], High[i+1], High[i+2]
 */
export function findFractals(candles: Candle[]): FractalPoint[] {
  const fractals: FractalPoint[] = [];

  for (let i = 2; i < candles.length - 2; i++) {
    const curr = candles[i];
    const prev1 = candles[i - 1];
    const prev2 = candles[i - 2];
    const next1 = candles[i + 1];
    const next2 = candles[i + 2];

    // Swing High
    if (
      curr.high > prev1.high &&
      curr.high > prev2.high &&
      curr.high > next1.high &&
      curr.high > next2.high
    ) {
      fractals.push({
        index: i,
        time: curr.time,
        type: "SWING_HIGH",
        price: curr.high,
      });
    }

    // Swing Low
    if (
      curr.low < prev1.low &&
      curr.low < prev2.low &&
      curr.low < next1.low &&
      curr.low < next2.low
    ) {
      fractals.push({
        index: i,
        time: curr.time,
        type: "SWING_LOW",
        price: curr.low,
      });
    }
  }

  return fractals;
}

/**
 * Calculates Simple Moving Average (SMA)
 */
export function calculateSMA(data: number[], period: number): number[] {
  if (data.length < period) return [];
  const sma: number[] = [];
  let sum = 0;
  for (let i = 0; i < period; i++) sum += data[i];
  sma.push(sum / period);
  for (let i = period; i < data.length; i++) {
    sum += data[i] - data[i - period];
    sma.push(sum / period);
  }
  return sma;
}

/**
 * Calculates MACD (Moving Average Convergence Divergence) and Histogram
 */
export function calculateMACD(
  data: number[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): { macd: number[]; signal: number[]; hist: number[] } {
  if (data.length < slowPeriod) {
    return { macd: [], signal: [], hist: [] };
  }
  const emaFast = calculateEMA(data, fastPeriod);
  const emaSlow = calculateEMA(data, slowPeriod);
  
  const offset = slowPeriod - fastPeriod;
  const macdLine: number[] = [];
  for (let i = 0; i < emaSlow.length; i++) {
    macdLine.push(emaFast[i + offset] - emaSlow[i]);
  }

  if (macdLine.length < signalPeriod) {
    return { macd: macdLine, signal: [], hist: [] };
  }

  const signalLine = calculateEMA(macdLine, signalPeriod);
  const sigOffset = signalPeriod - 1;
  const hist: number[] = [];
  for (let i = 0; i < signalLine.length; i++) {
    hist.push(macdLine[i + sigOffset] - signalLine[i]);
  }

  return { macd: macdLine, signal: signalLine, hist };
}

/**
 * Calculates Directional Movement Index (DMI): +DI, -DI, and ADX
 */
export function calculateDMI(candles: Candle[], period: number = 14): {
  adx: number[];
  plusDI: number[];
  minusDI: number[];
} {
  if (candles.length < period * 2 + 1) {
    return { adx: [], plusDI: [], minusDI: [] };
  }

  const plusDM: number[] = [];
  const minusDM: number[] = [];
  const tr: number[] = [];

  for (let i = 1; i < candles.length; i++) {
    const highDiff = candles[i].high - candles[i - 1].high;
    const lowDiff = candles[i - 1].low - candles[i].low;

    plusDM.push(highDiff > lowDiff && highDiff > 0 ? highDiff : 0);
    minusDM.push(lowDiff > highDiff && lowDiff > 0 ? lowDiff : 0);

    const trueRange = Math.max(
      candles[i].high - candles[i].low,
      Math.abs(candles[i].high - candles[i - 1].close),
      Math.abs(candles[i].low - candles[i - 1].close)
    );
    tr.push(trueRange);
  }

  const wilderSmooth = (data: number[], p: number): number[] => {
    const smoothed: number[] = [];
    let sum = 0;
    for (let i = 0; i < p; i++) sum += data[i];
    smoothed.push(sum);
    for (let i = p; i < data.length; i++) {
      smoothed.push(smoothed[smoothed.length - 1] - smoothed[smoothed.length - 1] / p + data[i]);
    }
    return smoothed;
  };

  const smoothTR = wilderSmooth(tr, period);
  const smoothPlusDM = wilderSmooth(plusDM, period);
  const smoothMinusDM = wilderSmooth(minusDM, period);

  const plusDIs: number[] = [];
  const minusDIs: number[] = [];
  const dx: number[] = [];

  for (let i = 0; i < smoothTR.length; i++) {
    if (smoothTR[i] === 0) {
      plusDIs.push(0);
      minusDIs.push(0);
      dx.push(0);
      continue;
    }
    const pDI = (smoothPlusDM[i] / smoothTR[i]) * 100;
    const mDI = (smoothMinusDM[i] / smoothTR[i]) * 100;
    plusDIs.push(pDI);
    minusDIs.push(mDI);
    const diSum = pDI + mDI;
    dx.push(diSum === 0 ? 0 : (Math.abs(pDI - mDI) / diSum) * 100);
  }

  if (dx.length < period) {
    return { adx: [], plusDI: plusDIs, minusDI: minusDIs };
  }

  const adx: number[] = [];
  let adxSum = 0;
  for (let i = 0; i < period; i++) adxSum += dx[i];
  let prevADX = adxSum / period;
  adx.push(prevADX);

  for (let i = period; i < dx.length; i++) {
    const currentADX = (prevADX * (period - 1) + dx[i]) / period;
    adx.push(currentADX);
    prevADX = currentADX;
  }

  return { adx, plusDI: plusDIs, minusDI: minusDIs };
}

/**
 * Calculates Volume Weighted Average Price (VWAP)
 */
export function calculateVWAP(candles: Candle[]): number[] {
  let cumTypicalVol = 0;
  let cumVol = 0;
  return candles.map((c) => {
    const typical = (c.high + c.low + c.close) / 3;
    const vol = c.volume && c.volume > 0 ? c.volume : 1;
    cumTypicalVol += typical * vol;
    cumVol += vol;
    return cumVol > 0 ? cumTypicalVol / cumVol : c.close;
  });
}

