"use client";

import React, { useState, useEffect } from "react";
import {
  Search,
  ExternalLink,
  Flame,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Layers,
  Copy,
  Check,
  RefreshCw,
} from "lucide-react";

export interface DexPairData {
  chainId: string;
  dexId: string;
  url: string;
  pairAddress: string;
  baseToken: {
    address: string;
    name: string;
    symbol: string;
  };
  quoteToken: {
    symbol: string;
  };
  priceNative: string;
  priceUsd: string;
  txns: {
    h24: { buys: number; sells: number };
  };
  volume: {
    h24: number;
  };
  priceChange: {
    h24: number;
  };
  liquidity?: {
    usd: number;
    base: number;
    quote: number;
  };
  marketCap?: number;
  fdv?: number;
}

const PRESET_SOLANA_MEMES = [
  { symbol: "WIF", name: "dogwifhat", address: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm" },
  { symbol: "BONK", name: "Bonk", address: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263" },
  { symbol: "POPCAT", name: "Popcat", address: "7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr" },
  { symbol: "FWOG", name: "Fwog", address: "A8C3xuqscfmyLrte3VmTqrAq8kgMASius9AFNANwpump" },
  { symbol: "GOAT", name: "Goatseus", address: "CzLSujWBLFsSjncfkh59rUFqvafWcY5tzedWJSuypump" },
  { symbol: "PENGU", name: "Pudgy Penguins", address: "2zMMhcVQEXDtdE6vsFS7S7D5oUodfJHE8vd1gnBouauv" },
];

export default function DexScreenerWidget({ height = 540 }: { height?: number }) {
  const [selectedToken, setSelectedToken] = useState(PRESET_SOLANA_MEMES[0]);
  const [inputAddress, setInputAddress] = useState("");
  const [pairData, setPairData] = useState<DexPairData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch token pair info from DexScreener public API
  const fetchDexData = async (tokenAddr: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${tokenAddr}`);
      if (!res.ok) throw new Error("DexScreener API offline");
      const json = await res.json();
      if (json.pairs && json.pairs.length > 0) {
        // Pick Solana pair with highest liquidity
        const solanaPairs = json.pairs.filter((p: any) => p.chainId === "solana");
        const bestPair = solanaPairs.length > 0
          ? solanaPairs.sort((a: any, b: any) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0))[0]
          : json.pairs[0];

        setPairData(bestPair);
      } else {
        setErrorMessage("Token tidak ditemukan di pool DEX Solana.");
      }
    } catch (err: any) {
      setErrorMessage("Gagal mengambil data dari DexScreener.");
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchDexData(selectedToken.address);
  }, [selectedToken]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanAddr = inputAddress.trim();
    if (cleanAddr.length > 20) {
      setSelectedToken({
        symbol: "CUSTOM",
        name: "Custom Solana Token",
        address: cleanAddr,
      });
      fetchDexData(cleanAddr);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const currentPairAddress = pairData?.pairAddress || selectedToken.address;
  const iframeSrc = `https://dexscreener.com/solana/${currentPairAddress}?embed=1&theme=dark&trades=0&info=0`;

  return (
    <div className="w-full space-y-3 rounded-lg border border-[#1F2430] bg-[#090A0F] p-4 text-[#E2E8F0] shadow-xl">
      {/* Header Bar & Quick Selectors */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1F2430] pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded bg-[#8B5CF6]/20 text-[#A78BFA] border border-[#8B5CF6]/40">
            <Flame className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-mono text-xs font-bold tracking-wider text-[#F8FAFC]">
                SOLANA DEX MEME TERMINAL
              </h3>
              <span className="rounded bg-[#8B5CF6]/20 px-1.5 py-0.2 font-mono text-[9px] font-bold text-[#A78BFA] border border-[#8B5CF6]/40">
                RAYDIUM / PUMP.FUN
              </span>
            </div>
            <p className="font-mono text-[10px] text-[#64748B]">
              Real-time Solana Memecoin Charts & Liquidity Pools via DexScreener
            </p>
          </div>
        </div>

        {/* Custom Address Input Form */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-1.5">
          <div className="relative">
            <input
              type="text"
              placeholder="Paste Token / Mint Address..."
              value={inputAddress}
              onChange={(e) => setInputAddress(e.target.value)}
              className="w-56 rounded border border-[#1F2430] bg-[#121622] px-2.5 py-1 pl-7 font-mono text-[11px] text-[#E2E8F0] placeholder-[#64748B] focus:border-[#8B5CF6] focus:outline-none transition"
            />
            <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-[#64748B]" />
          </div>
          <button
            type="submit"
            className="rounded border border-[#8B5CF6]/60 bg-[#8B5CF6]/20 px-3 py-1 font-mono text-[11px] font-bold text-[#A78BFA] hover:bg-[#8B5CF6]/30 transition"
          >
            LOAD
          </button>
        </form>
      </div>

      {/* Preset Solana Memecoins Quick Bar */}
      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
        <span className="font-mono text-[10px] text-[#64748B] font-semibold pr-1">TRENDING:</span>
        {PRESET_SOLANA_MEMES.map((meme) => (
          <button
            key={meme.symbol}
            onClick={() => {
              setSelectedToken(meme);
              setInputAddress("");
            }}
            className={`rounded px-2.5 py-1 font-mono text-[10px] font-bold transition ${
              selectedToken.address === meme.address
                ? "bg-[#8B5CF6] text-[#090A0F] shadow-[0_0_10px_rgba(139,92,246,0.3)]"
                : "border border-[#1F2430] bg-[#121622] text-[#94A3B8] hover:text-[#E2E8F0] hover:border-[#333D52]"
            }`}
          >
            ${meme.symbol}
          </button>
        ))}
      </div>

      {/* Live DEX Pair Stats Ticker Banner */}
      {pairData && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6 rounded border border-[#1F2430] bg-[#0E1118] p-2.5 font-mono text-xs">
          <div>
            <span className="text-[10px] text-[#64748B]">PRICE USD</span>
            <div className="text-sm font-bold text-[#F8FAFC]">
              ${parseFloat(pairData.priceUsd) < 0.001 ? pairData.priceUsd : parseFloat(pairData.priceUsd).toFixed(4)}
            </div>
          </div>
          <div>
            <span className="text-[10px] text-[#64748B]">24H CHANGE</span>
            <div
              className={`flex items-center gap-1 text-sm font-bold ${
                (pairData.priceChange?.h24 || 0) >= 0 ? "text-[#10B981]" : "text-[#F43F5E]"
              }`}
            >
              {(pairData.priceChange?.h24 || 0) >= 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {pairData.priceChange?.h24 ? `${pairData.priceChange.h24.toFixed(2)}%` : "0.00%"}
            </div>
          </div>
          <div>
            <span className="text-[10px] text-[#64748B]">LIQUIDITY</span>
            <div className="text-sm font-bold text-[#38BDF8]">
              ${pairData.liquidity?.usd ? Math.round(pairData.liquidity.usd).toLocaleString() : "N/A"}
            </div>
          </div>
          <div>
            <span className="text-[10px] text-[#64748B]">MARKET CAP</span>
            <div className="text-sm font-bold text-[#E2E8F0]">
              ${pairData.marketCap ? Math.round(pairData.marketCap).toLocaleString() : "N/A"}
            </div>
          </div>
          <div>
            <span className="text-[10px] text-[#64748B]">24H VOLUME</span>
            <div className="text-sm font-bold text-[#E2E8F0]">
              ${pairData.volume?.h24 ? Math.round(pairData.volume.h24).toLocaleString() : "N/A"}
            </div>
          </div>
          <div>
            <span className="text-[10px] text-[#64748B]">DEX PROTOCOL</span>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#A78BFA] uppercase truncate">
              <span>{pairData.dexId}</span>
              <a
                href={pairData.url}
                target="_blank"
                rel="noreferrer"
                className="text-[#64748B] hover:text-[#E2E8F0]"
                title="Buka di DexScreener"
              >
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="rounded border border-[#F43F5E]/40 bg-[#F43F5E]/10 p-2 font-mono text-xs text-[#F43F5E]">
          ⚠️ {errorMessage}
        </div>
      )}

      {/* Embedded Live DexScreener Chart */}
      <div
        className="w-full rounded border border-[#1F2430] bg-[#090A0F] overflow-hidden relative"
        style={{ height: `${height}px` }}
      >
        {isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#090A0F]/80 font-mono text-xs text-[#A78BFA]">
            <RefreshCw className="h-5 w-5 animate-spin mr-2" />
            Memuat chart real-time DexScreener...
          </div>
        )}
        <iframe
          src={iframeSrc}
          title={`DexScreener - ${selectedToken.symbol}`}
          width="100%"
          height="100%"
          className="border-0"
          loading="lazy"
        />
      </div>

      {/* Footer Info */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 font-mono text-[10px] text-[#64748B]">
        <div className="flex items-center gap-2">
          <span>TOKEN ADDRESS:</span>
          <span className="text-[#94A3B8] font-mono select-all">
            {selectedToken.address.slice(0, 12)}...{selectedToken.address.slice(-8)}
          </span>
          <button
            onClick={() => handleCopy(selectedToken.address)}
            className="text-[#64748B] hover:text-[#E2E8F0]"
            title="Salin Address"
          >
            {copied ? <Check className="h-3 w-3 text-[#10B981]" /> : <Copy className="h-3 w-3" />}
          </button>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-[#10B981]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#10B981] animate-pulse"></span>
            SOLANA MEME RPC & DEX FEED ACTIVE
          </span>
          <a
            href={`https://solscan.io/token/${selectedToken.address}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-[#38BDF8] hover:underline"
          >
            <span>SOLSCAN</span>
            <ExternalLink className="h-2.5 w-2.5" />
          </a>
        </div>
      </div>
    </div>
  );
}
