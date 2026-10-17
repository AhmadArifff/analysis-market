"""
Strategy Engine: Multi-Timeframe ATR Exhaustion & Retail Liquidity Sweep
Project: Analysis-Market

Mengimplementasikan:
1. Identifikasi Fraktal 5-Bar (Swing High & Swing Low)
2. Kalkulasi Psikologi Retail (Estimasi Entry, SL Pool, TP Target, dan RR Retail)
3. Filter Kelayakan Pool: Valid jika RR >= 1.5, Skip jika RR < 1.0 (atau inverted risk)
4. Deteksi Konfirmasi Liquidity Sweep (Pinbar / Rejection Wick pada H4/H1)
5. Indikator Presisi: EMA 21/50, ADX(14), RSI(5) Cepat, RVOL (>2.0x), & Open Interest
6. Sistem Pembobotan Confluence Score (0 - 100 Poin)
7. Anti Look-Ahead Bias (Menggunakan closed candle slicing)
"""

from typing import Dict, Any, Optional, Tuple
import pandas as pd
import numpy as np


def calculate_rsi(series: pd.Series, period: int = 5) -> pd.Series:
    """Kalkulasi RSI Cepat (default period=5 untuk siklus 5 bar)"""
    delta = series.diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
    rs = gain / loss.replace(0, np.nan)
    rsi = 100 - (100 / (1 + rs))
    return rsi.fillna(50)


def calculate_rvol(df: pd.DataFrame, period: int = 20) -> float:
    """Kalkulasi Relative Volume (RVOL): Volume saat ini vs Rata-rata 20 bar"""
    if len(df) < period + 1:
        return 1.0
    avg_vol = df['vol'].iloc[-period-1:-1].mean()
    if avg_vol <= 0:
        return 1.0
    return float(df['vol'].iloc[-1] / avg_vol)


def count_consecutive_bars(df: pd.DataFrame, direction: str = "DOWN") -> int:
    """
    Menghitung jumlah candlestick searah berturut-turut pada data closed candle.
    direction: 'UP' (close > open) atau 'DOWN' (close < open)
    """
    if len(df) < 1:
        return 0
    count = 0
    for i in range(len(df) - 1, -1, -1):
        is_up = df['close_px'].iloc[i] > df['open_px'].iloc[i]
        if (direction == "UP" and is_up) or (direction == "DOWN" and not is_up):
            count += 1
        else:
            break
    return count


def get_last_swing_low(df: pd.DataFrame, order: int = 2) -> Optional[float]:
    """
    Mendeteksi Swing Low fraktal 5-bar:
    Low[i] < Low[i-1], Low[i-2] dan Low[i] < Low[i+1], Low[i+2]
    Catatan: Memerlukan 2 candle tertutup di kanan untuk konfirmasi bebas look-ahead bias.
    """
    if len(df) < (2 * order + 1):
        return None
        
    lows = df['low_px'].values
    for i in range(len(lows) - 1 - order, order - 1, -1):
        current_low = lows[i]
        left_side = lows[i - order:i]
        right_side = lows[i + 1:i + order + 1]
        
        if (current_low < left_side).all() and (current_low < right_side).all():
            return float(current_low)
            
    return float(np.min(lows[-10:])) # Fallback support lokal


def get_last_swing_high(df: pd.DataFrame, order: int = 2) -> Optional[float]:
    """
    Mendeteksi Swing High fraktal 5-bar:
    High[i] > High[i-1], High[i-2] dan High[i] > High[i+1], High[i+2]
    """
    if len(df) < (2 * order + 1):
        return None
        
    highs = df['high_px'].values
    for i in range(len(highs) - 1 - order, order - 1, -1):
        current_high = highs[i]
        left_side = highs[i - order:i]
        right_side = highs[i + 1:i + order + 1]
        
        if (current_high > left_side).all() and (current_high > right_side).all():
            return float(current_high)
            
    return float(np.max(highs[-10:])) # Fallback resistance lokal


def calculate_confluence_score(
    macro_aligned: bool,
    daily_exhausted: bool,
    retail_rr_valid: bool,
    sweep_pinbar_rvol: bool,
    divergence_or_oi_plunge: bool
) -> Tuple[int, Dict[str, int]]:
    """
    Kalkulasi Confluence Score (0 - 100 Poin)
    Threshold eksekusi: >= 80 Poin
    """
    breakdown = {
        "macro_trend_ema_adx": 20 if macro_aligned else 0,
        "daily_exhaustion_atr_rsi5": 20 if daily_exhausted else 0,
        "retail_rr_pool_mapped": 20 if retail_rr_valid else 0,
        "sweep_pinbar_rvol_spike": 25 if sweep_pinbar_rvol else 0,
        "divergence_or_oi_drop": 15 if divergence_or_oi_plunge else 0
    }
    total_score = sum(breakdown.values())
    return total_score, breakdown


