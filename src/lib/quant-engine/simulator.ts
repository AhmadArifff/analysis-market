/**
 * Bar Replay & Quantitative Backtest Simulation Engine
 * Executes exact liquidity sweep algorithms candle-by-candle with zero look-ahead bias.
 */

import { Candle, findFractals } from "./indicators";
import { evaluateExhaustion } from "./exhaustion";

export interface ActivePosition {
  trade_id: number;
  symbol: string;
  side: "LONG" | "SHORT";
  entry_time: string;
  entry_index: number;
  entry_px: number;
  sl_px: number;
  tp_px: number;
  confluence_score: number;
  swept_pool_price: number;
  setup_type: string;
}

export interface ReplayTrade {
  trade_id: number;
  asset: string;
  timeframe: string;
  side: "LONG" | "SHORT";
  entry_time: string;
  entry_px: number;
  sl_px: number;
  tp_px: number;
  exit_time: string;
  exit_px: number;
  confluence_score: number;
  setup_type: string;
  pnl_pct: number;
  result: "WIN" | "LOSS";
  notes: string;
}

export interface SimulationStepResult {
  closedTrade: ReplayTrade | null;
  newPosition: ActivePosition | null;
  activePools: {
    pool_id: number;
    pool_type: "BUY_SL" | "SELL_SL";
    pool_price: number;
    retail_rr: number;
    status: "SWEPT" | "PENDING";
  }[];
  sweepAlert: string | null;
}

/**
 * Evaluates a single bar step in the replay simulation
 */
