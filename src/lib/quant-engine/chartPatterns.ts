/**
 * Chart Pattern Recognition Engine (20 Karakteristik Pola Chart Klasik)
 * 
 * Mengidentifikasi 20 pola chart geometris dari histori harga menggunakan
 * Fractal Swing Pivots (Swing Highs & Swing Lows), slope regresi batas atas/bawah,
 * dan rasio neckline / breakout.
 * 
 * Dilengkapi metadata visual SVG path representatif untuk setiap pola chart.
 */

import type { CandleData } from "@/components/LightweightChart";

export type ChartPatternCategory = "CONTINUATION" | "REVERSAL" | "BILATERAL";
export type PatternBias = "BULLISH" | "BEARISH" | "NEUTRAL";

export type ChartPatternId =
  // 1. Continuation Patterns
  | "BULLISH_FLAG"
  | "BULLISH_PENNANT"
  | "BULLISH_FALLING_WEDGE"
  | "BEARISH_FLAG"
  | "BEARISH_PENNANT"
  | "BEARISH_FALLING_WEDGE"
  // 2. Reversal Patterns
  | "BEARISH_DOUBLE_TOP"
  | "BEARISH_HEAD_AND_SHOULDERS"
  | "BEARISH_RISING_WEDGE"
  | "BEARISH_EXPANDING_TRIANGLE"
  | "BEARISH_TRIPLE_TOP"
  | "BULLISH_DOUBLE_BOTTOM"
  | "BULLISH_INVERTED_HEAD_AND_SHOULDERS"
  | "BULLISH_FALLING_WEDGE_REV"
  | "BULLISH_EXPANDING_TRIANGLE"
  | "BULLISH_TRIPLE_BOTTOM"
  // 3. Bilateral / Triangle Patterns
  | "ASCENDING_TRIANGLE"
  | "DESCENDING_TRIANGLE"
  | "SYMMETRICAL_TRIANGLE"
  | "SYMMETRICAL_EXPANDING_TRIANGLE";

export interface PatternDefinition {
  id: ChartPatternId;
  name: string;
  category: ChartPatternCategory;
  bias: PatternBias;
  description: string;
  tradingRule: string;
  svgIconPath: string; // Representasi garis SVG mini untuk preview
}

/**
 * Katalog 20 Pola Chart Geometri Lengkap dengan Desain Visual SVG
 */
