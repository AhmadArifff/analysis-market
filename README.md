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

- **Quant Engine & Backend**: Python 3.11+, FastAPI, VectorBT / Backtesting.py, Pandas, NumPy, Numba.
- **Data Ingestion**: CCXT (Binance / Bybit REST & WebSocket), MetaTrader 5 (MT5 Python API) / TwelveData / Oanda.
- **Time-Series Database**: PostgreSQL 16 + TimescaleDB (Hypertables untuk OHLCV multi-timeframe 1m s.d 1M dengan kebijakan kompresi otomatis).
- **Frontend UI & Visualization**: Next.js 15 (App Router, React 19, TypeScript), Tailwind CSS, TradingView Lightweight Charts (v5) dengan custom Canvas overlays.

---

## 📂 Struktur Monorepo Proyek

Proyek ini dibangun menggunakan arsitektur **Monorepo** yang memisahkan backend FastAPI dan frontend Next.js secara rapi dalam satu repositori:

```
Analysis-Market/
├── backend/                  # REST & WebSocket API, Quant Engine & Excel Exporter
│   ├── app/
│   │   ├── api/              # Endpoint routes (/watchlist, /analysis/current, /backtest, /export-excel)
│   │   ├── services/         # ExcelJournalExporter (OpenPyXL multi-sheet)
│   │   └── main.py           # FastAPI Application Entry Point
│   ├── venv/                 # Python Virtual Environment
│   └── requirements.txt      # FastAPI, Pandas, CCXT, OpenPyXL, Uvicorn
├── frontend/                 # Quantitative Institutional Terminal UI
│   ├── src/
│   │   ├── app/              # Next.js App Router (page.tsx, layout.tsx, globals.css)
│   │   └── components/       # LightweightChart (TradingView v5), Liquidity Overlays
│   ├── package.json          # Next 16, React 19, Tailwind CSS, Lightweight Charts, Lucide
│   └── tsconfig.json
├── .agents/                  # Autonomous Multi-Agent Governance & Knowledge Base
│   ├── rules/                # Core Guardrails, Database Standards & Workflow Discipline
│   ├── stubs/                # Reusable Boilerplate Stubs (TimescaleDB SQL, Quant Sweep Algorithm)
│   └── session-state.json    # Single Source of Truth Session Memory
├── AGENTS.md                 # Quantitative System Governance & Locked Constraints
├── PRD.md                    # Comprehensive Product Requirements Document (38KB+)
├── setup.bat                 # 1-Klik Setup Otomatis (Python venv + Pip + NPM Install)
├── run.bat                   # 1-Klik Jalankan Sistem (FastAPI + Next.js + Buka Browser Otomatis)
└── stop.bat                  # 1-Klik Matikan Seluruh Layanan (Port 8000 & 3000 Clean Exit)
```

---

## ⚡ Cara Menjalankan Sistem (1-Klik Tanpa Perlu Buka Terminal)

Anda tidak perlu membuka terminal VS Code untuk menjalankan sistem ini. Cukup gunakan file batch yang telah disediakan:

### 1. Pertama Kali: Setup Lingkungan (Hanya Perlu Sekali)
- **Klik ganda file `setup.bat`**
- Skrip ini akan secara otomatis:
  1. Memeriksa keberadaan Python dan Node.js.
  2. Membuat *virtual environment* Python (`backend/venv`).
  3. Menginstal seluruh pustaka backend (`FastAPI`, `Pandas`, `CCXT`, `OpenPyXL`).
  4. Menjalankan `npm install` untuk frontend Next.js.

### 2. Menjalankan Aplikasi Setiap Hari
- **Klik ganda file `run.bat`**
- Skrip ini akan:
  1. Menjalankan Backend Engine di `http://localhost:8000`.
  2. Menjalankan Frontend Web Terminal di `http://localhost:3000`.
  3. Membuka browser default secara otomatis langsung ke antarmuka terminal.

### 3. Menghentikan Seluruh Layanan
- **Klik ganda file `stop.bat`**
- Skrip ini akan mematikan proses di port 8000 dan port 3000 secara bersih tanpa meninggalkan *zombie process*.

---

## 📚 Dokumentasi & Tata Kelola

- **[PRD.md](./PRD.md)**: Dokumen Spesifikasi Produk lengkap (analisis celah logika, model matematika formal, skema database DDL, kontrak API, dan spesifikasi UI/UX).
- **[AGENTS.md](./AGENTS.md)**: Tata kelola sistem multi-agen otonom (OODA loop, pembagian peran Builders vs Reviewers, dan batasan domain terkunci).
- **[.agents/](./.agents/)**: Direktori tata kelola spoke lokal, session state tracker ([session-state.json](./.agents/session-state.json)), rules, workflows, dan template boilerplate ([.agents/stubs/](./.agents/stubs/)).

---

## 📄 Lisensi

MIT License © 2026 Ahmad Arif & Tim Analysis-Market.
