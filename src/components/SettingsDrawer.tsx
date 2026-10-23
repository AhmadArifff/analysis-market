"use client";

import React, { useState } from "react";
import {
  X,
  Sliders,
  DollarSign,
  Shield,
  Volume2,
  VolumeX,
  Bell,
  Send,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Layers,
  Check,
} from "lucide-react";
import { terminalAudio } from "@/lib/alerts/audioChime";
import {
  ChartPatternId,
  ChartPatternCategory,
  CHART_PATTERN_CATALOG,
  ALL_PATTERN_IDS,
  getDefaultEnabledPatterns,
} from "@/lib/quant-engine/chartPatterns";
import PatternVisualAsset from "@/components/PatternVisualAsset";

export interface StrategySettings {
  initialCapital: number;
  lotSize: number; // e.g. 0.10, 1.0, 0.01 (Configurable dummy lot)
  useDynamicLot: boolean; // Auto Risk % Lot vs Fixed Lot
  riskPerTradePct: number;
  atrBufferMultiplier: number; // e.g. 0.50 (default: 0.50x ATR)
  cooldownBarsAfterLoss: number; // e.g. 3 bars cooldown after a loss
  minWickRatio: number; // e.g. 0.20 (20%)
  retailRRThreshold: number; // e.g. 1.5
  confluenceThreshold: number; // e.g. 80
  cryptoFeePct: number; // e.g. 0.05%
  forexSpreadCents: number; // e.g. $0.20

  // Skema Strategi Toggles (Checklist Masuk Simulasi)
  enableLiquiditySweep: boolean; // 1. Mapped Retail Stop Loss Hunt (Sweep Entry)
  enableParallelChannel: boolean; // 2. Parallel Channel (Swing H/L Bounce & Break/Retest)
  enableFVGConfluence: boolean; // 3. Fair Value Gap Imbalance Confluence
  enableKillzones: boolean; // 4. Session Killzones (London/NY Open for Forex)
  enableTrendFilter: boolean; // 5. Macro Trend Alignment (EMA 21/50 + ADX 14)
  enableVolumeFilter: boolean; // 6. Relative Volume Spikes (RVOL >= 1.5x + CVD)
  enableTrendRunner: boolean; // 7. Trend Runner / Liquidity Void Continuation (No-Sweep Flow)
  enableDoubleTopBottom: boolean; // 8. Skema Double Top & Double Bottom (M & W Reversals)
  doubleTopBottomTolerance: number; // Toleransi deviasi puncak/lembah (misal: 1.5%)

  // 20 Pola Karakteristik Chart Klasik Toggles
  enablePatternTrades: boolean; // Master toggle eksekusi breakout pola chart
  enabledPatterns: Record<ChartPatternId, boolean>; // Checklist per individual pola

  // Channel Anchoring Configuration
  channelLookback: number; // Lookback bars for parallel channel detection (default: 25)
  channelAnchorMode: "SWING_HIGHLOW" | "REGRESSION"; // Patokan Kanal: Swing High & Low vs Linear Regression

  soundEnabled: boolean;
  discordWebhookUrl: string;
  telegramToken: string;
  telegramChatId: string;
}

export const DEFAULT_SETTINGS: StrategySettings = {
  initialCapital: 10000,
  lotSize: 0.10,
  useDynamicLot: false,
  riskPerTradePct: 1.0,
  atrBufferMultiplier: 0.50,
  cooldownBarsAfterLoss: 3,
  minWickRatio: 0.20,
  retailRRThreshold: 1.5,
  confluenceThreshold: 80,
  cryptoFeePct: 0.05,
  forexSpreadCents: 0.2,

  enableLiquiditySweep: true,
  enableParallelChannel: true,
  enableFVGConfluence: true,
  enableKillzones: true,
  enableTrendFilter: true,
  enableVolumeFilter: true,
  enableTrendRunner: true,
  enableDoubleTopBottom: true,
  doubleTopBottomTolerance: 1.5,

  enablePatternTrades: true,
  enabledPatterns: getDefaultEnabledPatterns(),

  channelLookback: 25,
  channelAnchorMode: "SWING_HIGHLOW",

  soundEnabled: true,
  discordWebhookUrl: "",
  telegramToken: "",
  telegramChatId: "",
};

interface SettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  settings: StrategySettings;
  onSave: (newSettings: StrategySettings) => void;
  initialTab?: "risk" | "algo" | "patterns" | "alerts";
}

