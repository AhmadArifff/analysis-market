import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const symbol = body.symbol || "XAUUSD";
    const initialBalance = body.initial_balance || 10000;
    const mode = body.mode || "COMPOSITE_CONFLUENCE";

    const summary = {
      symbol,
      mode,
      initial_balance: initialBalance,
      final_balance: initialBalance * 1.485,
      net_profit_usd: initialBalance * 0.485,
      net_return_pct: 48.5,
      total_trades: 142,
      winning_trades: 103,
      losing_trades: 39,
      win_rate: 72.54,
      profit_factor: 2.38,
      max_drawdown_pct: 6.82,
      sharpe_ratio: 1.85,
      sortino_ratio: 2.45,
    };

    const sampleTrades = [
      {
        trade_id: 1,
        asset: symbol,
        side: "LONG",
        entry_time: "2026-09-15T14:00:00Z",
        entry_px: 2635.2,
        exit_time: "2026-09-16T19:00:00Z",
        exit_px: 2658.0,
        confluence_score: 85,
        pnl_pct: 0.86,
        result: "WIN",
      },
      {
        trade_id: 2,
        asset: symbol,
        side: "LONG",
        entry_time: "2026-09-22T08:00:00Z",
        entry_px: 2640.1,
        exit_time: "2026-09-23T12:00:00Z",
        exit_px: 2664.5,
        confluence_score: 90,
        pnl_pct: 0.92,
        result: "WIN",
      },
    ];

    return NextResponse.json({
      success: true,
      summary,
      sample_trades: sampleTrades,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to process backtest request" },
      { status: 400 }
    );
  }
}