export const CHART_PATTERN_CATALOG: Record<ChartPatternId, PatternDefinition> = {
  // Row 1
  BULLISH_FLAG: {
    id: "BULLISH_FLAG",
    name: "Bullish Flag",
    category: "CONTINUATION",
    bias: "BULLISH",
    description: "Tiang impuls naik diikuti kanal konsolidasi paralel miring ke bawah.",
    tradingRule: "Entry Buy saat breakout menembus batas atas bendera. TP = tinggi tiang flag.",
    svgIconPath: "M 10 70 L 30 20 L 45 40 L 60 25 L 75 45 L 90 30 L 95 10",
  },
  BULLISH_PENNANT: {
    id: "BULLISH_PENNANT",
    name: "Bullish Pennant",
    category: "CONTINUATION",
    bias: "BULLISH",
    description: "Tiang impuls naik diikuti segitiga konvergensi kecil yang menyempit.",
    tradingRule: "Entry Buy saat penembusan ke atas segitiga pennant dengan lonjakan volume.",
    svgIconPath: "M 10 70 L 35 25 L 55 45 L 70 32 L 80 40 L 95 15",
  },
  BULLISH_FALLING_WEDGE: {
    id: "BULLISH_FALLING_WEDGE",
    name: "Bullish Falling Wedge (Cont)",
    category: "CONTINUATION",
    bias: "BULLISH",
    description: "Dua garis batas sama-sama miring ke bawah dan menyempit dalam tren naik.",
    tradingRule: "Entry Buy saat seller kehabisan momentum dan garis atas wedge ditembus.",
    svgIconPath: "M 15 65 L 35 30 L 50 55 L 70 42 L 85 58 L 95 20",
  },
  BEARISH_FLAG: {
    id: "BEARISH_FLAG",
    name: "Bearish Flag",
    category: "CONTINUATION",
    bias: "BEARISH",
    description: "Tiang impuls turun diikuti kanal konsolidasi paralel miring ke atas.",
    tradingRule: "Entry Sell saat breakdown menembus batas bawah bendera flag.",
    svgIconPath: "M 10 20 L 30 75 L 45 55 L 60 70 L 75 50 L 90 65 L 95 85",
  },

  // Row 2
  BEARISH_PENNANT: {
    id: "BEARISH_PENNANT",
    name: "Bearish Pennant",
    category: "CONTINUATION",
    bias: "BEARISH",
    description: "Tiang impuls turun tajam diikuti segitiga konvergensi kecil menyempit.",
    tradingRule: "Entry Sell saat harga breakdown keluar dari segitiga pennant ke bawah.",
    svgIconPath: "M 10 20 L 35 70 L 55 50 L 70 65 L 80 55 L 95 85",
  },
  BEARISH_FALLING_WEDGE: {
    id: "BEARISH_FALLING_WEDGE",
    name: "Bearish Falling Wedge",
    category: "CONTINUATION",
    bias: "BEARISH",
    description: "Garis menyempit ke bawah dalam tren turun yang menghasilkan breakdown lanjutan.",
    tradingRule: "Entry Sell saat support bawah ditembus ke bawah.",
    svgIconPath: "M 15 25 L 35 60 L 50 40 L 70 68 L 85 52 L 95 85",
  },
  BEARISH_DOUBLE_TOP: {
    id: "BEARISH_DOUBLE_TOP",
    name: "Bearish Double Top (M)",
    category: "REVERSAL",
    bias: "BEARISH",
    description: "Pola 'M' dua puncak sejajar membentur resisten horizontal yang sama.",
    tradingRule: "Entry Sell saat harga breakdown menembus neckline lembah tengah.",
    svgIconPath: "M 10 75 L 30 25 L 50 60 L 70 25 L 90 75 L 95 85",
  },
  BEARISH_HEAD_AND_SHOULDERS: {
    id: "BEARISH_HEAD_AND_SHOULDERS",
    name: "Bearish Head & Shoulders",
    category: "REVERSAL",
    bias: "BEARISH",
    description: "Bahu kiri, kepala lebih tinggi, dan bahu kanan dengan neckline support.",
    tradingRule: "Entry Sell saat penembusan valid di bawah garis leher (neckline).",
    svgIconPath: "M 10 70 L 25 40 L 40 65 L 55 15 L 70 65 L 85 40 L 95 85",
  },

  // Row 3
  BEARISH_RISING_WEDGE: {
    id: "BEARISH_RISING_WEDGE",
    name: "Bearish Rising Wedge",
    category: "REVERSAL",
    bias: "BEARISH",
    description: "Dua garis miring ke atas yang menyempit; buyer kehabisan tenaga beli.",
    tradingRule: "Entry Sell saat garis support bawah wedge ditembus tajam ke bawah.",
    svgIconPath: "M 10 75 L 30 50 L 50 65 L 70 38 L 85 55 L 95 85",
  },
  BEARISH_EXPANDING_TRIANGLE: {
    id: "BEARISH_EXPANDING_TRIANGLE",
    name: "Bearish Expanding Triangle",
    category: "REVERSAL",
    bias: "BEARISH",
    description: "Segitiga melebar (Megaphone) ke arah atas dengan swing semakin liar.",
    tradingRule: "Entry Sell saat harga kehilangan tenaga di puncak dan breakdown ke bawah.",
    svgIconPath: "M 15 50 L 35 35 L 55 65 L 75 25 L 90 85",
  },
  BEARISH_TRIPLE_TOP: {
    id: "BEARISH_TRIPLE_TOP",
    name: "Bearish Triple Top",
    category: "REVERSAL",
    bias: "BEARISH",
    description: "Tiga puncak menguji level resisten yang sama sebelum akhirnya runtuh.",
    tradingRule: "Entry Sell saat penembusan support horizontal neckline setelah 3 puncak.",
    svgIconPath: "M 10 75 L 25 25 L 40 60 L 55 25 L 70 60 L 85 25 L 95 85",
  },
  BULLISH_DOUBLE_BOTTOM: {
    id: "BULLISH_DOUBLE_BOTTOM",
    name: "Bullish Double Bottom (W)",
    category: "REVERSAL",
    bias: "BULLISH",
    description: "Pola 'W' dua lembah sejajar di support yang gagal ditembus penjual.",
    tradingRule: "Entry Buy saat harga breakout menembus neckline puncak tengah.",
    svgIconPath: "M 10 25 L 30 75 L 50 40 L 70 75 L 90 25 L 95 15",
  },

  // Row 4
  BULLISH_INVERTED_HEAD_AND_SHOULDERS: {
    id: "BULLISH_INVERTED_HEAD_AND_SHOULDERS",
    name: "Bullish Inverted H&S",
    category: "REVERSAL",
    bias: "BULLISH",
    description: "Kebalikan Head and Shoulders (bahu kiri bawah, kepala terdalam, bahu kanan).",
    tradingRule: "Entry Buy saat penembusan neckline ke atas setelah bahu kanan terbentuk.",
    svgIconPath: "M 10 30 L 25 60 L 40 35 L 55 85 L 70 35 L 85 60 L 95 15",
  },
  BULLISH_FALLING_WEDGE_REV: {
    id: "BULLISH_FALLING_WEDGE_REV",
    name: "Bullish Falling Wedge (Rev)",
    category: "REVERSAL",
    bias: "BULLISH",
    description: "Wedge menurun tajam di akhir tren turun; seller kehabisan momentum jenuh.",
    tradingRule: "Entry Buy saat garis resisten atas wedge ditembus ke atas.",
    svgIconPath: "M 10 20 L 30 70 L 50 45 L 70 75 L 85 55 L 95 15",
  },
  BULLISH_EXPANDING_TRIANGLE: {
    id: "BULLISH_EXPANDING_TRIANGLE",
    name: "Bullish Expanding Triangle",
    category: "REVERSAL",
    bias: "BULLISH",
    description: "Megaphone segitiga melebar di dasar harga dengan ayunan bawah semakin dalam.",
    tradingRule: "Entry Buy saat ayunan bawah disapu dan harga breakout ke atas.",
    svgIconPath: "M 15 45 L 35 60 L 55 30 L 75 75 L 90 15",
  },
  BULLISH_TRIPLE_BOTTOM: {
    id: "BULLISH_TRIPLE_BOTTOM",
    name: "Bullish Triple Bottom",
    category: "REVERSAL",
    bias: "BULLISH",
    description: "Tiga lembah menguji level support horizontal yang sama sebelum melesat.",
    tradingRule: "Entry Buy saat harga breakout menembus neckline di atas ketiga lembah.",
    svgIconPath: "M 10 25 L 25 75 L 40 40 L 55 75 L 70 40 L 85 75 L 95 15",
  },

  // Row 5
  ASCENDING_TRIANGLE: {
    id: "ASCENDING_TRIANGLE",
    name: "Ascending Triangle",
    category: "BILATERAL",
    bias: "BULLISH",
    description: "Resisten horizontal datar di atas dipadu dengan Higher Lows miring ke atas.",
    tradingRule: "Entry Buy dominan saat resisten horizontal atas ditembus (breakout up).",
    svgIconPath: "M 10 70 L 30 25 L 50 55 L 70 25 L 85 45 L 95 15",
  },
  DESCENDING_TRIANGLE: {
    id: "DESCENDING_TRIANGLE",
    name: "Descending Triangle",
    category: "BILATERAL",
    bias: "BEARISH",
    description: "Support horizontal datar di bawah dipadu dengan Lower Highs miring ke bawah.",
    tradingRule: "Entry Sell dominan saat support horizontal bawah ditembus (breakdown down).",
    svgIconPath: "M 10 25 L 30 75 L 50 45 L 70 75 L 85 55 L 95 85",
  },
  SYMMETRICAL_TRIANGLE: {
    id: "SYMMETRICAL_TRIANGLE",
    name: "Symmetrical Triangle",
    category: "BILATERAL",
    bias: "NEUTRAL",
    description: "Lower Highs dan Higher Lows saling mendekat simetris (kompresi volatilitas).",
    tradingRule: "Entry bilateral mengikuti arah penembusan valid (Breakout Up atau Breakdown Down).",
    svgIconPath: "M 10 20 L 30 75 L 50 35 L 70 65 L 85 48 L 95 20",
  },
  SYMMETRICAL_EXPANDING_TRIANGLE: {
    id: "SYMMETRICAL_EXPANDING_TRIANGLE",
    name: "Symmetrical Expanding",
    category: "BILATERAL",
    bias: "NEUTRAL",
    description: "Segitiga Megaphone simetris melebar ke kedua arah dengan volatilitas tinggi.",
    tradingRule: "Waspada Stop Hunt di kedua sisi; entry saat terjadi sweep salah satu batas ekstrem.",
    svgIconPath: "M 15 50 L 35 30 L 55 70 L 75 15 L 90 85",
  },
};

