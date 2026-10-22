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
} from "lucide-react";
import { terminalAudio } from "@/lib/alerts/audioChime";

export interface StrategySettings {
  initialCapital: number;
  lotSize: number; // e.g. 0.10, 1.0, 0.01 (Configurable dummy lot)
  riskPerTradePct: number;
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
  riskPerTradePct: 1.0,
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
}

export default function SettingsDrawer({
  isOpen,
  onClose,
  settings,
  onSave,
}: SettingsDrawerProps) {
  const [form, setForm] = useState<StrategySettings>(settings);
  const [activeTab, setActiveTab] = useState<"risk" | "algo" | "alerts">("risk");
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [isTestingWebhook, setIsTestingWebhook] = useState(false);

  if (!isOpen) return null;

  const handleChange = (field: keyof StrategySettings, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
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
        <div className="flex border-b border-[#1F2430] mt-4 font-mono text-xs">
          <button
            onClick={() => setActiveTab("risk")}
            className={`flex-1 py-2 font-bold text-center border-b-2 transition ${
              activeTab === "risk"
                ? "border-[#38BDF8] text-[#38BDF8]"
                : "border-transparent text-[#64748B] hover:text-[#94A3B8]"
            }`}
          >
            CAPITAL & RISK
          </button>
          <button
            onClick={() => setActiveTab("algo")}
            className={`flex-1 py-2 font-bold text-center border-b-2 transition ${
              activeTab === "algo"
                ? "border-[#10B981] text-[#10B981]"
                : "border-transparent text-[#64748B] hover:text-[#94A3B8]"
            }`}
          >
            SMC ALGORITHM
          </button>
          <button
            onClick={() => setActiveTab("alerts")}
            className={`flex-1 py-2 font-bold text-center border-b-2 transition ${
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
                  Bebas diisi nominal berapa saja (misal 0.01, 0.10, 1.0, 5.0).
                </span>
              </div>

              <div>
                <label className="text-[#8E9BAE] block mb-1">RISIKO PER TRADE (% CAP)</label>
                <input
                  type="number"
                  min={0.1}
                  max={5}
                  step={0.1}
                  value={form.riskPerTradePct}
                  onChange={(e) => handleChange("riskPerTradePct", parseFloat(e.target.value) || 1.0)}
                  className="w-full rounded border border-[#1F2430] bg-[#121622] px-3 py-2 text-[#F8FAFC] focus:border-[#38BDF8] focus:outline-none"
                />
                <span className="text-[10px] text-[#64748B] mt-1 block">
                  Standar institusional: 1.0% per trade ($100 pada modal $10k).
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
                </div>
              </div>

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
