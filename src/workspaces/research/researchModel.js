const UNKNOWN = '—';

export const RESEARCH_ENDPOINTS = [
  { key: 'stats', label: 'Research Stats', path: '/api/research/stats' },
  { key: 'statsLedger', label: 'Stats Ledger', path: '/api/research/stats-ledger' },
  { key: 'shadowSignals', label: 'Shadow Signals', path: '/api/shadow/signals' },
  { key: 'shadowOutcomes', label: 'Shadow Outcomes', path: '/api/shadow/outcomes' },
  { key: 'shadowCandidates', label: 'Shadow Candidates', path: '/api/shadow/candidates' },
  { key: 'closeHistory', label: 'Close History', path: '/api/trades/close-history' },
  { key: 'tradeJournal', label: 'Trade Journal', path: '/api/trades/journal' },
  { key: 'strategyEvaluation', label: 'Strategy Evaluation', path: '/api/research/strategy-evaluation' },
  { key: 'regimeEvaluation', label: 'Regime Evaluation', path: '/api/research/regime-evaluation' },
  { key: 'manualAlpha', label: 'Manual Alpha', path: '/api/research/manual-alpha' },
];

export const RESEARCH_SAFETY_DEFAULTS = Object.freeze({
  researchOnly: true,
  shadowOnly: true,
  advisoryOnly: true,
  readOnlyDataPlane: true,
  orderSendAllowed: false,
  closeAllowed: false,
  cancelAllowed: false,
  credentialStorageAllowed: false,
  livePresetMutationAllowed: false,
  canOverrideKillSwitch: false,
  canMutateGovernanceDecision: false,
  canPromoteOrDemoteRoute: false,
  autoPromotionAllowed: false,
  manualExecutionRequired: true,
});

function isObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function dataOf(payload) {
  if (payload?.data && isObject(payload.data)) return payload.data;
  if (payload?.payload && isObject(payload.payload)) return payload.payload;
  if (isObject(payload)) return payload;
  return {};
}

function rows(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data?.rows)) return value.data.rows;
  if (Array.isArray(value?.rows)) return value.rows;
  if (Array.isArray(value?.data)) return value.data;
  return [];
}

function firstValue(source, keys, fallback = UNKNOWN) {
  const scopes = [source, source?.data, source?.payload, source?.summary, source?.stats, source?.research, source?.metrics]
    .filter(isObject);
  for (const scope of scopes) {
    for (const key of keys) {
      if (scope[key] !== undefined && scope[key] !== null && scope[key] !== '') return scope[key];
    }
  }
  return fallback;
}

function formatNumber(value, digits = 2) {
  if (value === undefined || value === null || value === '') return UNKNOWN;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return String(value);
  return numeric.toFixed(digits).replace(/\.00$/, '');
}

function formatPercent(value) {
  if (value === undefined || value === null || value === '') return UNKNOWN;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return String(value);
  const normalized = Math.abs(numeric) <= 1 ? numeric * 100 : numeric;
  return `${normalized.toFixed(1)}%`;
}

function statusFromBoolean(value, trueStatus = 'ok', falseStatus = 'locked') {
  if (value === true) return trueStatus;
  if (value === false) return falseStatus;
  return 'unknown';
}

function boolLabel(value) {
  if (value === true) return 'true';
  if (value === false) return 'false';
  return UNKNOWN;
}

function latestTimestamp(payload, rowSets = []) {
  const fromPayload = firstValue(payload, ['updated_at', 'updatedAt', 'timestamp', 'generated_at', 'generatedAt', 'last_update', 'lastUpdated'], '');
  if (fromPayload) return fromPayload;
  for (const set of rowSets) {
    const row = rows(set)[0];
    const ts = firstValue(row, ['updated_at', 'updatedAt', 'timestamp', 'time', 'date', 'closed_at', 'opened_at'], '');
    if (ts) return ts;
  }
  return UNKNOWN;
}

function sumNumeric(rowSet, keys) {
  return rows(rowSet).reduce((total, row) => {
    const value = firstValue(row, keys, null);
    const numeric = Number(value);
    return Number.isFinite(numeric) ? total + numeric : total;
  }, 0);
}

function countWhere(rowSet, predicate) {
  return rows(rowSet).filter(predicate).length;
}

