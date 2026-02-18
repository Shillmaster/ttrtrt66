/**
 * Fractal Module Entry Point - PRODUCTION
 * V2.1 FINAL Architecture
 * 
 * BLOCK 41.x: Certification Suite
 * BLOCK 42.x: Module Isolation
 * BLOCK 43.x: Hardening + Persistence
 * BLOCK 47.x: Catastrophic Guard + Degeneration Monitor
 * BLOCK 48.x: Admin Decision Playbooks
 * BLOCK 49.x: Admin Aggregator Dashboard
 * 
 * CONTRACT FROZEN — Horizons: 7d / 14d / 30d
 */

import { FastifyInstance } from 'fastify';
import { fractalRoutes } from '../api/fractal.routes.js';
import { fractalCertRoutes } from '../api/fractal.cert.routes.js';
import { fractalV21AdminRoutes } from '../api/fractal.v21.admin.routes.js';
import { fractalSignalRoutes } from '../api/fractal.signal.routes.js';
import { fractalChartRoutes } from '../api/fractal.chart.routes.js';
import { fractalOverlayRoutes } from '../api/fractal.overlay.routes.js';
import { fractalStrategyRoutes } from '../api/fractal.strategy.routes.js';
import { strategyBacktestRoutes } from '../strategy/strategy.backtest.routes.js';
import { forwardEquityRoutes } from '../strategy/forward/forward.routes.js';
import { snapshotWriterRoutes } from '../lifecycle/snapshot.writer.routes.js';
import { outcomeResolverRoutes } from '../lifecycle/outcome.resolver.routes.js';
import { fractalJobRoutes } from '../jobs/fractal.job.routes.js';
import { shadowDivergenceRoutes } from '../admin/shadow_divergence.routes.js';
import { registerOpsRoutes } from '../ops/ops.routes.js';
import { registerHardenedOpsRoutes } from '../ops/ops.hardened.routes.js';
import { registerFreezeRoutes } from '../freeze/fractal.freeze.routes.js';
import { FractalBootstrapService } from '../bootstrap/fractal.bootstrap.service.js';
import { guardRoutes, playbookRoutes } from '../governance/index.js';
import { adminOverviewRoutes } from '../admin/dashboard/index.js';
import { fractalMultiSignalRoutes } from '../api/fractal.multi-signal.routes.js';
import { fractalRegimeRoutes } from '../api/fractal.regime.routes.js';
import { fractalTerminalRoutes } from '../api/fractal.terminal.routes.js';
import { registerVolatilityRoutes } from '../api/fractal.volatility.routes.js';
import { registerAlertRoutes } from '../alerts/index.js';

// ═══════════════════════════════════════════════════════════════
// BLOCK 42.1 — Host Dependencies Contract
// ═══════════════════════════════════════════════════════════════

export type Logger = {
  info: (obj: any, msg?: string) => void;
  warn: (obj: any, msg?: string) => void;
  error: (obj: any, msg?: string) => void;
};

export type Clock = {
  now: () => number; // ms epoch
};

export type Db = {
  getCollection: (name: string) => any; // mongodb collection or adapter
};

export type Settings = {
  get: (key: string) => any;
  getBool: (key: string, def?: boolean) => boolean;
  getNum: (key: string, def?: number) => number;
  getStr: (key: string, def?: string) => string;
};

export type FractalHostDeps = {
  app: FastifyInstance;
  logger?: Logger;
  clock?: Clock;
  db?: Db;
  settings?: Settings;
};

// ═══════════════════════════════════════════════════════════════
// MODULE REGISTRATION
// ═══════════════════════════════════════════════════════════════

