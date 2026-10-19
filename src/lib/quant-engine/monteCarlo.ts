import { ReplayTrade } from "./simulator";

export interface MonteCarloConfig {
  initialCapital: number;
  simulationsCount: number;
  riskPerTradePct: number;
}

export interface MonteCarloResult {
  simulationsCount: number;
  initialCapital: number;
  medianEndingCapital: number;
  percentile5EndingCapital: number;
  percentile95EndingCapital: number;
  worstCaseMaxDrawdownPct: number;
  averageMaxDrawdownPct: number;
  profitProbabilityPct: number;
  sampleEquityCurves: number[][]; // 8 representative curves for fan chart visualization
}

/**
 * Monte Carlo Bootstrap Resampling Simulation
 * Tests trading strategy robustness against 1,000 randomized sequences of trades
 */
export function runMonteCarloSimulation(
  trades: ReplayTrade[],
  config: Partial<MonteCarloConfig> = {}
): MonteCarloResult {
  const initialCapital = config.initialCapital || 10000;
  const numSimulations = config.simulationsCount || 1000;

  if (trades.length === 0) {
    return {
      simulationsCount: 0,
      initialCapital,
      medianEndingCapital: initialCapital,
      percentile5EndingCapital: initialCapital,
      percentile95EndingCapital: initialCapital,
      worstCaseMaxDrawdownPct: 0,
      averageMaxDrawdownPct: 0,
      profitProbabilityPct: 100,
      sampleEquityCurves: [],
    };
  }

  const pnlList = trades.map((t) => t.pnl_pct);
  const tradeCount = pnlList.length;

  const endingCapitals: number[] = [];
  const maxDrawdowns: number[] = [];
  const allCurves: number[][] = [];

  for (let s = 0; s < numSimulations; s++) {
    let currentCapital = initialCapital;
    let peakCapital = initialCapital;
    let maxDdPct = 0;
    const curve: number[] = [initialCapital];

    for (let t = 0; t < tradeCount; t++) {
      // Randomly pick a trade with replacement
      const randomIdx = Math.floor(Math.random() * tradeCount);
      const returnPct = pnlList[randomIdx];

      // Compounded equity calculation
      currentCapital = currentCapital * (1 + returnPct / 100);
      if (currentCapital < 0) currentCapital = 0;

      if (currentCapital > peakCapital) {
        peakCapital = currentCapital;
      }

      const dd = ((peakCapital - currentCapital) / peakCapital) * 100;
      if (dd > maxDdPct) {
        maxDdPct = dd;
      }

      // Record every few steps for visualization efficiency
      if (t % Math.max(1, Math.floor(tradeCount / 20)) === 0 || t === tradeCount - 1) {
        curve.push(parseFloat(currentCapital.toFixed(2)));
      }
    }

    endingCapitals.push(currentCapital);
    maxDrawdowns.push(maxDdPct);
    if (s < 12) {
      allCurves.push(curve);
    }
  }

  // Sort ending capitals and drawdowns
  endingCapitals.sort((a, b) => a - b);
  maxDrawdowns.sort((a, b) => a - b);

  const idxP5 = Math.floor(numSimulations * 0.05);
  const idxP50 = Math.floor(numSimulations * 0.5);
  const idxP95 = Math.floor(numSimulations * 0.95);

  const p5Ending = endingCapitals[idxP5];
  const p50Ending = endingCapitals[idxP50];
  const p95Ending = endingCapitals[idxP95];

  const profitableRuns = endingCapitals.filter((c) => c > initialCapital).length;
  const profitProbability = (profitableRuns / numSimulations) * 100;

  const worstCaseDrawdown = maxDrawdowns[idxP95]; // 95% worst drawdown
  const avgDrawdown = maxDrawdowns.reduce((a, b) => a + b, 0) / numSimulations;

  return {
    simulationsCount: numSimulations,
    initialCapital,
    medianEndingCapital: parseFloat(p50Ending.toFixed(2)),
    percentile5EndingCapital: parseFloat(p5Ending.toFixed(2)),
    percentile95EndingCapital: parseFloat(p95Ending.toFixed(2)),
    worstCaseMaxDrawdownPct: parseFloat(worstCaseDrawdown.toFixed(1)),
    averageMaxDrawdownPct: parseFloat(avgDrawdown.toFixed(1)),
    profitProbabilityPct: parseFloat(profitProbability.toFixed(1)),
    sampleEquityCurves: allCurves.slice(0, 6),
  };
}
