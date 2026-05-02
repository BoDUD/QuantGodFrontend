const POLYMARKET_ENDPOINTS = [
  ['Search', '/api/polymarket/search'],
  ['Radar', '/api/polymarket/radar'],
  ['Radar Worker', '/api/polymarket/radar-worker'],
  ['AI Score', '/api/polymarket/ai-score'],
  ['History', '/api/polymarket/history'],
  ['Auto Governance', '/api/polymarket/auto-governance'],
  ['Canary Contract', '/api/polymarket/canary-executor-contract'],
  ['Canary Run', '/api/polymarket/canary-executor-run'],
  ['Real Trades', '/api/polymarket/real-trades'],
  ['Cross Linkage', '/api/polymarket/cross-linkage'],
  ['Markets', '/api/polymarket/markets'],
  ['Asset Opportunities', '/api/polymarket/asset-opportunities'],
  ['Single Market Analysis', '/api/polymarket/single-market-analysis'],
];

export const POLYMARKET_SAFETY_DEFAULTS = Object.freeze({
  researchOnly: true,
  advisoryOnly: true,
  readOnlyDataPlane: true,
  polymarketTradingAllowed: false,
  canaryExecutionAllowed: false,
  realTradeExecutionAllowed: false,
  orderSendAllowed: false,
  closeAllowed: false,
  cancelAllowed: false,
  credentialStorageAllowed: false,
  fundTransferAllowed: false,
  withdrawalAllowed: false,
  livePresetMutationAllowed: false,
  canOverrideKillSwitch: false,
  canMutateGovernanceDecision: false,
  canPromoteOrDemoteRoute: false,
  autoExecutionAllowed: false,
  requiresManualAuthorization: true,
});

function unwrap(payload) {
  if (!payload) return payload;
  if (payload.data !== undefined) return payload.data;
  if (payload.payload !== undefined) return payload.payload;
  return payload;
}

function asRows(payload) {
  const value = unwrap(payload);
  if (Array.isArray(value)) return value.filter(Boolean);
  if (!value || typeof value !== 'object') return [];

  const candidates = [
    value.rows,
    value.items,
    value.markets,
    value.events,
    value.results,
    value.opportunities,
    value.trades,
    value.history,
    value.records,
    value.ledger,
    value.signals,
    value.candidates,
    value.data,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate.filter(Boolean);
  }

  return [];
}

function firstObject(payload) {
  const value = unwrap(payload);
  if (Array.isArray(value)) return value.find((row) => row && typeof row === 'object') || {};
  if (value && typeof value === 'object') return value;
  return {};
}

function getPath(payload, paths, fallback = null) {
  const sources = [payload, unwrap(payload), firstObject(payload)];
  for (const source of sources) {
    if (!source || typeof source !== 'object') continue;
    for (const path of paths) {
      const parts = String(path).split('.').filter(Boolean);
      let cursor = source;
      let ok = true;
      for (const part of parts) {
        if (!cursor || typeof cursor !== 'object' || !(part in cursor)) {
          ok = false;
          break;
        }
        cursor = cursor[part];
      }
      if (ok && cursor !== undefined && cursor !== null && cursor !== '') return cursor;
    }
  }
  return fallback;
}

function countRows(payload) {
  return asRows(payload).length;
}

function formatNumber(value, digits = 2) {
  const number = Number(value);
  if (!Number.isFinite(number)) return value ?? '—';
  return number.toLocaleString(undefined, { maximumFractionDigits: digits });
}

function formatPercent(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return value ?? '—';
  const normalized = Math.abs(number) <= 1 ? number * 100 : number;
  return `${normalized.toFixed(1)}%`;
}