function inferProfitFactor(rowSet) {
  const profits = rows(rowSet).map((row) => Number(firstValue(row, ['profit', 'pnl', 'net_pnl', 'netPnl', 'pips'], 0)) || 0);
  const grossWin = profits.filter((value) => value > 0).reduce((a, b) => a + b, 0);
  const grossLoss = Math.abs(profits.filter((value) => value < 0).reduce((a, b) => a + b, 0));
  if (grossWin === 0 && grossLoss === 0) return UNKNOWN;
  if (grossLoss === 0) return '∞';
  return formatNumber(grossWin / grossLoss, 2);
}

export function buildResearchEndpointHealth(state) {
  return RESEARCH_ENDPOINTS.map((endpoint) => {
    const value = state?.[endpoint.key];
    const rowCount = rows(value).length;
    const hasPayload = value !== undefined && value !== null;
    const hasRows = rowCount > 0;
    return {
      ...endpoint,
      status: hasRows || hasPayload ? 'ok' : 'warn',
      detail: hasRows ? `${rowCount} rows` : (hasPayload ? 'payload loaded' : 'missing'),
    };
  });
}

export function buildResearchSafetyEnvelope(overrides = {}) {
  const safety = { ...RESEARCH_SAFETY_DEFAULTS, ...(overrides || {}) };
  return [
    { label: 'Research only', value: boolLabel(safety.researchOnly), status: statusFromBoolean(safety.researchOnly) },
    { label: 'Shadow only', value: boolLabel(safety.shadowOnly), status: statusFromBoolean(safety.shadowOnly) },
    { label: 'Advisory only', value: boolLabel(safety.advisoryOnly), status: statusFromBoolean(safety.advisoryOnly) },
    { label: 'Read-only data plane', value: boolLabel(safety.readOnlyDataPlane), status: statusFromBoolean(safety.readOnlyDataPlane) },
    { label: 'Order send', value: boolLabel(safety.orderSendAllowed), status: statusFromBoolean(safety.orderSendAllowed, 'error', 'locked') },
    { label: 'Close allowed', value: boolLabel(safety.closeAllowed), status: statusFromBoolean(safety.closeAllowed, 'error', 'locked') },
    { label: 'Cancel allowed', value: boolLabel(safety.cancelAllowed), status: statusFromBoolean(safety.cancelAllowed, 'error', 'locked') },
    { label: 'Credential storage', value: boolLabel(safety.credentialStorageAllowed), status: statusFromBoolean(safety.credentialStorageAllowed, 'error', 'locked') },
    { label: 'Live preset mutation', value: boolLabel(safety.livePresetMutationAllowed), status: statusFromBoolean(safety.livePresetMutationAllowed, 'error', 'locked') },
    { label: 'Override Kill Switch', value: boolLabel(safety.canOverrideKillSwitch), status: statusFromBoolean(safety.canOverrideKillSwitch, 'error', 'locked') },
    { label: 'Mutate Governance decision', value: boolLabel(safety.canMutateGovernanceDecision), status: statusFromBoolean(safety.canMutateGovernanceDecision, 'error', 'locked') },
    { label: 'Promote or demote route', value: boolLabel(safety.canPromoteOrDemoteRoute), status: statusFromBoolean(safety.canPromoteOrDemoteRoute, 'error', 'locked') },
    { label: 'Auto promotion', value: boolLabel(safety.autoPromotionAllowed), status: statusFromBoolean(safety.autoPromotionAllowed, 'error', 'locked') },
    { label: 'Manual execution required', value: boolLabel(safety.manualExecutionRequired), status: statusFromBoolean(safety.manualExecutionRequired) },
  ];
}

