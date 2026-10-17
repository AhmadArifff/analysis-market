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

---

## 🛠️ Tech Stack & Arsitektur

- **Quant Engine & Backend**: Python 3.11+, FastAPI, VectorBT / Backtesting.py, Pandas, NumPy, Numba.
- **Data Ingestion**: CCXT (Binance / Bybit REST & WebSocket), MetaTrader 5 (MT5 Python API) / TwelveData / Oanda.
- **Time-Series Database**: PostgreSQL 16 + TimescaleDB (Hypertables untuk OHLCV multi-timeframe 1m s.d 1M dengan kebijakan kompresi otomatis).
- **Frontend UI & Visualization**: Next.js 15 (App Router, React 19, TypeScript), Tailwind CSS, TradingView Lightweight Charts (v4/v5) dengan custom Canvas overlays.

---

## 📚 Dokumentasi & Tata Kelola

- **[PRD.md](./PRD.md)**: Dokumen Spesifikasi Produk lengkap (analisis celah logika, model matematika formal, skema database DDL, kontrak API, dan spesifikasi UI/UX).
- **[AGENTS.md](./AGENTS.md)**: Tata kelola sistem multi-agen otonom (OODA loop, pembagian peran Builders vs Reviewers, dan batasan domain terkunci).
- **[.agents/](./.agents/)**: Direktori tata kelola spoke lokal, session state tracker ([session-state.json](./.agents/session-state.json)), rules, workflows, dan template boilerplate ([.agents/stubs/](./.agents/stubs/)).

---

## 📄 Lisensi

MIT License © 2026 Ahmad Arif & Tim Analysis-Market.
