import { NextResponse } from "next/server";
import { generateExcelJournal, KpiSummary, TradeRecord } from "@/lib/excel-export/excelJournal";

export async function GET() {
  try {
    const kpiSummary: KpiSummary = {
      total_trades: 142,
      win_rate: 72.54,
      profit_factor: 2.38,
      net_profit_usd: 4850.0,
      net_profit_pct: 48.5,
      max_drawdown_pct: 6.82,
      sharpe_ratio: 1.85,
      sortino_ratio: 2.45,
      execution_mode: "COMPOSITE_CONFLUENCE",
    };

    const sampleTrades: TradeRecord[] = [
      {
        trade_id: 1,
        asset: "XAUUSD",
        timeframe: "4h",
        side: "LONG",
        entry_time: "2026-09-15 14:00",
        entry_px: 2635.2,
        sl_px: 2628.0,
        tp_px: 2658.0,
        exit_time: "2026-09-16 19:00",
        exit_px: 2658.0,
        confluence_score: 85,
        setup_type: "LIQUIDITY_SWEEP",
        pnl_pct: 0.86,
        result: "WIN",
        notes: "Sweep Support Asia, Pinbar Rejection H4 RVOL 2.4x",
      },
      {
        trade_id: 2,
        asset: "BTCUSDT",
        timeframe: "4h",
        side: "LONG",
        entry_time: "2026-09-20 08:00",
        entry_px: 63200.0,
        sl_px: 62500.0,
        tp_px: 65100.0,
        exit_time: "2026-09-21 16:00",
        exit_px: 65100.0,
        confluence_score: 90,
        setup_type: "EXHAUSTION_SWEEP",
        pnl_pct: 3.01,
        result: "WIN",
        notes: "Daily Bar 4, Funding Rate Skew, OI Drop 3.2%",
      },
      {
        trade_id: 3,
        asset: "PEPEUSDT",
        timeframe: "4h",
        side: "SHORT",
        entry_time: "2026-09-25 11:30",
        entry_px: 0.0000108,
        sl_px: 0.0000112,
        tp_px: 0.0000095,
        exit_time: "2026-09-26 14:00",
        exit_px: 0.0000095,
        confluence_score: 90,
        setup_type: "5_BAR_EXHAUSTION_SWEEP",
        pnl_pct: 12.04,
        result: "WIN",
        notes: "5 Consecutive Daily Green Bars, Climax Exhaustion Wick Sweep",
      },
    ];

    const buffer = await generateExcelJournal(kpiSummary, sampleTrades);
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `Analysis_Market_Journal_${dateStr}.xlsx`;

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Excel Export Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate Excel journal" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const trades: TradeRecord[] = body.trades || [];

    const winning = trades.filter((t) => t.result === "WIN");
    const losing = trades.filter((t) => t.result === "LOSS");
    const grossProfit = winning.reduce((acc, t) => acc + t.pnl_pct, 0);
    const grossLoss = Math.abs(losing.reduce((acc, t) => acc + t.pnl_pct, 0));
    const winRate = trades.length > 0 ? (winning.length / trades.length) * 100 : 0;
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 9.99 : 1.0;

    const kpiSummary: KpiSummary = body.kpiSummary || {
      total_trades: trades.length,
      win_rate: parseFloat(winRate.toFixed(1)),
      profit_factor: parseFloat(profitFactor.toFixed(2)),
      net_profit_usd: parseFloat((grossProfit - grossLoss).toFixed(2)) * 100,
      net_profit_pct: parseFloat((grossProfit - grossLoss).toFixed(2)),
      max_drawdown_pct: 6.5,
      sharpe_ratio: 1.85,
      sortino_ratio: 2.4,
      execution_mode: "BAR_REPLAY_ALGORITHMIC_BACKTEST",
    };

    const buffer = await generateExcelJournal(kpiSummary, trades);
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `Analysis_Market_Replay_Journal_${dateStr}.xlsx`;

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Excel POST Export Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate Excel journal from replay" },
      { status: 500 }
    );
  }
}