export function buildResearchMetrics(state) {
  const stats = dataOf(state.stats);
  const shadowSignalRows = rows(state.shadowSignals);
  const tradeRows = rows(state.tradeJournal);
  const closeRows = rows(state.closeHistory);
  const evaluationRows = rows(state.strategyEvaluation).length + rows(state.regimeEvaluation).length;
  const shadowOutcomeRows = rows(state.shadowOutcomes);
  const winRate = firstValue(stats, ['win_rate', 'winRate', 'trade_win_rate', 'tradeWinRate'], null);
  const pf = firstValue(stats, ['profit_factor', 'profitFactor', 'pf'], null) ?? inferProfitFactor(state.closeHistory);
  const realized = firstValue(stats, ['realized_pnl', 'realizedPnl', 'pnl', 'net_pnl', 'netPnl'], null) ?? sumNumeric(state.closeHistory, ['profit', 'pnl', 'net_pnl', 'netPnl']);
  return [
    { label: 'Shadow Signals', value: shadowSignalRows.length, hint: 'last 30d' },
    { label: 'Shadow Outcomes', value: shadowOutcomeRows.length, hint: 'labeled rows' },
    { label: 'Trades', value: tradeRows.length + closeRows.length, hint: 'journal + close history' },
    { label: 'Research Rows', value: evaluationRows, hint: 'strategy + regime' },
    { label: 'Win Rate', value: formatPercent(winRate), hint: 'research stats' },
    { label: 'Profit Factor', value: pf === null ? UNKNOWN : formatNumber(pf, 2), hint: 'stats / inferred' },
    { label: 'Realized PnL', value: realized === null ? UNKNOWN : formatNumber(realized, 2), hint: 'stats / close history' },
    { label: 'Manual Alpha', value: rows(state.manualAlpha).length, hint: 'ideas' },
  ];
}

export function buildResearchStatsSummary(state) {
  const stats = dataOf(state.stats);
  return [
    { label: 'Status', value: firstValue(stats, ['status', 'state', 'research_status'], 'loaded'), status: firstValue(stats, ['status', 'state'], 'ok') },
    { label: 'Updated at', value: latestTimestamp(stats, [state.statsLedger]) },
    { label: 'Symbols', value: firstValue(stats, ['symbols', 'symbol_count', 'symbolCount'], UNKNOWN) },
    { label: 'Total trades', value: firstValue(stats, ['total_trades', 'totalTrades', 'trades', 'trade_count'], rows(state.tradeJournal).length + rows(state.closeHistory).length) },
    { label: 'Win rate', value: formatPercent(firstValue(stats, ['win_rate', 'winRate', 'trade_win_rate', 'tradeWinRate'], null)) },
    { label: 'Profit factor', value: formatNumber(firstValue(stats, ['profit_factor', 'profitFactor', 'pf'], inferProfitFactor(state.closeHistory)), 2) },
    { label: 'Expectancy', value: formatNumber(firstValue(stats, ['expectancy', 'avg_expectancy', 'averageExpectancy'], UNKNOWN), 2) },
    { label: 'Max drawdown', value: formatNumber(firstValue(stats, ['max_drawdown', 'maxDrawdown', 'drawdown'], UNKNOWN), 2) },
  ];
}

export function buildShadowSummary(state) {
  const signalRows = rows(state.shadowSignals);
  const outcomeRows = rows(state.shadowOutcomes);
  const candidateRows = rows(state.shadowCandidates);
  const blocked = countWhere(signalRows, (row) => String(firstValue(row, ['status', 'decision', 'action', 'blocked'], '')).toLowerCase().includes('block'));
  const buys = countWhere(signalRows, (row) => String(firstValue(row, ['side', 'direction', 'action', 'signal'], '')).toUpperCase().includes('BUY'));
  const sells = countWhere(signalRows, (row) => String(firstValue(row, ['side', 'direction', 'action', 'signal'], '')).toUpperCase().includes('SELL'));
  const wins = countWhere(outcomeRows, (row) => Number(firstValue(row, ['profit', 'pnl', 'pips', 'outcome_pips'], 0)) > 0 || String(firstValue(row, ['outcome', 'result'], '')).toLowerCase().includes('win'));
  return [
    { label: 'Signals', value: signalRows.length, status: signalRows.length ? 'ok' : 'warn' },
    { label: 'Outcomes', value: outcomeRows.length, status: outcomeRows.length ? 'ok' : 'warn' },
    { label: 'Candidates', value: candidateRows.length, status: candidateRows.length ? 'ok' : 'warn' },
    { label: 'Blocked signals', value: blocked },
    { label: 'BUY / SELL', value: `${buys} / ${sells}` },
    { label: 'Positive outcomes', value: wins },
    { label: 'Latest signal', value: latestTimestamp(null, [signalRows]) },
    { label: 'Research mode', value: 'shadow evidence', status: 'locked' },
  ];
}

