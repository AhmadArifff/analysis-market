/**
 * AssetProfile: Adaptive Market-Specific Configuration
 * Provides distinct parameter presets for Forex, Crypto Major, and Crypto Meme assets.
 * Each profile tunes wick thresholds, trend filters, exhaustion limits, session windows,
 * risk management multipliers, and confluence scoring weights.
 */

export type AssetCategory = "FOREX" | "CRYPTO_MAJOR" | "CRYPTO_MEME";

export interface ConfluenceWeights {
  trendAlignment: number;
  exhaustionZone: number;
  liquidityPool: number;
  sweepRejection: number;
  structureShift: number;
  volumeConfirm: number;
}

export interface AssetProfile {
  category: AssetCategory;
  label: string;

  minWickRatio: number;
  minRvol: number;

  emaPeriods: [number, number];
  adxThreshold: number;
  adxPeriod: number;

  rsiOverbought: number;
  rsiOversold: number;
  maxConsecutiveBars: number;

  killzoneHoursUTC: [number, number][] | null;

  atrSlMultiplier: number;
  riskRewardMin: number;
  riskRewardTarget: number;
  maxSpreadAtrRatio: number;

  confluenceWeights: ConfluenceWeights;
  confluenceMinScore: number;
}

const FOREX_PROFILE: AssetProfile = {
  category: "FOREX",
  label: "Forex (XAUUSD, Pairs)",

  minWickRatio: 0.32,
  minRvol: 1.5,

  emaPeriods: [21, 50],
  adxThreshold: 22,
  adxPeriod: 14,

  rsiOverbought: 75,
  rsiOversold: 25,
  maxConsecutiveBars: 4,

  killzoneHoursUTC: [
    [7, 9],   // London Open
    [12, 15], // New York Open
  ],

  atrSlMultiplier: 1.2,
  riskRewardMin: 1.8,
  riskRewardTarget: 2.5,
  maxSpreadAtrRatio: 0.15,

  confluenceWeights: {
    trendAlignment: 25,
    exhaustionZone: 15,
    liquidityPool: 20,
    sweepRejection: 20,
    structureShift: 10,
    volumeConfirm: 10,
  },
  confluenceMinScore: 75,
};

const CRYPTO_MAJOR_PROFILE: AssetProfile = {
  category: "CRYPTO_MAJOR",
  label: "Crypto Major (BTC, ETH, BNB, SOL)",

  minWickRatio: 0.25,
  minRvol: 1.8,

  emaPeriods: [21, 50],
  adxThreshold: 20,
  adxPeriod: 14,

  rsiOverbought: 78,
  rsiOversold: 22,
  maxConsecutiveBars: 5,

  killzoneHoursUTC: null,

  atrSlMultiplier: 1.5,
  riskRewardMin: 2.0,
  riskRewardTarget: 3.0,
  maxSpreadAtrRatio: 0.08,

  confluenceWeights: {
    trendAlignment: 20,
    exhaustionZone: 15,
    liquidityPool: 20,
    sweepRejection: 15,
    structureShift: 15,
    volumeConfirm: 15,
  },
  confluenceMinScore: 78,
};

const CRYPTO_MEME_PROFILE: AssetProfile = {
  category: "CRYPTO_MEME",
  label: "Crypto Meme (DOGE, PEPE, Trending)",

  minWickRatio: 0.22,
  minRvol: 2.5,

  emaPeriods: [9, 21],
  adxThreshold: 25,
  adxPeriod: 14,

  rsiOverbought: 82,
  rsiOversold: 18,
  maxConsecutiveBars: 6,

  killzoneHoursUTC: null,

  atrSlMultiplier: 2.0,
  riskRewardMin: 2.5,
  riskRewardTarget: 4.0,
  maxSpreadAtrRatio: 0.12,

  confluenceWeights: {
    trendAlignment: 15,
    exhaustionZone: 10,
    liquidityPool: 15,
    sweepRejection: 10,
    structureShift: 20,
    volumeConfirm: 30,
  },
  confluenceMinScore: 82,
};