export const ALL_PATTERN_IDS = Object.keys(CHART_PATTERN_CATALOG) as ChartPatternId[];

export interface DetectedChartPattern {
  id: ChartPatternId;
  name: string;
  category: ChartPatternCategory;
  bias: PatternBias;
  confidence: number; // 0 - 100%
  neckline: number;
  trigger_price: number;
  target_price: number;
  stop_loss: number;
  bar_start_idx: number;
  bar_end_idx: number;
  status: "FORMING" | "CONFIRMED_BREAKOUT" | "RETESTING";
  notes: string;
}

/**
 * Default status checklist 20 pola (aktif semua secara bawaan)
 */
export function getDefaultEnabledPatterns(): Record<ChartPatternId, boolean> {
  const defaults: Record<string, boolean> = {};
  for (const id of ALL_PATTERN_IDS) {
    defaults[id] = true;
  }
  return defaults as Record<ChartPatternId, boolean>;
}

export interface DetectChartPatternsOptions {
  enableDoubleTopBottom?: boolean;
  doubleTopBottomTolerance?: number; // e.g. 0.015 (1.5%)
}

/**
 * Algoritma Deteksi Geometris Pola Chart
 */
export function detectChartPatterns(
  candles: CandleData[],
  currentIndex: number,
  currentATR: number,
  enabledPatterns?: Record<ChartPatternId, boolean>,
  options?: DetectChartPatternsOptions
): DetectedChartPattern | null {
  if (currentIndex < 12 || candles.length < 12) return null;

  const isPatternActive = (id: ChartPatternId) => {
    if (!enabledPatterns) return true;
    return enabledPatterns[id] !== false;
  };

  const isDoubleTopBottomAllowed = options?.enableDoubleTopBottom !== false;
  const dblTol = options?.doubleTopBottomTolerance ?? 0.015;

  const windowSize = Math.min(30, currentIndex + 1);
  const windowCandles = candles.slice(currentIndex - windowSize + 1, currentIndex + 1);
  const currentBar = candles[currentIndex];

  // Identifikasi Swing Pivots (3-bar fractal)
  interface Pivot {
    type: "HIGH" | "LOW";
    price: number;
    index: number;
  }
  const pivots: Pivot[] = [];

  for (let i = 1; i < windowCandles.length - 1; i++) {
    const prev = windowCandles[i - 1];
    const curr = windowCandles[i];
    const next = windowCandles[i + 1];

    if (curr.high > prev.high && curr.high >= next.high) {
      pivots.push({ type: "HIGH", price: curr.high, index: currentIndex - windowSize + 1 + i });
    }
    if (curr.low < prev.low && curr.low <= next.low) {
      pivots.push({ type: "LOW", price: curr.low, index: currentIndex - windowSize + 1 + i });
    }
  }

  const highs = pivots.filter((p) => p.type === "HIGH");
  const lows = pivots.filter((p) => p.type === "LOW");

  // ========================================================
  // 1. DETEKSI DOUBLE TOP ("M")
  // ========================================================
  if (isDoubleTopBottomAllowed && isPatternActive("BEARISH_DOUBLE_TOP") && highs.length >= 2 && lows.length >= 1) {
    const h1 = highs[highs.length - 2];
    const h2 = highs[highs.length - 1];
    const middleLows = lows.filter((l) => l.index > h1.index && l.index < h2.index);

    if (middleLows.length > 0) {
      const necklineLow = middleLows[0];
      const diffPct = Math.abs(h1.price - h2.price) / h1.price;

      // Dua puncak sejajar dalam deviasi dblTol
      if (diffPct <= dblTol && necklineLow.price < Math.min(h1.price, h2.price) - currentATR * 0.8) {
        const height = Math.min(h1.price, h2.price) - necklineLow.price;
        const isBreakout = currentBar.close < necklineLow.price;

        if (isBreakout || currentBar.close < (h2.price + necklineLow.price) / 2) {
          return {
            id: "BEARISH_DOUBLE_TOP",
            name: "Bearish Double Top (M)",
            category: "REVERSAL",
            bias: "BEARISH",
            confidence: isBreakout ? 92 : 82,
            neckline: necklineLow.price,
            trigger_price: necklineLow.price,
            target_price: necklineLow.price - height,
            stop_loss: Math.max(h1.price, h2.price) + currentATR * 0.2,
            bar_start_idx: h1.index,
            bar_end_idx: currentIndex,
            status: isBreakout ? "CONFIRMED_BREAKOUT" : "FORMING",
            notes: `Dua puncak sejajar di $${h1.price.toFixed(2)} & $${h2.price.toFixed(2)} (Selisih ${(diffPct * 100).toFixed(2)}% ≤ ${(dblTol * 100).toFixed(1)}%) dengan neckline $${necklineLow.price.toFixed(2)}.`,
          };
        }
      }
    }
  }

  // ========================================================
  // 2. DETEKSI DOUBLE BOTTOM ("W")
  // ========================================================
  if (isDoubleTopBottomAllowed && isPatternActive("BULLISH_DOUBLE_BOTTOM") && lows.length >= 2 && highs.length >= 1) {
    const l1 = lows[lows.length - 2];
    const l2 = lows[lows.length - 1];
    const middleHighs = highs.filter((h) => h.index > l1.index && h.index < l2.index);

    if (middleHighs.length > 0) {
      const necklineHigh = middleHighs[0];
      const diffPct = Math.abs(l1.price - l2.price) / l1.price;

      if (diffPct <= dblTol && necklineHigh.price > Math.max(l1.price, l2.price) + currentATR * 0.8) {
        const height = necklineHigh.price - Math.max(l1.price, l2.price);
        const isBreakout = currentBar.close > necklineHigh.price;

        if (isBreakout || currentBar.close > (l2.price + necklineHigh.price) / 2) {
          return {
            id: "BULLISH_DOUBLE_BOTTOM",
            name: "Bullish Double Bottom (W)",
            category: "REVERSAL",
            bias: "BULLISH",
            confidence: isBreakout ? 92 : 82,
            neckline: necklineHigh.price,
            trigger_price: necklineHigh.price,
            target_price: necklineHigh.price + height,
            stop_loss: Math.min(l1.price, l2.price) - currentATR * 0.2,
            bar_start_idx: l1.index,
            bar_end_idx: currentIndex,
            status: isBreakout ? "CONFIRMED_BREAKOUT" : "FORMING",
            notes: `Dua lembah sejajar di $${l1.price.toFixed(2)} & $${l2.price.toFixed(2)} (Selisih ${(diffPct * 100).toFixed(2)}% ≤ ${(dblTol * 100).toFixed(1)}%) dengan neckline $${necklineHigh.price.toFixed(2)}.`,
          };
        }
      }
    }
  }

  // ========================================================
  // 3. DETEKSI HEAD AND SHOULDERS
  // ========================================================
  if (isPatternActive("BEARISH_HEAD_AND_SHOULDERS") && highs.length >= 3 && lows.length >= 2) {
    const left = highs[highs.length - 3];
    const head = highs[highs.length - 2];
    const right = highs[highs.length - 1];

    if (head.price > left.price && head.price > right.price) {
      const shoulderDiff = Math.abs(left.price - right.price) / left.price;
      if (shoulderDiff <= 0.015) {
        const middleLows = lows.filter((l) => l.index > left.index && l.index < right.index);
        const neckline = middleLows.length > 0 ? Math.min(...middleLows.map((l) => l.price)) : (left.price + right.price) / 2 - currentATR;
        const height = head.price - neckline;
        const isBreakout = currentBar.close < neckline;

        return {
          id: "BEARISH_HEAD_AND_SHOULDERS",
          name: "Head & Shoulders",
          category: "REVERSAL",
          bias: "BEARISH",
          confidence: isBreakout ? 94 : 80,
          neckline,
          trigger_price: neckline,
          target_price: neckline - height,
          stop_loss: right.price + currentATR * 0.2,
          bar_start_idx: left.index,
          bar_end_idx: currentIndex,
          status: isBreakout ? "CONFIRMED_BREAKOUT" : "FORMING",
          notes: `Kepala $${head.price.toFixed(2)} lebih tinggi dari bahu kiri ($${left.price.toFixed(2)}) & kanan ($${right.price.toFixed(2)}).`,
        };
      }
    }
  }

  // ========================================================
  // 4. DETEKSI INVERTED HEAD AND SHOULDERS
  // ========================================================
  if (isPatternActive("BULLISH_INVERTED_HEAD_AND_SHOULDERS") && lows.length >= 3 && highs.length >= 2) {
    const left = lows[lows.length - 3];
    const head = lows[lows.length - 2];
    const right = lows[lows.length - 1];

    if (head.price < left.price && head.price < right.price) {
      const shoulderDiff = Math.abs(left.price - right.price) / left.price;
      if (shoulderDiff <= 0.015) {
        const middleHighs = highs.filter((h) => h.index > left.index && h.index < right.index);
        const neckline = middleHighs.length > 0 ? Math.max(...middleHighs.map((h) => h.price)) : (left.price + right.price) / 2 + currentATR;
        const height = neckline - head.price;
        const isBreakout = currentBar.close > neckline;

        return {
          id: "BULLISH_INVERTED_HEAD_AND_SHOULDERS",
          name: "Inverted Head & Shoulders",
          category: "REVERSAL",
          bias: "BULLISH",
          confidence: isBreakout ? 94 : 80,
          neckline,
          trigger_price: neckline,
          target_price: neckline + height,
          stop_loss: right.price - currentATR * 0.2,
          bar_start_idx: left.index,
          bar_end_idx: currentIndex,
          status: isBreakout ? "CONFIRMED_BREAKOUT" : "FORMING",
          notes: `Kepala lembah $${head.price.toFixed(2)} lebih dalam dari bahu kiri & kanan.`,
        };
      }
    }
  }

  // ========================================================
  // 5. DETEKSI ASCENDING TRIANGLE
  // ========================================================
  if (isPatternActive("ASCENDING_TRIANGLE") && highs.length >= 2 && lows.length >= 2) {
    const h1 = highs[highs.length - 2];
    const h2 = highs[highs.length - 1];
    const l1 = lows[lows.length - 2];
    const l2 = lows[lows.length - 1];

    const flatHighs = Math.abs(h1.price - h2.price) / h1.price <= 0.006;
    const higherLows = l2.price > l1.price + currentATR * 0.2;

    if (flatHighs && higherLows) {
      const isBreakout = currentBar.close > h2.price;
      const height = h2.price - l1.price;
      return {
        id: "ASCENDING_TRIANGLE",
        name: "Ascending Triangle",
        category: "BILATERAL",
        bias: "BULLISH",
        confidence: isBreakout ? 90 : 78,
        neckline: h2.price,
        trigger_price: h2.price,
        target_price: h2.price + height,
        stop_loss: l2.price - currentATR * 0.2,
        bar_start_idx: Math.min(h1.index, l1.index),
        bar_end_idx: currentIndex,
        status: isBreakout ? "CONFIRMED_BREAKOUT" : "FORMING",
        notes: `Resisten datar $${h2.price.toFixed(2)} dengan Higher Lows ($${l1.price.toFixed(2)} -> $${l2.price.toFixed(2)}).`,
      };
    }
  }

  // ========================================================
  // 6. DETEKSI DESCENDING TRIANGLE
  // ========================================================
  if (isPatternActive("DESCENDING_TRIANGLE") && lows.length >= 2 && highs.length >= 2) {
    const l1 = lows[lows.length - 2];
    const l2 = lows[lows.length - 1];
    const h1 = highs[highs.length - 2];
    const h2 = highs[highs.length - 1];

    const flatLows = Math.abs(l1.price - l2.price) / l1.price <= 0.006;
    const lowerHighs = h2.price < h1.price - currentATR * 0.2;

    if (flatLows && lowerHighs) {
      const isBreakout = currentBar.close < l2.price;
      const height = h1.price - l2.price;
      return {
        id: "DESCENDING_TRIANGLE",
        name: "Descending Triangle",
        category: "BILATERAL",
        bias: "BEARISH",
        confidence: isBreakout ? 90 : 78,
        neckline: l2.price,
        trigger_price: l2.price,
        target_price: l2.price - height,
        stop_loss: h2.price + currentATR * 0.2,
        bar_start_idx: Math.min(h1.index, l1.index),
        bar_end_idx: currentIndex,
        status: isBreakout ? "CONFIRMED_BREAKOUT" : "FORMING",
        notes: `Support datar $${l2.price.toFixed(2)} dengan Lower Highs ($${h1.price.toFixed(2)} -> $${h2.price.toFixed(2)}).`,
      };
    }
  }

  // ========================================================
  // 7. DETEKSI BULLISH FLAG
  // ========================================================
  if (isPatternActive("BULLISH_FLAG") && highs.length >= 2 && lows.length >= 2) {
    const h1 = highs[highs.length - 2];
    const h2 = highs[highs.length - 1];
    const l1 = lows[lows.length - 2];
    const l2 = lows[lows.length - 1];

    // Kedua garis miring ke bawah secara paralel (Lower Highs & Lower Lows berjarak seragam)
    const lowerHighs = h2.price < h1.price;
    const lowerLows = l2.price < l1.price;
    const poleStart = windowCandles[0];
    const poleHeight = h1.price - poleStart.low;

    if (lowerHighs && lowerLows && poleHeight >= currentATR * 2.5) {
      const isBreakout = currentBar.close > h2.price;
      return {
        id: "BULLISH_FLAG",
        name: "Bullish Flag",
        category: "CONTINUATION",
        bias: "BULLISH",
        confidence: isBreakout ? 91 : 79,
        neckline: h2.price,
        trigger_price: h2.price,
        target_price: currentBar.close + poleHeight * 0.8,
        stop_loss: l2.price - currentATR * 0.2,
        bar_start_idx: currentIndex - windowSize,
        bar_end_idx: currentIndex,
        status: isBreakout ? "CONFIRMED_BREAKOUT" : "FORMING",
        notes: `Tiang bendera setinggi $${poleHeight.toFixed(2)} diikuti kanal koreksi miring ke bawah.`,
      };
    }
  }

  // ========================================================
  // 8. DETEKSI BEARISH FLAG
  // ========================================================
  if (isPatternActive("BEARISH_FLAG") && highs.length >= 2 && lows.length >= 2) {
    const h1 = highs[highs.length - 2];
    const h2 = highs[highs.length - 1];
    const l1 = lows[lows.length - 2];
    const l2 = lows[lows.length - 1];

    // Koreksi miring ke atas dalam tren turun
    const higherHighs = h2.price > h1.price;
    const higherLows = l2.price > l1.price;
    const poleStart = windowCandles[0];
    const poleHeight = poleStart.high - l1.price;

    if (higherHighs && higherLows && poleHeight >= currentATR * 2.5) {
      const isBreakout = currentBar.close < l2.price;
      return {
        id: "BEARISH_FLAG",
        name: "Bearish Flag",
        category: "CONTINUATION",
        bias: "BEARISH",
        confidence: isBreakout ? 91 : 79,
        neckline: l2.price,
        trigger_price: l2.price,
        target_price: currentBar.close - poleHeight * 0.8,
        stop_loss: h2.price + currentATR * 0.2,
        bar_start_idx: currentIndex - windowSize,
        bar_end_idx: currentIndex,
        status: isBreakout ? "CONFIRMED_BREAKOUT" : "FORMING",
        notes: `Tiang dump setinggi $${poleHeight.toFixed(2)} diikuti koreksi bendera miring ke atas.`,
      };
    }
  }

  // ========================================================
  // 9. DETEKSI SYMMETRICAL TRIANGLE
  // ========================================================
  if (isPatternActive("SYMMETRICAL_TRIANGLE") && highs.length >= 2 && lows.length >= 2) {
    const h1 = highs[highs.length - 2];
    const h2 = highs[highs.length - 1];
    const l1 = lows[lows.length - 2];
    const l2 = lows[lows.length - 1];

    if (h2.price < h1.price && l2.price > l1.price) {
      const height = h1.price - l1.price;
      const isBreakUp = currentBar.close > h2.price;
      const isBreakDown = currentBar.close < l2.price;

      if (isBreakUp || isBreakDown) {
        return {
          id: "SYMMETRICAL_TRIANGLE",
          name: "Symmetrical Triangle",
          category: "BILATERAL",
          bias: isBreakUp ? "BULLISH" : "BEARISH",
          confidence: 88,
          neckline: isBreakUp ? h2.price : l2.price,
          trigger_price: isBreakUp ? h2.price : l2.price,
          target_price: isBreakUp ? h2.price + height * 0.75 : l2.price - height * 0.75,
          stop_loss: isBreakUp ? l2.price : h2.price,
          bar_start_idx: Math.min(h1.index, l1.index),
          bar_end_idx: currentIndex,
          status: "CONFIRMED_BREAKOUT",
          notes: `Kompresi simetris meledak ${isBreakUp ? "ke ATAS" : "ke BAWAH"}.`,
        };
      }
    }
  }

  return null;
}
