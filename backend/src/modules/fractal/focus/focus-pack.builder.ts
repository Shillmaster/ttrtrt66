/**
 * BLOCK 70.2 — FocusPack Builder (Real Horizon Binding)
 * 
 * Builds focus-specific overlay and forecast data.
 * Each focus horizon gets DIFFERENT:
 * - windowLen
 * - aftermathDays  
 * - topK matches
 * - distribution series length
 * 
 * This is NOT cosmetic - it's architectural.
 */

import { HORIZON_CONFIG, type HorizonKey } from '../config/horizon.config.js';
import { FractalEngine } from '../engine/fractal.engine.js';
import { CanonicalStore } from '../data/canonical.store.js';
import {
  FocusPack,
  FocusPackMeta,
  OverlayPack,
  ForecastPack,
  OverlayMatch,
  DistributionSeries,
  FocusPackDiagnostics,
  getFocusTier,
} from './focus.types.js';

// ═══════════════════════════════════════════════════════════════
// FOCUS PACK BUILDER
// ═══════════════════════════════════════════════════════════════

const canonicalStore = new CanonicalStore();
const engine = new FractalEngine();

// Supported window lengths by engine
const SUPPORTED_WINDOWS = [30, 60, 90];

function mapToSupportedWindow(windowLen: number): number {
  return SUPPORTED_WINDOWS.reduce((prev, curr) =>
    Math.abs(curr - windowLen) < Math.abs(prev - windowLen) ? curr : prev
  );
}

/**
 * Build complete FocusPack for a given horizon focus
 */
export async function buildFocusPack(
  symbol: string,
  focus: HorizonKey
): Promise<FocusPack> {
  const cfg = HORIZON_CONFIG[focus];
  const tier = getFocusTier(focus);
  const asOf = new Date().toISOString();
  
  // Load candles
  const candles = await canonicalStore.getCandles({ 
    symbol: symbol === 'BTC' ? 'BTCUSD' : symbol, 
    limit: Math.max(1500, cfg.windowLen * 3 + cfg.aftermathDays * 2) 
  });
  
  if (!candles || candles.length < cfg.minHistory) {
    throw new Error(`INSUFFICIENT_DATA: need ${cfg.minHistory}, got ${candles?.length || 0}`);
  }
  
  const currentPrice = candles[candles.length - 1].close;
  const mappedWindowLen = mapToSupportedWindow(cfg.windowLen);
  
  // Run fractal engine with focus-specific parameters
  const result = await engine.match({
    symbol: symbol === 'BTC' ? 'BTCUSD' : symbol,
    candles,
    windowLen: mappedWindowLen,
    topK: cfg.topK,
  });
  
  // Build overlay pack
  const overlay = buildOverlayPack(result, candles, cfg, focus);
  
  // Build forecast pack
  const forecast = buildForecastPack(overlay, currentPrice, focus);
  
  // Build diagnostics
  const diagnostics = buildDiagnostics(result, overlay, candles);
  
  const meta: FocusPackMeta = {
    symbol,
    focus,
    windowLen: cfg.windowLen,
    aftermathDays: cfg.aftermathDays,
    topK: cfg.topK,
    tier,
    asOf,
  };
  
  return { meta, overlay, forecast, diagnostics };
}

// ═══════════════════════════════════════════════════════════════
// OVERLAY PACK BUILDER
// ═══════════════════════════════════════════════════════════════

function buildOverlayPack(
  result: any,
  candles: any[],
  cfg: typeof HORIZON_CONFIG['30d'],
  focus: HorizonKey
): OverlayPack {
  const currentWindow = {
    raw: result?.currentWindow?.raw || [],
    normalized: result?.currentWindow?.normalized || [],
    timestamps: candles.slice(-cfg.windowLen).map(c => c.ts.getTime()),
  };
  
  // Build matches with aftermath data
  const matches: OverlayMatch[] = (result?.matches || []).map((m: any, idx: number) => {
    // Find historical candles for aftermath
    const matchIdx = findMatchIndex(candles, m.endTs || m.date);
    const aftermathCandles = matchIdx >= 0 
      ? candles.slice(matchIdx, matchIdx + cfg.aftermathDays + 1)
      : [];
    
    // Calculate outcomes for different horizons
    const outcomes = calculateOutcomes(aftermathCandles);
    
    // Normalize aftermath
    const aftermathNorm = normalizeAftermath(aftermathCandles, cfg.aftermathDays);
    
    return {
      id: m.id || m.date || `match_${idx}`,
      similarity: m.similarity || 0,
      phase: m.phase || detectPhaseSimple(m),
      volatilityMatch: m.volatilityMatch || 0.5,
      drawdownShape: m.drawdownShape || 0.5,
      stability: m.stability || 0.5,
      windowNormalized: m.windowNormalized || m.normalized || [],
      aftermathNormalized: aftermathNorm,
      return: outcomes[`ret${focus}`] || m.forwardReturn || 0,
      maxDrawdown: m.maxDD || calculateMaxDD(aftermathCandles),
      maxExcursion: m.mfe || calculateMFE(aftermathCandles),
      outcomes,
    };
  });
  
  // Build distribution series with CORRECT length = aftermathDays
  const distributionSeries = buildDistributionSeries(matches, cfg.aftermathDays);
  
  // Calculate stats
  const returns = matches.map(m => m.return);
  const stats = {
    medianReturn: percentile(returns, 0.5),
    p10Return: percentile(returns, 0.1),
    p90Return: percentile(returns, 0.9),
    avgMaxDD: matches.reduce((s, m) => s + m.maxDrawdown, 0) / (matches.length || 1),
    hitRate: returns.filter(r => r > 0).length / (returns.length || 1),
    sampleSize: matches.length,
  };
  
  return { currentWindow, matches, distributionSeries, stats };
}

