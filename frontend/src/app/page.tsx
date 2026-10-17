"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import {
  Activity,
  BarChart2,
  Download,
  ShieldAlert,
  Layers,
  Crosshair,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  Sliders,
} from "lucide-react";
import type { CandleData, LiquidityPool } from "@/components/LightweightChart";

// Dynamically import LightweightChart to prevent SSR hydration mismatch with Canvas
const LightweightChart = dynamic(
  () => import("@/components/LightweightChart"),
  { ssr: false }
);

interface WatchlistItem {
  symbol: string;
  name: string;
  category: "FOREX" | "CRYPTO_MAJOR" | "CRYPTO_MEME";
  last_price: number;
  change_24h: number;
  consecutive_bar: number;
  max_bar_cycle: number;
  exhaustion_status: "NORMAL" | "WARNING" | "CRITICAL_ALERT";
  confluence_score: number;
  macro_trend: "BULLISH" | "BEARISH" | "NEUTRAL";
}

const DEFAULT_WATCHLIST: WatchlistItem[] = [
  {
    symbol: "XAUUSD",
    name: "Gold Spot / US Dollar",
    category: "FOREX",
    last_price: 2642.5,
    change_24h: 1.18,
    consecutive_bar: 4,
    max_bar_cycle: 5,
    exhaustion_status: "WARNING",
    confluence_score: 85,
    macro_trend: "BULLISH",
  },
  {
    symbol: "BTCUSDT",
    name: "Bitcoin / Tether",
    category: "CRYPTO_MAJOR",
    last_price: 64520.0,
    change_24h: 3.12,
    consecutive_bar: 2,
    max_bar_cycle: 5,
    exhaustion_status: "NORMAL",
    confluence_score: 45,
    macro_trend: "BULLISH",
  },
  {
    symbol: "ETHUSDT",
    name: "Ethereum / Tether",
    category: "CRYPTO_MAJOR",
    last_price: 2615.4,
    change_24h: -0.45,
    consecutive_bar: 1,
    max_bar_cycle: 5,
    exhaustion_status: "NORMAL",
    confluence_score: 30,
    macro_trend: "NEUTRAL",
  },
  {
    symbol: "SOLUSDT",
    name: "Solana / Tether",
    category: "CRYPTO_MAJOR",
    last_price: 154.2,
    change_24h: 5.25,
    consecutive_bar: 3,
    max_bar_cycle: 5,
    exhaustion_status: "NORMAL",
    confluence_score: 65,
    macro_trend: "BULLISH",
  },
  {
    symbol: "PEPEUSDT",
    name: "Pepe / Tether",
    category: "CRYPTO_MEME",
    last_price: 0.00001045,
    change_24h: 11.8,
    consecutive_bar: 5,
    max_bar_cycle: 5,
    exhaustion_status: "CRITICAL_ALERT",
    confluence_score: 90,
    macro_trend: "BULLISH",
  },
  {
    symbol: "DOGEUSDT",
    name: "Dogecoin / Tether",
    category: "CRYPTO_MEME",
    last_price: 0.1245,
    change_24h: 3.8,
    consecutive_bar: 2,
    max_bar_cycle: 5,
    exhaustion_status: "NORMAL",
    confluence_score: 50,
    macro_trend: "BULLISH",
  },
];

// Helper to generate realistic sample candle sequence for symbol
function generateCandles(basePrice: number, count: number = 60): CandleData[] {
  const candles: CandleData[] = [];
  const now = new Date();
  let currentPrice = basePrice * 0.94;

  for (let i = count; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 4 * 3600 * 1000);
    const dateStr = d.toISOString().split("T")[0];

    const volatility = currentPrice * 0.008;
    const change = (Math.random() - 0.46) * volatility;
    const open = currentPrice;
    const close = currentPrice + change;
    const high = Math.max(open, close) + Math.random() * volatility * 0.5;
    const low = Math.min(open, close) - Math.random() * volatility * 0.5;
    const volume = Math.floor(Math.random() * 800 + 300);

    candles.push({
      time: dateStr,
      open: parseFloat(open.toFixed(basePrice < 1 ? 6 : 2)),
      high: parseFloat(high.toFixed(basePrice < 1 ? 6 : 2)),
      low: parseFloat(low.toFixed(basePrice < 1 ? 6 : 2)),
      close: parseFloat(close.toFixed(basePrice < 1 ? 6 : 2)),
      volume,
    });

    currentPrice = close;
  }
  return candles;
}

