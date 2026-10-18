"use client";

import React, { useEffect, useRef } from "react";
import {
  createChart,
  ColorType,
  LineStyle,
  CandlestickSeries,
  HistogramSeries,
  IChartApi,
  ISeriesApi,
} from "lightweight-charts";

export interface CandleData {
  time: string;
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
  height?: number;
}

export default function LightweightChart({
  symbol,
  timeframe,
  candles,
  pools,
  activePosition = null,
  height = 520,
}: LightweightChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

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
      return String(a.time).localeCompare(String(b.time));
    });

    if (sortedCandles.length > 0) {
      candlestickSeries.setData(sortedCandles);

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
        time: c.time,
        value: c.volume || 450,
        color: c.close >= c.open ? "rgba(16, 185, 129, 0.25)" : "rgba(244, 63, 94, 0.25)",
      }));
      volumeSeries.setData(volumeData);
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
    };
  }, [candles, pools, activePosition, height]);

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
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] text-[#64748B]">
            INSTITUTIONAL LIQUIDITY ENGINE v1.0
          </span>
        </div>
      </div>
      <div ref={chartContainerRef} className="w-full" style={{ height: `${height}px` }} />
    </div>
  );
}
