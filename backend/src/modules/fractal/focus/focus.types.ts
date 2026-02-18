/**
 * BLOCK 70.2 — FocusPack Types (Desk-Grade Terminal Contract)
 * 
 * This is the single source of truth for focus-driven terminal data.
 * Frontend should ONLY use focusPack for visualization.
 */

import type { HorizonKey } from '../config/horizon.config.js';

// ═══════════════════════════════════════════════════════════════
// FOCUS PACK CONTRACT
// ═══════════════════════════════════════════════════════════════

export interface FocusPackMeta {
  symbol: string;
  focus: HorizonKey;
  windowLen: number;
  aftermathDays: number;
  topK: number;
  tier: 'TIMING' | 'TACTICAL' | 'STRUCTURE';
  asOf: string;
}

export interface OverlayMatch {
  id: string;                    // Historical date identifier
  similarity: number;            // 0..1
  phase: string;                 // Market phase at match time
  volatilityMatch: number;       // 0..1 how well volatility matches
  drawdownShape: number;         // 0..1 drawdown shape similarity
  stability: number;             // Pattern stability score
  
  windowNormalized: number[];    // Normalized prices for window period
  aftermathNormalized: number[]; // Normalized prices for aftermath
  
  return: number;                // Return over aftermath period
  maxDrawdown: number;           // Max drawdown over aftermath
  maxExcursion: number;          // Max favorable excursion
  
  // Per-horizon outcomes (for mini-metrics)
  outcomes: {
    ret7d?: number;
    ret14d?: number;
    ret30d?: number;
    ret90d?: number;
    ret180d?: number;
    ret365d?: number;
  };
}

export interface DistributionSeries {
  // Each array has length = aftermathDays
  p10: number[];
  p25: number[];
  p50: number[];
  p75: number[];
  p90: number[];
  timestamps?: number[];  // Optional: actual timestamps for each day
}

export interface OverlayPack {
  currentWindow: {
    raw: number[];
    normalized: number[];
    timestamps: number[];
  };
  matches: OverlayMatch[];
  distributionSeries: DistributionSeries;
  
  // Aggregate stats
  stats: {
    medianReturn: number;
    p10Return: number;
    p90Return: number;
    avgMaxDD: number;
    hitRate: number;        // % of positive outcomes
    sampleSize: number;
  };
}

export interface ForecastPack {
  path: number[];              // Central trajectory (p50 or weighted)
  upperBand: number[];         // Upper confidence band
  lowerBand: number[];         // Lower confidence band
  confidenceDecay: number[];   // 1 → 0 fade over horizon
  
  // Key markers
  markers: Array<{
    horizon: string;           // '7d', '14d', etc.
    dayIndex: number;          // Position in path array
    expectedReturn: number;
    price: number;
  }>;
  
  tailFloor: number;           // mcP95_DD protection level
  
  // Current reference
  currentPrice: number;
  startTs: number;
}

export interface FocusPackDiagnostics {
  sampleSize: number;
  effectiveN: number;
  entropy: number;
  reliability: number;
  coverageYears: number;       // How many years of data used
  qualityScore: number;        // Overall data quality 0..1
}

// ═══════════════════════════════════════════════════════════════
// MAIN FOCUS PACK
// ═══════════════════════════════════════════════════════════════

export interface FocusPack {
  meta: FocusPackMeta;
  overlay: OverlayPack;
  forecast: ForecastPack;
  diagnostics: FocusPackDiagnostics;
}

// ═══════════════════════════════════════════════════════════════
// TIER MAPPING
// ═══════════════════════════════════════════════════════════════

export function getFocusTier(focus: HorizonKey): 'TIMING' | 'TACTICAL' | 'STRUCTURE' {
  if (['7d', '14d'].includes(focus)) return 'TIMING';
  if (['30d', '90d'].includes(focus)) return 'TACTICAL';
  return 'STRUCTURE';
}

export function getTierLabel(tier: 'TIMING' | 'TACTICAL' | 'STRUCTURE'): string {
  switch (tier) {
    case 'TIMING': return 'Timing View';
    case 'TACTICAL': return 'Tactical View';
    case 'STRUCTURE': return 'Structure View';
  }
}
