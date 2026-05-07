# QuantGodFrontend

QuantGodFrontend is the Vue 3 operator workbench for the QuantGod local trading research and governance system.

It is not a retail trading terminal. It does not place orders, store credentials, mutate MT5 presets, or read local runtime files directly. Its job is to make the backend evidence plane understandable: why the EA can or cannot act, what the autonomous Agent changed, what was rolled back, and which shadow strategies are still research-only.

## Product Position

The current UI is centered on QuantGod v2.5:

```text
Live Lane: USDJPYc / RSI_Reversal / LONG / cent account
MT5 Shadow Lane: USDJPY multi-strategy simulation and ranking
Polymarket Shadow Lane: simulated ledger and macro/event context
Agent: autonomous daily todo, daily review, promotion, demotion, rollback
```

The interface is an operator workbench: dense, Chinese-first, evidence-first, and read-only.

## Repository Role

| Area | Path | Responsibility |
|---|---|---|
| App shell | `src/app/` | Workspace registry, navigation, command surface |
| Workspaces | `src/workspaces/` | Dashboard, MT5, Polymarket, Research, ParamLab, AI/Kline views |
| Components | `src/components/` | Shared panels, KPI cards, automation and USDJPY Agent panels |
| Services | `src/services/` | `/api/*` client modules |
| Styling | `src/styles*.css`, `src/styles/` | Theme tokens, responsive hardening, workbench layout |
| Guards and tests | `scripts/`, `tests/` | Contract, boundary, responsive, and workspace checks |

Related repositories:

- Backend: `../QuantGodBackend`
- Infra: `../QuantGodInfra`
- Docs: `../QuantGodDocs`

## Local Development

Start the backend first:

```bash
cd /Users/bowen/Desktop/Quard/QuantGodBackend
node Dashboard/dashboard_server.js
```

Start the frontend:

```bash
cd /Users/bowen/Desktop/Quard/QuantGodFrontend
npm install
npm run dev
```

Open:

```text
http://127.0.0.1:5173/vue/?workspace=mt5
```

Vite proxies `/api/*` to `QG_BACKEND_URL`, defaulting to `http://127.0.0.1:8080`.

## Main Workspaces

| Workspace | Purpose |
|---|---|
| Dashboard | System summary, USDJPY live-loop truth, Agent status, automation chain details |
| MT5 | EA recovery state, RSI entry diagnostics, positions, orders, trades, runtime blockers |
| USDJPY Evolution | Dataset, causal replay, walk-forward, autonomous lifecycle, daily todo/review |
| Polymarket | Shadow ledger, copy strategy quarantine, simulated capital view, event context |
| ParamLab / Research | Tester-only reports, strategy evidence, research surfaces |

The MT5 page should answer the most important operational question first: why the EA is or is not acting now.

## Build and Sync

```bash
cd /Users/bowen/Desktop/Quard/QuantGodFrontend
npm run build

cd /Users/bowen/Desktop/Quard/QuantGodInfra
python3 scripts/qg-workspace.py --workspace workspace/quantgod.workspace.json sync-frontend-dist
```

The synced runtime output is served by `QuantGodBackend/Dashboard/vue-dist/` and is not committed to backend.

## Validation

Core checks:

```bash
cd /Users/bowen/Desktop/Quard/QuantGodFrontend
npm test
npm run build
```

Focused guard set:

```bash
npm run contract
npm run api-client
npm run workspace-boundary
npm run code-splitting
npm run automation-chain
npm run usdjpy-strategy-lab
npm run usdjpy-evolution
npm run responsive-hardening
```

Full UI toolchain:

```bash
npm run p0-toolchain
```

Responsive QA:

```bash
npm run preview
npm run responsive:check
```

## UI Standards

- Chinese-first operating language.
- Natural-language labels instead of backend endpoint names.
- No Quick Trade, no wallet connection, no Telegram command UI.
- No direct `QuantGod_*.json` or CSV reads from the browser.
- No text overflow, collapsed tables, or card-in-card layout.
- Financial numbers should use consistent units and explain whether they are R, pips, USC, or simulated USDC.
- Strategy JSON, GA Evolution, and Telegram Gateway must be shown as next-phase tasks unless implemented.

## Safety Contract

Frontend may display:

- Live Lane status.
- MT5 Shadow Lane rankings.
- Polymarket Shadow Lane status.
- Agent patch evidence.
- Autonomous rollback and daily review results.

Frontend must not:

- Place orders.
- Close or cancel positions.
- Modify MT5 live presets.
- Store or reveal credentials.
- Connect Polymarket real wallets.
- Let DeepSeek override hard gates.

## Design Notes

- `FRONTEND_UX_FOUNDATION.md` documents tokens, themes, command panel, and shared UX primitives.
- `FRONTEND_P0_TOOLCHAIN.md` documents lint, format, style, and unit-test boundaries.
- `FRONTEND_RESPONSIVE_HARDENING.md` documents responsive hardening strategy.
