"""
Market Analysis API Endpoints
"""

from fastapi import APIRouter, Query
from typing import Optional, List, Dict, Any
import datetime

router = APIRouter()


@router.get("/watchlist")
def get_watchlist():
    """Mengembalikan daftar pantau instrumen dengan skor konfluensi dan status bar saat ini"""
    return {
        "success": True,
        "data": [
            {
                "symbol": "XAUUSD",
                "name": "Gold Spot / US Dollar",
                "category": "FOREX",
                "last_price": 2642.50,
                "change_24h": 1.18,
                "consecutive_bar": 4,
                "max_bar_cycle": 5,
                "exhaustion_status": "WARNING",
                "confluence_score": 85,
                "macro_trend": "BULLISH"
            },
            {
                "symbol": "BTCUSDT",
                "name": "Bitcoin / Tether",
                "category": "CRYPTO_MAJOR",
                "last_price": 64520.00,
                "change_24h": 3.12,
                "consecutive_bar": 2,
                "max_bar_cycle": 5,
                "exhaustion_status": "NORMAL",
                "confluence_score": 45,
                "macro_trend": "BULLISH"
            },
            {
                "symbol": "ETHUSDT",
                "name": "Ethereum / Tether",
                "category": "CRYPTO_MAJOR",
                "last_price": 2615.40,
                "change_24h": -0.45,
                "consecutive_bar": 1,
                "max_bar_cycle": 5,
                "exhaustion_status": "NORMAL",
                "confluence_score": 30,
                "macro_trend": "NEUTRAL"
            },
            {
                "symbol": "SOLUSDT",
                "name": "Solana / Tether",
                "category": "CRYPTO_MAJOR",
                "last_price": 154.20,
                "change_24h": 5.25,
                "consecutive_bar": 3,
                "max_bar_cycle": 5,
                "exhaustion_status": "NORMAL",
                "confluence_score": 65,
                "macro_trend": "BULLISH"
            },
            {
                "symbol": "PEPEUSDT",
                "name": "Pepe / Tether",
                "category": "CRYPTO_MEME",
                "last_price": 0.00001045,
                "change_24h": 11.80,
                "consecutive_bar": 5,
                "max_bar_cycle": 5,
                "exhaustion_status": "CRITICAL_ALERT",
                "confluence_score": 90,
                "macro_trend": "BULLISH"
            },
            {
                "symbol": "DOGEUSDT",
                "name": "Dogecoin / Tether",
                "category": "CRYPTO_MEME",
                "last_price": 0.1245,
                "change_24h": 3.80,
                "consecutive_bar": 2,
                "max_bar_cycle": 5,
                "exhaustion_status": "NORMAL",
                "confluence_score": 50,
                "macro_trend": "BULLISH"
            }
        ]
    }


@router.get("/analysis/current")
def get_current_analysis(symbol: str = Query("XAUUSD")):
    """Analisis multi-timeframe dan zona likuiditas aktif untuk aset yang dipilih"""
    return {
        "success": True,
        "data": {
            "symbol": symbol,
            "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
            "mtf_matrix": {
                "1M": "BULLISH",
                "1W": "BULLISH",
                "1D": "EXHAUSTION_WARNING",
                "H4": "SWEEP_WATCH",
                "H1": "CONSOLIDATION"
            },
            "cycle_meter": {
                "consecutive_bars": 4,
                "max_bars": 5,
                "daily_move_pct": 3.20,
                "atr_14": 28.50,
                "status": "ALERT_REVERSAL_ZONE"
            },
            "gravity_horizon": {
                "preferred_direction": "BUY_SIDE",
                "probability_pct": 74.0,
                "next_target_level": 2675.00
            },
            "confluence": {
                "score": 85,
                "status": "HIGH_PROBABILITY_SETUP",
                "breakdown": {
                    "macro_trend_ema_adx": 20,
                    "daily_exhaustion_atr_rsi5": 20,
                    "retail_rr_pool_mapped": 20,
                    "sweep_pinbar_rvol": 25,
                    "divergence_or_oi_plunge": 0
                }
            },
            "active_liquidity_pools": [
                {
                    "pool_id": 102,
                    "pool_type": "BUY_SL",
                    "pool_price": 2638.50,
                    "retail_rr": 1.85,
                    "status": "SWEPT",
                    "swept_ago": "2 candle yang lalu"
                },
                {
                    "pool_id": 103,
                    "pool_type": "SELL_SL",
                    "pool_price": 2668.00,
                    "retail_rr": 2.10,
                    "status": "PENDING",
                    "swept_ago": None
                }
            ],
            "signal_action": {
                "signal": "BUY_AFTER_SWEEP",
                "entry_price": 2642.50,
                "stop_loss": 2634.00,
                "take_profit": 2668.00,
                "planned_rr": 3.00,
                "confidence_score": 85
            }
        }
    }