export async function registerFractalModule(fastify: FastifyInstance, deps?: Partial<FractalHostDeps>): Promise<void> {
  const enabled = process.env.FRACTAL_ENABLED !== 'false';

  console.log(`[Fractal] Module ${enabled ? 'ENABLED' : 'DISABLED'}`);

  if (!enabled) {
    // Register minimal health endpoint even when disabled
    fastify.get('/api/fractal/health', async () => ({
      ok: true,
      enabled: false,
      message: 'Fractal module is disabled'
    }));
    return;
  }

  // Register main routes
  await fastify.register(fractalRoutes);

  // Register V2.1 FINAL signal endpoint (FROZEN CONTRACT)
  await fastify.register(fractalSignalRoutes);

  // Register V2.1 chart data endpoint (for UI)
  await fastify.register(fractalChartRoutes);

  // Register V2.1 overlay data endpoint (for Fractal Overlay UI)
  await fastify.register(fractalOverlayRoutes);

  // Register V2.1 strategy endpoint (BLOCK 54 - Strategy Engine)
  await fastify.register(fractalStrategyRoutes);

  // Register V2.1 strategy backtest endpoint (BLOCK 56 - Backtest Grid)
  await fastify.register(strategyBacktestRoutes);

  // Register Forward Equity routes (BLOCK 56.4 - Forward Truth Performance)
  await fastify.register(forwardEquityRoutes);

  // Register certification routes (BLOCK 41.x)
  await fastify.register(fractalCertRoutes);

  // Register V2.1 admin routes (BLOCK 43.x)
  await fastify.register(fractalV21AdminRoutes);

  // Register Guard routes (BLOCK 47.x)
  await fastify.register(guardRoutes);

  // Register Playbook routes (BLOCK 48.x)
  await fastify.register(playbookRoutes);

  // Register Admin Overview routes (BLOCK 49.x)
  await fastify.register(adminOverviewRoutes);

  // Register Snapshot Writer routes (BLOCK 56.2 - Lifecycle)
  await fastify.register(snapshotWriterRoutes);

  // Register Outcome Resolver routes (BLOCK 56.3 - Forward Truth)
  await fastify.register(outcomeResolverRoutes);

  // Register Daily Job routes (BLOCK 56.6 - Scheduler)
  await fastify.register(fractalJobRoutes);

  // Register Shadow Divergence routes (BLOCK 57 - Active vs Shadow)
  await fastify.register(shadowDivergenceRoutes);

  // Register OPS routes (Telegram + Cron - Production Infrastructure)
  await fastify.register(registerOpsRoutes);

  // Register Hardened OPS routes (BLOCK E - Telegram + Cron Hardening)
  await fastify.register(registerHardenedOpsRoutes);

  // Register Freeze routes (Contract Freeze Pack v1.0.0)
  await fastify.register(registerFreezeRoutes);

  // BLOCK 58/59 — Multi-Signal Extended (all horizons + hierarchical resolver)
  await fastify.register(fractalMultiSignalRoutes);

  // BLOCK 59.1 — Global Regime Panel
  await fastify.register(fractalRegimeRoutes);

  // PHASE 2 P0.1 — Terminal Aggregator (one request → entire terminal)
  await fastify.register(fractalTerminalRoutes);

  // P1.5 — Volatility Attribution (performance by regime)
  await fastify.register(registerVolatilityRoutes);

  // Run bootstrap in background (non-blocking)
  const bootstrap = new FractalBootstrapService();
  bootstrap.ensureBootstrapped().catch(err => {
    console.error('[Fractal] Background bootstrap error:', err);
  });

  console.log('[Fractal] V2.1 FINAL — Module registered (Contract Frozen: 7d/14d/30d)');
  console.log('[Fractal] BLOCK 47-49: Guard + Playbook + Overview registered');
  console.log('[Fractal] BLOCK 56: Strategy Backtest Grid registered');
  console.log('[Fractal] BLOCK 56.2: Snapshot Writer registered');
  console.log('[Fractal] BLOCK 56.3: Outcome Resolver registered');
  console.log('[Fractal] BLOCK 56.4: Forward Equity registered');
  console.log('[Fractal] BLOCK 56.6: Daily Job Scheduler registered');
  console.log('[Fractal] BLOCK 57: Shadow Divergence registered');
  console.log('[Fractal] OPS: Telegram + Cron routes registered');
  console.log('[Fractal] BLOCK E: Hardened OPS (rate limit, retry, idempotency) registered');
  console.log('[Fractal] BLOCK 58: Hierarchical Resolver (Bias + Timing + Final) registered');
  console.log('[Fractal] BLOCK 59: Extended Horizons (90d/180d/365d) registered');
  console.log('[Fractal] BLOCK 59.1: Global Regime Panel registered');
  console.log('[Fractal] PHASE 2 P0.1: Terminal Aggregator registered');
  console.log('[Fractal] P1.5: Volatility Attribution registered');
  console.log('[Fractal] FREEZE: Contract v2.1.0 frozen, guards active');
  console.log('[Fractal] Chart + Overlay endpoints registered');
}
