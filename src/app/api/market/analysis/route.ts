import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const symbol = searchParams.get("symbol") || "XAUUSD";

  return NextResponse.json({
    success: true,
    data: {
      symbol,
      timestamp: new Date().toISOString(),
      mtf_matrix: {
        "1M": "BULLISH",
        "1W": "BULLISH",
        "1D": "EXHAUSTION_WARNING",
        "H4": "SWEEP_WATCH",
        "H1": "CONSOLIDATION",
      },
      cycle_meter: {
        consecutive_bars: 4,
        max_bars: 5,
        daily_move_pct: 3.2,
        atr_14: 28.5,
        status: "ALERT_REVERSAL_ZONE",
      },
      gravity_horizon: {
        preferred_direction: "BUY_SIDE",
        probability_pct: 74.0,
        next_target_level: 2675.0,
      },
      confluence: {
        score: 85,
        status: "HIGH_PROBABILITY_SETUP",
        breakdown: {
          macro_trend_ema_adx: 20,
          daily_exhaustion_atr_rsi5: 20,
          retail_rr_pool_mapped: 20,
          sweep_pinbar_rvol: 25,
          divergence_or_oi_plunge: 0,
        },
      },
      active_liquidity_pools: [
        {
          pool_id: 101,
          pool_type: "BUY_SL",
          pool_price: 2638.5,
          retail_rr: 1.85,
          status: "SWEPT",
          swept_ago: "2 candles ago",
        },
        {
          pool_id: 102,
          pool_type: "SELL_SL",
          pool_price: 2668.0,
          retail_rr: 2.1,
          status: "PENDING",
          swept_ago: null,
        },
      ],
      signal_action: {
        signal: "BUY_AFTER_SWEEP",
        entry_price: 2642.5,
        stop_loss: 2634.0,
        take_profit: 2668.0,
        planned_rr: 3.0,
        confidence_score: 85,
      },
    },
  });
}
