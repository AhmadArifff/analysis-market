/**
 * Trend Runner / Liquidity Void Continuation Engine
 * 
 * Konsep:
 * Ketika market sedang berada dalam tren institusional kuat (ADX >= 22, EMA 21/50 searah),
 * dan tidak ada sweep likuiditas lokal karena retail enggan/ragu masuk (Retail RR Aversion:
 * jarak ke Swing Low/High asal terlalu jauh sehingga SL > TP bagi retail),
 * market maker mendorong harga terus melaju (Liquidity Void Run / Low Resistance Liquidity Run).
 * 
 * Sistem mengeksekusi posisi searah tren dengan Stop Loss berbasis volatilitas ATR lokal
 * (bukan swing jauh) sehingga Risk:Reward kita tetap optimal (>= 1:1.5 - 1:2.0).
 */

import type { CandleData } from "@/components/LightweightChart";
import type { ParallelChannel } from "./parallelChannel";

export interface TrendRunnerSignal {
  triggered: boolean;
  side: "LONG" | "SHORT" | null;
  entry_px: number;
  sl_px: number;
  tp_px: number;
  confluence_score: number;
  setup_type: string;
  retail_rr_index: number;
  distance_to_swing_atr: number;
  notes: string;
}

export interface TrendRunnerConfig {
  minADX?: number;
  maxRetailRR?: number; // threshold RR retail (default: 0.85)
  minAtrDistance?: number; // jarak ke swing asal dalam kelipatan ATR (default: 1.2x)
  atrMultiplierSL?: number; // buffer SL di bawah pemicu (default: 0.8x - 1.0x)
  riskRewardTarget?: number; // target RR (default: 1.8x)
}

/**
 * Mengevaluasi apakah candle saat ini memenuhi kriteria Trend Runner (No-Sweep Flow)
 */