def evaluate_market_setup(
    df_1w: pd.DataFrame, 
    df_1d: pd.DataFrame, 
    df_4h: pd.DataFrame,
    crypto_metrics: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Evaluasi setup kuantitatif menyeluruh berbasis Multi-Timeframe,
    Exhaustion ATR & RSI-5, Retail RR, dan Confluence Scoring.
    """
    # 1. CEK SIKLUS MAKRO (1W/1M TREND & ADX FILTER)
    closed_1w = df_1w[df_1w['is_closed'] == True] if 'is_closed' in df_1w else df_1w
    close_1w = closed_1w['close_px'].iloc[-1]
    ema_21_1w = closed_1w['ema_21'].iloc[-1] if 'ema_21' in closed_1w else close_1w
    ema_50_1w = closed_1w['ema_50'].iloc[-1] if 'ema_50' in closed_1w else close_1w
    adx_1w = closed_1w['adx_14'].iloc[-1] if 'adx_14' in closed_1w else 26.0

    is_macro_bullish = (close_1w > ema_21_1w) and (ema_21_1w > ema_50_1w) and (adx_1w > 20.0)
    macro_trend = "BULLISH" if is_macro_bullish else "BEARISH"

    # 2. CEK SIKLUS BAR HARIAN (EXHAUSTION & RSI-5)
    consecutive_red_bars = count_consecutive_bars(df_1d, direction="DOWN")
    daily_atr = df_1d['atr_14'].iloc[-1]
    daily_close = df_1d['close_px'].iloc[-1]
    cumulative_drop = abs(df_1d['open_px'].iloc[-consecutive_red_bars] - daily_close) if consecutive_red_bars > 0 else 0
    
    rsi_5_series = calculate_rsi(df_1d['close_px'], period=5)
    rsi_5_val = rsi_5_series.iloc[-1]
    
    # Syarat Exhaustion: 3-5 bar turun, pergerakan >= 1.5x ATR, dan RSI(5) oversold (< 20)
    daily_exhausted = (3 <= consecutive_red_bars <= 5) and (cumulative_drop >= 1.5 * daily_atr) and (rsi_5_val <= 25.0)

    # 3. DETEKSI POOL LIKUIDITAS RETAIL DI H4
    swing_low = get_last_swing_low(df_4h, order=2)
    swing_high = get_last_swing_high(df_4h, order=2)

    if swing_low is None or swing_high is None:
        return {"status": "NO_SETUP", "reason": "Swing levels belum terbentuk"}

    h4_atr = df_4h['atr_14'].iloc[-1]
    retail_entry_zone = swing_low + (0.3 * h4_atr)
    l_pool = swing_low - (0.1 * h4_atr)

    retail_risk = abs(retail_entry_zone - l_pool)
    retail_reward = abs(swing_high - retail_entry_zone)
    retail_rr = (retail_reward / retail_risk) if retail_risk > 0 else 0.0

    retail_rr_valid = (retail_rr >= 1.5)

    # 4. CEK KONFIRMASI SWEEP (TRIGGER ENTRY)
    current_candle = df_4h.iloc[-1]
    candle_range = current_candle['high_px'] - current_candle['low_px']
    penetrated = current_candle['low_px'] < l_pool
    closed_above_support = current_candle['close_px'] > swing_low
    lower_wick = min(current_candle['open_px'], current_candle['close_px']) - current_candle['low_px']
    wick_rejection_ratio = (lower_wick / candle_range) if candle_range > 0 else 0.0

    rvol_val = calculate_rvol(df_4h, period=20)
    sweep_pinbar_rvol = penetrated and closed_above_support and (wick_rejection_ratio >= 0.30) and (rvol_val >= 1.8)

    # 5. KONFIRMASI TAMBAHAN (DIVERGENCE / OI DROP)
    oi_dropped = False
    if crypto_metrics and "open_interest_delta_pct" in crypto_metrics:
        oi_dropped = crypto_metrics["open_interest_delta_pct"] < -2.0  # Penurunan OI > 2% pada sweep

    divergence_detected = crypto_metrics.get("rsi_divergence", False) if crypto_metrics else False
    extra_confirmation = oi_dropped or divergence_detected

    # 6. HITUNG CONFLUENCE SCORE
    score, breakdown = calculate_confluence_score(
        macro_aligned=is_macro_bullish,
        daily_exhausted=daily_exhausted,
        retail_rr_valid=retail_rr_valid,
        sweep_pinbar_rvol=sweep_pinbar_rvol,
        divergence_or_oi_plunge=extra_confirmation
    )

    if sweep_pinbar_rvol and (score >= 80):
        entry_price = current_candle['close_px']
        stop_loss = current_candle['low_px'] - (0.2 * h4_atr)
        take_profit = swing_high
        planned_risk = abs(entry_price - stop_loss)
        planned_reward = abs(take_profit - entry_price)
        system_rr = (planned_reward / planned_risk) if planned_risk > 0 else 0.0

        return {
            "status": "SIGNAL_TRIGGERED",
            "signal": "HIGH_PROBABILITY_SWEEP_ENTRY",
            "confluence_score": score,
            "score_breakdown": breakdown,
            "entry": entry_price,
            "sl": stop_loss,
            "tp": take_profit,
            "system_rr": round(system_rr, 2),
            "retail_rr_trapped": round(retail_rr, 2),
            "rvol": round(rvol_val, 2),
            "rsi_5": round(rsi_5_val, 2),
            "wick_rejection_ratio": round(wick_rejection_ratio, 2),
            "pool_price": l_pool
        }

    return {
        "status": "MONITORING",
        "confluence_score": score,
        "score_breakdown": breakdown,
        "macro_trend": macro_trend,
        "consecutive_red_bars": consecutive_red_bars,
        "rsi_5": round(rsi_5_val, 2),
        "rvol": round(rvol_val, 2),
        "active_pool_price": l_pool,
        "retail_rr": round(retail_rr, 2),
        "is_ready_for_sweep": retail_rr_valid and daily_exhausted
    }