// ═══════════════════════════════════════════════════════════════
// DISTRIBUTION SERIES BUILDER
// ═══════════════════════════════════════════════════════════════

function buildDistributionSeries(
  matches: OverlayMatch[],
  aftermathDays: number
): DistributionSeries {
  // Initialize arrays with correct length
  const p10: number[] = new Array(aftermathDays).fill(0);
  const p25: number[] = new Array(aftermathDays).fill(0);
  const p50: number[] = new Array(aftermathDays).fill(0);
  const p75: number[] = new Array(aftermathDays).fill(0);
  const p90: number[] = new Array(aftermathDays).fill(0);
  
  if (matches.length === 0) {
    return { p10, p25, p50, p75, p90 };
  }
  
  // For each day in aftermath, calculate percentiles across all matches
  for (let day = 0; day < aftermathDays; day++) {
    const dayValues: number[] = [];
    
    for (const match of matches) {
      if (match.aftermathNormalized && match.aftermathNormalized[day] !== undefined) {
        dayValues.push(match.aftermathNormalized[day]);
      }
    }
    
    if (dayValues.length > 0) {
      dayValues.sort((a, b) => a - b);
      p10[day] = percentile(dayValues, 0.10);
      p25[day] = percentile(dayValues, 0.25);
      p50[day] = percentile(dayValues, 0.50);
      p75[day] = percentile(dayValues, 0.75);
      p90[day] = percentile(dayValues, 0.90);
    }
  }
  
  return { p10, p25, p50, p75, p90 };
}

// ═══════════════════════════════════════════════════════════════
// FORECAST PACK BUILDER
// ═══════════════════════════════════════════════════════════════

function buildForecastPack(
  overlay: OverlayPack,
  currentPrice: number,
  focus: HorizonKey
): ForecastPack {
  const cfg = HORIZON_CONFIG[focus];
  const aftermathDays = cfg.aftermathDays;
  
  const dist = overlay.distributionSeries;
  
  // Central path = p50
  const path = dist.p50.map(pct => currentPrice * (1 + pct));
  
  // Upper band = blend of p75 and p90
  const upperBand = dist.p75.map((v, i) => {
    const p90Val = dist.p90[i] || v;
    const blended = v + 0.5 * (p90Val - v);
    return currentPrice * (1 + blended);
  });
  
  // Lower band = blend of p25 and p10
  const lowerBand = dist.p25.map((v, i) => {
    const p10Val = dist.p10[i] || v;
    const blended = v - 0.5 * (v - p10Val);
    return currentPrice * (1 + blended);
  });
  
  // Confidence decay: 1 → 0 over horizon
  const confidenceDecay = new Array(aftermathDays).fill(0).map((_, i) => 
    Math.max(0, 1 - (i / aftermathDays))
  );
  
  // Build markers for key horizons <= focus
  const markers = buildMarkers(dist, currentPrice, focus);
  
  // Tail floor from stats
  const tailFloor = currentPrice * (1 - Math.abs(overlay.stats.avgMaxDD));
  
  return {
    path,
    upperBand,
    lowerBand,
    confidenceDecay,
    markers,
    tailFloor,
    currentPrice,
    startTs: Date.now(),
  };
}