export function evaluateTrendRunnerSetup(
  candles: CandleData[],
  currentIndex: number,
  currentATR: number,
  currentADX: number,
  fastAboveSlow: boolean,
  isUptrend: boolean,
  lastHigh: { price: number; index: number } | undefined,
  lastLow: { price: number; index: number } | undefined,
  activeChannel?: ParallelChannel | null,
  config?: TrendRunnerConfig
): TrendRunnerSignal {
  const noneSignal: TrendRunnerSignal = {
    triggered: false,
    side: null,
    entry_px: 0,
    sl_px: 0,
    tp_px: 0,
    confluence_score: 0,
    setup_type: "NONE",
    retail_rr_index: 1.0,
    distance_to_swing_atr: 0,
    notes: "Kondisi Trend Runner tidak terpenuhi",
  };

  if (currentIndex < 3 || candles.length < 3) return noneSignal;

  const currentBar = candles[currentIndex];
  const prevBar = candles[currentIndex - 1];
  if (!currentBar || !prevBar) return noneSignal;

  const minADX = config?.minADX ?? 20;
  const maxRetailRR = config?.maxRetailRR ?? 0.85;
  const minAtrDist = config?.minAtrDistance ?? 1.2;
  const slAtrMult = config?.atrMultiplierSL ?? 0.85;
  const rrTarget = config?.riskRewardTarget ?? 1.8;

  // 1. Filter Kekuatan Tren (Harus ada momentum searah)
  if (currentADX < minADX) {
    return { ...noneSignal, notes: `ADX (${currentADX.toFixed(1)}) di bawah threshold (${minADX})` };
  }

  const prevRange = prevBar.high - prevBar.low;
  const isPauseCandle = prevRange <= currentATR * 1.15; // candle sebelumnya adalah candle jeda/konsolidasi mikro

  // ==========================================
  // A. SKENARIO BULLISH TREND RUNNER (LONG)
  // ==========================================
  if (fastAboveSlow && isUptrend && currentBar.close > currentBar.open) {
    // Ukur jarak harga ke swing low terdekat
    const swingLowPrice = lastLow ? lastLow.price : currentBar.low - currentATR * 2;
    const distToSwingLow = currentBar.close - swingLowPrice;
    const distInAtr = currentATR > 0 ? distToSwingLow / currentATR : 0;

    // Estimasi target retail (resisten terdekat)
    const swingHighPrice = lastHigh ? lastHigh.price : currentBar.close + currentATR;
    const distToResist = Math.max(swingHighPrice - currentBar.close, currentATR * 0.4);

    // Rasio RR bagi retail (Target / Jarak SL ke Swing Low)
    const retailRR = distToSwingLow > 0 ? distToResist / distToSwingLow : 1.0;

    // Kriteria Retail RR Aversion:
    // Jarak ke Swing Low >= 1.2x ATR ATAU Retail RR < 0.85 (SL lebih besar dari TP untuk retail)
    const retailAverse = distInAtr >= minAtrDist || retailRR < maxRetailRR;

    if (retailAverse) {
      // Pemicu Entri 1: Breakout dari candle jeda mikro (Inside bar / micro pause)
      const isBreakoutTrigger = isPauseCandle && currentBar.close > prevBar.high;

      // Pemicu Entri 2: Retest memantul dari Midline Paralel Kanal
      const isMidlineBounceTrigger =
        activeChannel &&
        currentBar.low <= activeChannel.mid_price * 1.002 &&
        currentBar.close > activeChannel.mid_price;

      if (isBreakoutTrigger || isMidlineBounceTrigger) {
        // Kalkulasi SL Kuantitatif Kita: 0.85x ATR di bawah low candle saat ini (bukan di swing asal!)
        const slBuffer = Math.max(currentATR * slAtrMult, (currentBar.close - currentBar.low) * 0.2);
        const sl_px = currentBar.low - slBuffer;
        const risk = Math.max(currentBar.close - sl_px, currentBar.close * 0.002);
        const tp_px = currentBar.close + risk * rrTarget;

        const triggerType = isBreakoutTrigger ? "MICRO_PAUSE_BREAKOUT" : "CHANNEL_MIDLINE_BOUNCE";

        return {
          triggered: true,
          side: "LONG",
          entry_px: currentBar.close,
          sl_px: Number(sl_px.toFixed(currentBar.close < 1 ? 6 : 2)),
          tp_px: Number(tp_px.toFixed(currentBar.close < 1 ? 6 : 2)),
          confluence_score: 86,
          setup_type: `TREND_RUNNER_BUY [${triggerType}]`,
          retail_rr_index: Number(retailRR.toFixed(2)),
          distance_to_swing_atr: Number(distInAtr.toFixed(2)),
          notes: `Retail ragu masuk (RR ${retailRR.toFixed(2)}x, SL ${distInAtr.toFixed(1)}x ATR). Momentum ekspansi berlanjut tanpa sweep.`,
        };
      }
    }
  }

  // ==========================================
  // B. SKENARIO BEARISH TREND RUNNER (SHORT)
  // ==========================================
  if (!fastAboveSlow && !isUptrend && currentBar.close < currentBar.open) {
    // Ukur jarak harga ke swing high terdekat
    const swingHighPrice = lastHigh ? lastHigh.price : currentBar.high + currentATR * 2;
    const distToSwingHigh = swingHighPrice - currentBar.close;
    const distInAtr = currentATR > 0 ? distToSwingHigh / currentATR : 0;

    // Estimasi target retail (support terdekat)
    const swingLowPrice = lastLow ? lastLow.price : currentBar.close - currentATR;
    const distToSupport = Math.max(currentBar.close - swingLowPrice, currentATR * 0.4);

    // Rasio RR bagi retail (Target / Jarak SL ke Swing High)
    const retailRR = distToSwingHigh > 0 ? distToSupport / distToSwingHigh : 1.0;

    const retailAverse = distInAtr >= minAtrDist || retailRR < maxRetailRR;

    if (retailAverse) {
      // Pemicu Entri 1: Breakdown dari candle jeda mikro
      const isBreakdownTrigger = isPauseCandle && currentBar.close < prevBar.low;

      // Pemicu Entri 2: Retest memantul ke bawah dari Midline Paralel Kanal
      const isMidlineBounceTrigger =
        activeChannel &&
        currentBar.high >= activeChannel.mid_price * 0.998 &&
        currentBar.close < activeChannel.mid_price;

      if (isBreakdownTrigger || isMidlineBounceTrigger) {
        // Kalkulasi SL Kuantitatif Kita: 0.85x ATR di atas high candle saat ini
        const slBuffer = Math.max(currentATR * slAtrMult, (currentBar.high - currentBar.close) * 0.2);
        const sl_px = currentBar.high + slBuffer;
        const risk = Math.max(sl_px - currentBar.close, currentBar.close * 0.002);
        const tp_px = currentBar.close - risk * rrTarget;

        const triggerType = isBreakdownTrigger ? "MICRO_PAUSE_BREAKDOWN" : "CHANNEL_MIDLINE_BOUNCE";

        return {
          triggered: true,
          side: "SHORT",
          entry_px: currentBar.close,
          sl_px: Number(sl_px.toFixed(currentBar.close < 1 ? 6 : 2)),
          tp_px: Number(tp_px.toFixed(currentBar.close < 1 ? 6 : 2)),
          confluence_score: 86,
          setup_type: `TREND_RUNNER_SELL [${triggerType}]`,
          retail_rr_index: Number(retailRR.toFixed(2)),
          distance_to_swing_atr: Number(distInAtr.toFixed(2)),
          notes: `Retail ragu short (RR ${retailRR.toFixed(2)}x, SL ${distInAtr.toFixed(1)}x ATR). Momentum penurunan berlanjut tanpa sweep.`,
        };
      }
    }
  }

  return noneSignal;
}
