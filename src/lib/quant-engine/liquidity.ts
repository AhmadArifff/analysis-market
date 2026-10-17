import { Candle, findFractals, FractalPoint } from "./indicators";

export interface MappedLiquidityPool {
  pool_id: number;
  pool_type: "BUY_SL" | "SELL_SL";
  pool_price: number;
  retail_rr: number;
  status: "SWEPT" | "PENDING";
  swept_at?: string | null;
  wick_ratio?: number;
  rvol?: number;
}

export interface SweepSignal {
  symbol: string;
  is_valid_sweep: boolean;
  direction: "BUY_AFTER_SWEEP" | "SELL_AFTER_SWEEP" | "NO_SIGNAL";
  entry_price: number;
  stop_loss: number;
  take_profit: number;
  risk_reward_ratio: number;
  swept_pool_price: number;
  wick_ratio: number;
  rvol: number;
}

/**
 * Maps Retail Liquidity Traps and Detects Rejection Wick Sweeps
 */
export function mapLiquidityAndSweeps(candles: Candle[], symbol: string): {
  pools: MappedLiquidityPool[];
  signal: SweepSignal;
} {
  const fractals = findFractals(candles);
  const pools: MappedLiquidityPool[] = [];

  // Identify most recent swing highs and swing lows
  const swingHighs = fractals.filter((f) => f.type === "SWING_HIGH");
  const swingLows = fractals.filter((f) => f.type === "SWING_LOW");

  const lastHigh = swingHighs[swingHighs.length - 1];
  const lastLow = swingLows[swingLows.length - 1];

  if (lastLow) {
    pools.push({
      pool_id: 101,
      pool_type: "BUY_SL", // Retail buyer stop-losses cluster below recent swing low
      pool_price: lastLow.price,
      retail_rr: 1.85,
      status: "PENDING",
    });
  }

  if (lastHigh) {
    pools.push({
      pool_id: 102,
      pool_type: "SELL_SL", // Retail seller stop-losses cluster above recent swing high
      pool_price: lastHigh.price,
      retail_rr: 2.1,
      status: "PENDING",
    });
  }

  // Check the latest 3 candles for Liquidity Sweep confirmation
  const recentCandles = candles.slice(-3);
  let signal: SweepSignal = {
    symbol,
    is_valid_sweep: false,
    direction: "NO_SIGNAL",
    entry_price: candles[candles.length - 1]?.close || 0,
    stop_loss: 0,
    take_profit: 0,
    risk_reward_ratio: 0,
    swept_pool_price: 0,
    wick_ratio: 0,
    rvol: 1.0,
  };

  // Calculate 20-period average volume for RVOL
  const vols = candles.slice(-20).map((c) => c.volume || 1);
  const avgVol = vols.reduce((a, b) => a + b, 0) / vols.length || 1;

  for (const candle of recentCandles) {
    const candleRange = candle.high - candle.low;
    if (candleRange <= 0) continue;

    const lowerWick = Math.min(candle.open, candle.close) - candle.low;
    const upperWick = candle.high - Math.max(candle.open, candle.close);
    const lowerWickRatio = lowerWick / candleRange;
    const upperWickRatio = upperWick / candleRange;
    const rvol = (candle.volume || 1) / avgVol;

    // 1. Bullish Sweep of Buy Stop-Loss Pool (Breached Low, then rejected back up)
    if (lastLow && candle.low < lastLow.price && candle.close > lastLow.price) {
      if (lowerWickRatio >= 0.28) {
        const pool = pools.find((p) => p.pool_id === 101);
        if (pool) {
          pool.status = "SWEPT";
          pool.swept_at = candle.time;
          pool.wick_ratio = parseFloat(lowerWickRatio.toFixed(2));
          pool.rvol = parseFloat(rvol.toFixed(2));
        }

        const sl = candle.low - (lastHigh ? (lastHigh.price - candle.low) * 0.05 : 2.0);
        const tp = lastHigh ? lastHigh.price : candle.close * 1.02;
        const rr = (tp - candle.close) / (candle.close - sl);

        signal = {
          symbol,
          is_valid_sweep: true,
          direction: "BUY_AFTER_SWEEP",
          entry_price: candle.close,
          stop_loss: parseFloat(sl.toFixed(2)),
          take_profit: parseFloat(tp.toFixed(2)),
          risk_reward_ratio: parseFloat(rr.toFixed(2)),
          swept_pool_price: lastLow.price,
          wick_ratio: parseFloat(lowerWickRatio.toFixed(2)),
          rvol: parseFloat(rvol.toFixed(2)),
        };
      }
    }

    // 2. Bearish Sweep of Sell Stop-Loss Pool (Breached High, then rejected back down)
    if (lastHigh && candle.high > lastHigh.price && candle.close < lastHigh.price) {
      if (upperWickRatio >= 0.28) {
        const pool = pools.find((p) => p.pool_id === 102);
        if (pool) {
          pool.status = "SWEPT";
          pool.swept_at = candle.time;
          pool.wick_ratio = parseFloat(upperWickRatio.toFixed(2));
          pool.rvol = parseFloat(rvol.toFixed(2));
        }

        const sl = candle.high + (lastLow ? (candle.high - lastLow.price) * 0.05 : 2.0);
        const tp = lastLow ? lastLow.price : candle.close * 0.98;
        const rr = (candle.close - tp) / (sl - candle.close);

        signal = {
          symbol,
          is_valid_sweep: true,
          direction: "SELL_AFTER_SWEEP",
          entry_price: candle.close,
          stop_loss: parseFloat(sl.toFixed(2)),
          take_profit: parseFloat(tp.toFixed(2)),
          risk_reward_ratio: parseFloat(rr.toFixed(2)),
          swept_pool_price: lastHigh.price,
          wick_ratio: parseFloat(upperWickRatio.toFixed(2)),
          rvol: parseFloat(rvol.toFixed(2)),
        };
      }
    }
  }

  return { pools, signal };
}
