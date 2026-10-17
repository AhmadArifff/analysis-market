"""
Analysis-Market: Quantitative Market Analysis & Backtesting Backend
FastAPI Main Application Entry Point
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import routes_market, routes_backtest

app = FastAPI(
    title="Analysis-Market API",
    description="Quantitative Market Analysis & Multi-Asset Backtesting Engine",
    version="1.0.0"
)

# CORS configuration for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(routes_market.router, prefix="/api/v1/market", tags=["Market Analysis"])
app.include_router(routes_backtest.router, prefix="/api/v1/backtest", tags=["Backtest Studio"])


@app.get("/")
def root():
    return {
        "system": "Analysis-Market Quantitative Engine",
        "status": "online",
        "docs_url": "/docs"
    }


@app.get("/api/v1/health")
def health_check():
    return {"status": "healthy", "service": "backend", "code": 200}
