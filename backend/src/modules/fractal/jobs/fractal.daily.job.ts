/**
 * BLOCK 56.6 — Fractal Daily Job
 * 
 * Orchestrates the daily forward-truth cycle:
 * 1. Write BTC snapshot (ACTIVE + SHADOW)
 * 2. Resolve matured snapshots (7/14/30d)
 * 3. Rebuild forward equity
 * 4. Log governance audit
 * 
 * Principles:
 * - BTC-only (no alts)
 * - Idempotent (safe to run multiple times)
 * - No auto-promotion
 * - No auto-retrain
 * - Only truth collection
 */

import { snapshotWriterService } from '../lifecycle/snapshot.writer.service.js';
import { outcomeResolverService } from '../lifecycle/outcome.resolver.service.js';
import { forwardEquityService } from '../strategy/forward/forward.equity.service.js';
import { runAlertEngine, type AlertEngineContext } from '../alerts/alert.engine.service.js';
import { sendAlertsToTelegram } from '../alerts/alert.tg.adapter.js';
import { getQuotaStatus } from '../alerts/alert.quota.service.js';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface DailyJobContext {
  runId: string;
  symbol: string;
  startedAt: Date;
  completedAt?: Date;
  steps: DailyJobStep[];
  status: 'RUNNING' | 'SUCCESS' | 'FAILED';
  error?: string;
}

export interface DailyJobStep {
  name: string;
  startedAt: Date;
  completedAt?: Date;
  status: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED';
  result?: any;
  error?: string;
}

export interface DailyJobResult {
  success: boolean;
  runId: string;
  symbol: string;
  durationMs: number;
  snapshot: {
    written: number;
    skipped: number;
    asofDate: string;
  };
  resolve: {
    resolved7d: number;
    resolved14d: number;
    resolved30d: number;
  };
  equity: {
    rebuilt: boolean;
  };
  alerts: {
    sent: number;
    blocked: number;
    quotaUsed: number;
    quotaMax: number;
  };
  errors: string[];
}

// ═══════════════════════════════════════════════════════════════
// STORAGE (in-memory for now, can move to MongoDB)
// ═══════════════════════════════════════════════════════════════

const jobHistory: DailyJobContext[] = [];
let isRunning = false;

// ═══════════════════════════════════════════════════════════════
// DAILY JOB SERVICE
// ═══════════════════════════════════════════════════════════════

export class FractalDailyJobService {
  
