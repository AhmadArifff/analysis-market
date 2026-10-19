"use client";

import React, { useEffect, useRef, memo } from "react";

const TV_SYMBOL_MAP: Record<string, string> = {
  XAUUSD: "OANDA:XAUUSD",
  BTCUSDT: "BINANCE:BTCUSDT",
  ETHUSDT: "BINANCE:ETHUSDT",
  SOLUSDT: "BINANCE:SOLUSDT",
  BNBUSDT: "BINANCE:BNBUSDT",
  DOGEUSDT: "BINANCE:DOGEUSDT",
  PEPEUSDT: "BINANCE:PEPEUSDT",
};

const TV_INTERVAL_MAP: Record<string, string> = {
  "1m": "1",
  "5m": "5",
  "15m": "15",
  "30m": "30",
  "45m": "45",
  "1h": "60",
  "4h": "240",
  "1D": "D",
  "1W": "W",
  "1M": "M",
};

interface TradingViewWidgetProps {
  symbol: string;
  timeframe?: string;
  height?: number;
}

function TradingViewWidgetComponent({
  symbol,
  timeframe = "1D",
  height = 520,
}: TradingViewWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const tvSymbol = TV_SYMBOL_MAP[symbol] || `BINANCE:${symbol}`;
  const tvInterval = TV_INTERVAL_MAP[timeframe] || "D";

  useEffect(() => {
    if (!containerRef.current) return;

    // Reset container
    containerRef.current.innerHTML = "";

    const widgetDiv = document.createElement("div");
    widgetDiv.className = "tradingview-widget-container__widget";
    widgetDiv.style.height = `${height}px`;
    widgetDiv.style.width = "100%";
    containerRef.current.appendChild(widgetDiv);

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: tvSymbol,
      interval: tvInterval,
      timezone: "Asia/Jakarta",
      theme: "dark",
      style: "1",
      locale: "en",
      backgroundColor: "rgba(9, 10, 15, 1)",
      gridColor: "rgba(31, 36, 48, 0.4)",
      enable_publishing: false,
      hide_top_toolbar: false,
      hide_legend: false,
      save_image: false,
      calendar: false,
      hide_volume: false,
      support_host: "https://www.tradingview.com",
    });

    containerRef.current.appendChild(script);

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, [tvSymbol, tvInterval, height]);

  return (
    <div
      className="tradingview-widget-container w-full rounded-lg border border-[#1F2430] bg-[#090A0F] overflow-hidden"
      ref={containerRef}
      style={{ height: `${height}px` }}
    />
  );
}

export default memo(TradingViewWidgetComponent);