function inferStatus(payload) {
  if (!payload) return 'unknown';
  if (payload.ok === false || payload.error) return 'error';
  const value = unwrap(payload);
  if (Array.isArray(value)) return value.length ? 'ok' : 'warn';
  if (value && typeof value === 'object') {
    const state = String(value.status || value.state || value.health || value.mode || '').toLowerCase();
    if (['error', 'fail', 'failed', 'blocked', 'offline', 'critical'].includes(state)) return 'error';
    if (['warn', 'warning', 'degraded', 'pending', 'paused'].includes(state)) return 'warn';
    if (['ok', 'healthy', 'active', 'online', 'available', 'ready', 'running'].includes(state)) return 'ok';
    return Object.keys(value).length ? 'ok' : 'warn';
  }
  return 'unknown';
}

function statusLabel(payload) {
  const explicit = getPath(payload, ['status', 'state', 'health', 'mode']);
  return explicit ? String(explicit) : inferStatus(payload);
}

function bestScore(payload) {
  const candidates = [
    getPath(payload, ['score', 'ai_score', 'probability', 'confidence', 'edge', 'value_score']),
    ...asRows(payload).flatMap((row) => [row.score, row.ai_score, row.probability, row.confidence, row.edge, row.value_score]),
  ];
  const nums = candidates.map(Number).filter(Number.isFinite);
  if (!nums.length) return null;
  return Math.max(...nums);
}

function buildSafetyItems() {
  return [
    { label: 'Research only', value: 'true', status: 'ok' },
    { label: 'Advisory only', value: 'true', status: 'ok' },
    { label: 'Read-only data plane', value: 'true', status: 'ok' },
    { label: 'Polymarket trading', value: 'false', status: 'locked' },
    { label: 'Canary execution', value: 'false', status: 'locked' },
    { label: 'Real trade execution', value: 'false', status: 'locked' },
    { label: 'Order send', value: 'false', status: 'locked' },
    { label: 'Close / cancel', value: 'false', status: 'locked' },
    { label: 'Credential storage', value: 'false', status: 'locked' },
    { label: 'Fund transfer / withdrawal', value: 'false', status: 'locked' },
    { label: 'Governance mutation', value: 'false', status: 'locked' },
    { label: 'Route promote/demote', value: 'false', status: 'locked' },
    { label: 'Manual authorization', value: 'required', status: 'warn' },
  ];
}

function buildEndpoints(payload) {
  const keys = {
    Search: 'search',
    Radar: 'radar',
    'Radar Worker': 'worker',
    'AI Score': 'aiScore',
    History: 'history',
    'Auto Governance': 'autoGovernance',
    'Canary Contract': 'canary',
    'Canary Run': 'canaryRun',
    'Real Trades': 'realTrades',
    'Cross Linkage': 'cross',
    Markets: 'markets',
    'Asset Opportunities': 'assets',
    'Single Market Analysis': 'singleAnalysis',
  };
  return POLYMARKET_ENDPOINTS.map(([label, endpoint]) => {
    const key = keys[label];
    const value = payload?.[key];
    const status = inferStatus(value);
    return { label, endpoint, status, statusLabel: statusLabel(value) };
  });
}

function buildMetrics(payload) {
  const searchRows = countRows(payload.search);
  const radarRows = countRows(payload.radar);
  const marketRows = countRows(payload.markets);
  const assetRows = countRows(payload.assets);
  const historyRows = countRows(payload.history);
  const tradeRows = countRows(payload.realTrades);
  const score = bestScore(payload.aiScore);
  return [
    { label: 'Search results', value: searchRows, hint: 'query matches' },
    { label: 'Radar opportunities', value: radarRows, hint: 'research-only radar' },
    { label: 'Markets', value: marketRows, hint: 'volume sorted' },
    { label: 'Asset opportunities', value: assetRows, hint: 'candidate rows' },
    { label: 'AI score', value: score === null ? '—' : formatNumber(score, 3), hint: 'advisory score' },
    { label: 'History / trades', value: `${historyRows} / ${tradeRows}`, hint: 'ledger evidence' },
  ];
}

