import {
  fetchJson,
  fetchRows,
  postJson,
  queryString as params,
  rowsFromPayload,
} from './apiClient.js';

export async function loadDashboardWorkspace() {
  const [latest, state, backtest, dailyReview, dailyAutopilot, mt5Snapshot, polyRadar, polyMarkets] = await Promise.all([
    fetchJson('/api/latest'),
    fetchJson('/api/dashboard/state'),
    fetchJson('/api/dashboard/backtest-summary'),
    fetchJson('/api/daily-review'),
    fetchJson('/api/daily-autopilot'),
    fetchJson('/api/mt5-readonly/snapshot'),
    fetchJson('/api/polymarket/radar?limit=8'),
    fetchJson('/api/polymarket/markets?limit=8&sort=volume'),
  ]);
  return { latest, state, backtest, dailyReview, dailyAutopilot, mt5Snapshot, polyRadar, polyMarkets };
}

export async function loadMt5Workspace() {
  const [status, account, positions, orders, symbols, snapshot, closeHistory, tradeJournal, dailyReview, dailyAutopilot] = await Promise.all([
    fetchJson('/api/mt5-readonly/status'),
    fetchJson('/api/mt5-readonly/account'),
    fetchJson('/api/mt5-readonly/positions'),
    fetchJson('/api/mt5-readonly/orders'),
    fetchJson('/api/mt5-symbol-registry/symbols'),
    fetchJson('/api/mt5-readonly/snapshot'),
    fetchRows('/api/trades/close-history?limit=80'),
    fetchRows('/api/trades/journal?limit=120'),
    fetchJson('/api/daily-review'),
    fetchJson('/api/daily-autopilot'),
  ]);
  return { status, account, positions, orders, symbols, snapshot, closeHistory, tradeJournal, dailyReview, dailyAutopilot };
}

export async function loadGovernanceWorkspace() {
  const [advisor, versionRegistry, promotionGate, optimizerV2] = await Promise.all([
    fetchJson('/api/governance/advisor'),
    fetchJson('/api/governance/version-registry'),
    fetchJson('/api/governance/promotion-gate'),
    fetchJson('/api/governance/optimizer-v2'),
  ]);
  return { advisor, versionRegistry, promotionGate, optimizerV2 };
}

export async function loadParamLabWorkspace(query = {}) {
  const limit = query.limit || 200;
  const [status, results, scheduler, recovery, reportWatcher, testerWindow, resultRows, schedulerRows] = await Promise.all([
    fetchJson('/api/paramlab/status'),
    fetchJson('/api/paramlab/results'),
    fetchJson('/api/paramlab/scheduler'),
    fetchJson('/api/paramlab/recovery'),
    fetchJson('/api/paramlab/report-watcher'),
    fetchJson('/api/paramlab/tester-window'),
    fetchRows(`/api/paramlab/results-ledger${params({ limit })}`),
    fetchRows(`/api/paramlab/scheduler-ledger${params({ limit })}`),
  ]);
  return { status, results, scheduler, recovery, reportWatcher, testerWindow, resultRows, schedulerRows };
}

export async function loadResearchWorkspace(query = {}) {
  const limit = query.limit || 300;
  const days = query.days || 30;
  const [stats, statsLedger, shadowSignals, shadowOutcomes, shadowCandidates, closeHistory, tradeJournal, strategyEvaluation, regimeEvaluation, manualAlpha] = await Promise.all([
    fetchJson('/api/research/stats'),
    fetchRows(`/api/research/stats-ledger${params({ limit })}`),
    fetchRows(`/api/shadow/signals${params({ limit, days })}`),
    fetchRows(`/api/shadow/outcomes${params({ limit, days })}`),
    fetchRows(`/api/shadow/candidates${params({ limit, days })}`),
    fetchRows(`/api/trades/close-history${params({ limit, days })}`),
    fetchRows(`/api/trades/journal${params({ limit, days })}`),
    fetchRows(`/api/research/strategy-evaluation${params({ limit })}`),
    fetchRows(`/api/research/regime-evaluation${params({ limit })}`),
    fetchRows(`/api/research/manual-alpha${params({ limit })}`),
  ]);
  return { stats, statsLedger, shadowSignals, shadowOutcomes, shadowCandidates, closeHistory, tradeJournal, strategyEvaluation, regimeEvaluation, manualAlpha };
}

export async function loadPolymarketWorkspace(query = {}) {
  const q = query.q || '';
  const limit = query.limit || 50;
  const [search, radar, worker, aiScore, history, autoGovernance, canary, canaryRun, realTrades, cross, markets, assets, singleAnalysis] = await Promise.all([
    fetchJson(`/api/polymarket/search${params({ q, limit: 12 })}`),
    fetchJson(`/api/polymarket/radar${params({ limit: 12 })}`),
    fetchJson('/api/polymarket/radar-worker'),
    fetchJson('/api/polymarket/ai-score'),
    fetchJson(`/api/polymarket/history${params({ table: 'all', limit: 12 })}`),
    fetchJson('/api/polymarket/auto-governance'),
    fetchJson('/api/polymarket/canary-executor-contract'),
    fetchJson('/api/polymarket/canary-executor-run'),
    fetchJson('/api/polymarket/real-trades'),
    fetchJson('/api/polymarket/cross-linkage'),
    fetchJson(`/api/polymarket/markets${params({ limit: 12, sort: 'volume' })}`),
    fetchJson(`/api/polymarket/asset-opportunities${params({ limit: 12 })}`),
    fetchJson('/api/polymarket/single-market-analysis'),
  ]);
  return { search, radar, worker, aiScore, history, autoGovernance, canary, canaryRun, realTrades, cross, markets, assets, singleAnalysis };
}

export async function reloadWorkspace(key, query = {}) {
  const loaders = {
    dashboard: loadDashboardWorkspace,
    mt5: loadMt5Workspace,
    governance: loadGovernanceWorkspace,
    paramlab: loadParamLabWorkspace,
    research: loadResearchWorkspace,
    polymarket: loadPolymarketWorkspace,
  };
  return loaders[key]?.(query) ?? null;
}

export { fetchJson, fetchRows, postJson, rowsFromPayload };