export function stepReplaySimulation(
  allCandles: Candle[],
  currentIndex: number,
  currentPosition: ActivePosition | null,
  symbol: string,
  timeframe: string = "4h"
): SimulationStepResult {
  if (currentIndex < 5 || currentIndex >= allCandles.length) {
    return {
      closedTrade: null,
      newPosition: currentPosition,
      activePools: [],
      sweepAlert: null,
    };
  }

  const currentBar = allCandles[currentIndex];
  let closedTrade: ReplayTrade | null = null;
  let activePos: ActivePosition | null = currentPosition;
  let alertMessage: string | null = null;

  // 1. If an active trade is open, check if current bar hits TP or SL
  if (activePos) {
    if (activePos.side === "LONG") {
      // Check SL hit (worst case first for realistic backtesting)
      if (currentBar.low <= activePos.sl_px) {
        const pnl = ((activePos.sl_px - activePos.entry_px) / activePos.entry_px) * 100;
        closedTrade = {
          trade_id: activePos.trade_id,
          asset: symbol,
          timeframe,
          side: "LONG",
          entry_time: activePos.entry_time,
          entry_px: activePos.entry_px,
          sl_px: activePos.sl_px,
          tp_px: activePos.tp_px,
          exit_time: currentBar.time,
          exit_px: activePos.sl_px,
          confluence_score: activePos.confluence_score,
          setup_type: activePos.setup_type,
          pnl_pct: parseFloat(pnl.toFixed(2)),
          result: "LOSS",
          notes: `Stopped out @ $${activePos.sl_px}`,
        };
        activePos = null;
        alertMessage = `STOP LOSS HIT (LONG @ $${currentBar.low})! Result: ${pnl.toFixed(2)}%`;
      } else if (currentBar.high >= activePos.tp_px) {
        // Check TP hit
        const pnl = ((activePos.tp_px - activePos.entry_px) / activePos.entry_px) * 100;
        closedTrade = {
          trade_id: activePos.trade_id,
          asset: symbol,
          timeframe,
          side: "LONG",
          entry_time: activePos.entry_time,
          entry_px: activePos.entry_px,
          sl_px: activePos.sl_px,
          tp_px: activePos.tp_px,
          exit_time: currentBar.time,
          exit_px: activePos.tp_px,
          confluence_score: activePos.confluence_score,
          setup_type: activePos.setup_type,
          pnl_pct: parseFloat(pnl.toFixed(2)),
          result: "WIN",
          notes: `Take Profit hit @ $${activePos.tp_px}`,
        };
        activePos = null;
        alertMessage = `TAKE PROFIT HIT (LONG @ $${currentBar.high})! Result: +${pnl.toFixed(2)}%`;
      }
    } else if (activePos.side === "SHORT") {
      // Check SL hit
      if (currentBar.high >= activePos.sl_px) {
        const pnl = ((activePos.entry_px - activePos.sl_px) / activePos.entry_px) * 100;
        closedTrade = {
          trade_id: activePos.trade_id,
          asset: symbol,
          timeframe,
          side: "SHORT",
          entry_time: activePos.entry_time,
          entry_px: activePos.entry_px,
          sl_px: activePos.sl_px,
          tp_px: activePos.tp_px,
          exit_time: currentBar.time,
          exit_px: activePos.sl_px,
          confluence_score: activePos.confluence_score,
          setup_type: activePos.setup_type,
          pnl_pct: parseFloat(pnl.toFixed(2)),
          result: "LOSS",
          notes: `Stopped out @ $${activePos.sl_px}`,
        };
        activePos = null;
        alertMessage = `STOP LOSS HIT (SHORT @ $${currentBar.high})! Result: ${pnl.toFixed(2)}%`;
      } else if (currentBar.low <= activePos.tp_px) {
        // Check TP hit
        const pnl = ((activePos.entry_px - activePos.tp_px) / activePos.entry_px) * 100;
        closedTrade = {
          trade_id: activePos.trade_id,
          asset: symbol,
          timeframe,
          side: "SHORT",
          entry_time: activePos.entry_time,
          entry_px: activePos.entry_px,
          sl_px: activePos.sl_px,
          tp_px: activePos.tp_px,
          exit_time: currentBar.time,
          exit_px: activePos.tp_px,
          confluence_score: activePos.confluence_score,
          setup_type: activePos.setup_type,
          pnl_pct: parseFloat(pnl.toFixed(2)),
          result: "WIN",
          notes: `Take Profit hit @ $${activePos.tp_px}`,
        };
        activePos = null;
        alertMessage = `TAKE PROFIT HIT (SHORT @ $${currentBar.low})! Result: +${pnl.toFixed(2)}%`;
      }
    }
  }

  // 2. Compute fractals and liquidity pools strictly on past bars (0 .. currentIndex - 1)
  const pastCandles = allCandles.slice(0, currentIndex);
  const fractals = findFractals(pastCandles);
  const swingHighs = fractals.filter((f) => f.type === "SWING_HIGH");
  const swingLows = fractals.filter((f) => f.type === "SWING_LOW");

  const lastHigh = swingHighs[swingHighs.length - 1];
  const lastLow = swingLows[swingLows.length - 1];

  const activePools: {
    pool_id: number;
    pool_type: "BUY_SL" | "SELL_SL";
    pool_price: number;
    retail_rr: number;
    status: "SWEPT" | "PENDING";
    swept_ago?: string | null;
  }[] = [];

  // Add recent swing lows as Buy SL pools
  swingLows.slice(-2).forEach((low, idx) => {
    const isSwept = currentBar.low <= low.price;
    activePools.push({
      pool_id: 100 + idx,
      pool_type: "BUY_SL",
      pool_price: parseFloat(low.price.toFixed(low.price < 1 ? 6 : 2)),
      retail_rr: 1.85 + idx * 0.25,
      status: isSwept ? "SWEPT" : "PENDING",
      swept_ago: isSwept ? `Swept at bar ${currentIndex}` : null,
    });
  });

  // Add recent swing highs as Sell SL pools
  swingHighs.slice(-2).forEach((high, idx) => {
    const isSwept = currentBar.high >= high.price;
    activePools.push({
      pool_id: 200 + idx,
      pool_type: "SELL_SL",
      pool_price: parseFloat(high.price.toFixed(high.price < 1 ? 6 : 2)),
      retail_rr: 2.1 + idx * 0.3,
      status: isSwept ? "SWEPT" : "PENDING",
      swept_ago: isSwept ? `Swept at bar ${currentIndex}` : null,
    });
  });

  // 3. If no active position, check if current bar triggers a valid Liquidity Sweep Entry!
  if (!activePos) {
    const range = currentBar.high - currentBar.low;
    if (range > 0) {
      const lowerWick = Math.min(currentBar.open, currentBar.close) - currentBar.low;
      const upperWick = currentBar.high - Math.max(currentBar.open, currentBar.close);
      const lowerWickRatio = lowerWick / range;
      const upperWickRatio = upperWick / range;

      // Condition A: Bullish Sweep of Retail Buy Stop-Loss
      // Price pushed lower than swing low, but rejected and closed back above the swing low
      if (lastLow && currentBar.low < lastLow.price && currentBar.close > lastLow.price) {
        if (lowerWickRatio >= 0.20) {
          const risk = Math.max(currentBar.close - currentBar.low, currentBar.close * 0.005);
          const sl = currentBar.low - risk * 0.1;
          // Target minimum RR 1:2, or the opposing swing high
          const targetDistance = (currentBar.close - sl) * 2;
          const tp = (lastHigh && lastHigh.price > currentBar.close)
            ? Math.max(lastHigh.price, currentBar.close + targetDistance)
            : currentBar.close + targetDistance;

          activePos = {
            trade_id: Date.now() + Math.floor(Math.random() * 1000),
            symbol,
            side: "LONG",
            entry_time: currentBar.time,
            entry_index: currentIndex,
            entry_px: parseFloat(currentBar.close.toFixed(currentBar.close < 1 ? 6 : 2)),
            sl_px: parseFloat(sl.toFixed(currentBar.close < 1 ? 6 : 2)),
            tp_px: parseFloat(tp.toFixed(currentBar.close < 1 ? 6 : 2)),
            confluence_score: 85,
            swept_pool_price: lastLow.price,
            setup_type: "RETAIL_BUY_SL_SWEEP",
          };

          const pool = activePools.find((p) => p.pool_type === "BUY_SL");
          if (pool) pool.status = "SWEPT";

          alertMessage = `🚨 LIQUIDITY SWEEP ENTRY! LONG @ $${activePos.entry_px} (SL: $${activePos.sl_px}, TP: $${activePos.tp_px})`;
        }
      }

      // Condition B: Bearish Sweep of Retail Sell Stop-Loss
      // Price pushed higher than swing high, but rejected and closed back below the swing high
      else if (lastHigh && currentBar.high > lastHigh.price && currentBar.close < lastHigh.price) {
        if (upperWickRatio >= 0.20) {
          const risk = Math.max(currentBar.high - currentBar.close, currentBar.close * 0.005);
          const sl = currentBar.high + risk * 0.1;
          // Target minimum RR 1:2, or the opposing swing low
          const targetDistance = (sl - currentBar.close) * 2;
          const tp = (lastLow && lastLow.price < currentBar.close)
            ? Math.min(lastLow.price, currentBar.close - targetDistance)
            : currentBar.close - targetDistance;

          activePos = {
            trade_id: Date.now() + Math.floor(Math.random() * 1000),
            symbol,
            side: "SHORT",
            entry_time: currentBar.time,
            entry_index: currentIndex,
            entry_px: parseFloat(currentBar.close.toFixed(currentBar.close < 1 ? 6 : 2)),
            sl_px: parseFloat(sl.toFixed(currentBar.close < 1 ? 6 : 2)),
            tp_px: parseFloat(tp.toFixed(currentBar.close < 1 ? 6 : 2)),
            confluence_score: 85,
            swept_pool_price: lastHigh.price,
            setup_type: "RETAIL_SELL_SL_SWEEP",
          };

          const pool = activePools.find((p) => p.pool_type === "SELL_SL");
          if (pool) pool.status = "SWEPT";

          alertMessage = `🚨 LIQUIDITY SWEEP ENTRY! SHORT @ $${activePos.entry_px} (SL: $${activePos.sl_px}, TP: $${activePos.tp_px})`;
        }
      }
    }
  }

  return {
    closedTrade,
    newPosition: activePos,
    activePools,
    sweepAlert: alertMessage,
  };
}

