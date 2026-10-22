"use client";

import React, { useEffect, useRef } from "react";
import {
  createChart,
  ColorType,
  LineStyle,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  IChartApi,
  ISeriesApi,
} from "lightweight-charts";
import type { ParallelChannel } from "@/lib/quant-engine/parallelChannel";

export interface CandleData {
  time: string | number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface LiquidityPool {
  pool_id: number;
  pool_type: "BUY_SL" | "SELL_SL";
  pool_price: number;
  retail_rr: number;
  status: "SWEPT" | "PENDING";
  swept_ago?: string | null;
}

export interface ActiveTradeMarker {
  side: "LONG" | "SHORT";
  entry_px: number;
  sl_px: number;
  tp_px: number;
}

interface LightweightChartProps {
  symbol: string;
  timeframe: string;
  candles: CandleData[];
  pools: LiquidityPool[];
  activePosition?: ActiveTradeMarker | null;
  liveTickPrice?: number | null;
  height?: number;
  channel?: ParallelChannel | null;
}

export default function LightweightChart({
  symbol,
  timeframe,
  candles,
  pools,
  activePosition = null,
  liveTickPrice = null,
  height = 520,
  channel = null,
}: LightweightChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const lastBarRef = useRef<CandleData | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Initialize chart
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: height,
      layout: {
        background: { type: ColorType.Solid, color: "#0B0D13" },
        textColor: "#8E9BAE",
        fontSize: 11,
        fontFamily: "var(--font-geist-mono), monospace",
      },
      grid: {
        vertLines: { color: "#151821" },
        horzLines: { color: "#151821" },
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: "#333D52",
          width: 1,
          style: LineStyle.Dashed,
        },
        horzLine: {
          color: "#333D52",
          width: 1,
          style: LineStyle.Dashed,
        },
      },
      rightPriceScale: {
        borderColor: "#1F2430",
        scaleMargins: {
          top: 0.1,
          bottom: 0.2,
        },
      },
      timeScale: {
        borderColor: "#1F2430",
        timeVisible: true,
        secondsVisible: false,
      },
    });

    chartRef.current = chart;

    // Candlestick series
    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#10B981",
      downColor: "#F43F5E",
      borderUpColor: "#10B981",
      borderDownColor: "#F43F5E",
      wickUpColor: "#10B981",
      wickDownColor: "#F43F5E",
    });

    // Ensure data is chronologically ascending with strictly unique timestamps
    const timeMap = new Map<string, CandleData>();
    candles.forEach((c) => {
      timeMap.set(String(c.time), c);
    });

    const sortedCandles = Array.from(timeMap.values()).sort((a, b) => {
      const ta = typeof a.time === "number" ? a.time : new Date(a.time).getTime() / 1000;
      const tb = typeof b.time === "number" ? b.time : new Date(b.time).getTime() / 1000;
      return ta - tb;
    });

    candlestickSeriesRef.current = candlestickSeries;
    if (sortedCandles.length > 0) {
      candlestickSeries.setData(sortedCandles as any);
      lastBarRef.current = sortedCandles[sortedCandles.length - 1];

      // Volume series at bottom
      const volumeSeries = chart.addSeries(HistogramSeries, {
        color: "#1F2937",
        priceFormat: {
          type: "volume",
        },
        priceScaleId: "",
      });

      volumeSeries.priceScale().applyOptions({
        scaleMargins: {
          top: 0.82,
          bottom: 0,
        },
      });

      const volumeData = sortedCandles.map((c) => ({
        time: c.time as any,
        value: c.volume || 450,
        color: c.close >= c.open ? "rgba(16, 185, 129, 0.25)" : "rgba(244, 63, 94, 0.25)",
      }));
      volumeSeries.setData(volumeData as any);
    }

    // Draw active liquidity pool price lines
    pools.forEach((pool) => {
      const isBuySL = pool.pool_type === "BUY_SL";
      const isSwept = pool.status === "SWEPT";
      const lineColor = isSwept ? "#D97706" : isBuySL ? "#F43F5E" : "#10B981";

      candlestickSeries.createPriceLine({
        price: pool.pool_price,
        color: lineColor,
        lineWidth: 1,
        lineStyle: isSwept ? LineStyle.Solid : LineStyle.Dashed,
        axisLabelVisible: true,
        title: `${pool.pool_type} [${pool.status}] $${pool.pool_price}`,
      });
    });

    // Draw active position lines (Entry, Stop Loss, Take Profit)
    if (activePosition) {
      // Entry Line (Cyan Dashed)
      candlestickSeries.createPriceLine({
        price: activePosition.entry_px,
        color: "#38BDF8",
        lineWidth: 2,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: `ENTRY [${activePosition.side}] $${activePosition.entry_px}`,
      });

      // Stop Loss Line (Rose Solid)
      candlestickSeries.createPriceLine({
        price: activePosition.sl_px,
        color: "#F43F5E",
        lineWidth: 2,
        lineStyle: LineStyle.Solid,
        axisLabelVisible: true,
        title: `STOP LOSS $${activePosition.sl_px}`,
      });

      // Take Profit Line (Emerald Solid)
      candlestickSeries.createPriceLine({
        price: activePosition.tp_px,
        color: "#10B981",
        lineWidth: 2,
        lineStyle: LineStyle.Solid,
        axisLabelVisible: true,
        title: `TAKE PROFIT $${activePosition.tp_px}`,
      });
    }

    // Draw Parallel Channel envelopes (Upper, Midline 50%, Lower)
    if (channel && sortedCandles.length >= 2) {
      const channelCandles = sortedCandles.filter((c) => {
        const ct = typeof c.time === "number" ? c.time : new Date(c.time).getTime() / 1000;
        const st = typeof channel.start_time === "number" ? channel.start_time : new Date(channel.start_time).getTime() / 1000;
        const et = typeof channel.end_time === "number" ? channel.end_time : new Date(channel.end_time).getTime() / 1000;
        return ct >= st && ct <= et;
      });

      const pts = channelCandles.length >= 2 ? channelCandles : sortedCandles.slice(-25);

      if (pts.length >= 2) {
        const upperLineData = pts.map((c, idx) => ({
          time: c.time as any,
          value: parseFloat((channel.upper_intercept + channel.slope * idx).toFixed(4)),
        }));

        const midLineData = pts.map((c, idx) => ({
          time: c.time as any,
          value: parseFloat((channel.mid_intercept + channel.slope * idx).toFixed(4)),
        }));

        const lowerLineData = pts.map((c, idx) => ({
          time: c.time as any,
          value: parseFloat((channel.lower_intercept + channel.slope * idx).toFixed(4)),
        }));

        // Upper channel line (Cyan Solid #38BDF8)
        const upperSeries = chart.addSeries(LineSeries, {
          color: "#38BDF8",
          lineWidth: 2,
          lineStyle: LineStyle.Solid,
          title: `CHANNEL RESISTANCE ($${channel.upper_price.toFixed(2)})`,
          crosshairMarkerVisible: false,
          lastValueVisible: true,
          priceLineVisible: false,
        });
        upperSeries.setData(upperLineData);

        // Midline 50% (Slate Dashed #94A3B8)
        const midSeries = chart.addSeries(LineSeries, {
          color: "#94A3B8",
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          title: `MIDLINE 50% ($${channel.mid_price.toFixed(2)})`,
          crosshairMarkerVisible: false,
          lastValueVisible: true,
          priceLineVisible: false,
        });
        midSeries.setData(midLineData);

        // Lower channel line (Cyan Solid #38BDF8)
        const lowerSeries = chart.addSeries(LineSeries, {
          color: "#38BDF8",
          lineWidth: 2,
          lineStyle: LineStyle.Solid,
          title: `CHANNEL SUPPORT ($${channel.lower_price.toFixed(2)})`,
          crosshairMarkerVisible: false,
          lastValueVisible: true,
          priceLineVisible: false,
        });
        lowerSeries.setData(lowerLineData);
      }
    }

    // Auto-fit content
    chart.timeScale().fitContent();

    // Resize observer
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
      chartRef.current = null;
      candlestickSeriesRef.current = null;
    };
  }, [candles, pools, activePosition, channel, height]);

  // Real-Time Live Ticker Dynamic Candle Update Effect
  useEffect(() => {
    if (!liveTickPrice || !candlestickSeriesRef.current || !lastBarRef.current) return;
    const current = lastBarRef.current;
    const updated: CandleData = {
      ...current,
      high: Math.max(current.high, liveTickPrice),
      low: Math.min(current.low, liveTickPrice),
      close: liveTickPrice,
    };
    lastBarRef.current = updated;
    try {
      candlestickSeriesRef.current.update(updated as any);
    } catch {
      // Ignore if timeframe format differs
    }
  }, [liveTickPrice]);

  return (
    <div className="relative w-full rounded-lg border border-[#1F2430] bg-[#0B0D13] overflow-hidden">
      <div className="flex items-center justify-between border-b border-[#1F2430] px-4 py-2 bg-[#0E1118]">
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm font-semibold text-[#E2E8F0]">
            {symbol}
          </span>
          <span className="rounded bg-[#1A1F2C] px-2 py-0.5 font-mono text-[11px] text-[#94A3B8]">
            {timeframe}
          </span>
          <span className="flex items-center gap-1.5 font-mono text-xs text-[#10B981]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#10B981] animate-pulse"></span>
            FEED ACTIVE
          </span>
          {candles.length > 0 && (
            <span className="hidden sm:inline-flex items-center gap-1 font-mono text-[11px] text-[#94A3B8] border-l border-[#1F2430] pl-3">
              <span>CANDLE:</span>
              <strong className="text-[#F8FAFC]">{String(candles[candles.length - 1]?.time)}</strong>
              <span className="text-[#64748B]">|</span>
              <span>CLOSE:</span>
              <strong className="text-[#38BDF8]">${candles[candles.length - 1]?.close}</strong>
            </span>
          )}
          {channel && (
            <span className="hidden md:inline-flex items-center gap-1.5 font-mono text-[11px] rounded bg-[#38BDF8]/10 border border-[#38BDF8]/30 px-2 py-0.5 text-[#38BDF8]">
              <span>KANAL:</span>
              <strong className="font-bold">{channel.slope_type}</strong>
              {channel.anchor_high && (
                <>
                  <span className="text-[#64748B]">|</span>
                  <span>SWING H: <strong className="text-white">${channel.anchor_high.price < 1 ? channel.anchor_high.price.toFixed(6) : channel.anchor_high.price.toFixed(2)}</strong></span>
                </>
              )}
              {channel.anchor_low && (
                <>
                  <span className="text-[#64748B]">|</span>
                  <span>SWING L: <strong className="text-white">${channel.anchor_low.price < 1 ? channel.anchor_low.price.toFixed(6) : channel.anchor_low.price.toFixed(2)}</strong></span>
                </>
              )}
              <span className="text-[#64748B]">|</span>
              <span>H: ${(channel.channel_height).toFixed(2)}</span>
            </span>
          )}
          {liveTickPrice && (
            <span className="rounded border border-[#10B981]/50 bg-[#10B981]/15 px-2 py-0.5 font-mono text-[11px] font-bold text-[#10B981] animate-fade-in">
              LIVE TICK: ${liveTickPrice < 1 ? liveTickPrice.toFixed(6) : liveTickPrice.toFixed(2)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] text-[#64748B]">
            INSTITUTIONAL LIQUIDITY & PARALLEL CHANNEL ENGINE
          </span>
        </div>
      </div>
      <div ref={chartContainerRef} className="w-full" style={{ height: `${height}px` }} />
    </div>
  );
}