  /**
   * Generate unique run ID
   */
  private generateRunId(): string {
    return `daily-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }
  
  /**
   * BTC-only guard
   */
  private validateSymbol(symbol: string): void {
    if (symbol !== 'BTC') {
      throw new Error('Fractal forward scheduler supports BTC only');
    }
  }
  
  /**
   * Check if job is already running (mutex)
   */
  isJobRunning(): boolean {
    return isRunning;
  }
  
  /**
   * Get last job run
   */
  getLastRun(): DailyJobContext | null {
    return jobHistory[jobHistory.length - 1] || null;
  }
  
  /**
   * Get job history
   */
  getHistory(limit = 10): DailyJobContext[] {
    return jobHistory.slice(-limit).reverse();
  }
  
  /**
   * Main daily job runner
   */
  async runDaily(symbol = 'BTC'): Promise<DailyJobResult> {
    // BTC-only guard
    this.validateSymbol(symbol);
    
    // Mutex check
    if (isRunning) {
      throw new Error('Daily job is already running');
    }
    
    isRunning = true;
    const runId = this.generateRunId();
    const startedAt = new Date();
    
    const context: DailyJobContext = {
      runId,
      symbol,
      startedAt,
      steps: [],
      status: 'RUNNING'
    };
    
    jobHistory.push(context);
    
    // Keep only last 30 runs
    if (jobHistory.length > 30) {
      jobHistory.shift();
    }
    
    const errors: string[] = [];
    let snapshotResult = { written: 0, skipped: 0, asofDate: '' };
    let resolveResult = { resolved7d: 0, resolved14d: 0, resolved30d: 0 };
    let equityRebuilt = false;
    let alertsResult = { sent: 0, blocked: 0, quotaUsed: 0, quotaMax: 3 };
    
    try {
      // ═══════════════════════════════════════════════════════════
      // STEP 1: Write BTC Snapshot
      // ═══════════════════════════════════════════════════════════
      const step1: DailyJobStep = {
        name: 'WRITE_SNAPSHOT',
        startedAt: new Date(),
        status: 'RUNNING'
      };
      context.steps.push(step1);
      
      try {
        console.log(`[DailyJob] Step 1: Writing BTC snapshot...`);
        const writeResult = await snapshotWriterService.writeBtcSnapshots();
        
        snapshotResult = {
          written: writeResult.written,
          skipped: writeResult.skipped,
          asofDate: writeResult.asofDate
        };
        
        step1.result = snapshotResult;
        step1.status = 'SUCCESS';
        step1.completedAt = new Date();
        
        console.log(`[DailyJob] Snapshot: written=${writeResult.written}, skipped=${writeResult.skipped}`);
      } catch (err: any) {
        step1.status = 'FAILED';
        step1.error = err.message;
        step1.completedAt = new Date();
        errors.push(`WRITE_SNAPSHOT: ${err.message}`);
        console.error(`[DailyJob] Snapshot error:`, err);
      }
      
      // ═══════════════════════════════════════════════════════════
      // STEP 2: Resolve Outcomes (7d, 14d, 30d)
      // ═══════════════════════════════════════════════════════════
      const step2: DailyJobStep = {
        name: 'RESOLVE_OUTCOMES',
        startedAt: new Date(),
        status: 'RUNNING'
      };
      context.steps.push(step2);
      
      try {
        console.log(`[DailyJob] Step 2: Resolving outcomes...`);
        
        // Resolve all horizons
        const resolve7d = await outcomeResolverService.resolveSnapshots(symbol, 7);
        const resolve14d = await outcomeResolverService.resolveSnapshots(symbol, 14);
        const resolve30d = await outcomeResolverService.resolveSnapshots(symbol, 30);
        
        resolveResult = {
          resolved7d: resolve7d.resolved,
          resolved14d: resolve14d.resolved,
          resolved30d: resolve30d.resolved
        };
        
        step2.result = resolveResult;
        step2.status = 'SUCCESS';
        step2.completedAt = new Date();
        
        console.log(`[DailyJob] Resolved: 7d=${resolve7d.resolved}, 14d=${resolve14d.resolved}, 30d=${resolve30d.resolved}`);
      } catch (err: any) {
        step2.status = 'FAILED';
        step2.error = err.message;
        step2.completedAt = new Date();
        errors.push(`RESOLVE_OUTCOMES: ${err.message}`);
        console.error(`[DailyJob] Resolve error:`, err);
      }
      
      // ═══════════════════════════════════════════════════════════
      // STEP 3: Rebuild Forward Equity
      // ═══════════════════════════════════════════════════════════
      const step3: DailyJobStep = {
        name: 'REBUILD_EQUITY',
        startedAt: new Date(),
        status: 'RUNNING'
      };
      context.steps.push(step3);
      
      try {
        console.log(`[DailyJob] Step 3: Rebuilding forward equity...`);
        
        // Trigger grid rebuild (this validates all calculations)
        await forwardEquityService.grid(symbol);
        
        equityRebuilt = true;
        step3.result = { rebuilt: true };
        step3.status = 'SUCCESS';
        step3.completedAt = new Date();
        
        console.log(`[DailyJob] Equity rebuilt successfully`);
      } catch (err: any) {
        step3.status = 'FAILED';
        step3.error = err.message;
        step3.completedAt = new Date();
        errors.push(`REBUILD_EQUITY: ${err.message}`);
        console.error(`[DailyJob] Equity rebuild error:`, err);
      }
      
      // ═══════════════════════════════════════════════════════════
      // STEP 4: Audit Log
      // ═══════════════════════════════════════════════════════════
      const step4: DailyJobStep = {
        name: 'AUDIT_LOG',
        startedAt: new Date(),
        status: 'RUNNING'
      };
      context.steps.push(step4);
      
      try {
        console.log(`[DailyJob] Step 4: Writing audit log...`);
        
        // In production, write to MongoDB audit collection
        // For now, just log
        const auditEntry = {
          type: 'DAILY_FORWARD_RUN',
          runId,
          symbol,
          date: new Date().toISOString().slice(0, 10),
          snapshot: snapshotResult,
          resolve: resolveResult,
          equityRebuilt,
          errors,
          durationMs: Date.now() - startedAt.getTime()
        };
        
        console.log(`[DailyJob] Audit:`, JSON.stringify(auditEntry));
        
        step4.result = auditEntry;
        step4.status = 'SUCCESS';
        step4.completedAt = new Date();
      } catch (err: any) {
        step4.status = 'FAILED';
        step4.error = err.message;
        step4.completedAt = new Date();
        errors.push(`AUDIT_LOG: ${err.message}`);
      }
      
      // Complete context
      context.completedAt = new Date();
      context.status = errors.length === 0 ? 'SUCCESS' : 'FAILED';
      
    } catch (err: any) {
      context.completedAt = new Date();
      context.status = 'FAILED';
      context.error = err.message;
      errors.push(`FATAL: ${err.message}`);
    } finally {
      isRunning = false;
    }
    
    const durationMs = Date.now() - startedAt.getTime();
    
    console.log(`[DailyJob] Completed in ${durationMs}ms, status=${context.status}`);
    
    return {
      success: errors.length === 0,
      runId,
      symbol,
      durationMs,
      snapshot: snapshotResult,
      resolve: resolveResult,
      equity: { rebuilt: equityRebuilt },
      errors
    };
  }
}

// Export singleton
export const fractalDailyJobService = new FractalDailyJobService();
