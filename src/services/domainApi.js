const JSON_HEADERS = { Accept: 'application/json' };

async function fetchJson(url, fallback = null, options = {}) {
  try {
    const response = await fetch(url, { headers: JSON_HEADERS, cache: 'no-store', ...options });
    if (!response.ok) return fallback;
    return await response.json();
  } catch (_) {
    return fallback;
  }
}

async function postJson(url, payload = {}, fallback = null, options = {}) {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { ...JSON_HEADERS, 'Content-Type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify(payload || {}),
      ...options,
    });
    if (!response.ok) return fallback;
    return await response.json();
  } catch (_) {
    return fallback;
  }
}

function rowsFromPayload(payload) {
  if (Array.isArray(payload?.data?.rows)) return payload.data.rows;
  if (Array.isArray(payload?.rows)) return payload.rows;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload)) return payload;
  return [];
}

async function fetchRows(url) {
  return rowsFromPayload(await fetchJson(url, null));
}

function params(query = {}) {
  const search = new URLSearchParams();
  Object.entries(query || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
  });
  const text = search.toString();
  return text ? `?${text}` : '';
}

export async function loadDashboardWorkspace() {
  const [latest, state, backtest, dailyReview, dailyAutopilot] = await Promise.all([
    fetchJson('/api/latest'),
    fetchJson('/api/dashboard/state'),
    fetchJson('/api/dashboard/backtest-summary'),
    fetchJson('/api/daily-review'),
    fetchJson('/api/daily-autopilot'),
  ]);
  return { latest, state, backtest, dailyReview, dailyAutopilot };
}

export async function loadMt5Workspace() {
  const [status, account, positions, orders, symbols, snapshot] = await Promise.all([
    fetchJson('/api/mt5-readonly/status'),
    fetchJson('/api/mt5-readonly/account'),
    fetchJson('/api/mt5-readonly/positions'),
    fetchJson('/api/mt5-readonly/orders'),
    fetchJson('/api/mt5-symbol-registry/symbols'),
    fetchJson('/api/mt5-readonly/snapshot'),
  ]);
  return { status, account, positions, orders, symbols, snapshot };
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
