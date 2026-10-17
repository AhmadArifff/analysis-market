import { NextResponse } from "next/server";
import { getRealWatchlist } from "@/lib/data-feed/marketDataService";

export async function GET() {
  try {
    const data = await getRealWatchlist();
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      data,
    });
  } catch (error) {
    console.error("Watchlist API Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch real watchlist" },
      { status: 500 }
    );
  }
}