export function buildTradeLedgerSummary(state) {
  const closeRows = rows(state.closeHistory);
  const journalRows = rows(state.tradeJournal);
  const realizedPnl = sumNumeric(closeRows, ['profit', 'pnl', 'net_pnl', 'netPnl']);
  const pips = sumNumeric(closeRows, ['pips', 'profit_pips', 'net_pips']);
  const wins = countWhere(closeRows, (row) => Number(firstValue(row, ['profit', 'pnl', 'pips'], 0)) > 0 || String(firstValue(row, ['result', 'outcome'], '')).toLowerCase().includes('win'));
  const losses = countWhere(closeRows, (row) => Number(firstValue(row, ['profit', 'pnl', 'pips'], 0)) < 0 || String(firstValue(row, ['result', 'outcome'], '')).toLowerCase().includes('loss'));
  return [
    { label: 'Close rows', value: closeRows.length, status: closeRows.length ? 'ok' : 'warn' },
    { label: 'Journal rows', value: journalRows.length, status: journalRows.length ? 'ok' : 'warn' },
    { label: 'Wins / losses', value: `${wins} / ${losses}` },
    { label: 'Realized PnL', value: formatNumber(realizedPnl, 2) },
    { label: 'Net pips', value: formatNumber(pips, 1) },
    { label: 'Inferred PF', value: inferProfitFactor(closeRows) },
    { label: 'Latest trade', value: latestTimestamp(null, [closeRows, journalRows]) },
    { label: 'Execution control', value: 'none in frontend', status: 'locked' },
  ];
}

export function buildEvaluationSummary(state) {
  const strategyRows = rows(state.strategyEvaluation);
  const regimeRows = rows(state.regimeEvaluation);
  const manualRows = rows(state.manualAlpha);
  const statsRows = rows(state.statsLedger);
  const bestStrategy = strategyRows[0] || {};
  const bestRegime = regimeRows[0] || {};
  return [
    { label: 'Strategy eval rows', value: strategyRows.length, status: strategyRows.length ? 'ok' : 'warn' },
    { label: 'Regime eval rows', value: regimeRows.length, status: regimeRows.length ? 'ok' : 'warn' },
    { label: 'Stats ledger rows', value: statsRows.length, status: statsRows.length ? 'ok' : 'warn' },
    { label: 'Manual alpha rows', value: manualRows.length, status: manualRows.length ? 'ok' : 'warn' },
    { label: 'Top strategy', value: firstValue(bestStrategy, ['route', 'strategy', 'name', 'symbol'], UNKNOWN) },
    { label: 'Top strategy PF', value: formatNumber(firstValue(bestStrategy, ['profit_factor', 'profitFactor', 'pf'], UNKNOWN), 2) },
    { label: 'Top regime', value: firstValue(bestRegime, ['regime', 'name', 'market_regime', 'marketRegime'], UNKNOWN) },
    { label: 'Latest evaluation', value: latestTimestamp(null, [strategyRows, regimeRows, statsRows]) },
  ];
}

export function limitRows(value, count = 10) {
  return rows(value).slice(0, count);
}

export function buildResearchViewModel(state) {
  return {
    metrics: buildResearchMetrics(state),
    endpoints: buildResearchEndpointHealth(state),
    safety: buildResearchSafetyEnvelope(state?.stats?.safety || state?.stats?.data?.safety || {}),
    statsSummary: buildResearchStatsSummary(state),
    shadowSummary: buildShadowSummary(state),
    tradeSummary: buildTradeLedgerSummary(state),
    evaluationSummary: buildEvaluationSummary(state),
    tables: {
      shadowSignals: limitRows(state.shadowSignals, 10),
      shadowOutcomes: limitRows(state.shadowOutcomes, 10),
      shadowCandidates: limitRows(state.shadowCandidates, 10),
      closeHistory: limitRows(state.closeHistory, 10),
      tradeJournal: limitRows(state.tradeJournal, 10),
      strategyEvaluation: limitRows(state.strategyEvaluation, 10),
      regimeEvaluation: limitRows(state.regimeEvaluation, 10),
      manualAlpha: limitRows(state.manualAlpha, 10),
      statsLedger: limitRows(state.statsLedger, 10),
    },
  };
}