function buildMarkers(
  dist: DistributionSeries,
  currentPrice: number,
  focus: HorizonKey
): ForecastPack['markers'] {
  const focusDays = parseInt(focus.replace('d', ''), 10);
  const horizons = ['7d', '14d', '30d', '90d', '180d', '365d'];
  
  const markers: ForecastPack['markers'] = [];
  
  for (const h of horizons) {
    const days = parseInt(h.replace('d', ''), 10);
    if (days > focusDays) continue;
    if (days > dist.p50.length) continue;
    
    const dayIndex = Math.min(days - 1, dist.p50.length - 1);
    const expectedReturn = dist.p50[dayIndex] || 0;
    
    markers.push({
      horizon: h,
      dayIndex,
      expectedReturn,
      price: currentPrice * (1 + expectedReturn),
    });
  }
  
  return markers;
}

// ═══════════════════════════════════════════════════════════════
// DIAGNOSTICS BUILDER
// ═══════════════════════════════════════════════════════════════

function buildDiagnostics(
  result: any,
  overlay: OverlayPack,
  candles: any[]
): FocusPackDiagnostics {
  const sampleSize = overlay.matches.length;
  const effectiveN = Math.min(sampleSize, result?.forwardStats?.effectiveN || sampleSize);
  
  // Calculate entropy from return distribution
  const returns = overlay.matches.map(m => m.return);
  const positiveCount = returns.filter(r => r > 0).length;
  const winRate = positiveCount / (returns.length || 1);
  const entropy = 1 - Math.abs(2 * winRate - 1);
  
  // Reliability based on sample size and entropy
  const reliability = Math.min(1, (effectiveN / 20)) * (1 - entropy * 0.3);
  
  // Coverage in years
  const coverageYears = candles.length / 365;
  
  // Quality score
  const qualityScore = Math.min(1, 
    (sampleSize >= 10 ? 0.3 : sampleSize * 0.03) +
    (reliability * 0.4) +
    (coverageYears >= 5 ? 0.3 : coverageYears * 0.06)
  );
  
  return {
    sampleSize,
    effectiveN,
    entropy: Math.round(entropy * 1000) / 1000,
    reliability: Math.round(reliability * 1000) / 1000,
    coverageYears: Math.round(coverageYears * 10) / 10,
    qualityScore: Math.round(qualityScore * 1000) / 1000,
  };
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function findMatchIndex(candles: any[], dateOrTs: any): number {
  if (!dateOrTs) return -1;
  const target = typeof dateOrTs === 'string' ? new Date(dateOrTs).getTime() : dateOrTs;
  return candles.findIndex(c => Math.abs(c.ts.getTime() - target) < 86400000);
}

function normalizeAftermath(candles: any[], targetLength: number): number[] {
  if (candles.length === 0) {
    return new Array(targetLength).fill(0);
  }
  
  const basePrice = candles[0]?.close || 1;
  const normalized = candles.map(c => (c.close - basePrice) / basePrice);
  
  // Pad or trim to exact length
  while (normalized.length < targetLength) {
    normalized.push(normalized[normalized.length - 1] || 0);
  }
  
  return normalized.slice(0, targetLength);
}

function calculateOutcomes(candles: any[]): Record<string, number> {
  if (candles.length === 0) return {};
  
  const basePrice = candles[0]?.close || 1;
  const outcomes: Record<string, number> = {};
  
  const horizons = [7, 14, 30, 90, 180, 365];
  for (const h of horizons) {
    const idx = Math.min(h, candles.length - 1);
    if (idx >= 0 && candles[idx]) {
      outcomes[`ret${h}d`] = (candles[idx].close - basePrice) / basePrice;
    }
  }
  
  return outcomes;
}

function calculateMaxDD(candles: any[]): number {
  if (candles.length === 0) return 0;
  
  let peak = candles[0]?.close || 0;
  let maxDD = 0;
  
  for (const c of candles) {
    if (c.close > peak) peak = c.close;
    const dd = (peak - c.close) / peak;
    if (dd > maxDD) maxDD = dd;
  }
  
  return maxDD;
}

function calculateMFE(candles: any[]): number {
  if (candles.length === 0) return 0;
  
  const basePrice = candles[0]?.close || 1;
  let maxUp = 0;
  
  for (const c of candles) {
    const gain = (c.close - basePrice) / basePrice;
    if (gain > maxUp) maxUp = gain;
  }
  
  return maxUp;
}

function detectPhaseSimple(match: any): string {
  const ret = match.forwardReturn || match.return || 0;
  if (ret > 0.2) return 'MARKUP';
  if (ret < -0.2) return 'MARKDOWN';
  if (ret > 0) return 'RECOVERY';
  if (ret < 0) return 'DISTRIBUTION';
  return 'ACCUMULATION';
}

function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.floor(p * (sorted.length - 1));
  return sorted[idx] || 0;
}
