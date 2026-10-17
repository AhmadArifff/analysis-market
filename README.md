# analysis-market

> **Quantitative Market Analysis & Multi-Asset Algorithmic Backtesting Engine**  
> Menggabungkan **Multi-Timeframe Analysis (MTF)**, **Dynamic ATR Time-Bar Exhaustion**, **Retail Risk-to-Reward (RR) Liquidity Sweep**, dan **Smart Money Concepts (SMC)** untuk instrumen Forex (`XAUUSD`) dan Cryptocurrency (`BTC`, `ETH`, `BNB`, `SOL`, `DOGE`, `PEPE`).

---

## 🚀 Fitur Utama Sistem

1. **Siklus Tren Multi-Timeframe (MTF)**: Evaluasi bias makro 1M & 1W untuk menentukan arah tren utama menggunakan EMA 21/50 dan filter kekuatan tren ADX(14) > 25.
2. **Dynamic Volatility Time-Bar Exhaustion**: Pengukur kejenuhan 3–5 bar harian berturut-turut yang dinormalisasi dengan kelipatan ATR(14) dinamis dan RSI Cepat periode 5 (RSI-5).
3. **Retail Risk-Reward (RR) Traps Mapping**: Deteksi Stop Loss retail secara algoritmik berbasis fraktal Williams 5-bar pada pola breakout/breakdown dengan filter kelayakan $RR_{retail} \ge 1:1.5$.
4. **Konfirmasi Liquidity Sweep**: Pembeda antara *real breakout* dan *fakeout sweep* menggunakan Relative Volume ($RVOL \ge 2.0\times$), Rejection Wick Ratio ($\ge 30\%$), serta *Open Interest (OI) Plunge* pada derivatif kripto.
5. **Confluence Scoring System (0–100 Poin)**: Menghasilkan notifikasi eksekusi probabilitas tinggi HANYA ketika skor gabungan mencapai $\ge 80$ poin.
6. **Zero Look-Ahead Bias Backtester**: Simulasi transaksi kausal tanpa bias intip masa depan dengan kalkulasi friksi pasar riil (spread, dynamic slippage, dan exchange taker fees).
7. **Modular Multi-Indicator Backtesting**: Kemampuan menguji komponen strategi secara terpisah (Liquidity Sweep murni vs Exhaustion vs Trend) untuk comparative A/B testing.
8. **Live Forward-Testing & Chart Marking Mode ("Paper Trading")**: Pengujian real-time pada data berjalan dengan penanda visual (virtual entry, SL, TP) tanpa risiko finansial nyata.
9. **Predictive Liquidity Horizon Forecasting**: Peramalan arah pergerakan harga 1D/1W berbasis gravitasi daya tarik likuiditas Buy-Side vs Sell-Side.
10. **Automated Excel Export & Trading Journal (.xlsx)**: Rekap 1-klik riwayat transaksi ke dalam spreadsheet Excel 4-sheet terformat lengkap (KPI Summary, Detailed Journal, Confluence Attribution, dan Monthly Matrix).

---

## 🛠️ Tech Stack & Arsitektur

- **Unified Full-Stack Framework**: Next.js 15 (App Router, React 19, TypeScript), Node.js V8 High-Performance Runtime.
- **Quant Calculation Engine**: Algoritma deterministik TypeScript murni (`src/lib/quant-engine/`): Wilder ATR(14), Fast RSI(5), EMA(21, 50), ADX(14), Fraktal 5-Bar Williams, dan Confluence Scoring.
- **Data Ingestion**: `ccxt` resmi Node.js/TypeScript (Binance, Bybit REST & WebSocket) & Oanda / MetaTrader.
- **Reporting & Journaling**: `exceljs` untuk streaming download spreadsheet `.xlsx` 4-sheet terformat lengkap.
- **Frontend UI & Visualization**: Tailwind CSS, TradingView Lightweight Charts (v5) dengan custom Canvas overlays, Lucide Icons.

---

## 📂 Struktur Unified Pure Monorepo

Proyek ini menggunakan arsitektur **Unified Pure Monorepo** (100% Next.js Full-Stack) di mana antarmuka, API endpoint, engine kuantitatif, dan generator excel berada dalam satu kesatuan utuh yang terpadu:

