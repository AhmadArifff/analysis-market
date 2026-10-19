"use client";

import React, { useMemo } from "react";
import {
  X,
  TrendingUp,
  ShieldCheck,
  AlertTriangle,
  Activity,
  Layers,
  BarChart3,
} from "lucide-react";
import { ReplayTrade } from "@/lib/quant-engine/simulator";
import { runMonteCarloSimulation, MonteCarloResult } from "@/lib/quant-engine/monteCarlo";

interface MonteCarloModalProps {
  isOpen: boolean;
  onClose: () => void;
  trades: ReplayTrade[];
  initialCapital?: number;
}

export default function MonteCarloModal({
  isOpen,
  onClose,
  trades,
  initialCapital = 10000,
}: MonteCarloModalProps) {
  const result: MonteCarloResult = useMemo(() => {
    if (!isOpen || trades.length === 0) {
      return {
        simulationsCount: 0,
        initialCapital,
        medianEndingCapital: initialCapital,
        percentile5EndingCapital: initialCapital,
        percentile95EndingCapital: initialCapital,
        worstCaseMaxDrawdownPct: 0,
        averageMaxDrawdownPct: 0,
        profitProbabilityPct: 0,
        sampleEquityCurves: [],
      };
    }
    return runMonteCarloSimulation(trades, { initialCapital, simulationsCount: 1000 });
  }, [isOpen, trades, initialCapital]);

  if (!isOpen) return null;

  const isResilient = result.profitProbabilityPct >= 75 && result.worstCaseMaxDrawdownPct < 30;
  const isModerate = result.profitProbabilityPct >= 50;

  // Compute SVG scale for fan chart
  const allPoints = result.sampleEquityCurves.flat();
  const maxEquity = allPoints.length > 0 ? Math.max(...allPoints) : initialCapital * 1.5;
  const minEquity = allPoints.length > 0 ? Math.min(...allPoints) : initialCapital * 0.7;
  const rangeEquity = Math.max(1, maxEquity - minEquity);

  const svgWidth = 560;
  const svgHeight = 200;

  const curveColors = [
    "#38BDF8", // Cyan
    "#10B981", // Emerald
    "#8B5CF6", // Purple
    "#F59E0B", // Amber
    "#EC4899", // Pink
    "#06B6D4", // Teal
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-fade-in">
      <div className="w-full max-w-2xl rounded-xl border border-[#1F2430] bg-[#090A0F] p-6 text-[#E2E8F0] shadow-2xl space-y-5">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#1F2430] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/40">
              <BarChart3 className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-mono text-sm font-bold tracking-wider text-[#F8FAFC]">
                  MONTE CARLO RISK STRESS-TEST (1,000 SIMULATIONS)
                </h3>
                <span className="rounded bg-[#10B981]/15 px-2 py-0.5 font-mono text-[10px] font-bold text-[#10B981] border border-[#10B981]/40">
                  BOOTSTRAP RESAMPLING
                </span>
              </div>
              <p className="font-mono text-[11px] text-[#64748B]">
                Analisis ketahanan strategi terhadap 1.000 urutan acak trade masa lalu
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-[#64748B] hover:bg-[#1A1F2C] hover:text-[#E2E8F0] transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 4 Core Quantitative Metrics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
          <div className="rounded border border-[#1F2430] bg-[#0E1118] p-3">
            <span className="text-[10px] text-[#64748B] block">MEDIAN ENDING EQUITY</span>
            <div className="text-base font-bold text-[#10B981] mt-1">
              ${result.medianEndingCapital.toLocaleString()}
            </div>
            <span className="text-[10px] text-[#8E9BAE]">
              {result.medianEndingCapital >= initialCapital ? "+" : ""}
              {(((result.medianEndingCapital - initialCapital) / initialCapital) * 100).toFixed(1)}% Return
            </span>
          </div>

          <div className="rounded border border-[#1F2430] bg-[#0E1118] p-3">
            <span className="text-[10px] text-[#64748B] block">PROBABILITY OF PROFIT</span>
            <div className={`text-base font-bold mt-1 ${result.profitProbabilityPct >= 65 ? "text-[#10B981]" : "text-[#D97706]"}`}>
              {result.profitProbabilityPct}%
            </div>
            <span className="text-[10px] text-[#8E9BAE]">dari 1,000 iterasi</span>
          </div>

          <div className="rounded border border-[#1F2430] bg-[#0E1118] p-3">
            <span className="text-[10px] text-[#64748B] block">95% WORST DRAWDOWN</span>
            <div className="text-base font-bold text-[#F43F5E] mt-1">
              -{result.worstCaseMaxDrawdownPct}%
            </div>
            <span className="text-[10px] text-[#8E9BAE]">Batas risiko terburuk</span>
          </div>

          <div className="rounded border border-[#1F2430] bg-[#0E1118] p-3">
            <span className="text-[10px] text-[#64748B] block">95% CONFIDENCE RANGE</span>
            <div className="text-xs font-bold text-[#38BDF8] mt-1.5 truncate">
              ${Math.round(result.percentile5EndingCapital).toLocaleString()} - ${Math.round(result.percentile95EndingCapital).toLocaleString()}
            </div>
            <span className="text-[10px] text-[#8E9BAE]">P5 (Konservatif) - P95 (Optimis)</span>
          </div>
        </div>

        {/* SVG Equity Curves Fan Chart */}
        <div className="rounded border border-[#1F2430] bg-[#0B0D13] p-4">
          <div className="flex items-center justify-between border-b border-[#1F2430] pb-2 mb-3 font-mono text-xs text-[#8E9BAE]">
            <span>BOOTSTRAP EQUITY TRAJECTORY (SAMPEL 6 JALUR RANDOM)</span>
            <span className="text-[#10B981]">MODAL AWAL: ${initialCapital.toLocaleString()}</span>
          </div>

          <div className="w-full overflow-hidden flex justify-center">
            <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-44">
              {/* Baseline Horizontal Line */}
              <line
                x1={0}
                y1={svgHeight - ((initialCapital - minEquity) / rangeEquity) * svgHeight}
                x2={svgWidth}
                y2={svgHeight - ((initialCapital - minEquity) / rangeEquity) * svgHeight}
                stroke="#333D52"
                strokeDasharray="4"
                strokeWidth={1}
              />

              {/* Sample Curves */}
              {result.sampleEquityCurves.map((curve, cIdx) => {
                if (curve.length < 2) return null;
                const stepX = svgWidth / (curve.length - 1);
                const points = curve
                  .map((val, idx) => {
                    const x = idx * stepX;
                    const y = svgHeight - ((val - minEquity) / rangeEquity) * (svgHeight - 20) - 10;
                    return `${x},${y}`;
                  })
                  .join(" ");

                return (
                  <polyline
                    key={cIdx}
                    fill="none"
                    stroke={curveColors[cIdx % curveColors.length]}
                    strokeWidth={1.75}
                    strokeOpacity={0.85}
                    points={points}
                  />
                );
              })}
            </svg>
          </div>
        </div>

        {/* Resilience Verdict Box */}
        <div className={`flex items-center gap-3 rounded border p-3 font-mono text-xs ${
          isResilient
            ? "border-[#10B981]/50 bg-[#10B981]/10 text-[#10B981]"
            : isModerate
            ? "border-[#D97706]/50 bg-[#D97706]/10 text-[#D97706]"
            : "border-[#F43F5E]/50 bg-[#F43F5E]/10 text-[#F43F5E]"
        }`}>
          {isResilient ? (
            <ShieldCheck className="h-5 w-5 shrink-0" />
          ) : (
            <AlertTriangle className="h-5 w-5 shrink-0" />
          )}
          <div>
            <div className="font-bold">
              {isResilient
                ? "STRATEGI TAHAN UJI (HIGHLY RESILIENT ALGORITHM)"
                : isModerate
                ? "KETAHANAN MODERAT (MODERATE RESILIENCE)"
                : "RISIKO TINGGI (HIGH DRAWDOWN SENSITIVITY)"}
            </div>
            <div className="text-[11px] opacity-90">
              {isResilient
                ? `Peluang profit ${result.profitProbabilityPct}% dengan proyeksi median $${result.medianEndingCapital.toLocaleString()}. Risiko kebangkrutan sangat rendah.`
                : `Peluang profit ${result.profitProbabilityPct}%. Disarankan menggunakan rasio risiko maksimal 0.5%–1.0% per trade untuk menjaga stabilitas equity.`}
            </div>
          </div>
        </div>

        {/* Modal Close Button */}
        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="rounded border border-[#38BDF8] bg-[#38BDF8] px-5 py-2 font-mono text-xs font-bold text-[#090A0F] hover:bg-[#38BDF8]/90 transition"
          >
            TUTUP SIMULASI
          </button>
        </div>
      </div>
    </div>
  );
}
