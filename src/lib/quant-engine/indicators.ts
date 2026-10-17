/**
 * Quantitative Technical Indicators Engine
 * Deterministic mathematical formulas for ATR, EMA, ADX, RSI, and Williams Fractals.
 */

export interface Candle {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface FractalPoint {
  index: number;
  time: string;
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
