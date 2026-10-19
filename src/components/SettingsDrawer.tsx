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
  riskPerTradePct: number;
  minWickRatio: number; // e.g. 0.20 (20%)
  retailRRThreshold: number; // e.g. 1.5
  confluenceThreshold: number; // e.g. 80
  cryptoFeePct: number; // e.g. 0.05%
  forexSpreadCents: number; // e.g. $0.20
  soundEnabled: boolean;
  discordWebhookUrl: string;
  telegramToken: string;
  telegramChatId: string;
}

export const DEFAULT_SETTINGS: StrategySettings = {
  initialCapital: 10000,
  riskPerTradePct: 1.0,
  minWickRatio: 0.20,
  retailRRThreshold: 1.5,
  confluenceThreshold: 80,
  cryptoFeePct: 0.05,
  forexSpreadCents: 0.2,
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
                  min={100}
                  step={500}
                  value={form.initialCapital}
                  onChange={(e) => handleChange("initialCapital", parseFloat(e.target.value) || 10000)}
                  className="w-full rounded border border-[#1F2430] bg-[#121622] px-3 py-2 text-[#F8FAFC] focus:border-[#38BDF8] focus:outline-none"
                />
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
              <div>
                <label className="text-[#8E9BAE] block mb-1">MIN REJECTION WICK RATIO (%)</label>
                <input
                  type="number"
                  min={10}
                  max={50}
                  step={5}
                  value={form.minWickRatio * 100}
                  onChange={(e) => handleChange("minWickRatio", (parseFloat(e.target.value) || 20) / 100)}
                  className="w-full rounded border border-[#1F2430] bg-[#121622] px-3 py-2 text-[#F8FAFC] focus:border-[#10B981] focus:outline-none"
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
                  className="w-full rounded border border-[#1F2430] bg-[#121622] px-3 py-2 text-[#F8FAFC] focus:border-[#10B981] focus:outline-none"
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
                  className="w-full rounded border border-[#1F2430] bg-[#121622] px-3 py-2 text-[#F8FAFC] focus:border-[#10B981] focus:outline-none"
                />
                <span className="text-[10px] text-[#64748B] mt-1 block">
                  Skor syarat eksekusi sinyal sweep (C-QUANT-07: Minimal 80 Poin).
                </span>
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
