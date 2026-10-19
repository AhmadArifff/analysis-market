/**
 * Bar Replay & Quantitative Backtest Simulation Engine
 * Executes exact liquidity sweep algorithms candle-by-candle with zero look-ahead bias.
 */

import { Candle, findFractals, calculateEMA, calculateRSI } from "./indicators";
import { evaluateExhaustion } from "./exhaustion";

export type TradeDirectionFilter = "AUTO" | "LONG" | "SHORT" | "ALL";

export interface ActivePosition {
  trade_id: number;
  symbol: string;
  side: "LONG" | "SHORT";
  entry_time: string | number;
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
  entry_time: string | number;
  entry_px: number;
  sl_px: number;
  tp_px: number;
  exit_time: string | number;
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
 * Evaluates a single bar step in the replay simulation with institutional trend confluence
 */
export function stepReplaySimulation(
  allCandles: Candle[],
  currentIndex: number,
  currentPosition: ActivePosition | null,
  symbol: string,
  timeframe: string = "4h",
  directionFilter: TradeDirectionFilter = "AUTO",
  minWickRatio: number = 0.20,
  riskRewardRatio: number = 2.0
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

  // Internal Range Liquidity (Pullback highs/lows from recent 5-8 bars)
  const pullbackLookback = Math.min(6, Math.max(3, pastCandles.length - 1));
  const recentSlice = pastCandles.slice(-pullbackLookback);
  const recentMinLow = recentSlice.length > 0 ? Math.min(...recentSlice.map((c) => c.low)) : (lastLow?.price || 0);
  const recentMaxHigh = recentSlice.length > 0 ? Math.max(...recentSlice.map((c) => c.high)) : (lastHigh?.price || Infinity);

  const activePools: {
    pool_id: number;
    pool_type: "BUY_SL" | "SELL_SL";
    pool_price: number;
    retail_rr: number;
    status: "SWEPT" | "PENDING";
    swept_ago?: string | null;
  }[] = [];

  // Add recent swing lows & pullback low as Buy SL pools
  const effectiveLow = Math.max(recentMinLow, lastLow ? lastLow.price : 0);
  if (effectiveLow > 0) {
    const isSwept = currentBar.low <= effectiveLow;
    activePools.push({
      pool_id: 101,
      pool_type: "BUY_SL",
      pool_price: parseFloat(effectiveLow.toFixed(effectiveLow < 1 ? 6 : 2)),
      retail_rr: 1.85,
      status: isSwept ? "SWEPT" : "PENDING",
      swept_ago: isSwept ? `Swept at bar ${currentIndex}` : null,
    });
  }

  // Add recent swing highs & pullback high as Sell SL pools
  const effectiveHigh = Math.min(recentMaxHigh, lastHigh ? lastHigh.price : Infinity);
  if (effectiveHigh < Infinity) {
    const isSwept = currentBar.high >= effectiveHigh;
    activePools.push({
      pool_id: 201,
      pool_type: "SELL_SL",
      pool_price: parseFloat(effectiveHigh.toFixed(effectiveHigh < 1 ? 6 : 2)),
      retail_rr: 2.1,
      status: isSwept ? "SWEPT" : "PENDING",
      swept_ago: isSwept ? `Swept at bar ${currentIndex}` : null,
    });
  }

  // 3. Compute Macro Trend Confluence (EMA) and Time-Bar Exhaustion
  const closes = pastCandles.map((c) => c.close);
  const emaPeriod = Math.min(21, Math.max(5, Math.floor(pastCandles.length / 2)));
  const emaVals = calculateEMA(closes, emaPeriod);
  const currentEma = emaVals[emaVals.length - 1] || currentBar.close;
  const isUptrend = currentBar.close >= currentEma;

  const rsiVals = calculateRSI(closes, 5);
  const fastRsi = rsiVals[rsiVals.length - 1] || 50;

  let consecutiveBars = 1;
  if (pastCandles.length >= 2) {
    const lastBar = pastCandles[pastCandles.length - 1];
    const isBull = lastBar.close >= lastBar.open;
    for (let k = pastCandles.length - 2; k >= 0; k--) {
      if ((pastCandles[k].close >= pastCandles[k].open) === isBull) {
        consecutiveBars++;
      } else {
        break;
      }
    }
  }

  // 4. If no active position, evaluate Liquidity Sweep Entry with Confluence Guards
  if (!activePos) {
    const range = currentBar.high - currentBar.low;
    if (range > 0) {
      const lowerWick = Math.min(currentBar.open, currentBar.close) - currentBar.low;
      const upperWick = currentBar.high - Math.max(currentBar.open, currentBar.close);
      const lowerWickRatio = lowerWick / range;
      const upperWickRatio = upperWick / range;

      // Buy SL Sweep Condition (Price dips below recent low/pullback to sweep retail stops, then rejects up)
      const buySweepLevel = Math.max(recentMinLow, lastLow ? lastLow.price : 0);
      const isBuySweep =
        currentBar.low < buySweepLevel &&
        currentBar.close > buySweepLevel &&
        lowerWickRatio >= minWickRatio;

      // Sell SL Sweep Condition (Price spikes above recent high/pullback to sweep retail stops, then rejects down)
      const sellSweepLevel = Math.min(recentMaxHigh, lastHigh ? lastHigh.price : Infinity);
      const isSellSweep =
        currentBar.high > sellSweepLevel &&
        currentBar.close < sellSweepLevel &&
        upperWickRatio >= minWickRatio;

      let allowLong = false;
      let allowShort = false;

      if (directionFilter === "LONG") {
        allowLong = isBuySweep;
      } else if (directionFilter === "SHORT") {
        allowShort = isSellSweep;
      } else if (directionFilter === "AUTO") {
        // Confluence Protocol (C-QUANT-07 & PRD 4.1):
        // In Uptrend: Trend-confluent dip buy is primary. Counter-trend shorts ONLY on Exhaustion Climax.
        if (isUptrend) {
          allowLong = isBuySweep;
          allowShort = isSellSweep && (fastRsi >= 72 || consecutiveBars >= 4 || upperWickRatio >= minWickRatio * 1.5);
        } else {
          // In Downtrend: Trend-confluent rally sell is primary. Counter-trend longs ONLY on Exhaustion Climax.
          allowShort = isSellSweep;
          allowLong = isBuySweep && (fastRsi <= 28 || consecutiveBars >= 4 || lowerWickRatio >= minWickRatio * 1.5);
        }
      } else {
        // ALL (Bi-directional)
        allowLong = isBuySweep;
        allowShort = isSellSweep;
      }

      // Execute LONG
      if (allowLong) {
        const risk = Math.max(currentBar.close - currentBar.low, currentBar.close * 0.005);
        const sl = currentBar.low - risk * 0.1;
        const targetDistance = (currentBar.close - sl) * riskRewardRatio;
        const tp =
          lastHigh && lastHigh.price > currentBar.close
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
          confluence_score: isUptrend ? 90 : 80,
          swept_pool_price: buySweepLevel,
          setup_type: isUptrend ? "TREND_DIP_BUY_SL_SWEEP" : "COUNTER_EXHAUSTION_BUY_SL_SWEEP",
        };

        const pool = activePools.find((p) => p.pool_type === "BUY_SL");
        if (pool) pool.status = "SWEPT";

        alertMessage = `🚨 LIQUIDITY SWEEP ENTRY! LONG @ $${activePos.entry_px} (SL: $${activePos.sl_px}, TP: $${activePos.tp_px}) [${isUptrend ? "Trend-Confluent" : "Exhaustion Climax"}]`;
      }
      // Execute SHORT
      else if (allowShort) {
        const risk = Math.max(currentBar.high - currentBar.close, currentBar.close * 0.005);
        const sl = currentBar.high + risk * 0.1;
        const targetDistance = (sl - currentBar.close) * riskRewardRatio;
        const tp =
          lastLow && lastLow.price < currentBar.close
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
          confluence_score: !isUptrend ? 90 : 80,
          swept_pool_price: sellSweepLevel,
          setup_type: !isUptrend ? "TREND_RALLY_SELL_SL_SWEEP" : "COUNTER_EXHAUSTION_SELL_SL_SWEEP",
        };

        const pool = activePools.find((p) => p.pool_type === "SELL_SL");
        if (pool) pool.status = "SWEPT";

        alertMessage = `🚨 LIQUIDITY SWEEP ENTRY! SHORT @ $${activePos.entry_px} (SL: $${activePos.sl_px}, TP: $${activePos.tp_px}) [${!isUptrend ? "Trend-Confluent" : "Exhaustion Climax"}]`;
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
  timeframe: string = "4h",
  directionFilter: TradeDirectionFilter = "AUTO",
  minWickRatio: number = 0.20,
  riskRewardRatio: number = 2.0
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
    const result = stepReplaySimulation(
      candles,
      i,
      currentPos,
      symbol,
      timeframe,
      directionFilter,
      minWickRatio,
      riskRewardRatio
    );
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
