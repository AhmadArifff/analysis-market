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
import {
  ParallelChannel,
  ChannelSignalType,
  evaluateChannelSetups,
} from "./parallelChannel";
import { evaluateTrendRunnerSetup, TrendRunnerSignal } from "./trendRunner";
import {
  detectChartPatterns,
  DetectedChartPattern,
  ChartPatternId,
  getDefaultEnabledPatterns,
} from "./chartPatterns";

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
  lot_size?: number;
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
  pnl_usd?: number;
  lot_size?: number;
  balance_after?: number;
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
  activeChannel?: ParallelChannel | null;
  channelSignal?: ChannelSignalType;
  detectedPattern?: DetectedChartPattern | null;
  adxValue?: number;
  currentBalance?: number;
  isLiquidated?: boolean;
}

/**
 * Calculates contract multiplier based on asset class and price
 */
export function calculateContractMultiplier(symbol: string, price: number): number {
  const clean = symbol.replace(/[^A-Z0-9]/g, "").toUpperCase();
  if (clean.includes("XAU") || clean.includes("GOLD")) {
    return 100; // 100 troy oz per lot
  }
  if (clean.includes("EUR") || clean.includes("GBP") || clean.includes("JPY") || clean.includes("AUD")) {
    return 100000; // Standard forex contract
  }
  if (price < 0.001) return 1000000; // Micro meme
  if (price < 1.0) return 1000; // Low price crypto
  return 1; // Major crypto (1 unit per lot)
}

/**
 * Calculates trade profit & loss in percent and USD based on lot size
 */
export function calculateTradePnL(
  symbol: string,
  side: "LONG" | "SHORT",
  entryPx: number,
  exitPx: number,
  lotSize: number = 0.1
): { pnlPct: number; pnlUsd: number } {
  const pnlPct = side === "LONG"
    ? ((exitPx - entryPx) / entryPx) * 100
    : ((entryPx - exitPx) / entryPx) * 100;

  const multiplier = calculateContractMultiplier(symbol, entryPx);
  const priceDiff = side === "LONG" ? (exitPx - entryPx) : (entryPx - exitPx);
  const pnlUsd = priceDiff * multiplier * lotSize;

  return {
    pnlPct: parseFloat(pnlPct.toFixed(2)),
    pnlUsd: parseFloat(pnlUsd.toFixed(2)),
  };
}

