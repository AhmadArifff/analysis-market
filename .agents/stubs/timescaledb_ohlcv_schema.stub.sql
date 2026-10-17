-- ============================================================================
-- TimescaleDB & PostgreSQL Schema for Market Analysis & Backtesting Engine
-- Project: Analysis-Market
-- Naming Convention:
--   mst_* : Master Configuration Tables
--   mkt_* : Market Time-Series Data Tables
--   anl_* : Quantitative Analytics & Liquidity Traps
--   bt_*  : Backtesting Engine Execution & Trade Logs
-- ============================================================================

-- 1. Enable TimescaleDB Extension
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

-- 2. Master Aset & Konfigurasi Karakteristik Pasar
CREATE TABLE IF NOT EXISTS mst_asset (
    asset_id SERIAL PRIMARY KEY,
    symbol VARCHAR(20) UNIQUE NOT NULL,       -- Contoh: 'XAUUSD', 'BTCUSDT', 'PEPEUSDT'
    asset_cat VARCHAR(15) NOT NULL,           -- 'FOREX', 'CRYPTO_MAJOR', 'CRYPTO_MEME'
    max_bar_cycle INT DEFAULT 5,              -- Batas maksimal bar searah (default: 5)
    avg_daily_pct NUMERIC(5, 2) NOT NULL,     -- Rata-rata gerak harian (XAU: 1.00, BTC: 3.00, PEPE: 10.00)
    max_daily_pct NUMERIC(5, 2) NOT NULL,     -- Batas jenuh harian (XAU: 2.50, BTC: 5.00, PEPE: 20.00)
    min_retail_rr NUMERIC(4, 2) DEFAULT 1.50, -- Ambang batas RR retail (1.50 = 1:1.5)
    spread_bps NUMERIC(6, 2) DEFAULT 5.00,    -- Estimasi biaya spread/slippage untuk backtest (basis points)
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Data Candle Multi-Timeframe (Hypertable Partitioned by open_time)
CREATE TABLE IF NOT EXISTS mkt_ohlcv (
    asset_id INT NOT NULL REFERENCES mst_asset(asset_id) ON DELETE CASCADE,
    tf VARCHAR(5) NOT NULL,                   -- '1M', '1w', '1d', '4h', '1h'
    open_time TIMESTAMPTZ NOT NULL,
    open_px NUMERIC(18, 8) NOT NULL,          -- 8 desimal untuk mengakomodasi koin meme PEPE (0.0000xxxx)
    high_px NUMERIC(18, 8) NOT NULL,
    low_px NUMERIC(18, 8) NOT NULL,
    close_px NUMERIC(18, 8) NOT NULL,
    vol NUMERIC(24, 4) DEFAULT 0,
    atr_14 NUMERIC(18, 8),                    -- Nilai ATR(14) yang sudah dihitung
    consec_bar INT DEFAULT 0,                 -- +3 (3 bar naik berturut), -4 (4 bar turun berturut)
    is_closed BOOLEAN DEFAULT TRUE,           -- Mencegah look-ahead bias saat backtesting
    PRIMARY KEY (asset_id, tf, open_time)
);

-- Ubah mkt_ohlcv menjadi TimescaleDB Hypertable (chunk 7 hari)
SELECT create_hypertable('mkt_ohlcv', 'open_time', 
    chunk_time_interval => INTERVAL '7 days', 
    if_not_exists => TRUE
);

-- Indeks komposit efisiensi query multi-timeframe
CREATE INDEX IF NOT EXISTS idx_mkt_ohlcv_lookup 
ON mkt_ohlcv (asset_id, tf, open_time DESC);

-- 4. Peta Titik Likuiditas Retail (Active Retail Traps)
CREATE TABLE IF NOT EXISTS anl_liq_pool (
    pool_id BIGSERIAL PRIMARY KEY,
    asset_id INT NOT NULL REFERENCES mst_asset(asset_id) ON DELETE CASCADE,
    tf VARCHAR(5) NOT NULL,                   -- e.g. '4h', '1d'
    formed_at TIMESTAMPTZ NOT NULL,           -- Waktu swing high/low terkonfirmasi
    pool_type VARCHAR(10) NOT NULL,           -- 'BUY_SL' (di bawah support) atau 'SELL_SL' (di atas resistance)
    pool_px NUMERIC(18, 8) NOT NULL,          -- Harga titik likuiditas (SL level: Swing - 0.1*ATR)
    est_retail_rr NUMERIC(5, 2) NOT NULL,     -- Hasil hitungan RR retail (misal: 1.85)
    is_valid_target BOOLEAN NOT NULL,         -- TRUE jika est_retail_rr >= min_retail_rr (1.5)
    status VARCHAR(15) DEFAULT 'PENDING',     -- 'PENDING', 'SWEPT', 'INVALIDATED'
    swept_at TIMESTAMPTZ,                     -- Waktu ketika harga berhasil menjemput pool ini
    swept_px NUMERIC(18, 8),
    invalidated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_anl_liq_pool_active 
ON anl_liq_pool (asset_id, tf, status) 
WHERE status = 'PENDING';

-- 5. Jurnal Hasil Backtest & Live Paper Trading (Trade Logs)
CREATE TABLE IF NOT EXISTS bt_trade_log (
    trade_id BIGSERIAL PRIMARY KEY,
    asset_id INT NOT NULL REFERENCES mst_asset(asset_id) ON DELETE CASCADE,
    pool_id BIGINT REFERENCES anl_liq_pool(pool_id),
    is_paper_trading BOOLEAN DEFAULT FALSE,   -- TRUE = Live Forward Marking, FALSE = Historical Backtest
    confluence_score INT NOT NULL DEFAULT 0,  -- Skor gabungan saat entry (0 - 100 Poin)
    setup_type VARCHAR(32) NOT NULL DEFAULT 'COMPOSITE_SWEEP',
    macro_bias VARCHAR(10) NOT NULL,          -- Bias 1M/1W saat entry ('BULLISH' / 'BEARISH')
    daily_bar_cnt INT NOT NULL,               -- Bar ke-berapa di 1D saat sinyal muncul (misal: bar ke-4)
    side VARCHAR(5) NOT NULL,                 -- 'LONG' atau 'SHORT'
    entry_time TIMESTAMPTZ NOT NULL,
    entry_px NUMERIC(18, 8) NOT NULL,
    sl_px NUMERIC(18, 8) NOT NULL,
    tp_px NUMERIC(18, 8) NOT NULL,
    exit_time TIMESTAMPTZ,
    exit_px NUMERIC(18, 8),
    fees_paid NUMERIC(18, 8) DEFAULT 0,
    pnl_pct NUMERIC(8, 2),                    -- Persentase profit/loss bersih setelah dikurangi spread
    result VARCHAR(10),                       -- 'WIN', 'LOSS', 'BREAKEVEN', 'OPEN'
    active_modules JSONB,                     -- Indikator yang aktif
    notes TEXT                                -- Catatan analisis untuk jurnal trading
);

CREATE INDEX IF NOT EXISTS idx_bt_trade_log_asset 
ON bt_trade_log (asset_id, entry_time DESC);

CREATE INDEX IF NOT EXISTS idx_bt_trade_log_paper 
ON bt_trade_log (is_paper_trading, entry_time DESC);

-- 6. Kebijakan Kompresi TimescaleDB (Otomatis kompres data mkt_ohlcv > 30 hari)
ALTER TABLE mkt_ohlcv SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'asset_id, tf',
    timescaledb.compress_orderby = 'open_time DESC'
);

SELECT add_compression_policy('mkt_ohlcv', INTERVAL '30 days', if_not_exists => TRUE);