function buildRadarItems(payload) {
  const radarScore = bestScore(payload.radar);
  const worker = payload.worker;
  return [
    { label: 'Radar state', value: statusLabel(payload.radar), status: inferStatus(payload.radar) },
    { label: 'Radar rows', value: countRows(payload.radar) },
    { label: 'Best radar score', value: radarScore === null ? '—' : formatNumber(radarScore, 3) },
    { label: 'Worker state', value: statusLabel(worker), status: inferStatus(worker) },
    { label: 'Worker updated', value: getPath(worker, ['updated_at', 'timestamp', 'last_run_at', 'last_updated'], '—') },
    { label: 'Search query', value: getPath(payload.search, ['query', 'q', 'keyword'], '—') },
  ];
}

function buildAiScoreItems(payload) {
  const score = payload.aiScore;
  const governance = payload.autoGovernance;
  return [
    { label: 'AI score state', value: statusLabel(score), status: inferStatus(score) },
    { label: 'Score', value: bestScore(score) === null ? '—' : formatNumber(bestScore(score), 3) },
    { label: 'Confidence', value: formatPercent(getPath(score, ['confidence', 'decision.confidence', 'score.confidence'], null)) },
    { label: 'Recommendation', value: getPath(score, ['recommendation', 'decision', 'action', 'side'], '—') },
    { label: 'Auto governance', value: statusLabel(governance), status: inferStatus(governance) },
    { label: 'Governance note', value: getPath(governance, ['note', 'reasoning', 'summary', 'next_action'], 'evidence only') },
  ];
}

function buildCanaryItems(payload) {
  const contract = payload.canary;
  const run = payload.canaryRun;
  return [
    { label: 'Contract state', value: statusLabel(contract), status: inferStatus(contract) },
    { label: 'Contract version', value: getPath(contract, ['version', 'schemaVersion', 'contract_version'], '—') },
    { label: 'Run state', value: statusLabel(run), status: inferStatus(run) },
    { label: 'Run mode', value: getPath(run, ['mode', 'run_mode', 'dry_run'], 'research-only') },
    { label: 'Last run', value: getPath(run, ['last_run_at', 'updated_at', 'timestamp'], '—') },
    { label: 'Execution posture', value: 'blocked by UI guard', status: 'locked' },
  ];
}

function buildCrossLinkageItems(payload) {
  const cross = payload.cross;
  const analysis = payload.singleAnalysis;
  return [
    { label: 'Cross-link state', value: statusLabel(cross), status: inferStatus(cross) },
    { label: 'Cross rows', value: countRows(cross) },
    { label: 'Single analysis', value: statusLabel(analysis), status: inferStatus(analysis) },
    { label: 'Linked asset', value: getPath(cross, ['asset', 'symbol', 'linked_symbol', 'market.asset'], '—') },
    { label: 'Macro theme', value: getPath(analysis, ['theme', 'macro_theme', 'market.theme'], '—') },
    { label: 'Reasoning', value: getPath(analysis, ['reasoning', 'summary', 'thesis'], '—') },
  ];
}

export function buildPolymarketModel(payload = {}) {
  const model = {
    safety: POLYMARKET_SAFETY_DEFAULTS,
    metrics: buildMetrics(payload),
    endpoints: buildEndpoints(payload),
    safetyItems: buildSafetyItems(),
    radarItems: buildRadarItems(payload),
    aiScoreItems: buildAiScoreItems(payload),
    canaryItems: buildCanaryItems(payload),
    crossLinkageItems: buildCrossLinkageItems(payload),
    tables: {
      search: asRows(payload.search).slice(0, 12),
      radar: asRows(payload.radar).slice(0, 12),
      markets: asRows(payload.markets).slice(0, 12),
      assets: asRows(payload.assets).slice(0, 12),
      history: asRows(payload.history).slice(0, 12),
      realTrades: asRows(payload.realTrades).slice(0, 12),
      cross: asRows(payload.cross).slice(0, 12),
    },
    raw: payload,
  };
  return model;
}
