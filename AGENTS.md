# AGENTS.md: Local Project Governance & Quantitative Agentic System

> **Child Spoke Entry File**: File ini dibaca secara otomatis pada setiap sesi percakapan baru di lingkungan Antigravity, Claude Code, Codex, dan Cursor untuk proyek **Analysis-Market**. Proyek ini mengadopsi tata kelola arsitektur dari **Master Hub** (`agentic AI`) dengan penyesuaian khusus (*tailored customization*) untuk domain **Quantitative Market Analysis & Multi-Asset Backtesting Engine** (Forex & Cryptocurrency).

---

## 1. Identitas Proyek & Single Source of Truth

- **Nama Proyek**: `Analysis-Market`
- **Domain**: Quantitative Market Analysis, Multi-Timeframe Algorithmic Backtesting, Smart Money Concepts (SMC) & Retail Liquidity Traps.
- **Instrumen Target**:
  - **Forex**: `XAUUSD` (Gold Spot US Dollar).
  - **Crypto Majors**: `BTC/USDT`, `ETH/USDT`, `BNB/USDT`, `SOL/USDT`.
  - **Crypto High-Beta / Memes**: `DOGE/USDT`, `PEPE/USDT`, dan token trending lainnya.
- **Tech Stack**:
  - **Quant Core & Engine**: Python 3.11+, FastAPI, VectorBT / Backtesting.py, Pandas, NumPy, Numba.
  - **Data Feeds**: CCXT (Binance/Bybit REST & WebSocket), MetaTrader 5 (MT5 Python API) / TwelveData / Oanda.
  - **Database & Time-Series**: PostgreSQL 16 + TimescaleDB (Hypertables untuk OHLCV 1m s.d 1M, continuous aggregates).
  - **Frontend UI & Visualization**: Next.js 15 (App Router, React 19, TypeScript), Tailwind CSS, TradingView Lightweight Charts (v4/v5) dengan custom Canvas primitives overlay.
- **Spesifikasi Lengkap**: Lihat dokumen [PRD.md](./PRD.md) di root proyek.
- **Session State Aktif**: Terkunci di [.agents/session-state.json](./.agents/session-state.json). Semua agen wajib membaca dan memperbarui status sub-tugas di file ini guna mencegah *context drift*.

---

## 2. Arsitektur Multi-Agen & Pembagian Peran (OODA Loop)

Sistem ini mewarisi siklus **OODA (Observe -> Orient -> Decide -> Act)** dan prinsip **No Self-Review** dari Master Hub:

```
[Pengguna] ──> [triage-router] ──> [problem-decomposer] ──> [goal-tracker (.agents/session-state.json)]
                                                                  │
               ┌───────────────────────┬──────────────────────────┤
               ▼                       ▼                          ▼
      [quant-engineer]        [backend-engineer]        [frontend-engineer]
  (Model Matematika & ATR) (TimescaleDB & Data Feed) (TradingView Charts & UI)
               │                       │                          │
               └───────────────────────┼──────────────────────────┘
                                       ▼
                       [qa-engineer] & [tech-critic]
           (Uji Look-Ahead Bias, Slippage, & Overfitting Review)
                                       │
                                       ▼
                             [Delivery Gate Lolos]
```

### Peran Kunci yang Aktif di Proyek Ini:
1. **Generalist / Orchestration**:
   - `triage-router`: Gerbang utama penerima instruksi alami pengguna.
   - `goal-tracker`: Pengelola [.agents/session-state.json](./.agents/session-state.json) dan penjaga batasan terkunci (`established_constraints`).
2. **Builders (Pelaksana Teknis)**:
   - `quant-engineer`: Perancang model matematika Multi-Timeframe (MTF), kalkulasi volatilitas dinamis ATR(14), indeks kejenuhan candle (*Time-Bar Exhaustion*), formulasi deteksi Stop Loss retail (RR 1:1.5 - 1:2), dan finite state machine eksekusi.
   - `backend-engineer`: Pembangun REST & WebSocket API FastAPI, pipeline data feed (CCXT & MT5), optimasi query TimescaleDB hypertable, dan engine backtest asinkron.
   - `frontend-engineer`: Pembangun antarmuka modern Next.js, integrasi TradingView Lightweight Charts, rendering zona likuiditas (*Active Liquidity Pools*), penanda candle *sweep*, serta kartu performa metrik (Sharpe, Max Drawdown, Win Rate).
3. **Reviewers (Penguji Kualitas & Ketahanan)**:
   - `qa-engineer`: Boundary testing, validasi bebas *Look-Ahead Bias* (strict closed candle slicing), pengujian gesekan transaksi (*spread, dynamic slippage, commissions*), dan automated browser testing.
   - `tech-critic`: Devil's advocate independen, menantang asumsi trading, mendeteksi overfitting / p-hacking, serta mengawasi validitas pengujian *Walk-Forward*.
   - `security-engineer`: Pengawal isolasi kredensial (API Key CCXT, akun MT5) dan pencegah kebocoran rahasia.

---

## 3. Batasan Domain Kuantitatif Terkunci (`established_constraints`)

Seluruh agen wajib mematuhi batasan kuantitatif ini tanpa kompromi:

