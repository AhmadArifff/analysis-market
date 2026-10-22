import { evaluateTrendRunnerSetup } from "../src/lib/quant-engine/trendRunner";
import type { CandleData } from "../src/components/LightweightChart";

function runTest() {
  console.log("=== UNIT TEST: TREND RUNNER (LIQUIDITY VOID / NO-SWEEP FLOW) ===");

  // Create a synthetic strong uptrend where retail is hesitant because distance to origin swing low is 50 pips (SL > TP)
  const baseTime = 1700000000;
  const candles: CandleData[] = [];
  
  // Starting swing low at 2600
  candles.push({ time: baseTime, open: 2600, high: 2605, low: 2598, close: 2604, volume: 1000 });
  candles.push({ time: baseTime + 3600, open: 2604, high: 2615, low: 2603, close: 2614, volume: 1200 });
  candles.push({ time: baseTime + 7200, open: 2614, high: 2625, low: 2613, close: 2624, volume: 1500 });
  candles.push({ time: baseTime + 10800, open: 2624, high: 2635, low: 2623, close: 2634, volume: 1800 });
  candles.push({ time: baseTime + 14400, open: 2634, high: 2642, low: 2633, close: 2640, volume: 2000 });
  
  // Jeda mikro / Pause candle (inside range) at bar #5
  candles.push({ time: baseTime + 18000, open: 2640, high: 2643, low: 2638, close: 2641, volume: 800 });
  
  // Current breakout candle at bar #6 breaking pause high (2643) to 2648
  candles.push({ time: baseTime + 21600, open: 2641, high: 2649, low: 2640, close: 2648, volume: 2200 });

  const currentATR = 8.0; // ATR is $8. Distance to swing low (2598) is $50 (~6.2x ATR!) -> Retail RR is terrible
  const currentADX = 32; // Strong trend
  const fastAboveSlow = true;
  const isUptrend = true;
  const lastLow = { price: 2598, index: 0 };
  const lastHigh = { price: 2652, index: 4 };

  const signal = evaluateTrendRunnerSetup(
    candles,
    6,
    currentATR,
    currentADX,
    fastAboveSlow,
    isUptrend,
    lastHigh,
    lastLow,
    null
  );

  console.log("Result Trend Runner Test 1 (Strong Trend + Retail Hesitation):");
  console.log("Triggered:", signal.triggered);
  console.log("Side:", signal.side);
  console.log("Entry Px:", signal.entry_px);
  console.log("SL Px:", signal.sl_px, `(Risk: $${(signal.entry_px - signal.sl_px).toFixed(2)})`);
  console.log("TP Px:", signal.tp_px, `(Target: $${(signal.tp_px - signal.entry_px).toFixed(2)})`);
  console.log("Setup Type:", signal.setup_type);
  console.log("Retail RR Index:", signal.retail_rr_index);
  console.log("Distance in ATR:", signal.distance_to_swing_atr);
  console.log("Notes:", signal.notes);

  if (!signal.triggered || signal.side !== "LONG") {
    throw new Error("Test 1 Failed: Expected LONG Trend Runner trigger!");
  }
  console.log("✅ Test 1 PASSED!");

  // Test 2: Low ADX (Sideways market) -> Should NOT trigger
  const lowAdxSignal = evaluateTrendRunnerSetup(
    candles,
    6,
    currentATR,
    14, // Weak ADX
    fastAboveSlow,
    isUptrend,
    lastHigh,
    lastLow,
    null
  );
  console.log("\nResult Trend Runner Test 2 (Low ADX / Sideways):");
  console.log("Triggered:", lowAdxSignal.triggered, "(Expected: false)");
  if (lowAdxSignal.triggered) {
    throw new Error("Test 2 Failed: Should not trigger when ADX is weak!");
  }
  console.log("✅ Test 2 PASSED!");

  console.log("\n🎉 ALL TESTS PASSED SUCCESSFULLY!");
}

runTest();
