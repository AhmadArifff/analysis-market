# Rule 10: Quantitative Domain Architecture & Algorithmic Patterns

> **Status**: PANDUAN UTAMA ARSITEKTUR TEKNIS SISTEM KUANTITATIF & BACKTESTING

---

## 1. Clean Hexagonal Architecture (Separation of Concerns)

Sistem `Analysis-Market` mengadopsi arsitektur heksagonal (*Ports & Adapters*) untuk menjamin logika kuantitatif murni bebas dari dependensi framework, bursa, atau database:

```
                      ┌─────────────────────────────────────────┐
                      │        Primary Adapters (Input)         │
                      │  - Next.js Web UI / TV Lightweight      │
                      │  - FastAPI REST Endpoints               │
                      │  - WebSocket Market Ingestion           │
                      └────────────────────┬────────────────────┘
                                           │
                                           ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                APPLICATION / SERVICE LAYER                             │
│  - MarketAnalysisService (MTF Scanner & Exhaustion Detector)                           │
│  - BacktestSimulationEngine (Vectorized / Event-Driven Runner)                         │
│  - RetailTrapMappingService (Swing RR Calculator & Liquidity Pool Identifier)          │
└──────────────────────────────────────────┬─────────────────────────────────────────────┘
                                           │
                                           ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              DOMAIN CORE (LOGIKA MURNI)                                │
│  - Math Models: ATR(14), Normalized Volatility, Fractal Swings                         │
│  - Strategy State Machine: IDLE -> ALERT -> POOL_MAPPED -> SWEPT -> MSS -> EXECUTED    │
│  - Risk Models: Position Sizing, Dynamic Slippage, Risk-to-Reward Metrics              │
│  - Zero Framework Dependency (Pure Python / NumPy / Pandas)                            │
└──────────────────────────────────────────┬─────────────────────────────────────────────┘
                                           │
                                           ▼
                      ┌────────────────────┴────────────────────┐
                      │       Secondary Adapters (Output)       │
                      │  - CCXT Adapter (Binance / Bybit)       │
                      │  - MetaTrader 5 / Oanda Adapter         │
                      │  - TimescaleDB Hypertables Repository   │
                      │  - Redis Pub/Sub Event Bus              │
                      └─────────────────────────────────────────┘
```

---

## 2. Prinsip Rekayasa Kuantitatif (Quant Standards)

1. **Zero Look-Ahead Bias Enforcement**:
   - Seluruh kalkulasi indikator pada timeframe lebih tinggi (1W atau 1M) wajib menggunakan candle yang **sudah ditutup secara resmi** (`is_closed == True`).
   - Slicing data time-series saat simulasi backtest wajib bersifat kausal: pada timestamp $T_k$, memori algoritma hanya boleh mengakses data dengan timestamp $\le T_k$.
2. **Dynamic Volatility Profiling (No Static Pct)**:
   - Dilarang keras meng-hardcode kenaikan 2%–5% untuk semua aset.
   - Volatilitas wajib dinormalisasi menggunakan rasio ATR:
     $$\text{Exhaustion Multiplier} = \frac{\Delta P_{\text{consecutive}}}{ATR(14)}$$
3. **Retail Risk-to-Reward (RR) Quantification**:
   - Deteksi *Swing High* (Resistance) dan *Swing Low* (Support) berbasis fraktal $N$-bar.
   - Jarak Stop Loss retail ($R$) dihitung dari titik breakout ke swing ekstrem terdekat.
   - Jarak Take Profit retail ($T$) diproyeksikan ke level struktural berikutnya.
   - Tandai sebagai `Active Liquidity Pool` jika $1.5 \le \frac{T}{R} \le 2.5$. Jika $\frac{T}{R} < 1.5$ atau $> 3.0$, tandai sebagai `Low Probability Pool` (skip).
4. **Finite State Machine Eksekusi**:
   - Transisi status harus deterministik: `IDLE` $\rightarrow$ `BIAS_CONFIRMED` $\rightarrow$ `EXHAUSTION_ALERT` $\rightarrow$ `LIQUIDITY_MAPPED` $\rightarrow$ `WAITING_SWEEP` $\rightarrow$ `SWEEP_CONFIRMED` $\rightarrow$ `MSS_TRIGGER` $\rightarrow$ `IN_POSITION`.

---

## 3. Penanganan Data & Gesekan Pasar Riil

1. **Real-world Friction Simulation**:
   - Setiap simulasi trade wajib mengurangkan:
     - **Spread**: Rata-rata bid-ask spread instrumen (misal: 15–30 cents untuk Gold, 0.01% untuk BTC).
     - **Dynamic Slippage**: Slippage berdasarkan ukuran volume order terhadap likuiditas pasar.
     - **Exchange Commissions**: Biaya maker/taker fee (0.02%–0.075%).
2. **Graceful Degradation Data Feeds**:
   - Jika koneksi WebSocket CCXT atau MT5 terputus, engine wajib beralih otomatis ke REST polling periodik dan mengirimkan alert status `DATA_FEED_DEGRADED` ke UI.
3. **Guard Clauses & Result Pattern**:
   - Semua fungsi kalkulasi kuantitatif wajib menggunakan Guard Clauses untuk mencegah division-by-zero (misal saat $R = 0$) dan mengembalikan Result Pattern `{ success: bool, value: Any, error: Optional[str] }`.
