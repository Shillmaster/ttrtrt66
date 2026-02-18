# Fractal Research Terminal — PRD

## Original Problem Statement
Поднять фронт, бэк и базу данных MongoDB с админкой для разработки. Бэк касается только логики. Фрактал - это изолированный модуль, полностью настроен.
Репозиторий: https://github.com/Shillmaster/Finade3

## Core Architecture
```
/app
├── backend (FastAPI proxy → Fastify TypeScript)
│   ├── server.py              # Python proxy (port 8001)
│   └── src/
│       ├── app.fractal.ts     # Isolated Fractal entrypoint (port 8002)
│       ├── modules/fractal/   # Fractal business logic
│       └── modules/fractal/alerts/  # BLOCK 67-68: Alert System
└── frontend (React + Craco)
    └── src/
        ├── pages/FractalPage.js
        ├── pages/FractalAdminPage.js
        └── components/fractal/admin/AlertsTab.jsx
```

## What's Been Implemented

### 2026-02-18 — Initial Setup Complete
- ✅ Cloned GitHub repository Finade3
- ✅ Configured MongoDB connection
- ✅ TypeScript backend running (Fastify on port 8002)
- ✅ Bootstrap data loaded: 5694 candles (2010-2026)
- ✅ Frontend compiled and running

### 2026-02-18 — BLOCK 67-68: Regime Alert System
- ✅ Alert Engine Core (BTC-only, institutional)
- ✅ Rate limiting: 3 INFO/HIGH per 24h rolling, CRITICAL unlimited
- ✅ Alert types: REGIME_SHIFT, CRISIS_ENTER, CRISIS_EXIT, HEALTH_DROP, TAIL_SPIKE
- ✅ Dedup + Cooldown system (6h INFO/HIGH, 1h CRITICAL)
- ✅ MongoDB logging (fractal_alerts_log)
- ✅ Telegram adapter (ready, needs credentials)
- ✅ Admin UI: Alerts tab with quota, stats, filters, table

## Working Features

### Main Dashboard (/)
- Fractal Research Terminal with BTC chart
- Price Chart / Fractal Overlay modes
- VOLATILITY card (Crisis mode)
- SIZING BREAKDOWN table

### Admin Panel (/admin/fractal)
- **Overview Tab:** Governance, Health, Reliability, Performance
- **Shadow Divergence Tab:** Active vs Shadow comparison
- **Volatility Tab:** Regime Timeline, Performance by Regime
- **Alerts Tab (NEW):**
  - Quota status (0/3, 3 remaining)
  - Stats: Last 24h / Last 7d
  - Filters: Level, Type, Status
  - Alerts history table
  - Send Test Alert button

## API Endpoints

### Alert System (BLOCK 67-68)
- `GET /api/fractal/v2.1/admin/alerts` — List alerts with filters
- `GET /api/fractal/v2.1/admin/alerts/quota` — Quota status
- `GET /api/fractal/v2.1/admin/alerts/stats` — Statistics
- `GET /api/fractal/v2.1/admin/alerts/latest` — Recent sent alerts
- `POST /api/fractal/v2.1/admin/alerts/check` — Dry run (evaluate without sending)
- `POST /api/fractal/v2.1/admin/alerts/run` — Production run (evaluate + send)
- `POST /api/fractal/v2.1/admin/alerts/test` — Send test alert

## Tech Stack
- **Backend:** FastAPI (Python proxy) → Fastify (TypeScript)
- **Frontend:** React 19 + Craco + Tailwind CSS
- **Database:** MongoDB
- **Charts:** Recharts, Lightweight Charts

## Prioritized Backlog

### P0 (High Priority)
- [x] ~~Regime Alert System (Telegram)~~ — DONE (needs TG credentials)
- [ ] API Contract Tightening v2.1

### P1 (Medium Priority)
- [ ] Policy Tuning Suggestions
- [ ] Admin Policy Editor (BLOCK 66)

### P2 (Future)
- [ ] PHASE 4 - Cycle Engine (Bitcoin halving context)

## Configuration Required

### Telegram Integration
Add to `/app/backend/.env`:
```
TG_BOT_TOKEN=your_bot_token
TG_ADMIN_CHAT_ID=your_chat_id
```

## Access
- **URL:** https://tradeanalyzer-8.preview.emergentagent.com
- **Admin:** /admin/fractal
- **Alerts Tab:** /admin/fractal?tab=alerts
- **Shadow Tab:** /admin/fractal?tab=shadow
- **Auth:** admin / admin12345

## Last Updated
2026-02-18 — UI/UX Unification Complete: 
- ✅ Overview Tab: Modernized with tooltips, Russian descriptions, progress bars
- ✅ Volatility Tab: Unified design with Russian tooltips
- ✅ Alerts Tab: Unified design with Russian tooltips  
- ✅ Shadow Tab: Full unification — all components have Russian tooltips:
  - VerdictHeader: 6 metric cards with tooltips (Verdict, Resolved Signals, Shadow Score, ΔSharpe, ΔMaxDD, ΔCAGR)
  - Equity Overlay: Tooltip with chart explanation
  - Divergence Matrix: Russian legend and tooltip
  - Calibration Delta: Tooltips and Russian explanations for ECE/Brier Score
  - Divergence Ledger: Tooltip and Russian status messages
  - Governance Actions: Full Russian UI with tooltips

## Design Standards
- **Technical terms**: English (Verdict, Sharpe, MaxDD, CAGR, ECE, Brier Score)
- **Descriptions/Tooltips**: Russian (пояснения для модераторов)
- **InfoTooltip Component**: `/app/frontend/src/components/fractal/admin/InfoTooltip.jsx`

## Upcoming Tasks

### P0 — BLOCK 68.3: Auto Trigger Integration
- Activate backend alert triggers (Regime Shift, Health Drop, etc.)
- Integrate with daily cron job in `alert.engine.service.ts`
- Auto-generate alerts based on data changes

### P1 — BLOCK 69: Alert Correlation Links  
- Add deep links from alerts to relevant admin sections
- Filter by time of alert event

### P2 — Future
- BLOCK A2: Contract Lock v2.1.1
- BLOCK A3: Weekly Governance Digest
- BLOCK A4: Isolation Hardening
- PHASE B: Productization