const SYMBOL_CATEGORY_MAP: Record<string, AssetCategory> = {
  "XAUUSD": "FOREX",
  "EURUSD": "FOREX",
  "GBPUSD": "FOREX",
  "USDJPY": "FOREX",

  "BTCUSDT": "CRYPTO_MAJOR",
  "BTC/USDT": "CRYPTO_MAJOR",
  "BTC_USDT": "CRYPTO_MAJOR",
  "ETHUSDT": "CRYPTO_MAJOR",
  "ETH/USDT": "CRYPTO_MAJOR",
  "ETH_USDT": "CRYPTO_MAJOR",
  "BNBUSDT": "CRYPTO_MAJOR",
  "BNB/USDT": "CRYPTO_MAJOR",
  "BNB_USDT": "CRYPTO_MAJOR",
  "SOLUSDT": "CRYPTO_MAJOR",
  "SOL/USDT": "CRYPTO_MAJOR",
  "SOL_USDT": "CRYPTO_MAJOR",

  "DOGEUSDT": "CRYPTO_MEME",
  "DOGE/USDT": "CRYPTO_MEME",
  "DOGE_USDT": "CRYPTO_MEME",
  "PEPEUSDT": "CRYPTO_MEME",
  "PEPE/USDT": "CRYPTO_MEME",
  "PEPE_USDT": "CRYPTO_MEME",
  "SHIBUSDT": "CRYPTO_MEME",
  "SHIB/USDT": "CRYPTO_MEME",
  "FLOKIUSDT": "CRYPTO_MEME",
  "FLOKI/USDT": "CRYPTO_MEME",
  "WIFUSDT": "CRYPTO_MEME",
  "WIF/USDT": "CRYPTO_MEME",
  "BONKUSDT": "CRYPTO_MEME",
  "BONK/USDT": "CRYPTO_MEME",
};

const PROFILE_MAP: Record<AssetCategory, AssetProfile> = {
  FOREX: FOREX_PROFILE,
  CRYPTO_MAJOR: CRYPTO_MAJOR_PROFILE,
  CRYPTO_MEME: CRYPTO_MEME_PROFILE,
};

/**
 * Resolves the correct AssetProfile for a given trading symbol.
 * Falls back to CRYPTO_MAJOR if the symbol is not explicitly mapped.
 */
export function getAssetProfile(symbol: string): AssetProfile {
  const normalized = symbol.toUpperCase().replace(/[^A-Z0-9]/g, "");

  const directMatch = SYMBOL_CATEGORY_MAP[symbol.toUpperCase()];
  if (directMatch) return { ...PROFILE_MAP[directMatch] };

  const normalizedMatch = SYMBOL_CATEGORY_MAP[normalized];
  if (normalizedMatch) return { ...PROFILE_MAP[normalizedMatch] };

  for (const [key, cat] of Object.entries(SYMBOL_CATEGORY_MAP)) {
    if (normalized.includes(key.replace(/[^A-Z0-9]/g, ""))) {
      return { ...PROFILE_MAP[cat] };
    }
  }

  if (normalized.includes("USD") && !normalized.includes("USDT")) {
    return { ...FOREX_PROFILE };
  }

  return { ...CRYPTO_MAJOR_PROFILE };
}

/**
 * Returns all 3 preset profiles for UI display/selection
 */
export function getAllProfiles(): AssetProfile[] {
  return [
    { ...FOREX_PROFILE },
    { ...CRYPTO_MAJOR_PROFILE },
    { ...CRYPTO_MEME_PROFILE },
  ];
}

/**
 * Checks if a candle timestamp falls within any killzone window.
 * Returns true if no killzones are configured (24/7 market).
 */
export function isWithinKillzone(
  candleTime: string | number,
  killzones: [number, number][] | null
): boolean {
  if (!killzones || killzones.length === 0) return true;

  const date = new Date(
    typeof candleTime === "number" ? candleTime * 1000 : candleTime
  );
  const hourUTC = date.getUTCHours();

  return killzones.some(([start, end]) => {
    if (start <= end) {
      return hourUTC >= start && hourUTC < end;
    }
    return hourUTC >= start || hourUTC < end;
  });
}