export default function SettingsDrawer({
  isOpen,
  onClose,
  settings,
  onSave,
  initialTab = "risk",
}: SettingsDrawerProps) {
  const [form, setForm] = useState<StrategySettings>(settings);
  const [activeTab, setActiveTab] = useState<"risk" | "algo" | "patterns" | "alerts">(initialTab);
  const [patternFilter, setPatternFilter] = useState<"ALL" | ChartPatternCategory>("ALL");
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [isTestingWebhook, setIsTestingWebhook] = useState(false);

  // Sync form and activeTab when drawer opens
  React.useEffect(() => {
    if (isOpen) {
      setForm(settings);
      if (initialTab) setActiveTab(initialTab);
    }
  }, [isOpen, initialTab, settings]);

  if (!isOpen) return null;

  const handleChange = (field: keyof StrategySettings, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const applyPreset = (preset: "SMC_CORE" | "TREND_RETEST" | "ALL_IN") => {
    if (preset === "SMC_CORE") {
      const noneActive: Record<string, boolean> = {};
      for (const id of ALL_PATTERN_IDS) noneActive[id] = false;

      setForm((prev) => ({
        ...prev,
        enableLiquiditySweep: true,
        enableTrendFilter: true,
        enableFVGConfluence: true,
        enableKillzones: true,
        enableVolumeFilter: true,
        enableParallelChannel: false,
        enableTrendRunner: true,
        enableDoubleTopBottom: false,
        enablePatternTrades: false,
        enabledPatterns: noneActive as any,
        confluenceThreshold: 80,
        atrBufferMultiplier: 0.50,
        cooldownBarsAfterLoss: 3,
        useDynamicLot: true,
      }));
    } else if (preset === "TREND_RETEST") {
      const selective: Record<string, boolean> = {};
      for (const id of ALL_PATTERN_IDS) {
        selective[id] =
          id === "BEARISH_HEAD_AND_SHOULDERS" ||
          id === "BULLISH_INVERTED_HEAD_AND_SHOULDERS" ||
          id === "BULLISH_FLAG" ||
          id === "BEARISH_FLAG";
      }

      setForm((prev) => ({
        ...prev,
        enableLiquiditySweep: true,
        enableTrendFilter: true,
        enableFVGConfluence: true,
        enableKillzones: true,
        enableVolumeFilter: true,
        enableParallelChannel: true,
        channelAnchorMode: "SWING_HIGHLOW",
        enableTrendRunner: true,
        enableDoubleTopBottom: true,
        doubleTopBottomTolerance: 1.5,
        enablePatternTrades: true,
        enabledPatterns: selective as any,
        confluenceThreshold: 80,
        atrBufferMultiplier: 0.50,
        cooldownBarsAfterLoss: 3,
        useDynamicLot: true,
      }));
    } else if (preset === "ALL_IN") {
      const allActive = getDefaultEnabledPatterns();
      setForm((prev) => ({
        ...prev,
        enableLiquiditySweep: true,
        enableParallelChannel: true,
        enableFVGConfluence: true,
        enableKillzones: true,
        enableTrendFilter: true,
        enableVolumeFilter: true,
        enableTrendRunner: true,
        enableDoubleTopBottom: true,
        doubleTopBottomTolerance: 1.5,
        enablePatternTrades: true,
        enabledPatterns: allActive,
        channelAnchorMode: "SWING_HIGHLOW",
        atrBufferMultiplier: 0.50,
        cooldownBarsAfterLoss: 3,
      }));
    }
  };

  const handleTestAudio = () => {
    terminalAudio.enabled = true;
    terminalAudio.playSweepAlert();
    setTimeout(() => {
      terminalAudio.playWinChime();
    }, 400);
  };

  const handleTestWebhook = async () => {
    setIsTestingWebhook(true);
    setTestStatus(null);
    try {
      const res = await fetch("/api/alerts/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          webhookUrl: form.discordWebhookUrl,
          telegramToken: form.telegramToken,
          telegramChatId: form.telegramChatId,
          signal: {
            symbol: "TEST_XAUUSD",
            side: "LONG",
            entry_px: 4194.8,
            sl_px: 4180.0,
            tp_px: 4224.4,
            confluence_score: 95,
            setup_type: "RETAIL_BUY_SL_SWEEP",
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTestStatus("✅ Test Sinyal Berhasil Terkirim ke Webhook!");
      } else {
        setTestStatus(`❌ Gagal: ${data.error || "Cek URL Webhook"}`);
      }
    } catch (e: any) {
      setTestStatus(`❌ Error: ${e.message}`);
    }
    setIsTestingWebhook(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    terminalAudio.enabled = form.soundEnabled;
    onSave(form);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/70 backdrop-blur-xs animate-fade-in">
      <div className="flex h-full w-full max-w-md flex-col border-l border-[#1F2430] bg-[#0B0D13] p-6 text-[#E2E8F0] shadow-2xl">
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-[#1F2430] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-[#38BDF8]/20 text-[#38BDF8] border border-[#38BDF8]/40">
              <Sliders className="h-4 w-4" />
            </div>
            <div>
              <h2 className="font-mono text-sm font-bold tracking-wider text-[#F8FAFC]">
                INSTITUTIONAL SETTINGS
              </h2>
              <p className="font-mono text-[11px] text-[#64748B]">
                Kalibrasi Parameter Kuantitatif & Notifikasi
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

        {/* Tab Navigation */}
        <div className="flex border-b border-[#1F2430] mt-4 font-mono text-xs overflow-x-auto">
          <button
            onClick={() => setActiveTab("risk")}
            className={`flex-1 py-2 px-2 whitespace-nowrap font-bold text-center border-b-2 transition ${
              activeTab === "risk"
                ? "border-[#38BDF8] text-[#38BDF8]"
                : "border-transparent text-[#64748B] hover:text-[#94A3B8]"
            }`}
          >
            CAPITAL & RISK
          </button>
          <button
            onClick={() => setActiveTab("algo")}
            className={`flex-1 py-2 px-2 whitespace-nowrap font-bold text-center border-b-2 transition ${
              activeTab === "algo"
                ? "border-[#10B981] text-[#10B981]"
                : "border-transparent text-[#64748B] hover:text-[#94A3B8]"
            }`}
          >
            SMC ALGORITHM
          </button>
          <button
            onClick={() => setActiveTab("patterns")}
            className={`flex-1 py-2 px-2 whitespace-nowrap font-bold text-center border-b-2 transition ${
              activeTab === "patterns"
                ? "border-[#F59E0B] text-[#F59E0B]"
                : "border-transparent text-[#64748B] hover:text-[#94A3B8]"
            }`}
          >
            📐 20 POLA CHART
          </button>
          <button
            onClick={() => setActiveTab("alerts")}
            className={`flex-1 py-2 px-2 whitespace-nowrap font-bold text-center border-b-2 transition ${
              activeTab === "alerts"
                ? "border-[#8B5CF6] text-[#A78BFA]"
                : "border-transparent text-[#64748B] hover:text-[#94A3B8]"
            }`}
          >
            ALERTS & NOTIF
          </button>
        </div>

        {/* Drawer Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto py-4 space-y-4 font-mono text-xs">
          {activeTab === "risk" && (
            <div className="space-y-4">
              <div>
                <label className="text-[#8E9BAE] block mb-1">MODAL AWAL AKUN ($ USD)</label>
                <input
                  type="number"
                  min={10}
                  step={100}
                  value={form.initialCapital}
                  onChange={(e) => handleChange("initialCapital", parseFloat(e.target.value) || 10000)}
                  className="w-full rounded border border-[#1F2430] bg-[#121622] px-3 py-2 text-[#F8FAFC] focus:border-[#38BDF8] focus:outline-none"
                />
              </div>

              {/* Mode Lot Sizing: Fixed vs Auto Risk % */}
              <div className="pt-1">
                <label className="text-[#8E9BAE] block mb-1.5 flex items-center justify-between">
                  <span>MODE UKURAN LOT TRADING</span>
                  <span className={form.useDynamicLot ? "text-[#10B981] font-bold" : "text-[#38BDF8] font-bold"}>
                    {form.useDynamicLot ? "🛡️ AUTO RISK %" : "MANUAL FIXED"}
                  </span>
                </label>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => handleChange("useDynamicLot", false)}
                    className={`py-2 px-3 rounded text-[11px] font-semibold border transition ${
                      !form.useDynamicLot
                        ? "bg-[#38BDF8]/20 border-[#38BDF8] text-[#38BDF8]"
                        : "bg-[#121622] border-[#1F2430] text-[#64748B] hover:text-[#94A3B8]"
                    }`}
                  >
                    MANUAL LOT (FIXED)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleChange("useDynamicLot", true)}
                    className={`py-2 px-3 rounded text-[11px] font-semibold border transition ${
                      form.useDynamicLot
                        ? "bg-[#10B981]/20 border-[#10B981] text-[#10B981]"
                        : "bg-[#121622] border-[#1F2430] text-[#64748B] hover:text-[#94A3B8]"
                    }`}
                  >
                    🛡️ AUTO RISK % (DYNAMIC)
                  </button>
                </div>

                {!form.useDynamicLot ? (
                  <div>
                    <label className="text-[#8E9BAE] block mb-1">UKURAN LOT PER ENTRY (LOTS)</label>
                    <input
                      type="number"
                      min={0.001}
                      step={0.01}
                      value={form.lotSize}
                      onChange={(e) => handleChange("lotSize", parseFloat(e.target.value) || 0.1)}
                      className="w-full rounded border border-[#1F2430] bg-[#121622] px-3 py-2 text-[#F8FAFC] focus:border-[#38BDF8] focus:outline-none"
                    />
                    <span className="text-[10px] text-[#64748B] mt-1 block">
                      Nominal lot tetap per posisi (misal 0.01, 0.10, 1.0).
                    </span>
                  </div>
                ) : (
                  <div className="rounded border border-[#10B981]/30 bg-[#10B981]/10 p-2.5 space-y-2">
                    <label className="text-[#10B981] font-bold block">RISIKO PER TRADE (% MODAL)</label>
                    <input
                      type="number"
                      min={0.1}
                      max={10}
                      step={0.1}
                      value={form.riskPerTradePct}
                      onChange={(e) => handleChange("riskPerTradePct", parseFloat(e.target.value) || 1.0)}
                      className="w-full rounded border border-[#10B981]/40 bg-[#0B0D13] px-3 py-2 text-[#F8FAFC] focus:border-[#10B981] focus:outline-none"
                    />
                    <span className="text-[10px] text-[#A7F3D0] block leading-relaxed">
                      💡 <strong>Sizing Otomatis:</strong> Lot dihitung dari <code>(Modal x Risk%) / (Jarak SL x Multiplier)</code>. Modal kecil ($100-$1000) otomatis menggunakan lot mikro (0.01) agar tahan puluhan trade tanpa margin call!
                    </span>
                  </div>
                )}
              </div>

              {/* Stop Loss ATR Buffer */}
              <div className="pt-2 border-t border-[#1F2430]">
                <label className="text-[#8E9BAE] block mb-1 flex items-center justify-between">
                  <span>BUFFER STOP LOSS (x ATR)</span>
                  <span className="text-[#38BDF8] font-bold">{form.atrBufferMultiplier || 0.5}x ATR</span>
                </label>
                <input
                  type="number"
                  min={0.15}
                  max={2.0}
                  step={0.05}
                  value={form.atrBufferMultiplier || 0.5}
                  onChange={(e) => handleChange("atrBufferMultiplier", parseFloat(e.target.value) || 0.5)}
                  className="w-full rounded border border-[#1F2430] bg-[#121622] px-3 py-2 text-[#F8FAFC] focus:border-[#38BDF8] focus:outline-none"
                />
                <span className="text-[10px] text-[#64748B] mt-1 block">
                  Jarak nafas pengaman SL dari ujung wick. Standar institusional 0.50x ATR melindungi dari false stop-out akibat spread & micro-whipsaw pasar.
                </span>
              </div>

              {/* Cooldown Bars After Loss */}
              <div>
                <label className="text-[#8E9BAE] block mb-1 flex items-center justify-between">
                  <span>JEDA SETELAH LOSS (COOLDOWN CANDLE)</span>
                  <span className="text-[#F59E0B] font-bold">{form.cooldownBarsAfterLoss || 3} Bar</span>
                </label>
                <input
                  type="number"
                  min={0}
                  max={15}
                  step={1}
                  value={form.cooldownBarsAfterLoss || 3}
                  onChange={(e) => handleChange("cooldownBarsAfterLoss", parseInt(e.target.value) || 0)}
                  className="w-full rounded border border-[#1F2430] bg-[#121622] px-3 py-2 text-[#F8FAFC] focus:border-[#F59E0B] focus:outline-none"
                />
                <span className="text-[10px] text-[#64748B] mt-1 block">
                  Mencegah overtrading saat market trending kuat. Jika posisi kena SL, algo jeda N candle sebelum boleh membuka entry baru.
                </span>
              </div>

              <div className="pt-2 border-t border-[#1F2430]">
                <label className="text-[#8E9BAE] block mb-1">KOMISI TAKER FEE KRIPTO (%)</label>
                <input
                  type="number"
                  min={0.01}
                  max={0.5}
                  step={0.01}
                  value={form.cryptoFeePct}
                  onChange={(e) => handleChange("cryptoFeePct", parseFloat(e.target.value) || 0.05)}
                  className="w-full rounded border border-[#1F2430] bg-[#121622] px-3 py-2 text-[#F8FAFC] focus:border-[#38BDF8] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[#8E9BAE] block mb-1">SPREAD FOREX EMAS ($ CENTS)</label>
                <input
                  type="number"
                  min={0.05}
                  max={2.0}
                  step={0.05}
                  value={form.forexSpreadCents}
                  onChange={(e) => handleChange("forexSpreadCents", parseFloat(e.target.value) || 0.2)}
                  className="w-full rounded border border-[#1F2430] bg-[#121622] px-3 py-2 text-[#F8FAFC] focus:border-[#38BDF8] focus:outline-none"
                />
              </div>
            </div>
          )}

          {activeTab === "algo" && (
            <div className="space-y-4">
              {/* ⚡ 1-CLICK STRATEGY PRESETS */}
              <div className="rounded border border-[#38BDF8]/40 bg-[#38BDF8]/10 p-3 space-y-2.5">
                <div className="flex items-center justify-between border-b border-[#38BDF8]/20 pb-1.5">
                  <span className="font-mono text-[11px] font-bold text-[#38BDF8] flex items-center gap-1.5">
                    <span>⚡</span> PRESET REKOMENDASI (ANTI-OVERTRADING)
                  </span>
                  <span className="text-[10px] text-[#A5F3FC] font-semibold">1-Klik Pilihan</span>
                </div>
                <p className="text-[10px] text-[#94A3B8] leading-relaxed">
                  Pilih preset teruji berikut untuk mengeliminasi pemicu entry berlebih yang sering memicu lost beruntun:
                </p>
                <div className="space-y-1.5 pt-0.5">
                  <button
                    type="button"
                    onClick={() => applyPreset("SMC_CORE")}
                    className="w-full flex items-center justify-between p-2 rounded bg-[#10B981]/15 hover:bg-[#10B981]/25 border border-[#10B981]/50 text-left transition group active:scale-[0.99]"
                  >
                    <div>
                      <div className="text-[11px] font-extrabold text-[#10B981] flex items-center gap-1">
                        <span>🏆</span> 1. INSTITUTIONAL SMC CORE (Paling Ampuh)
                      </div>
                      <div className="text-[9.5px] text-[#A7F3D0] mt-0.5">
                        Hanya Sweep Searah Tren + FVG + Macro EMA/ADX. Matikan semua pola chart minor.
                      </div>
                    </div>
                    <span className="rounded bg-[#10B981] text-[#090A0F] font-bold text-[9px] px-1.5 py-0.5 whitespace-nowrap ml-2">
                      Winrate 70%+
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => applyPreset("TREND_RETEST")}
                    className="w-full flex items-center justify-between p-2 rounded bg-[#38BDF8]/15 hover:bg-[#38BDF8]/25 border border-[#38BDF8]/50 text-left transition group active:scale-[0.99]"
                  >
                    <div>
                      <div className="text-[11px] font-extrabold text-[#38BDF8] flex items-center gap-1">
                        <span>⚡</span> 2. TREND &amp; BREAK-RETEST (Balanced RR)
                      </div>
                      <div className="text-[9.5px] text-[#BAE6FD] mt-0.5">
                        Sweep + Retest Garis Kanal Paralel + Trend Runner + Double Top/Bottom.
                      </div>
                    </div>
                    <span className="rounded bg-[#38BDF8] text-[#090A0F] font-bold text-[9px] px-1.5 py-0.5 whitespace-nowrap ml-2">
                      RR 1:2 - 1:3
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => applyPreset("ALL_IN")}
                    className="w-full flex items-center justify-between p-2 rounded bg-[#1F2430]/60 hover:bg-[#1F2430] border border-[#334155] text-left transition active:scale-[0.99]"
                  >
                    <div>
                      <div className="text-[11px] font-bold text-[#E2E8F0] flex items-center gap-1">
                        <span>🌐</span> 3. ALL-IN EXPLORATION (Semua Aktif)
                      </div>
                      <div className="text-[9.5px] text-[#64748B] mt-0.5">
                        Aktifkan seluruh 20 pola + sweep + kanal (Hanya untuk keperluan riset/benchmark).
                      </div>
                    </div>
                    <span className="rounded bg-[#334155] text-[#94A3B8] font-bold text-[9px] px-1.5 py-0.5 whitespace-nowrap ml-2">
                      High Noise
                    </span>
                  </button>
                </div>
              </div>

              {/* 1. SKEMA STRATEGI AKTIF (CHECKLIST) */}
              <div className="rounded border border-[#1F2430] bg-[#121622] p-3.5 space-y-3">
                <div className="border-b border-[#1F2430] pb-2">
                  <div className="font-bold text-[#F8FAFC] text-xs">SKEMA STRATEGI AKTIF (CHECKLIST)</div>
                  <div className="text-[10px] text-[#8E9BAE]">
                    Ceklist skema yang ingin dipakai dalam simulasi bar replay &amp; instant backtest
                  </div>
                </div>

                <div className="space-y-2">
                  {/* 1. Liquidity Sweep */}
                  <label className="flex items-start justify-between gap-3 p-2 rounded border border-[#1F2430] hover:border-[#10B981]/50 cursor-pointer transition bg-[#0E1118]">
                    <div>
                      <div className="font-semibold text-[#E2E8F0] flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]"></span>
                        1. Skema Likuiditas &amp; Retail Stop Loss Hunt
                      </div>
                      <div className="text-[10px] text-[#64748B]">
                        Perburuan Stop Loss retail (RR 1:1.5 - 1:2.0) dengan konfirmasi candle rejection pinbar
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={form.enableLiquiditySweep}
                      onChange={(e) => handleChange("enableLiquiditySweep", e.target.checked)}
                      className="h-4 w-4 accent-[#10B981] mt-0.5 cursor-pointer"
                    />
                  </label>

                  {/* 2. Parallel Channel */}
                  <label className="flex items-start justify-between gap-3 p-2 rounded border border-[#1F2430] hover:border-[#38BDF8]/50 cursor-pointer transition bg-[#0E1118]">
                    <div>
                      <div className="font-semibold text-[#E2E8F0] flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#38BDF8]"></span>
                        2. Skema Kanal Paralel (Bounce &amp; Break-Retest)
                      </div>
                      <div className="text-[10px] text-[#64748B]">
                        Entry mantul saat candle reject batas kanal &amp; entry break-retest saat garis di-break jadi Support/Supply
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={form.enableParallelChannel}
                      onChange={(e) => handleChange("enableParallelChannel", e.target.checked)}
                      className="h-4 w-4 accent-[#38BDF8] mt-0.5 cursor-pointer"
                    />
                  </label>

                  {/* 3. Fair Value Gap */}
                  <label className="flex items-start justify-between gap-3 p-2 rounded border border-[#1F2430] hover:border-[#A855F7]/50 cursor-pointer transition bg-[#0E1118]">
                    <div>
                      <div className="font-semibold text-[#E2E8F0] flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#A855F7]"></span>
                        3. Skema Fair Value Gap (FVG Imbalance Confluence)
                      </div>
                      <div className="text-[10px] text-[#64748B]">
                        Memeriksa overlap zona FVG yang belum terisi untuk memperkuat probabilitas entry
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={form.enableFVGConfluence}
                      onChange={(e) => handleChange("enableFVGConfluence", e.target.checked)}
                      className="h-4 w-4 accent-[#A855F7] mt-0.5 cursor-pointer"
                    />
                  </label>

                  {/* 4. Session Killzones */}
                  <label className="flex items-start justify-between gap-3 p-2 rounded border border-[#1F2430] hover:border-[#D97706]/50 cursor-pointer transition bg-[#0E1118]">
                    <div>
                      <div className="font-semibold text-[#E2E8F0] flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#D97706]"></span>
                        4. Skema Session Killzones (Forex London &amp; NY Open)
                      </div>
                      <div className="text-[10px] text-[#64748B]">
                        Membatasi entry Forex pada jam likuiditas puncak (London 14:00-16:00 &amp; NY 19:00-22:00 WIB)
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={form.enableKillzones}
                      onChange={(e) => handleChange("enableKillzones", e.target.checked)}
                      className="h-4 w-4 accent-[#D97706] mt-0.5 cursor-pointer"
                    />
                  </label>

                  {/* 5. Macro Trend Filter */}
                  <label className="flex items-start justify-between gap-3 p-2 rounded border border-[#1F2430] hover:border-[#3B82F6]/50 cursor-pointer transition bg-[#0E1118]">
                    <div>
                      <div className="font-semibold text-[#E2E8F0] flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#3B82F6]"></span>
                        5. Skema Filter Macro Trend (EMA 21/50 + ADX 14)
                      </div>
                      <div className="text-[10px] text-[#64748B]">
                        Menyelaraskan arah posisi dengan tren makro; mencegah counter-trend saat momentum kuat
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={form.enableTrendFilter}
                      onChange={(e) => handleChange("enableTrendFilter", e.target.checked)}
                      className="h-4 w-4 accent-[#3B82F6] mt-0.5 cursor-pointer"
                    />
                  </label>

                  {/* 6. Relative Volume & CVD */}
                  <label className="flex items-start justify-between gap-3 p-2 rounded border border-[#1F2430] hover:border-[#F43F5E]/50 cursor-pointer transition bg-[#0E1118]">
                    <div>
                      <div className="font-semibold text-[#E2E8F0] flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#F43F5E]"></span>
                        6. Skema Filter Lonjakan Volume (RVOL &amp; CVD)
                      </div>
                      <div className="text-[10px] text-[#64748B]">
                        Wajib konfirmasi lonjakan volume (RVOL ≥ 1.5x) dan Cumulative Volume Delta searah
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={form.enableVolumeFilter}
                      onChange={(e) => handleChange("enableVolumeFilter", e.target.checked)}
                      className="h-4 w-4 accent-[#F43F5E] mt-0.5 cursor-pointer"
                    />
                  </label>

                  {/* 7. Trend Runner (Liquidity Void / No-Sweep Flow) */}
                  <label className="flex items-start justify-between gap-3 p-2 rounded border border-[#1F2430] hover:border-[#14B8A6]/50 cursor-pointer transition bg-[#0E1118]">
                    <div>
                      <div className="font-semibold text-[#E2E8F0] flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#14B8A6]"></span>
                        7. Skema Trend Runner (Liquidity Void / No-Sweep Flow)
                      </div>
                      <div className="text-[10px] text-[#64748B]">
                        Entri searah tren kuat ketika retail ragu masuk akibat SL &gt; TP (Retail RR Aversion) dan ketiadaan sweep likuiditas
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={form.enableTrendRunner}
                      onChange={(e) => handleChange("enableTrendRunner", e.target.checked)}
                      className="h-4 w-4 accent-[#14B8A6] mt-0.5 cursor-pointer"
                    />
                  </label>

                  {/* 8. Double Top & Double Bottom Reversals */}
                  <label className="flex items-start justify-between gap-3 p-2 rounded border border-[#1F2430] hover:border-[#EC4899]/50 cursor-pointer transition bg-[#0E1118]">
                    <div>
                      <div className="font-semibold text-[#E2E8F0] flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#EC4899]"></span>
                        8. Skema Double Top &amp; Double Bottom (Pola Pembalikan M &amp; W)
                      </div>
                      <div className="text-[10px] text-[#64748B]">
                        Deteksi dua puncak sejajar (Double Top &apos;M&apos;) untuk Breakdown Sell &amp; dua lembah sejajar (Double Bottom &apos;W&apos;) untuk Breakout Buy
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={form.enableDoubleTopBottom}
                      onChange={(e) => handleChange("enableDoubleTopBottom", e.target.checked)}
                      className="h-4 w-4 accent-[#EC4899] mt-0.5 cursor-pointer"
                    />
                  </label>
                </div>
              </div>

              {/* PENGATURAN PARAMETER DOUBLE TOP & BOTTOM */}
              {form.enableDoubleTopBottom && (
                <div className="rounded border border-[#1F2430] bg-[#121622] p-3.5 space-y-3">
                  <div className="border-b border-[#1F2430] pb-2">
                    <div className="font-bold text-[#EC4899] text-xs">PENGATURAN SKEMA DOUBLE TOP &amp; BOTTOM (M &amp; W)</div>
                    <div className="text-[10px] text-[#8E9BAE]">
                      Toleransi selisih ketinggian puncak/lembah untuk validitas pola geometris
                    </div>
                  </div>
                  <div>
                    <label className="text-[#8E9BAE] block mb-1">TOLERANSI DEVIASI PUNCAK / LEMBAH (%)</label>
                    <input
                      type="number"
                      min={0.2}
                      max={5.0}
                      step={0.1}
                      value={form.doubleTopBottomTolerance}
                      onChange={(e) => handleChange("doubleTopBottomTolerance", parseFloat(e.target.value) || 1.5)}
                      className="w-full rounded border border-[#1F2430] bg-[#0E1118] px-3 py-2 text-[#F8FAFC] focus:border-[#EC4899] focus:outline-none"
                    />
                    <span className="text-[10px] text-[#64748B] mt-1 block">
                      Maksimal selisih persentase antara Puncak 1 dan Puncak 2 (Default: 1.5%).
                    </span>
                  </div>
                </div>
              )}

              {/* 2. PENGATURAN KANAL PARALEL & PATOKAN SWING */}
              <div className="rounded border border-[#1F2430] bg-[#121622] p-3.5 space-y-3">
                <div className="border-b border-[#1F2430] pb-2">
                  <div className="font-bold text-[#38BDF8] text-xs">PENGATURAN PATOKAN KANAL PARALEL</div>
                  <div className="text-[10px] text-[#8E9BAE]">
                    Metode penarikan garis kanal menggunakan Swing High &amp; Swing Low
                  </div>
                </div>

                <div>
                  <label className="text-[#8E9BAE] block mb-1">PATOKAN PENARIKAN GARIS KANAL</label>
                  <select
                    value={form.channelAnchorMode}
                    onChange={(e) => handleChange("channelAnchorMode", e.target.value as any)}
                    className="w-full rounded border border-[#1F2430] bg-[#0E1118] px-3 py-2 text-[#F8FAFC] focus:border-[#38BDF8] focus:outline-none"
                  >
                    <option value="SWING_HIGHLOW">Tarik dari Swing High &amp; Swing Low (Fractal Pivots)</option>
                    <option value="REGRESSION">Regresi Linier Standar (Least Squares Envelope)</option>
                  </select>
                  <span className="text-[10px] text-[#64748B] mt-1 block">
                    Mode &quot;Swing High &amp; Low&quot; menarik garis atas persis di puncak Swing High dan garis bawah di lembah Swing Low.
                  </span>
                </div>

                <div>
                  <label className="text-[#8E9BAE] block mb-1">LOOKBACK PERIOD KANAL (15 - 50 BARS)</label>
                  <input
                    type="number"
                    min={15}
                    max={50}
                    step={1}
                    value={form.channelLookback}
                    onChange={(e) => handleChange("channelLookback", parseInt(e.target.value) || 25)}
                    className="w-full rounded border border-[#1F2430] bg-[#0E1118] px-3 py-2 text-[#F8FAFC] focus:border-[#38BDF8] focus:outline-none"
                  />
                  <span className="text-[10px] text-[#64748B] mt-1 block">
                    Jumlah candle histori untuk mendeteksi swing pivots dan garis kanal (Default: 25).
                  </span>
                </div>
              </div>

              {/* 3. PARAMETER KALIBRASI SWEEP & EKSEKUSI */}
              <div className="rounded border border-[#1F2430] bg-[#121622] p-3.5 space-y-3">
                <div className="border-b border-[#1F2430] pb-2">
                  <div className="font-bold text-[#F8FAFC] text-xs">PARAMETER KALIBRASI SWEEP &amp; SCORE</div>
                  <div className="text-[10px] text-[#8E9BAE]">
                    Ambang batas matematis pinbar rejection dan target retail RR
                  </div>
                </div>

                <div>
                  <label className="text-[#8E9BAE] block mb-1">MIN REJECTION WICK RATIO (%)</label>
                  <input
                    type="number"
                    min={10}
                    max={50}
                    step={5}
                    value={form.minWickRatio * 100}
                    onChange={(e) => handleChange("minWickRatio", (parseFloat(e.target.value) || 20) / 100)}
                    className="w-full rounded border border-[#1F2430] bg-[#0E1118] px-3 py-2 text-[#F8FAFC] focus:border-[#10B981] focus:outline-none"
                  />
                  <span className="text-[10px] text-[#64748B] mt-1 block">
                    Batas minimal ekor penolakan pinbar/rejection (Default: 20%).
                  </span>
                </div>

                <div>
                  <label className="text-[#8E9BAE] block mb-1">THRESHOLD RETAIL RR RATIO</label>
                  <input
                    type="number"
                    min={1.0}
                    max={3.0}
                    step={0.25}
                    value={form.retailRRThreshold}
                    onChange={(e) => handleChange("retailRRThreshold", parseFloat(e.target.value) || 1.5)}
                    className="w-full rounded border border-[#1F2430] bg-[#0E1118] px-3 py-2 text-[#F8FAFC] focus:border-[#10B981] focus:outline-none"
                  />
                  <span className="text-[10px] text-[#64748B] mt-1 block">
                    Rasio Risk:Reward retail di mana Stop Loss mereka menjadi target (Default: 1.5).
                  </span>
                </div>

                <div>
                  <label className="text-[#8E9BAE] block mb-1">MIN CONFLUENCE SCORE (0 - 100 PTS)</label>
                  <input
                    type="number"
                    min={60}
                    max={95}
                    step={5}
                    value={form.confluenceThreshold}
                    onChange={(e) => handleChange("confluenceThreshold", parseInt(e.target.value) || 80)}
                    className="w-full rounded border border-[#1F2430] bg-[#0E1118] px-3 py-2 text-[#F8FAFC] focus:border-[#10B981] focus:outline-none"
                  />
                  <span className="text-[10px] text-[#64748B] mt-1 block">
                    Skor syarat eksekusi sinyal sweep (C-QUANT-07: Minimal 80 Poin).
                  </span>
                </div>
              </div>
            </div>
          )}

          {activeTab === "patterns" && (
            <div className="space-y-4">
              {/* Master Pattern Detection Switch */}
              <div className="flex items-center justify-between rounded border border-[#1F2430] bg-[#121622] p-3.5">
                <div>
                  <div className="font-bold text-[#F8FAFC] text-xs flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-[#F59E0B]"></span>
                    MASTER SWITCH: DETEKSI &amp; ENTRI 20 POLA CHART
                  </div>
                  <div className="text-[10px] text-[#8E9BAE] mt-0.5">
                    Aktifkan pengenalan pola geometris dan eksekusi otomatis saat breakout/neckline retest
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={form.enablePatternTrades}
                  onChange={(e) => handleChange("enablePatternTrades", e.target.checked)}
                  className="h-4 w-4 accent-[#F59E0B] cursor-pointer"
                />
              </div>

              {/* Category Filter & Bulk Selection Actions */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1F2430] pb-2 text-[11px]">
                <div className="flex flex-wrap items-center gap-1 bg-[#121622] p-1 rounded border border-[#1F2430]">
                  {(["ALL", "CONTINUATION", "REVERSAL", "BILATERAL"] as const).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setPatternFilter(cat)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                        patternFilter === cat
                          ? "bg-[#F59E0B] text-[#090A0F]"
                          : "text-[#64748B] hover:text-[#E2E8F0]"
                      }`}
                    >
                      {cat === "ALL" ? "SEMUA (20)" : cat}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      const allActive = getDefaultEnabledPatterns();
                      handleChange("enabledPatterns", allActive);
                    }}
                    className="rounded border border-[#10B981]/50 bg-[#10B981]/15 px-2 py-0.5 text-[10px] font-bold text-[#10B981] hover:bg-[#10B981]/25"
                  >
                    ✓ PILIH SEMUA
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const noneActive: Record<string, boolean> = {};
                      for (const id of ALL_PATTERN_IDS) noneActive[id] = false;
                      handleChange("enabledPatterns", noneActive);
                    }}
                    className="rounded border border-[#F43F5E]/50 bg-[#F43F5E]/15 px-2 py-0.5 text-[10px] font-bold text-[#F43F5E] hover:bg-[#F43F5E]/25"
                  >
                    ✕ HAPUS SEMUA
                  </button>
                </div>
              </div>

              {/* Individual Pattern Cards Grid with SVG Visual Assets */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {ALL_PATTERN_IDS.filter((id) => {
                  const pat = CHART_PATTERN_CATALOG[id];
                  if (patternFilter === "ALL") return true;
                  return pat.category === patternFilter;
                }).map((id) => {
                  const pat = CHART_PATTERN_CATALOG[id];
                  const isChecked = form.enabledPatterns?.[id] !== false;

                  return (
                    <div
                      key={id}
                      onClick={() => {
                        const updated = {
                          ...form.enabledPatterns,
                          [id]: !isChecked,
                        };
                        handleChange("enabledPatterns", updated);
                      }}
                      className={`rounded border p-3 transition cursor-pointer select-none ${
                        isChecked
                          ? "border-[#F59E0B]/50 bg-[#0E1524] shadow-sm shadow-[#F59E0B]/5"
                          : "border-[#1F2430] bg-[#121622]/60 opacity-60 hover:opacity-100"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-bold text-[#F8FAFC] text-xs flex items-center gap-1.5">
                            <span
                              className={`h-2 w-2 rounded-full ${
                                pat.bias === "BULLISH"
                                  ? "bg-[#10B981]"
                                  : pat.bias === "BEARISH"
                                  ? "bg-[#F43F5E]"
                                  : "bg-[#38BDF8]"
                              }`}
                            />
                            {pat.name}
                          </div>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="rounded bg-[#1F2430] px-1.5 py-0.5 text-[9px] text-[#94A3B8]">
                              {pat.category}
                            </span>
                            <span
                              className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${
                                pat.bias === "BULLISH"
                                  ? "bg-[#10B981]/15 text-[#10B981]"
                                  : pat.bias === "BEARISH"
                                  ? "bg-[#F43F5E]/15 text-[#F43F5E]"
                                  : "bg-[#38BDF8]/15 text-[#38BDF8]"
                              }`}
                            >
                              {pat.bias}
                            </span>
                          </div>
                        </div>

                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}} // handled by container onClick
                          className="h-4 w-4 accent-[#F59E0B] mt-0.5 cursor-pointer"
                        />
                      </div>

                      {/* SVG Visual Diagram Asset */}
                      <div className="my-2.5 flex justify-center">
                        <PatternVisualAsset patternId={id} width="100%" height={80} />
                      </div>

                      <div className="text-[10px] text-[#8E9BAE] line-clamp-2">
                        {pat.description}
                      </div>
                      <div className="text-[10px] text-[#38BDF8] mt-1 font-semibold border-t border-[#1F2430]/60 pt-1">
                        Target: {pat.tradingRule}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === "alerts" && (
            <div className="space-y-4">
              {/* Audio Chime Toggle */}
              <div className="flex items-center justify-between rounded border border-[#1F2430] bg-[#121622] p-3">
                <div className="flex items-center gap-2.5">
                  {form.soundEnabled ? (
                    <Volume2 className="h-5 w-5 text-[#10B981]" />
                  ) : (
                    <VolumeX className="h-5 w-5 text-[#64748B]" />
                  )}
                  <div>
                    <div className="font-bold text-[#F8FAFC]">AUDIO CHIME ALERT</div>
                    <div className="text-[10px] text-[#64748B]">
                      Suara notifikasi saat Sweep atau TP/SL kena
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleTestAudio}
                    className="rounded border border-[#1F2430] bg-[#1A1F2C] px-2 py-1 text-[10px] font-bold text-[#38BDF8] hover:border-[#38BDF8]"
                  >
                    TEST
                  </button>
                  <input
                    type="checkbox"
                    checked={form.soundEnabled}
                    onChange={(e) => handleChange("soundEnabled", e.target.checked)}
                    className="h-4 w-4 accent-[#10B981] cursor-pointer"
                  />
                </div>
              </div>

              {/* Discord Webhook */}
              <div>
                <label className="text-[#8E9BAE] block mb-1">DISCORD WEBHOOK URL (OPSIONAL)</label>
                <input
                  type="url"
                  placeholder="https://discord.com/api/webhooks/..."
                  value={form.discordWebhookUrl}
                  onChange={(e) => handleChange("discordWebhookUrl", e.target.value)}
                  className="w-full rounded border border-[#1F2430] bg-[#121622] px-3 py-2 text-[#F8FAFC] placeholder-[#64748B] focus:border-[#8B5CF6] focus:outline-none"
                />
              </div>

              {/* Telegram Bot */}
              <div>
                <label className="text-[#8E9BAE] block mb-1">TELEGRAM BOT TOKEN (OPSIONAL)</label>
                <input
                  type="text"
                  placeholder="123456789:ABCdefGhIJKlmNoPQRstuv..."
                  value={form.telegramToken}
                  onChange={(e) => handleChange("telegramToken", e.target.value)}
                  className="w-full rounded border border-[#1F2430] bg-[#121622] px-3 py-2 text-[#F8FAFC] placeholder-[#64748B] focus:border-[#8B5CF6] focus:outline-none mb-2"
                />
                <label className="text-[#8E9BAE] block mb-1">TELEGRAM CHAT ID</label>
                <input
                  type="text"
                  placeholder="Contoh: 987654321"
                  value={form.telegramChatId}
                  onChange={(e) => handleChange("telegramChatId", e.target.value)}
                  className="w-full rounded border border-[#1F2430] bg-[#121622] px-3 py-2 text-[#F8FAFC] placeholder-[#64748B] focus:border-[#8B5CF6] focus:outline-none"
                />
              </div>

              {/* Test Webhook Button */}
              {(form.discordWebhookUrl || form.telegramToken) && (
                <div>
                  <button
                    type="button"
                    onClick={handleTestWebhook}
                    disabled={isTestingWebhook}
                    className="flex w-full items-center justify-center gap-1.5 rounded border border-[#8B5CF6]/50 bg-[#8B5CF6]/20 py-2 font-bold text-[#A78BFA] hover:bg-[#8B5CF6]/30 transition disabled:opacity-50"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>{isTestingWebhook ? "MENGIRIM..." : "TEST KIRIM NOTIFIKASI"}</span>
                  </button>
                  {testStatus && (
                    <div className="mt-2 text-center text-[11px] font-semibold text-[#F8FAFC]">
                      {testStatus}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Drawer Actions */}
          <div className="pt-4 border-t border-[#1F2430] flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded border border-[#1F2430] bg-[#121622] py-2.5 font-bold text-[#94A3B8] hover:bg-[#1A1F2C] transition"
            >
              BATAL
            </button>
            <button
              type="submit"
              className="flex-1 rounded border border-[#38BDF8] bg-[#38BDF8] py-2.5 font-bold text-[#090A0F] hover:bg-[#38BDF8]/90 transition shadow-[0_0_15px_rgba(56,189,248,0.3)]"
            >
              SIMPAN PENGATURAN
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
