/**
 * Bar Replay & Quantitative Backtest Simulation Engine v2
 * Integrates AssetProfile adaptive thresholds, ADX trend strength gate,
 * FVG structure shift, Volume Delta, Session Killzone filter,
 * and ATR-normalized SL/TP placement.
 *
 * Executes exact liquidity sweep algorithms candle-by-candle with zero look-ahead bias.
 */

import {
  Candle,
  findFractals,
  calculateEMA,
  calculateRSI,
  calculateATR,
  calculateADX,
  cumulativeVolumeDelta,
} from "./indicators";
import { getAssetProfile, isWithinKillzone, AssetProfile } from "./assetProfile";
import { evaluateConfluence, ConfluenceInput, ConfluenceEvaluation } from "./confluence";
import { detectFVGs, updateFVGStatus, findOverlappingFVG, FairValueGap } from "./fvg";

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
  confluenceSnapshot?: ConfluenceEvaluation | null;
  activeFVGs?: FairValueGap[];
  adxValue?: number;
}

/**
 * Evaluates a single bar step in the replay simulation with adaptive confluence
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

  const profile = getAssetProfile(symbol);
  const effectiveWickRatio = Math.max(minWickRatio, profile.minWickRatio);
  const effectiveRR = Math.max(riskRewardRatio, profile.riskRewardMin);

  const currentBar = allCandles[currentIndex];
  let closedTrade: ReplayTrade | null = null;
  let activePos: ActivePosition | null = currentPosition;
  let alertMessage: string | null = null;
  let confluenceSnapshot: ConfluenceEvaluation | null = null;

  // 1. If an active trade is open, check if current bar hits TP or SL
  if (activePos) {
    if (activePos.side === "LONG") {
      if (currentBar.low <= activePos.sl_px) {
        const pnl = ((activePos.sl_px - activePos.entry_px) / activePos.entry_px) * 100;
        closedTrade = buildClosedTrade(activePos, symbol, timeframe, currentBar, activePos.sl_px, pnl, "LOSS");
        activePos = null;
        alertMessage = `STOP LOSS HIT (LONG @ $${currentBar.low})! Result: ${pnl.toFixed(2)}%`;
      } else if (currentBar.high >= activePos.tp_px) {
        const pnl = ((activePos.tp_px - activePos.entry_px) / activePos.entry_px) * 100;
        closedTrade = buildClosedTrade(activePos, symbol, timeframe, currentBar, activePos.tp_px, pnl, "WIN");
        activePos = null;
        alertMessage = `TAKE PROFIT HIT (LONG @ $${currentBar.high})! Result: +${pnl.toFixed(2)}%`;
      }
    } else if (activePos.side === "SHORT") {
      if (currentBar.high >= activePos.sl_px) {
        const pnl = ((activePos.entry_px - activePos.sl_px) / activePos.entry_px) * 100;
        closedTrade = buildClosedTrade(activePos, symbol, timeframe, currentBar, activePos.sl_px, pnl, "LOSS");
        activePos = null;
        alertMessage = `STOP LOSS HIT (SHORT @ $${currentBar.high})! Result: ${pnl.toFixed(2)}%`;
      } else if (currentBar.low <= activePos.tp_px) {
        const pnl = ((activePos.entry_px - activePos.tp_px) / activePos.entry_px) * 100;
        closedTrade = buildClosedTrade(activePos, symbol, timeframe, currentBar, activePos.tp_px, pnl, "WIN");
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

  const effectiveLow = Math.max(recentMinLow, lastLow ? lastLow.price : 0);
  if (effectiveLow > 0) {
    const isSwept = currentBar.low <= effectiveLow;
    activePools.push({
      pool_id: 101,
      pool_type: "BUY_SL",
      pool_price: fmtPrice(effectiveLow),
      retail_rr: 1.85,
      status: isSwept ? "SWEPT" : "PENDING",
      swept_ago: isSwept ? `Swept at bar ${currentIndex}` : null,
    });
  }

  const effectiveHigh = Math.min(recentMaxHigh, lastHigh ? lastHigh.price : Infinity);
  if (effectiveHigh < Infinity) {
    const isSwept = currentBar.high >= effectiveHigh;
    activePools.push({
      pool_id: 201,
      pool_type: "SELL_SL",
      pool_price: fmtPrice(effectiveHigh),
      retail_rr: 2.1,
      status: isSwept ? "SWEPT" : "PENDING",
      swept_ago: isSwept ? `Swept at bar ${currentIndex}` : null,
    });
  }

  // 3. Compute technical indicators on past bars
  const closes = pastCandles.map((c) => c.close);

  const [fastPeriod, slowPeriod] = profile.emaPeriods;
  const emaFastVals = calculateEMA(closes, Math.min(fastPeriod, Math.max(5, Math.floor(closes.length / 2))));
  const emaSlowVals = calculateEMA(closes, Math.min(slowPeriod, Math.max(10, Math.floor(closes.length / 2))));
  const currentEmaFast = emaFastVals[emaFastVals.length - 1] || currentBar.close;
  const currentEmaSlow = emaSlowVals[emaSlowVals.length - 1] || currentBar.close;
  const fastAboveSlow = currentEmaFast >= currentEmaSlow;
  const isUptrend = currentBar.close >= currentEmaFast;

  const adxValues = calculateADX(pastCandles, profile.adxPeriod);
  const currentADX = adxValues[adxValues.length - 1] || 0;

  const rsiVals = calculateRSI(closes, 5);
  const fastRsi = rsiVals[rsiVals.length - 1] || 50;

  const atrValues = calculateATR(pastCandles, 14);
  const currentATR = atrValues[atrValues.length - 1] || currentBar.close * 0.01;

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

  // Volume metrics
  const vols = pastCandles.slice(-20).map((c) => c.volume || 1);
  const avgVol = vols.reduce((a, b) => a + b, 0) / vols.length || 1;
  const currentRvol = (currentBar.volume || 1) / avgVol;
  const cvd = cumulativeVolumeDelta(pastCandles, 10);

  // FVG detection on past bars
  const rawFVGs = detectFVGs(pastCandles);
  const activeFVGs = updateFVGStatus(rawFVGs, pastCandles).filter((f) => !f.filled);

  // 4. If no active position, evaluate Liquidity Sweep Entry with Adaptive Confluence
  if (!activePos) {
    // Session Killzone Gate (Forex only)
    if (!isWithinKillzone(currentBar.time, profile.killzoneHoursUTC)) {
      return {
        closedTrade,
        newPosition: activePos,
        activePools,
        sweepAlert: alertMessage || `[KILLZONE FILTER] Outside session window for ${profile.category}`,
        confluenceSnapshot: null,
        activeFVGs,
        adxValue: round2(currentADX),
      };
    }

    // ADX Trend Strength Gate
    const adxGatePass = currentADX >= profile.adxThreshold || pastCandles.length < 30;

    const range = currentBar.high - currentBar.low;
    if (range > 0 && adxGatePass) {
      const lowerWick = Math.min(currentBar.open, currentBar.close) - currentBar.low;
      const upperWick = currentBar.high - Math.max(currentBar.open, currentBar.close);
      const lowerWickRatio = lowerWick / range;
      const upperWickRatio = upperWick / range;

      const buySweepLevel = Math.max(recentMinLow, lastLow ? lastLow.price : 0);
      const isBuySweep =
        currentBar.low < buySweepLevel &&
        currentBar.close > buySweepLevel &&
        lowerWickRatio >= effectiveWickRatio;

      const sellSweepLevel = Math.min(recentMaxHigh, lastHigh ? lastHigh.price : Infinity);
      const isSellSweep =
        currentBar.high > sellSweepLevel &&
        currentBar.close < sellSweepLevel &&
        upperWickRatio >= effectiveWickRatio;

      let allowLong = false;
      let allowShort = false;

      if (directionFilter === "LONG") {
        allowLong = isBuySweep;
      } else if (directionFilter === "SHORT") {
        allowShort = isSellSweep;
      } else if (directionFilter === "AUTO") {
        if (isUptrend) {
          allowLong = isBuySweep;
          allowShort = isSellSweep && (
            fastRsi >= profile.rsiOverbought ||
            consecutiveBars >= profile.maxConsecutiveBars ||
            upperWickRatio >= effectiveWickRatio * 1.5
          );
        } else {
          allowShort = isSellSweep;
          allowLong = isBuySweep && (
            fastRsi <= profile.rsiOversold ||
            consecutiveBars >= profile.maxConsecutiveBars ||
            lowerWickRatio >= effectiveWickRatio * 1.5
          );
        }
      } else {
        allowLong = isBuySweep;
        allowShort = isSellSweep;
      }

      // Evaluate confluence for potential LONG
      if (allowLong) {
        const fvgMatch = findOverlappingFVG(currentBar, activeFVGs, "LONG");
        const volumeDeltaAligned = cvd < 0;

        const confluenceInput: ConfluenceInput = {
          fastEmaAboveSlowEma: fastAboveSlow,
          adxValue: currentADX,
          adxThreshold: profile.adxThreshold,
          consecutiveBars,
          maxConsecutiveThreshold: profile.maxConsecutiveBars,
          fastRsi,
          rsiOverbought: profile.rsiOverbought,
          rsiOversold: profile.rsiOversold,
          entryDirection: "LONG",
          fractalPoolMapped: !!lastLow,
          retailRRVisible: buySweepLevel > 0,
          wickRatio: lowerWickRatio,
          minWickRatio: effectiveWickRatio,
          rvol: currentRvol,
          minRvol: profile.minRvol,
          hasFVGOverlap: !!fvgMatch,
          hasOrderBlock: false,
          volumeDeltaAligned,
          rvolSpike: currentRvol >= profile.minRvol,
        };

        const evaluation = evaluateConfluence(confluenceInput, profile);
        confluenceSnapshot = evaluation;

        if (evaluation.is_high_probability) {
          const sl = currentBar.close - currentATR * profile.atrSlMultiplier;
          const riskDist = currentBar.close - sl;
          const tp = currentBar.close + riskDist * effectiveRR;

          const finalTP = lastHigh && lastHigh.price > currentBar.close
            ? Math.max(lastHigh.price, tp)
            : tp;

          const actualRR = (finalTP - currentBar.close) / riskDist;
          if (actualRR >= profile.riskRewardMin) {
            activePos = {
              trade_id: Date.now() + Math.floor(Math.random() * 1000),
              symbol,
              side: "LONG",
              entry_time: currentBar.time,
              entry_index: currentIndex,
              entry_px: fmtPrice(currentBar.close),
              sl_px: fmtPrice(sl),
              tp_px: fmtPrice(finalTP),
              confluence_score: evaluation.score,
              swept_pool_price: buySweepLevel,
              setup_type: isUptrend
                ? `TREND_DIP_BUY [${profile.category}]`
                : `COUNTER_EXHAUSTION_BUY [${profile.category}]`,
            };

            const pool = activePools.find((p) => p.pool_type === "BUY_SL");
            if (pool) pool.status = "SWEPT";

            alertMessage = `LIQUIDITY SWEEP ENTRY! LONG @ $${activePos.entry_px} | Confluence: ${evaluation.score}/100 | SL: $${activePos.sl_px}, TP: $${activePos.tp_px} | ADX: ${round2(currentADX)} | ${profile.category}${fvgMatch ? " + FVG" : ""}`;
          }
        }
      }

      // Evaluate confluence for potential SHORT
      if (!activePos && allowShort) {
        const fvgMatch = findOverlappingFVG(currentBar, activeFVGs, "SHORT");
        const volumeDeltaAligned = cvd > 0;

        const confluenceInput: ConfluenceInput = {
          fastEmaAboveSlowEma: !fastAboveSlow,
          adxValue: currentADX,
          adxThreshold: profile.adxThreshold,
          consecutiveBars,
          maxConsecutiveThreshold: profile.maxConsecutiveBars,
          fastRsi,
          rsiOverbought: profile.rsiOverbought,
          rsiOversold: profile.rsiOversold,
          entryDirection: "SHORT",
          fractalPoolMapped: !!lastHigh,
          retailRRVisible: sellSweepLevel < Infinity,
          wickRatio: upperWickRatio,
          minWickRatio: effectiveWickRatio,
          rvol: currentRvol,
          minRvol: profile.minRvol,
          hasFVGOverlap: !!fvgMatch,
          hasOrderBlock: false,
          volumeDeltaAligned,
          rvolSpike: currentRvol >= profile.minRvol,
        };

        const evaluation = evaluateConfluence(confluenceInput, profile);
        confluenceSnapshot = evaluation;

        if (evaluation.is_high_probability) {
          const sl = currentBar.close + currentATR * profile.atrSlMultiplier;
          const riskDist = sl - currentBar.close;
          const tp = currentBar.close - riskDist * effectiveRR;

          const finalTP = lastLow && lastLow.price < currentBar.close
            ? Math.min(lastLow.price, tp)
            : tp;

          const actualRR = (currentBar.close - finalTP) / riskDist;
          if (actualRR >= profile.riskRewardMin) {
            activePos = {
              trade_id: Date.now() + Math.floor(Math.random() * 1000),
              symbol,
              side: "SHORT",
              entry_time: currentBar.time,
              entry_index: currentIndex,
              entry_px: fmtPrice(currentBar.close),
              sl_px: fmtPrice(sl),
              tp_px: fmtPrice(finalTP),
              confluence_score: evaluation.score,
              swept_pool_price: sellSweepLevel,
              setup_type: !isUptrend
                ? `TREND_RALLY_SELL [${profile.category}]`
                : `COUNTER_EXHAUSTION_SELL [${profile.category}]`,
            };

            const pool = activePools.find((p) => p.pool_type === "SELL_SL");
            if (pool) pool.status = "SWEPT";

            alertMessage = `LIQUIDITY SWEEP ENTRY! SHORT @ $${activePos.entry_px} | Confluence: ${evaluation.score}/100 | SL: $${activePos.sl_px}, TP: $${activePos.tp_px} | ADX: ${round2(currentADX)} | ${profile.category}${fvgMatch ? " + FVG" : ""}`;
          }
        }
      }

      // Log ADX rejection
      if (!activePos && !adxGatePass && (isBuySweep || isSellSweep)) {
        alertMessage = `[ADX FILTER] Sweep detected but ADX ${round2(currentADX)} < ${profile.adxThreshold} (${profile.category}). Ranging market, skipped.`;
      }
    }
  }

  return {
    closedTrade,
    newPosition: activePos,
    activePools,
    sweepAlert: alertMessage,
    confluenceSnapshot,
    activeFVGs,
    adxValue: round2(currentADX),
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
    avg_confluence: number;
    asset_category: string;
  };
} {
  const profile = getAssetProfile(symbol);
  const trades: ReplayTrade[] = [];
  let currentPos: ActivePosition | null = null;
  let totalConfluence = 0;
  let confluenceCount = 0;

  const startBar = Math.max(10, profile.adxPeriod * 3);

  for (let i = startBar; i < candles.length; i++) {
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
      totalConfluence += result.closedTrade.confluence_score;
      confluenceCount++;
    }
    currentPos = result.newPosition;
  }

  const winning = trades.filter((t) => t.result === "WIN");
  const losing = trades.filter((t) => t.result === "LOSS");
  const winRate = trades.length > 0 ? (winning.length / trades.length) * 100 : 0;

  const grossProfit = winning.reduce((acc, t) => acc + t.pnl_pct, 0);
  const grossLoss = Math.abs(losing.reduce((acc, t) => acc + t.pnl_pct, 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 9.99 : 1.0;
  const netReturn = grossProfit - grossLoss;

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
      avg_confluence: confluenceCount > 0 ? parseFloat((totalConfluence / confluenceCount).toFixed(1)) : 0,
      asset_category: profile.category,
    },
  };
}

function buildClosedTrade(
  pos: ActivePosition,
  symbol: string,
  timeframe: string,
  currentBar: Candle,
  exitPx: number,
  pnl: number,
  result: "WIN" | "LOSS"
): ReplayTrade {
  return {
    trade_id: pos.trade_id,
    asset: symbol,
    timeframe,
    side: pos.side,
    entry_time: pos.entry_time,
    entry_px: pos.entry_px,
    sl_px: pos.sl_px,
    tp_px: pos.tp_px,
    exit_time: currentBar.time,
    exit_px: exitPx,
    confluence_score: pos.confluence_score,
    setup_type: pos.setup_type,
    pnl_pct: parseFloat(pnl.toFixed(2)),
    result,
    notes: result === "WIN"
      ? `Take Profit hit @ $${exitPx}`
      : `Stopped out @ $${exitPx}`,
  };
}

function fmtPrice(price: number): number {
  return parseFloat(price.toFixed(price < 1 ? 6 : 2));
}

function round2(n: number): number {
  return parseFloat(n.toFixed(2));
}