```
Analysis-Market/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── market/
│   │   │   │   ├── watchlist/route.ts       # Endpoint live watchlist, ATR & 5-bar status
│   │   │   │   └── analysis/route.ts        # Endpoint MTF regime, liquidity pools & signals
│   │   │   └── backtest/
│   │   │       ├── run/route.ts             # Endpoint simulasi backtest kuantitatif
│   │   │       └── export-excel/route.ts    # Streaming download jurnal Excel (.xlsx)
│   │   ├── globals.css                      # Stealth Institutional Minimalist design tokens
│   │   ├── layout.tsx                       # Root layout & dark institutional metadata
│   │   └── page.tsx                         # Quantitative Terminal Dashboard UI
│   ├── components/
│   │   └── LightweightChart.tsx             # TradingView v5 Canvas + Active Liquidity Pools Overlay
│   └── lib/
│       ├── quant-engine/
│       │   ├── indicators.ts                # Rumus ATR, EMA, ADX, RSI, Fraktal Williams
│       │   ├── exhaustion.ts                # Dynamic ATR 3-5 Bar Exhaustion Protocol
│       │   ├── liquidity.ts                 # Retail RR Traps & Rejection Wick Sweep Detection
│       │   └── confluence.ts                # Confluence Scoring Engine (0-100 Pts, C-QUANT-07)
│       └── excel-export/
│           └── excelJournal.ts              # 4-Sheet Excel Trading Journal Generator (ExcelJS)
├── public/                                  # Static brand assets
├── .agents/                                 # Tata Kelola Multi-Agen, Rules, Session State & Stubs
├── AGENTS.md                                # Batasan Domain Kuantitatif Terkunci
├── PRD.md                                   # Product Requirements Document Komprehensif (38KB+)
├── package.json                             # 1 File Manifest Dependensi Tunggal
├── tsconfig.json                            # TypeScript Configuration
├── setup.bat                                # 1-Klik Setup Otomatis (Hanya Node.js npm install)
├── run.bat                                  # 1-Klik Jalankan Sistem (1 Terminal, Port 3000, Auto-Open Browser)
└── stop.bat                                 # 1-Klik Matikan Layanan (Port 3000 Clean Exit)
```

---

## ⚡ Cara Menjalankan Sistem (1-Klik Tanpa Perlu Buka Terminal)

Anda tidak perlu membuka terminal VS Code atau mengetik perintah apapun. Cukup gunakan file batch yang telah disediakan:

### 1. Pertama Kali: Setup Lingkungan (Hanya Perlu Sekali)
- **Klik ganda file `setup.bat`**
- Skrip ini akan secara otomatis memeriksa instalasi Node.js dan menjalankan `npm install`.

### 2. Menjalankan Aplikasi Setiap Hari
- **Klik ganda file `run.bat`**
- Skrip ini akan:
  1. Menjalankan server tunggal di `http://localhost:3000` dalam **hanya 1 jendela terminal**.
  2. Menunggu 4 detik hingga server siap, lalu **otomatis membuka browser ke `http://localhost:3000`**.

### 3. Menghentikan Layanan
- **Klik ganda file `stop.bat`**
- Skrip ini akan mematikan proses di port 3000 secara bersih tanpa meninggalkan *zombie process*.

---

## 📚 Dokumentasi & Tata Kelola

- **[PRD.md](./PRD.md)**: Dokumen Spesifikasi Produk lengkap (analisis celah logika, model matematika formal, skema database DDL, kontrak API, dan spesifikasi UI/UX).
- **[AGENTS.md](./AGENTS.md)**: Tata kelola sistem multi-agen otonom (OODA loop, pembagian peran Builders vs Reviewers, dan batasan domain terkunci).
- **[.agents/](./.agents/)**: Direktori tata kelola spoke lokal, session state tracker ([session-state.json](./.agents/session-state.json)), rules, workflows, dan template boilerplate ([.agents/stubs/](./.agents/stubs/)).

---

## 📄 Lisensi

MIT License © 2026 Ahmad Arif & Tim Analysis-Market.
