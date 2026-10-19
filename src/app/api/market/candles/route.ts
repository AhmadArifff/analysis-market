import { NextRequest, NextResponse } from "next/server";
import { getRealCandles } from "@/lib/data-feed/marketDataService";
import { mapLiquidityAndSweeps } from "@/lib/quant-engine/liquidity";
import { evaluateExhaustion } from "@/lib/quant-engine/exhaustion";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const symbol = searchParams.get("symbol") || "XAUUSD";
    const timeframe = searchParams.get("timeframe") || "1D";
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;

    const candles = await getRealCandles(symbol, timeframe, startDate, endDate);

    if (candles.length === 0) {
      return NextResponse.json(
        { success: false, error: "No market data available" },
        { status: 502 }
      );
    }

    // Run quant analysis on real candles
    const { pools, signal } = mapLiquidityAndSweeps(candles, symbol);
    const exhaustion = evaluateExhaustion(candles, symbol.startsWith("PEPE") ? "CRYPTO_MEME" : "CRYPTO_MAJOR");

    return NextResponse.json({
      success: true,
      symbol,
      timeframe,
      candles,
      pools,
      signal,
      exhaustion,
    });
  } catch (error) {
    console.error("Candles API Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal market feed error" },
      { status: 500 }
    );
  }
}
