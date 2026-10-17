# Rule 20: Database & Time-Series Storage Standards (TimescaleDB)

> **Time-Series Storage Protocol**: Standar arsitektur basis data PostgreSQL 16 dengan ekstensi TimescaleDB untuk pemrosesan OHLCV berkecepatan tinggi, data derivatif kripto, dan riwayat backtest.

---

## 1. Arsitektur TimescaleDB Hypertables

1. **Partisi Waktu Otomatis (Chunk Intervals)**:
   - Tabel `candles` dan `crypto_market_metrics` wajib dikonversi menjadi **Hypertable** menggunakan `create_hypertable()`.
   - Chunk interval diatur berdasarkan granularitas data:
     - Data tick / 1-menit (`1m`): Chunk interval **7 hari** (`INTERVAL '7 days'`).
     - Data higher timeframe (`1h`, `4h`, `1d`, `1w`, `1M`): Chunk interval **30 hari** atau **90 hari**.
2. **Kunci Komposit & Pengindeksan Efisien**:
   - Primary index wajib memuat `(asset_id, timeframe, timestamp DESC)`.
   - Menghindari full-table scan dengan selalu menyertakan filter `asset_id` dan rentang `timestamp` pada setiap query backtest.
3. **Continuous Aggregates**:
   - Daripada menghitung ulang timeframe besar saat runtime, gunakan fitur TimescaleDB *Continuous Aggregates* untuk otomatis merangkum data 1m menjadi candle 1h, 4h, dan 1d di latar belakang.
4. **Kebijakan Kompresi (*Compression Policy*)**:
   - Aktifkan kompresi bawaan TimescaleDB pada chunk data historis yang berusia lebih dari **30 hari**.
   - Segmentasi kompresi: `segmentby = 'asset_id, timeframe'` dan urutan `orderby = 'timestamp DESC'`. Ini menghemat kapasitas disk hingga 80%–90%.

---

## 2. Struktur Entitas Inti Sistem Kuantitatif

1. **`assets`**: Katalog instrumen trading (Forex: XAUUSD; Crypto: BTC, ETH, BNB, SOL, DOGE, PEPE), tipe pasar, tick size, minimal notional, dan taker/maker fees.
2. **`candles`** (*Hypertable*): Data Open, High, Low, Close, Volume (OHLCV) per aset dan timeframe.
3. **`crypto_market_metrics`** (*Hypertable*): Data pelengkap crypto (Funding Rate, Open Interest (OI), Long/Short Ratio, Liquidation Volume).
4. **`liquidity_pools`**: Wilayah konsentrasi Stop Loss retail terdeteksi (Support/Resistance Swing, rasio RR 1:1.5 - 1:2, status `ACTIVE`, `SWEPT`, `INVALIDATED`).
5. **`backtest_runs`**: Header eksekusi backtesting (parameter input, rentang waktu, modal awal, final balance, Sharpe, Max Drawdown, Win Rate).
6. **`backtest_trades`**: Rincian setiap transaksi simulasi (entry time/price, exit time/price, SL, TP, PnL kotor, fees/slippage, PnL bersih, alasan exit).

---

## 3. Kebijakan Keamanan & Zero-Direct-CRUD

1. **Zero-Direct-CRUD (MUTLAK)**:
   - Agen AI dilarang mengeksekusi DDL (`CREATE`, `ALTER`, `DROP`) atau DML mutasi langsung ke database produksi secara sepihak.
   - Seluruh perubahan skema dan tabel wajib disediakan dalam bentuk file skrip migrasi `.sql` terstruktur yang dapat diverifikasi dan dieksekusi secara transparan oleh pengguna.
2. **Transactional Rollback**:
   - Setiap pencatatan hasil backtest yang melibatkan banyak trade wajib menggunakan transaksi atomik (`BEGIN ... COMMIT`) dengan mekanisme rollback jika terjadi kegagalan parsial.
