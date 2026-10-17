# Rule 30: UI Component Reasoning & Financial Charting Standards

> **UI/UX & Charting Standard**: Pedoman pemetaan interaksi dan visualisasi antarmuka analisis kuantitatif, grafik TradingView Lightweight Charts, matriks bias multi-timeframe, dan metrik backtest.

---

## 1. Matriks Visualisasi Kuantitatif & TradingView Charts

| Elemen Antarmuka | Representasi Visual | Tujuan UX / Reasoning | Interaksi & Perilaku |
| :--- | :--- | :--- | :--- |
| **TradingView Candlestick Series** | Main Chart Panel (Dark theme `#131722`) | Menampilkan pergerakan harga OHLCV real-time dan historis | Zoom, pan, timeframe switch (1m, 1h, 4h, 1d, 1w) |
| **Retail Liquidity Pool (Box Overlay)** | Semi-transparent Box (`rgba(239, 68, 68, 0.2)` untuk Sell SL, `rgba(34, 197, 94, 0.2)` untuk Buy SL) | Menandai area konsentrasi Stop Loss retail (RR 1:1.5 - 1:2) yang berpotensi dijemput bandar | Hover menampilkan tooltip: Jarak $R$, $T$, rasio RR, dan estimasi volume pool |
| **Liquidity Sweep Marker** | Chevron Marker / Wick Highlight tepat di candle penembus | Memberikan konfirmasi visual bahwa likuiditas retail telah terjemput | Klik marker menampilkan popup ringkasan sweep (waktu, harga puncak, wick rejection ratio) |
| **Multi-Timeframe (MTF) Heatmap** | 5-Badge Status Matrix (1M, 1W, 1D, H4, H1) | Memberikan kejelasan arah tren makro dan siklus pasar tanpa harus berganti-ganti chart | Warna dinamis: Hijau (Bullish), Merah (Bearish), Abu-abu (Neutral/Consolidating) |
| **Bar Exhaustion Gauge** | Progress Ring / Numeric Badge (1 s.d 5) | Memperingatkan kejenuhan pergerakan harian berbasis ATR | Bar 1-3 (Normal), Bar 4 (Warning Orange), Bar 5 (Alert Yellow - Siap Reversal) |
| **Backtest Equity Curve** | Baseline / Area Chart bergradien | Menilai pertumbuhan modal simulasi dan kedalaman drawdown | Sumbu X (Waktu/Trade #), Sumbu Y (Portfolio Balance USD), fill hijau/merah |
| **Performance Scorecard** | KPI Cards Grid (Win Rate, Profit Factor, Max DD, Sharpe) | Ringkasan statistik performa kuantitatif secara instan | Pure numeric typography, warna hijau untuk metrik positif, merah untuk drawdown |

---

## 2. Standar Desain Chart & Zero-Lag Rendering

1. **TradingView Lightweight Charts v4/v5**:
   - Gunakan instance canvas terisolasi di dalam kontainer reaktif (Next.js/React `useRef` + `useEffect`).
   - Wajib memanggil `.remove()` pada chart instance saat komponen mengalami *unmount* untuk mencegah kebocoran memori WebGL/Canvas.
   - Aktifkan `autoSize: true` dan tangani event *window resize* dengan debounce 100ms.
2. **Pewarnaan Kontras Finansial (Dark Theme First)**:
   - Background: Dark slate/navy `#0d1117` atau `#131722`.
   - Bullish Candle: `#22c55e` (Emerald 500) atau `#089981`.
   - Bearish Candle: `#ef4444` (Red 500) atau `#f23645`.
   - Wick & Border: Selaras dengan body candle.
   - Liquidity Sweep Indicator: Gold/Amber `#f59e0b` untuk menonjolkan momen krusial.
3. **Data Refresh & Streaming**:
   - Update candle real-time via WebSocket menggunakan method `series.update()` (bukan reload seluruh array `series.setData()`) demi efisiensi CPU 60fps.

---

## 3. Matriks Reasoning Elemen Interaksi Standar

- **Drawer / Slide-Over**: Digunakan untuk menampilkan rincian trade spesifik dari daftar hasil backtest (waktu entry/exit, screenshot chart saat sinyal terbentuk, slippage, PnL) tanpa keluar dari halaman utama.
- **Modal Dialog**: Digunakan untuk form parameter backtest kompleks (pemilihan aset multi-select, rentang tanggal, konfigurasi ATR multiplier, target RR retail, modal awal) sebelum kalkulasi dijalankan.
- **Toast**: Umpan balik cepat ("Backtest selesai dalam 1.2 detik", "Data candle diperbarui", "Preset strategi disimpan").
- **Inline Alert**: Peringatan risiko ("Data feed terputus", "Kombinasi parameter menghasilkan < 10 trade, sampel statistik tidak signifikan").
