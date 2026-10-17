/**
 * TradingView Lightweight Charts Adapter Stub
 * Project: Analysis-Market
 * 
 * Menangani rendering Candlestick Series dan Custom Overlays untuk:
 * - Active Retail Liquidity Pools (Boxes)
 * - Liquidity Sweep Marker (Wick Rejection)
 */

import { createChart, IChartApi, ISeriesApi, CandlestickData, Time, SeriesMarker } from 'lightweight-charts';

export interface LiquidityPoolOverlay {
  id: string;
  type: 'BUY_SIDE' | 'SELL_SIDE';
  priceLevel: number;
  timeStart: Time;
  timeEnd?: Time;
  rrRatio: number;
  isSwept: boolean;
}

export class TradingViewChartAdapter {
  private chart: IChartApi | null = null;
  private candleSeries: ISeriesApi<'Candlestick'> | null = null;

  public initialize(container: HTMLElement): IChartApi {
    this.chart = createChart(container, {
      width: container.clientWidth,
      height: 520,
      layout: {
        background: { color: '#131722' },
        textColor: '#d1d4dc',
      },
      grid: {
        vertLines: { color: 'rgba(42, 46, 57, 0.5)' },
        horzLines: { color: 'rgba(42, 46, 57, 0.5)' },
      },
      crosshair: {
        mode: 1, // Normal crosshair
      },
      timeScale: {
        borderColor: '#2a2e39',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    this.candleSeries = this.chart.addCandlestickSeries({
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    });

    return this.chart;
  }

  public setCandleData(candles: CandlestickData<Time>[]): void {
    if (this.candleSeries) {
      this.candleSeries.setData(candles);
    }
  }

  public updateRealtimeCandle(candle: CandlestickData<Time>): void {
    if (this.candleSeries) {
      this.candleSeries.update(candle);
    }
  }

  public addSweepMarkers(markers: SeriesMarker<Time>[]): void {
    if (this.candleSeries) {
      this.candleSeries.setMarkers(markers);
    }
  }

  public destroy(): void {
    if (this.chart) {
      this.chart.remove();
      this.chart = null;
      this.candleSeries = null;
    }
  }
}