export interface StrategySchemaConfig {
  enableLiquiditySweep?: boolean;
  enableParallelChannel?: boolean;
  enableFVGConfluence?: boolean;
  enableKillzones?: boolean;
  enableTrendFilter?: boolean;
  enableVolumeFilter?: boolean;
  enableTrendRunner?: boolean;
  enablePatternTrades?: boolean;
  enabledPatterns?: Record<ChartPatternId, boolean>;
  channelLookback?: number;
  channelAnchorMode?: "SWING_HIGHLOW" | "REGRESSION";
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
  riskRewardRatio: number = 2.0,
  currentBalance: number = 10000,
  lotSize: number = 0.10,
  configOrEnableParallel: boolean | StrategySchemaConfig = true,
  channelLookback: number = 25
): SimulationStepResult {
  const schema: StrategySchemaConfig =
    typeof configOrEnableParallel === "object" && configOrEnableParallel !== null
      ? configOrEnableParallel
      : {
          enableParallelChannel: configOrEnableParallel,
          channelLookback: channelLookback,
          enableLiquiditySweep: true,
          enableFVGConfluence: true,
          enableKillzones: true,
          enableTrendFilter: true,
          enableVolumeFilter: true,
          enableTrendRunner: true,
          enablePatternTrades: true,
          enabledPatterns: getDefaultEnabledPatterns(),
          channelAnchorMode: "SWING_HIGHLOW",
        };

  const enableLiquiditySweep = schema.enableLiquiditySweep ?? true;
  const enableParallelChannel = schema.enableParallelChannel ?? true;
  const enableFVGConfluence = schema.enableFVGConfluence ?? true;
  const enableKillzones = schema.enableKillzones ?? true;
  const enableTrendFilter = schema.enableTrendFilter ?? true;
  const enableVolumeFilter = schema.enableVolumeFilter ?? true;
  const enableTrendRunner = schema.enableTrendRunner ?? true;
  const enablePatternTrades = schema.enablePatternTrades ?? true;
  const effectiveChannelLookback = schema.channelLookback ?? 25;
  const channelAnchorMode = schema.channelAnchorMode ?? "SWING_HIGHLOW";

  if (currentIndex < 5 || currentIndex >= allCandles.length) {
    return {
      closedTrade: null,
      newPosition: currentPosition,
      activePools: [],
      sweepAlert: null,
      currentBalance,
      isLiquidated: currentBalance <= 0,
    };
  }

  // If dummy capital is exhausted, stop simulation immediately
  if (currentBalance <= 0) {
    return {
      closedTrade: null,
      newPosition: null,
      activePools: [],
      sweepAlert: "💀 MODAL HABIS ($0.00)! Akun mengalami likuidasi. Simulasi dihentikan. Silakan isi modal dummy untuk melanjutkan.",
      currentBalance: 0,
      isLiquidated: true,
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
  let runningBalance = currentBalance;
  let isLiquidated = false;

  // 1. If an active trade is open, check if current bar hits TP or SL
  if (activePos) {
    const tradeLot = activePos.lot_size || lotSize;
    if (activePos.side === "LONG") {
      if (currentBar.low <= activePos.sl_px) {
        const closed = buildClosedTrade(activePos, symbol, timeframe, currentBar, activePos.sl_px, tradeLot, runningBalance, "LOSS");
        closedTrade = closed.trade;
        runningBalance = closed.newBalance;
        isLiquidated = closed.isLiquidated;
        activePos = null;
        alertMessage = isLiquidated
          ? `💀 STOP LOSS & MODAL HABIS! Saldo $0.00. Simulasi berhenti otomatis.`
          : `STOP LOSS HIT (LONG @ $${currentBar.low})! Result: ${closed.trade.pnl_pct}% (${closed.trade.pnl_usd && closed.trade.pnl_usd >= 0 ? "+" : ""}$${closed.trade.pnl_usd}) | Saldo: $${runningBalance}`;
      } else if (currentBar.high >= activePos.tp_px) {
        const closed = buildClosedTrade(activePos, symbol, timeframe, currentBar, activePos.tp_px, tradeLot, runningBalance, "WIN");
        closedTrade = closed.trade;
        runningBalance = closed.newBalance;
        isLiquidated = closed.isLiquidated;
        activePos = null;
        alertMessage = `TAKE PROFIT HIT (LONG @ $${currentBar.high})! Result: +${closed.trade.pnl_pct}% (+$${closed.trade.pnl_usd}) | Saldo: $${runningBalance}`;
      }
    } else if (activePos.side === "SHORT") {
      if (currentBar.high >= activePos.sl_px) {
        const closed = buildClosedTrade(activePos, symbol, timeframe, currentBar, activePos.sl_px, tradeLot, runningBalance, "LOSS");
        closedTrade = closed.trade;
        runningBalance = closed.newBalance;
        isLiquidated = closed.isLiquidated;
        activePos = null;
        alertMessage = isLiquidated
          ? `💀 STOP LOSS & MODAL HABIS! Saldo $0.00. Simulasi berhenti otomatis.`
          : `STOP LOSS HIT (SHORT @ $${currentBar.high})! Result: ${closed.trade.pnl_pct}% (${closed.trade.pnl_usd && closed.trade.pnl_usd >= 0 ? "+" : ""}$${closed.trade.pnl_usd}) | Saldo: $${runningBalance}`;
      } else if (currentBar.low <= activePos.tp_px) {
        const closed = buildClosedTrade(activePos, symbol, timeframe, currentBar, activePos.tp_px, tradeLot, runningBalance, "WIN");
        closedTrade = closed.trade;
        runningBalance = closed.newBalance;
        isLiquidated = closed.isLiquidated;
        activePos = null;
        alertMessage = `TAKE PROFIT HIT (SHORT @ $${currentBar.low})! Result: +${closed.trade.pnl_pct}% (+$${closed.trade.pnl_usd}) | Saldo: $${runningBalance}`;
      }
    }
  }

  // If trade just closed and caused liquidation, immediately return
  if (isLiquidated) {
    return {
      closedTrade,
      newPosition: null,
      activePools: [],
      sweepAlert: alertMessage,
      currentBalance: 0,
      isLiquidated: true,
    };
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

  if (enableLiquiditySweep) {
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
    // Session Killzone Gate (Forex only - intraday timeframes only)
    const isIntraday = ["1m", "5m", "15m", "30m", "45m", "1h"].includes(timeframe.toLowerCase());
    if (enableKillzones && isIntraday && !isWithinKillzone(currentBar.time, profile.killzoneHoursUTC)) {
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

    // Trend & range detection: sweeps are evaluated across both trending & ranging regimes
    const adxGatePass = true;

    const range = currentBar.high - currentBar.low;
    if (range > 0 && adxGatePass) {
      const lowerWick = Math.min(currentBar.open, currentBar.close) - currentBar.low;
      const upperWick = currentBar.high - Math.max(currentBar.open, currentBar.close);
      const lowerWickRatio = lowerWick / range;
      const upperWickRatio = upperWick / range;

      const buySweepLevel = Math.max(recentMinLow, lastLow ? lastLow.price : 0);
      const isBuySweep =
        enableLiquiditySweep &&
        currentBar.low < buySweepLevel &&
        currentBar.close > buySweepLevel &&
        lowerWickRatio >= effectiveWickRatio;

      const sellSweepLevel = Math.min(recentMaxHigh, lastHigh ? lastHigh.price : Infinity);
      const isSellSweep =
        enableLiquiditySweep &&
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
        if (!enableTrendFilter) {
          allowLong = isBuySweep;
          allowShort = isSellSweep;
        } else if (isUptrend) {
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
          fastEmaAboveSlowEma: enableTrendFilter ? fastAboveSlow : true,
          adxValue: enableTrendFilter ? currentADX : 35,
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
          rvol: enableVolumeFilter ? currentRvol : Math.max(currentRvol, profile.minRvol),
          minRvol: profile.minRvol,
          hasFVGOverlap: enableFVGConfluence ? !!fvgMatch : true,
          hasOrderBlock: false,
          volumeDeltaAligned: enableVolumeFilter ? volumeDeltaAligned : true,
          rvolSpike: enableVolumeFilter ? currentRvol >= profile.minRvol : true,
          isTrendTrade: enableTrendFilter ? isUptrend : true,
        };

        const evaluation = evaluateConfluence(confluenceInput, profile);
        confluenceSnapshot = evaluation;

        if (evaluation.is_high_probability) {
          // Structural Stop Loss placed behind the sweep low with an ATR buffer
          const buffer = Math.max(currentATR * 0.15, (currentBar.close - currentBar.low) * 0.1);
          const sl = currentBar.low - buffer;
          const riskDist = Math.max(currentBar.close - sl, currentBar.close * 0.003);
          const minTarget = currentBar.close + riskDist * effectiveRR;

          // TP targets opposing fractal high if it offers >= effectiveRR, otherwise standard RR target
          const finalTP = lastHigh && lastHigh.price >= minTarget ? lastHigh.price : minTarget;

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
            lot_size: lotSize,
          };

          const pool = activePools.find((p) => p.pool_type === "BUY_SL");
          if (pool) pool.status = "SWEPT";

          alertMessage = `LIQUIDITY SWEEP ENTRY! LONG @ $${activePos.entry_px} | Confluence: ${evaluation.score}/100 | SL: $${activePos.sl_px}, TP: $${activePos.tp_px} | ADX: ${round2(currentADX)} | ${profile.category}${fvgMatch ? " + FVG" : ""}`;
        }
      }

      // Evaluate confluence for potential SHORT
      if (!activePos && allowShort) {
        const fvgMatch = findOverlappingFVG(currentBar, activeFVGs, "SHORT");
        const volumeDeltaAligned = cvd > 0;

        const confluenceInput: ConfluenceInput = {
          fastEmaAboveSlowEma: enableTrendFilter ? !fastAboveSlow : true,
          adxValue: enableTrendFilter ? currentADX : 35,
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
          rvol: enableVolumeFilter ? currentRvol : Math.max(currentRvol, profile.minRvol),
          minRvol: profile.minRvol,
          hasFVGOverlap: enableFVGConfluence ? !!fvgMatch : true,
          hasOrderBlock: false,
          volumeDeltaAligned: enableVolumeFilter ? volumeDeltaAligned : true,
          rvolSpike: enableVolumeFilter ? currentRvol >= profile.minRvol : true,
          isTrendTrade: enableTrendFilter ? !isUptrend : true,
        };

        const evaluation = evaluateConfluence(confluenceInput, profile);
        confluenceSnapshot = evaluation;

        if (evaluation.is_high_probability) {
          // Structural Stop Loss placed behind the sweep high with an ATR buffer
          const buffer = Math.max(currentATR * 0.15, (currentBar.high - currentBar.close) * 0.1);
          const sl = currentBar.high + buffer;
          const riskDist = Math.max(sl - currentBar.close, currentBar.close * 0.003);
          const minTarget = currentBar.close - riskDist * effectiveRR;

          // TP targets opposing fractal low if it offers >= effectiveRR, otherwise standard RR target
          const finalTP = lastLow && lastLow.price <= minTarget ? lastLow.price : minTarget;

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
            lot_size: lotSize,
          };

          const pool = activePools.find((p) => p.pool_type === "SELL_SL");
          if (pool) pool.status = "SWEPT";

          alertMessage = `LIQUIDITY SWEEP ENTRY! SHORT @ $${activePos.entry_px} | Confluence: ${evaluation.score}/100 | SL: $${activePos.sl_px}, TP: $${activePos.tp_px} | ADX: ${round2(currentADX)} | ${profile.category}${fvgMatch ? " + FVG" : ""}`;
        }
      }
    }
  }

  // 5. Evaluate Parallel Channel Setups (Bounce & Break/Retest)
  let activeChannel: ParallelChannel | null = null;
  let channelSignal: ChannelSignalType = "NONE";

  if (enableParallelChannel && pastCandles.length >= 10) {
    const channelEval = evaluateChannelSetups(
      allCandles,
      currentIndex,
      effectiveChannelLookback,
      effectiveRR,
      channelAnchorMode
    );
    activeChannel = channelEval.channel;
    channelSignal = channelEval.signal;

    // If no active trade open, evaluate entry on Parallel Channel only if enabled
    if (enableParallelChannel && !activePos && channelSignal !== "NONE") {
      let allowChannelTrade = false;

      if (channelSignal === "CHANNEL_BOUNCE_BUY" || channelSignal === "CHANNEL_BREAK_RETEST_BUY") {
        if (directionFilter === "LONG" || directionFilter === "ALL") {
          allowChannelTrade = true;
        } else if (directionFilter === "AUTO") {
          allowChannelTrade = isUptrend || channelSignal === "CHANNEL_BOUNCE_BUY";
        }

        if (allowChannelTrade) {
          activePos = {
            trade_id: Date.now() + Math.floor(Math.random() * 1000),
            symbol,
            side: "LONG",
            entry_time: currentBar.time,
            entry_index: currentIndex,
            entry_px: channelEval.entry_px,
            sl_px: channelEval.sl_px,
            tp_px: channelEval.tp_px,
            confluence_score: channelSignal.includes("BREAK") ? 88 : 84,
            swept_pool_price: channelEval.channel?.lower_price || currentBar.close,
            setup_type: channelEval.setup_type,
            lot_size: lotSize,
          };

          alertMessage = `PARALLEL CHANNEL ENTRY! ${channelEval.setup_type} @ $${activePos.entry_px} | SL: $${activePos.sl_px}, TP: $${activePos.tp_px} | ${channelEval.notes}`;
        }
      } else if (channelSignal === "CHANNEL_BOUNCE_SELL" || channelSignal === "CHANNEL_BREAK_RETEST_SELL") {
        if (directionFilter === "SHORT" || directionFilter === "ALL") {
          allowChannelTrade = true;
        } else if (directionFilter === "AUTO") {
          allowChannelTrade = !isUptrend || channelSignal === "CHANNEL_BOUNCE_SELL";
        }

        if (allowChannelTrade) {
          activePos = {
            trade_id: Date.now() + Math.floor(Math.random() * 1000),
            symbol,
            side: "SHORT",
            entry_time: currentBar.time,
            entry_index: currentIndex,
            entry_px: channelEval.entry_px,
            sl_px: channelEval.sl_px,
            tp_px: channelEval.tp_px,
            confluence_score: channelSignal.includes("BREAK") ? 88 : 84,
            swept_pool_price: channelEval.channel?.upper_price || currentBar.close,
            setup_type: channelEval.setup_type,
            lot_size: lotSize,
          };

          alertMessage = `PARALLEL CHANNEL ENTRY! ${channelEval.setup_type} @ $${activePos.entry_px} | SL: $${activePos.sl_px}, TP: $${activePos.tp_px} | ${channelEval.notes}`;
        }
      }
    }
  }

  // 6. Evaluate Trend Runner / Liquidity Void Continuation (No-Sweep Flow via Retail RR Aversion)
  if (enableTrendRunner && !activePos) {
    const runnerSignal = evaluateTrendRunnerSetup(
      allCandles,
      currentIndex,
      currentATR,
      currentADX,
      fastAboveSlow,
      isUptrend,
      lastHigh,
      lastLow,
      activeChannel,
      {
        riskRewardTarget: effectiveRR,
      }
    );

    if (runnerSignal.triggered && runnerSignal.side) {
      let allowRunner = false;
      if (runnerSignal.side === "LONG") {
        allowRunner = directionFilter === "LONG" || directionFilter === "ALL" || directionFilter === "AUTO";
      } else if (runnerSignal.side === "SHORT") {
        allowRunner = directionFilter === "SHORT" || directionFilter === "ALL" || directionFilter === "AUTO";
      }

      if (allowRunner) {
        activePos = {
          trade_id: Date.now() + Math.floor(Math.random() * 1000),
          symbol,
          side: runnerSignal.side,
          entry_time: currentBar.time,
          entry_index: currentIndex,
          entry_px: fmtPrice(runnerSignal.entry_px),
          sl_px: fmtPrice(runnerSignal.sl_px),
          tp_px: fmtPrice(runnerSignal.tp_px),
          confluence_score: runnerSignal.confluence_score,
          swept_pool_price: runnerSignal.side === "LONG" ? (lastLow?.price || currentBar.close) : (lastHigh?.price || currentBar.close),
          setup_type: runnerSignal.setup_type,
          lot_size: lotSize,
        };

        alertMessage = `🏃 TREND RUNNER ENTRY! ${runnerSignal.setup_type} @ $${activePos.entry_px} | SL: $${activePos.sl_px}, TP: $${activePos.tp_px} | ${runnerSignal.notes}`;
      }
    }
  }

  // 7. Detect Chart Patterns (20 Classical Formations) & Breakout Execution
  const detectedPattern = enablePatternTrades
    ? detectChartPatterns(
        allCandles,
        currentIndex,
        currentATR,
        schema.enabledPatterns
      )
    : null;

  if (enablePatternTrades && !activePos && detectedPattern && detectedPattern.status === "CONFIRMED_BREAKOUT") {
    let allowPattern = false;
    if (detectedPattern.bias === "BULLISH") {
      allowPattern = directionFilter === "LONG" || directionFilter === "ALL" || directionFilter === "AUTO";
    } else if (detectedPattern.bias === "BEARISH") {
      allowPattern = directionFilter === "SHORT" || directionFilter === "ALL" || directionFilter === "AUTO";
    }

    if (allowPattern) {
      activePos = {
        trade_id: Date.now() + Math.floor(Math.random() * 1000),
        symbol,
        side: detectedPattern.bias === "BULLISH" ? "LONG" : "SHORT",
        entry_time: currentBar.time,
        entry_index: currentIndex,
        entry_px: fmtPrice(currentBar.close),
        sl_px: fmtPrice(detectedPattern.stop_loss),
        tp_px: fmtPrice(detectedPattern.target_price),
        confluence_score: detectedPattern.confidence,
        swept_pool_price: detectedPattern.neckline,
        setup_type: `PATTERN_${detectedPattern.id}`,
        lot_size: lotSize,
      };

      alertMessage = `📐 POLA CHART BREAKOUT! ${detectedPattern.name} @ $${activePos.entry_px} | SL: $${activePos.sl_px}, TP: $${activePos.tp_px} | ${detectedPattern.notes}`;
    }
  }

  return {
    closedTrade,
    newPosition: activePos,
    activePools: enableLiquiditySweep ? activePools : [],
    sweepAlert: alertMessage,
    confluenceSnapshot,
    activeFVGs: enableFVGConfluence ? activeFVGs : [],
    activeChannel: enableParallelChannel ? activeChannel : null,
    channelSignal: enableParallelChannel ? channelSignal : "NONE",
    detectedPattern: enablePatternTrades ? detectedPattern : null,
    adxValue: round2(currentADX),
    currentBalance: runningBalance,
    isLiquidated: runningBalance <= 0,
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
  riskRewardRatio: number = 2.0,
  initialCapital: number = 10000,
  lotSize: number = 0.10,
  configOrEnableParallel: boolean | StrategySchemaConfig = true,
  channelLookback: number = 25
): {
  trades: ReplayTrade[];
  summary: {
    total_trades: number;
    winning_trades: number;
    losing_trades: number;
    win_rate: number;
    profit_factor: number;
    net_return_pct: number;
    net_profit_usd: number;
    initial_capital: number;
    final_balance: number;
    is_liquidated: boolean;
    liquidation_bar?: number | null;
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
  let runningBalance = initialCapital;
  let isLiquidated = runningBalance <= 0;
  let liquidationBar: number | null = null;

  const startBar = Math.max(10, Math.min(25, Math.floor(candles.length * 0.15)));

  for (let i = startBar; i < candles.length; i++) {
    // If capital is exhausted, halt simulation immediately!
    if (runningBalance <= 0) {
      isLiquidated = true;
      liquidationBar = i;
      break;
    }

    const result = stepReplaySimulation(
      candles,
      i,
      currentPos,
      symbol,
      timeframe,
      directionFilter,
      minWickRatio,
      riskRewardRatio,
      runningBalance,
      lotSize,
      configOrEnableParallel,
      channelLookback
    );
    if (result.closedTrade) {
      trades.push(result.closedTrade);
      totalConfluence += result.closedTrade.confluence_score;
      confluenceCount++;
    }
    runningBalance = result.currentBalance !== undefined ? result.currentBalance : runningBalance;
    currentPos = result.newPosition;

    if (result.isLiquidated || runningBalance <= 0) {
      isLiquidated = true;
      liquidationBar = i;
      break;
    }
  }

  const winning = trades.filter((t) => t.result === "WIN");
  const losing = trades.filter((t) => t.result === "LOSS");
  const winRate = trades.length > 0 ? (winning.length / trades.length) * 100 : 0;

  const grossProfit = winning.reduce((acc, t) => acc + t.pnl_pct, 0);
  const grossLoss = Math.abs(losing.reduce((acc, t) => acc + t.pnl_pct, 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 9.99 : 1.0;
  const netReturn = grossProfit - grossLoss;
  const netProfitUsd = parseFloat((runningBalance - initialCapital).toFixed(2));

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
      net_profit_usd: netProfitUsd,
      initial_capital: initialCapital,
      final_balance: parseFloat(runningBalance.toFixed(2)),
      is_liquidated: isLiquidated,
      liquidation_bar: liquidationBar,
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
  lotSize: number,
  currentBalance: number,
  result: "WIN" | "LOSS"
): {
  trade: ReplayTrade;
  newBalance: number;
  isLiquidated: boolean;
} {
  const { pnlPct, pnlUsd } = calculateTradePnL(
    symbol,
    pos.side,
    pos.entry_px,
    exitPx,
    lotSize
  );

  const rawBalance = currentBalance + pnlUsd;
  const newBalance = Math.max(0, parseFloat(rawBalance.toFixed(2)));
  const isLiquidated = newBalance <= 0;

  const trade: ReplayTrade = {
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
    pnl_pct: pnlPct,
    pnl_usd: pnlUsd,
    lot_size: lotSize,
    balance_after: newBalance,
    result,
    notes: result === "WIN"
      ? `Take Profit hit @ $${exitPx} (+${pnlPct}%, +$${pnlUsd})`
      : `Stopped out @ $${exitPx} (${pnlPct}%, $${pnlUsd})`,
  };

  return {
    trade,
    newBalance,
    isLiquidated,
  };
}

function fmtPrice(price: number): number {
  return parseFloat(price.toFixed(price < 1 ? 6 : 2));
}

function round2(n: number): number {
  return parseFloat(n.toFixed(2));
}