1. **C-QUANT-01 (Anti Look-Ahead Bias)**:
   Dalam backtesting multi-timeframe (misal menggunakan bias 1W/1M untuk entry di 1D atau H1), candle yang sedang berjalan (*unclosed bar*) **DILARANG KERAS** diintip oleh algoritma sebelum timestamp penutupan resminya tercapai.
2. **C-QUANT-02 (Dynamic Volatility Calibration)**:
   Dilarang menggunakan ambang persentase kenaikan harian yang kaku (2%–5%) secara seragam. Wajib menggunakan kelipatan **ATR(14)** yang dinormalisasi untuk membedakan volatilitas rendah (XAUUSD: 0.5%–1.5%), sedang (BTC/ETH: 2%–5%), dan ekstrem (SOL, DOGE, PEPE: 8%–25%+).
3. **C-QUANT-03 (Bar Exhaustion Protocol)**:
   Kondisi 3 hingga 5 bar chart harian berturut-turut searah hanya diperlakukan sebagai **Alert Zone / Warning State**, BUKAN sinyal counter-trend langsung. Entry posisi wajib menunggu konfirmasi *Liquidity Sweep* dan *Market Structure Shift (MSS)* pada timeframe yang lebih rendah (H1/H4).
4. **C-QUANT-04 (Realistic Execution Friction)**:
   Backtest wajib mensimulasikan spread bid-ask riil, slippage dinamis berbasis volume, dan biaya maker/taker fee bursa (0.05%–0.1% untuk crypto, spread pips untuk forex).
5. **C-QUANT-05 (Session Killzones)**:
   Khusus instrumen Forex (XAUUSD), perburuan likuiditas retail diprioritaskan pada sesi London (14:00–16:00 WIB) dan New York (19:00–22:00 WIB). Penembusan di luar jam ini diperlakukan sebagai konsolidasi probabilitas rendah.
6. **C-QUANT-06 (Crypto Derivatives Data)**:
   Khusus instrumen Crypto, sinyal sweep likuiditas wajib dikorelasikan dengan lonjakan Open Interest (OI), skew ekstrem Funding Rate, dan data likuidasi.
7. **C-QUANT-07 (Confluence Scoring Protocol)**:
   Sinyal eksekusi (`HIGH_PROBABILITY_SWEEP_ENTRY`) wajib mencapai skor gabungan minimal **$\ge$ 80/100 Poin** (EMA 21/50 + ADX 14, 3–5 Bar ATR + RSI-5, Retail RR 1:1.5–1:2, Pinbar RVOL $\ge$ 2.0x, dan RSI Divergence / OI drop).
8. **C-DB & C-ZERO-DIRECT-CRUD**:
   Menggunakan TimescaleDB untuk efisiensi penyimpanan time-series. Agen dilarang mengeksekusi migrasi diam-diam; wajib menyediakan query DDL/DML terverifikasi.

---

## 4. Struktur Direktori Tata Kelola Lokal (`.agents/`)

- [.agents/session-state.json](./.agents/session-state.json): Single Source of Truth memori sesi aktif dan pelacakan sub-tugas.
- `.agents/rules/`:
  - [00-core-guardrails.md](./.agents/rules/00-core-guardrails.md): Aturan mutlak keamanan data, zero-leak API keys, dan Zero-Direct-CRUD.
  - [01-workflow-discipline.md](./.agents/rules/01-workflow-discipline.md): Disiplin OODA loop, 7 pilar task review, pelacakan sesi, dan eliminasi zombie code.
  - [10-domain-architecture.md](./.agents/rules/10-domain-architecture.md): Arsitektur Quant Engine, Clean Hexagonal Pattern, dan orkestrasi data pipeline.
  - [20-database-storage.md](./.agents/rules/20-database-storage.md): Standar TimescaleDB hypertables, continuous aggregates OHLCV, dan optimasi time-series.
  - [30-ui-component-reasoning.md](./.agents/rules/30-ui-component-reasoning.md): Matriks visual TradingView Lightweight Charts, overlay box likuiditas, dan metrik backtest.
- `.agents/workflows/`:
  - [git-workflow.md](./.agents/workflows/git-workflow.md): Protokol Git Pull-Before-Build & Pull-Before-Push.
  - [task-review-protocol.md](./.agents/workflows/task-review-protocol.md): Evaluasi 7 pilar sebelum implementasi model kuantitatif.
  - [new-feature-lifecycle.md](./.agents/workflows/new-feature-lifecycle.md): Siklus hidup fitur dari riset matematika hingga visualisasi chart.
  - [record-bug-case.md](./.agents/workflows/record-bug-case.md): Dokumentasi preseden bug kuantitatif atau anomali backtest.
- `.agents/stubs/`: Template boilerplate kode siap pakai:
  - `timescaledb_ohlcv_schema.stub.sql`: DDL hypertable & continuous aggregates.
  - `strategy_exhaustion_sweep.stub.py`: Template algoritma Python ATR & Retail Liquidity Sweep.
  - `data_feed_adapter.stub.py`: Adapter abstraksi CCXT dan MT5.
  - `tradingview_chart_adapter.stub.ts`: Adapter TypeScript untuk TradingView Lightweight Charts.
- `.agents/knowledge/cases/`: Catatan preseden bug produksi dan anomali backtest.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