interface PaperTrade {
  id: number;
  symbol: string;
  side: "LONG" | "SHORT";
  entry_px: number;
  sl_px: number;
  tp_px: number;
  current_px: number;
  pnl_pct: number;
  confluence: number;
  status: "ACTIVE" | "TARGET_HIT" | "STOPPED";
  timestamp: string;
}

export default function TerminalHome() {
  const [selectedSymbol, setSelectedSymbol] = useState("XAUUSD");
  const [timeframe, setTimeframe] = useState("4h");
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>(DEFAULT_WATCHLIST);
  const [candles, setCandles] = useState<CandleData[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  // Paper Trades state (marking without real execution)
  const [paperTrades, setPaperTrades] = useState<PaperTrade[]>([
    {
      id: 101,
      symbol: "XAUUSD",
      side: "LONG",
      entry_px: 2635.2,
      sl_px: 2628.0,
      tp_px: 2658.0,
      current_px: 2642.5,
      pnl_pct: 0.28,
      confluence: 85,
      status: "ACTIVE",
      timestamp: "2026-10-17 14:00",
    },
    {
      id: 102,
      symbol: "PEPEUSDT",
      side: "SHORT",
      entry_px: 0.0000108,
      sl_px: 0.0000112,
      tp_px: 0.0000095,
      current_px: 0.00001045,
      pnl_pct: 3.24,
      confluence: 90,
      status: "ACTIVE",
      timestamp: "2026-10-17 11:30",
    },
  ]);

  const activeAsset = watchlist.find((w) => w.symbol === selectedSymbol) || watchlist[0];

  // Pools configuration
  const pools: LiquidityPool[] = [
    {
      pool_id: 201,
      pool_type: "BUY_SL",
      pool_price: activeAsset.last_price * 0.992,
      retail_rr: 1.85,
      status: "SWEPT",
      swept_ago: "2 candles ago",
    },
    {
      pool_id: 202,
      pool_type: "SELL_SL",
      pool_price: activeAsset.last_price * 1.018,
      retail_rr: 2.1,
      status: "PENDING",
      swept_ago: null,
    },
  ];

  // Regenerate candles when active asset changes
  useEffect(() => {
    setCandles(generateCandles(activeAsset.last_price, 50));
  }, [activeAsset.symbol, activeAsset.last_price]);

  // Handle Excel Export from Backend
  const handleExportExcel = async () => {
    setIsExporting(true);
    setExportNotice(null);
    try {
      const response = await fetch("http://localhost:8000/api/v1/backtest/export-excel");
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Quantitative_Journal_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setExportNotice("Jurnal Excel berhasil diekspor!");
    } catch (err) {
      // Fallback message if backend isn't running yet
      setExportNotice("Unduhan Excel: Pastikan backend FastAPI :8000 aktif.");
    } finally {
      setIsExporting(false);
      setTimeout(() => setExportNotice(null), 5000);
    }
  };

  // Add Paper Trade Marking
  const handleMarkPaperTrade = () => {
    const isLong = activeAsset.confluence_score >= 80;
    const entry = activeAsset.last_price;
    const sl = isLong ? entry * 0.994 : entry * 1.006;
    const tp = isLong ? entry * 1.022 : entry * 0.978;

    const newTrade: PaperTrade = {
      id: Date.now(),
      symbol: activeAsset.symbol,
      side: isLong ? "LONG" : "SHORT",
      entry_px: parseFloat(entry.toFixed(entry < 1 ? 6 : 2)),
      sl_px: parseFloat(sl.toFixed(entry < 1 ? 6 : 2)),
      tp_px: parseFloat(tp.toFixed(entry < 1 ? 6 : 2)),
      current_px: parseFloat(entry.toFixed(entry < 1 ? 6 : 2)),
      pnl_pct: 0.0,
      confluence: activeAsset.confluence_score,
      status: "ACTIVE",
      timestamp: new Date().toISOString().replace("T", " ").slice(0, 16),
    };

    setPaperTrades([newTrade, ...paperTrades]);
  };

  return (
    <div className="min-h-screen bg-[#090A0F] text-[#E2E8F0]">
      {/* 1. Header Bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-[#1F2430] bg-[#0E1118]/90 px-6 py-3 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-[#10B981] shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
            <span className="font-mono text-sm font-bold tracking-wider text-[#F8FAFC]">
              ANALYSIS-MARKET
            </span>
          </div>
          <span className="hidden sm:inline-block font-mono text-[11px] text-[#64748B]">
            INSTITUTIONAL QUANTITATIVE TERMINAL
          </span>
          <span className="rounded bg-[#1A2030] px-2 py-0.5 font-mono text-[11px] text-[#38BDF8]">
            MONOREPO // DESKTOP READY
          </span>
        </div>

        {/* Global Controls & Excel Export */}
        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-2 font-mono text-xs text-[#94A3B8] border-r border-[#1F2430] pr-4">
            <Clock className="h-3.5 w-3.5 text-[#38BDF8]" />
            <span>SESSION:</span>
            <span className="text-[#10B981] font-semibold">NEW YORK OPEN</span>
            <span className="text-[#64748B]">(KILLZONE ACTIVE)</span>
          </div>

          <button
            onClick={handleExportExcel}
            disabled={isExporting}
            className="flex items-center gap-2 rounded border border-[#1F2430] bg-[#141824] px-3 py-1.5 font-mono text-xs font-medium text-[#E2E8F0] transition hover:border-[#38BDF8] hover:bg-[#1E2538] active:scale-95 disabled:opacity-50"
            title="Download multi-sheet trading journal (.xlsx)"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-[#10B981]" />
            <span>{isExporting ? "GENERATING..." : "EXPORT EXCEL JOURNAL"}</span>
          </button>
        </div>
      </header>

      {/* Export notification toast */}
      {exportNotice && (
        <div className="fixed top-16 right-6 z-50 flex items-center gap-2 rounded border border-[#1F2430] bg-[#111319] px-4 py-2 text-xs font-mono text-[#E2E8F0] shadow-xl animate-fade-in">
          <CheckCircle2 className="h-4 w-4 text-[#10B981]" />
          <span>{exportNotice}</span>
        </div>
      )}

      {/* 2. Top Watchlist / Macro Regime Bar */}
      <section className="border-b border-[#1F2430] bg-[#0B0D13] px-6 py-2">
        <div className="flex items-center gap-3 overflow-x-auto pb-1">
          {watchlist.map((item) => {
            const isSelected = item.symbol === selectedSymbol;
            const isPositive = item.change_24h >= 0;
            return (
              <button
                key={item.symbol}
                onClick={() => setSelectedSymbol(item.symbol)}
                className={`flex min-w-[210px] items-center justify-between rounded border p-2.5 text-left transition ${
                  isSelected
                    ? "border-[#38BDF8] bg-[#131A29]"
                    : "border-[#1F2430] bg-[#0E1118] hover:border-[#333D52]"
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-[#E2E8F0]">
                      {item.symbol}
                    </span>
                    <span className="rounded bg-[#1A1F2C] px-1.5 py-0.2 font-mono text-[10px] text-[#8E9BAE]">
                      {item.category === "FOREX" ? "FX" : "CRYPTO"}
                    </span>
                  </div>
                  <div className="font-mono text-[13px] font-semibold text-[#F8FAFC]">
                    ${item.last_price < 1 ? item.last_price.toFixed(6) : item.last_price.toLocaleString()}
                  </div>
                </div>

                <div className="text-right">
                  <div
                    className={`font-mono text-xs font-semibold ${
                      isPositive ? "text-[#10B981]" : "text-[#F43F5E]"
                    }`}
                  >
                    {isPositive ? "+" : ""}
                    {item.change_24h.toFixed(2)}%
                  </div>
                  <div className="mt-0.5 flex items-center justify-end gap-1">
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        item.exhaustion_status === "CRITICAL_ALERT"
                          ? "bg-[#F43F5E] animate-ping"
                          : item.exhaustion_status === "WARNING"
                          ? "bg-[#D97706]"
                          : "bg-[#64748B]"
                      }`}
                    ></span>
                    <span className="font-mono text-[10px] text-[#94A3B8]">
                      {item.consecutive_bar}/{item.max_bar_cycle} BARS
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* 3. Main Workspace Grid */}
      <main className="grid grid-cols-1 gap-6 p-6 xl:grid-cols-12">
        {/* Left Column: Interactive Lightweight Chart + Timeframe Tabs (8 cols) */}
        <div className="space-y-4 xl:col-span-8">
          {/* Timeframe Controls Bar */}
          <div className="flex flex-wrap items-center justify-between rounded border border-[#1F2430] bg-[#0E1118] px-4 py-2.5">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-[#8E9BAE]">CYCLE TIMEFRAME:</span>
              {(["1M", "1W", "1D", "4h", "1h"] as const).map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={`rounded px-2.5 py-1 font-mono text-xs font-medium transition ${
                    timeframe === tf
                      ? "bg-[#1E293B] text-[#38BDF8] border border-[#38BDF8]/40"
                      : "text-[#8E9BAE] hover:text-[#E2E8F0]"
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-4 text-xs font-mono">
              <span className="text-[#8E9BAE]">
                DAILY MOVE: <span className="text-[#E2E8F0] font-semibold">3.20%</span>
              </span>
              <span className="text-[#8E9BAE]">
                ATR(14): <span className="text-[#E2E8F0] font-semibold">28.50</span>
              </span>
              <span className="rounded bg-[#1A1F2C] px-2 py-0.5 text-[#10B981] font-semibold">
                NORMALIZED VOLATILITY
              </span>
            </div>
          </div>

          {/* Interactive Chart Component */}
          <LightweightChart
            symbol={activeAsset.symbol}
            timeframe={timeframe}
            candles={candles}
            pools={pools}
            height={500}
          />

          {/* Paper Trading Forward-Marking Table */}
          <div className="rounded border border-[#1F2430] bg-[#0E1118] p-4">
            <div className="flex items-center justify-between border-b border-[#1F2430] pb-3">
              <div className="flex items-center gap-2">
                <Crosshair className="h-4 w-4 text-[#38BDF8]" />
                <h3 className="font-mono text-xs font-bold tracking-wider text-[#F8FAFC]">
                  SIMULATED PAPER-MARKING POSITIONS (FORWARD-TESTING)
                </h3>
              </div>
              <span className="font-mono text-[11px] text-[#64748B]">
                ZERO BROKER RISK // MARKING JOURNAL MODE
              </span>
            </div>

            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead>
                  <tr className="border-b border-[#1F2430] text-[#64748B]">
                    <th className="py-2">TIMESTAMP</th>
                    <th className="py-2">SYMBOL</th>
                    <th className="py-2">SIDE</th>
                    <th className="py-2 text-right">ENTRY</th>
                    <th className="py-2 text-right">STOP LOSS</th>
                    <th className="py-2 text-right">TAKE PROFIT</th>
                    <th className="py-2 text-right">CONFLUENCE</th>
                    <th className="py-2 text-right">UNREALIZED PNL</th>
                    <th className="py-2 text-center">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1F2430]/50 text-[#CBD5E1]">
                  {paperTrades.map((t) => (
                    <tr key={t.id} className="hover:bg-[#141824]">
                      <td className="py-2.5 text-[#94A3B8]">{t.timestamp}</td>
                      <td className="py-2.5 font-bold text-[#E2E8F0]">{t.symbol}</td>
                      <td className="py-2.5">
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                            t.side === "LONG"
                              ? "bg-[#10B981]/10 text-[#10B981]"
                              : "bg-[#F43F5E]/10 text-[#F43F5E]"
                          }`}
                        >
                          {t.side}
                        </span>
                      </td>
                      <td className="py-2.5 text-right">${t.entry_px}</td>
                      <td className="py-2.5 text-right text-[#F43F5E]">${t.sl_px}</td>
                      <td className="py-2.5 text-right text-[#10B981]">${t.tp_px}</td>
                      <td className="py-2.5 text-right font-semibold text-[#38BDF8]">
                        {t.confluence}/100
                      </td>
                      <td
                        className={`py-2.5 text-right font-bold ${
                          t.pnl_pct >= 0 ? "text-[#10B981]" : "text-[#F43F5E]"
                        }`}
                      >
                        {t.pnl_pct >= 0 ? "+" : ""}
                        {t.pnl_pct.toFixed(2)}%
                      </td>
                      <td className="py-2.5 text-center">
                        <span className="rounded bg-[#1E293B] px-2 py-0.5 text-[10px] text-[#38BDF8]">
                          {t.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Quantitative Confluence & Intelligence Panel (4 cols) */}
        <div className="space-y-4 xl:col-span-4">
          {/* A. Confluence Score Gauge Card */}
          <div className="rounded border border-[#1F2430] bg-[#0E1118] p-5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-semibold text-[#8E9BAE]">
                CONFLUENCE SCORE
              </span>
              <span className="rounded bg-[#10B981]/15 px-2 py-0.5 font-mono text-[11px] font-bold text-[#10B981]">
                {activeAsset.confluence_score >= 80 ? "HIGH PROBABILITY" : "WAITING FILTER"}
              </span>
            </div>

            <div className="my-4 flex items-baseline gap-2">
              <span className="font-mono text-4xl font-extrabold tracking-tight text-[#F8FAFC]">
                {activeAsset.confluence_score}
              </span>
              <span className="font-mono text-sm text-[#64748B]">/ 100 PTS</span>
            </div>

            <div className="space-y-2 border-t border-[#1F2430] pt-3 text-xs font-mono">
              <div className="flex items-center justify-between text-[#94A3B8]">
                <span>1. Macro Trend (EMA 21/50 + ADX 14)</span>
                <span className="text-[#10B981] font-semibold">+20 PTS</span>
              </div>
              <div className="flex items-center justify-between text-[#94A3B8]">
                <span>2. 5-Bar Exhaustion (ATR + RSI-5)</span>
                <span className="text-[#10B981] font-semibold">+20 PTS</span>
              </div>
              <div className="flex items-center justify-between text-[#94A3B8]">
                <span>3. Retail RR Trap (1:1.5 - 1:2.0 Mapped)</span>
                <span className="text-[#10B981] font-semibold">+20 PTS</span>
              </div>
              <div className="flex items-center justify-between text-[#94A3B8]">
                <span>4. Sweep Pinbar Rejection (RVOL ≥ 2.0x)</span>
                <span className="text-[#10B981] font-semibold">+25 PTS</span>
              </div>
              <div className="flex items-center justify-between text-[#94A3B8]">
                <span>5. RSI Divergence / Open Interest Drop</span>
                <span className="text-[#64748B]">0 PTS</span>
              </div>
            </div>

            {/* Quick Action Button to Mark Simulated Trade */}
            <div className="mt-5">
              <button
                onClick={handleMarkPaperTrade}
                className="w-full rounded border border-[#10B981] bg-[#10B981]/15 py-2.5 font-mono text-xs font-bold text-[#10B981] transition hover:bg-[#10B981]/25 active:scale-98"
              >
                MARK SIMULATED SWEEP ENTRY (PAPER TRADE)
              </button>
            </div>
          </div>

          {/* B. Multi-Timeframe Regime Matrix */}
          <div className="rounded border border-[#1F2430] bg-[#0E1118] p-5">
            <div className="flex items-center gap-2 border-b border-[#1F2430] pb-2.5">
              <Layers className="h-4 w-4 text-[#38BDF8]" />
              <h3 className="font-mono text-xs font-bold tracking-wider text-[#F8FAFC]">
                MTF SIKLUS REGIME MATRIX
              </h3>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 font-mono text-xs">
              <div className="rounded border border-[#1F2430] bg-[#121622] p-2.5">
                <span className="text-[10px] text-[#64748B]">1M CYCLE (MAKRO)</span>
                <div className="mt-1 font-bold text-[#10B981]">BULLISH TREND</div>
              </div>
              <div className="rounded border border-[#1F2430] bg-[#121622] p-2.5">
                <span className="text-[10px] text-[#64748B]">1W CYCLE (INTERMEDIATE)</span>
                <div className="mt-1 font-bold text-[#10B981]">BULLISH PULLBACK</div>
              </div>
              <div className="rounded border border-[#1F2430] bg-[#121622] p-2.5">
                <span className="text-[10px] text-[#64748B]">1D EXHAUSTION (4/5 BARS)</span>
                <div className="mt-1 font-bold text-[#D97706]">WARNING STATE</div>
              </div>
              <div className="rounded border border-[#1F2430] bg-[#121622] p-2.5">
                <span className="text-[10px] text-[#64748B]">H4 SWEEP EXECUTION</span>
                <div className="mt-1 font-bold text-[#38BDF8]">SWEEP CONFIRMED</div>
              </div>
            </div>
          </div>

          {/* C. Active Liquidity Pools Detected */}
          <div className="rounded border border-[#1F2430] bg-[#0E1118] p-5">
            <div className="flex items-center justify-between border-b border-[#1F2430] pb-2.5">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-[#D97706]" />
                <h3 className="font-mono text-xs font-bold tracking-wider text-[#F8FAFC]">
                  MAPPED RETAIL LIQUIDITY POOLS
                </h3>
              </div>
              <span className="font-mono text-[10px] text-[#94A3B8]">FRACTAL 5-BAR</span>
            </div>

            <div className="mt-3 space-y-2.5 font-mono text-xs">
              {pools.map((p) => (
                <div
                  key={p.pool_id}
                  className="flex items-center justify-between rounded border border-[#1F2430] bg-[#121622] p-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#E2E8F0]">{p.pool_type}</span>
                      <span className="text-[10px] text-[#8E9BAE]">RR {p.retail_rr}</span>
                    </div>
                    <div className="mt-0.5 text-[#94A3B8]">
                      Trigger Level: ${p.pool_price.toLocaleString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                        p.status === "SWEPT"
                          ? "bg-[#D97706]/15 text-[#D97706]"
                          : "bg-[#10B981]/15 text-[#10B981]"
                      }`}
                    >
                      {p.status}
                    </span>
                    {p.swept_ago && (
                      <div className="mt-1 text-[10px] text-[#64748B]">{p.swept_ago}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* D. Quantitative Backtest Benchmark Card */}
          <div className="rounded border border-[#1F2430] bg-[#0E1118] p-5">
            <span className="font-mono text-xs font-semibold text-[#8E9BAE]">
              VALIDATED BACKTEST METRICS (2025 - 2026)
            </span>
            <div className="mt-3 grid grid-cols-2 gap-3 font-mono text-xs">
              <div className="rounded bg-[#121622] p-2 border border-[#1F2430]">
                <div className="text-[10px] text-[#64748B]">WIN RATE</div>
                <div className="text-base font-bold text-[#10B981]">72.5%</div>
              </div>
              <div className="rounded bg-[#121622] p-2 border border-[#1F2430]">
                <div className="text-[10px] text-[#64748B]">PROFIT FACTOR</div>
                <div className="text-base font-bold text-[#E2E8F0]">2.38</div>
              </div>
              <div className="rounded bg-[#121622] p-2 border border-[#1F2430]">
                <div className="text-[10px] text-[#64748B]">MAX DRAWDOWN</div>
                <div className="text-base font-bold text-[#38BDF8]">-6.8%</div>
              </div>
              <div className="rounded bg-[#121622] p-2 border border-[#1F2430]">
                <div className="text-[10px] text-[#64748B]">SHARPE RATIO</div>
                <div className="text-base font-bold text-[#E2E8F0]">1.85</div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