/**
 * Runs a complete automated backtest across the entire candle history
 */
export function runFullAutomatedBacktest(
  candles: Candle[],
  symbol: string,
  timeframe: string = "4h"
): {
  trades: ReplayTrade[];
  summary: {
    total_trades: number;
    winning_trades: number;
    losing_trades: number;
    win_rate: number;
    profit_factor: number;
    net_return_pct: number;
    max_drawdown_pct: number;
  };
} {
  const trades: ReplayTrade[] = [];
  let currentPos: ActivePosition | null = null;

  for (let i = 10; i < candles.length; i++) {
    const result = stepReplaySimulation(candles, i, currentPos, symbol, timeframe);
    if (result.closedTrade) {
      trades.push(result.closedTrade);
    }
    currentPos = result.newPosition;
  }

  // Calculate summary metrics
  const winning = trades.filter((t) => t.result === "WIN");
  const losing = trades.filter((t) => t.result === "LOSS");
  const winRate = trades.length > 0 ? (winning.length / trades.length) * 100 : 0;

  const grossProfit = winning.reduce((acc, t) => acc + t.pnl_pct, 0);
  const grossLoss = Math.abs(losing.reduce((acc, t) => acc + t.pnl_pct, 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 9.99 : 1.0;
  const netReturn = grossProfit - grossLoss;

  // Max drawdown calculation
  let peak = 0;
  let maxDd = 0;
  let runningPnl = 0;

  trades.forEach((t) => {
    runningPnl += t.pnl_pct;
    if (runningPnl > peak) peak = runningPnl;
    const dd = peak - runningPnl;
    if (dd > maxDd) maxDd = dd;
  });

  return {
    trades,
    summary: {
      total_trades: trades.length,
      winning_trades: winning.length,
      losing_trades: losing.length,
      win_rate: parseFloat(winRate.toFixed(1)),
      profit_factor: parseFloat(profitFactor.toFixed(2)),
      net_return_pct: parseFloat(netReturn.toFixed(2)),
      max_drawdown_pct: parseFloat(maxDd.toFixed(1)),
    },
  };
}
