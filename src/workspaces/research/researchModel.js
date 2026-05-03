const UNKNOWN = '—';

export const RESEARCH_ENDPOINTS = [
  { key: 'stats', label: '研究统计', path: '/api/research/stats', description: '总体样本、胜率、PF 和更新时间' },
  { key: 'statsLedger', label: '统计流水', path: '/api/research/stats-ledger', description: '研究统计的历史回灌记录' },
  { key: 'shadowSignals', label: '模拟信号', path: '/api/shadow/signals', description: '只读模拟信号与阻断原因' },
  { key: 'shadowOutcomes', label: '模拟结果', path: '/api/shadow/outcomes', description: '模拟信号后验结果' },
  { key: 'shadowCandidates', label: '模拟候选', path: '/api/shadow/candidates', description: '候选策略和候选品种' },
  { key: 'closeHistory', label: '历史平仓', path: '/api/trades/close-history', description: 'MT5 历史平仓证据' },
  { key: 'tradeJournal', label: '交易流水', path: '/api/trades/journal', description: 'MT5 交易事件流水' },
  { key: 'strategyEvaluation', label: '策略评估', path: '/api/research/strategy-evaluation', description: '策略维度研究结果' },
  { key: 'regimeEvaluation', label: '行情环境评估', path: '/api/research/regime-evaluation', description: '行情状态维度研究结果' },
  { key: 'manualAlpha', label: '人工 Alpha', path: '/api/research/manual-alpha', description: '人工观察与研究线索' },
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
  if (value === true) return '是';
  if (value === false) return '否';
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
      detail: hasRows ? `${rowCount} 条记录` : (hasPayload ? '已读取' : '缺失'),
    };
  });
}

export function buildResearchSafetyEnvelope(overrides = {}) {
  const safety = { ...RESEARCH_SAFETY_DEFAULTS, ...(overrides || {}) };
  return [
    { label: '只读研究', value: boolLabel(safety.researchOnly), status: statusFromBoolean(safety.researchOnly) },
    { label: '仅模拟', value: boolLabel(safety.shadowOnly), status: statusFromBoolean(safety.shadowOnly) },
    { label: '仅给建议', value: boolLabel(safety.advisoryOnly), status: statusFromBoolean(safety.advisoryOnly) },
    { label: '只读数据面', value: boolLabel(safety.readOnlyDataPlane), status: statusFromBoolean(safety.readOnlyDataPlane) },
    { label: '允许下单', value: boolLabel(safety.orderSendAllowed), status: statusFromBoolean(safety.orderSendAllowed, 'error', 'locked') },
    { label: '允许平仓', value: boolLabel(safety.closeAllowed), status: statusFromBoolean(safety.closeAllowed, 'error', 'locked') },
    { label: '允许撤单', value: boolLabel(safety.cancelAllowed), status: statusFromBoolean(safety.cancelAllowed, 'error', 'locked') },
    { label: '保存凭据', value: boolLabel(safety.credentialStorageAllowed), status: statusFromBoolean(safety.credentialStorageAllowed, 'error', 'locked') },
    { label: '修改实盘配置', value: boolLabel(safety.livePresetMutationAllowed), status: statusFromBoolean(safety.livePresetMutationAllowed, 'error', 'locked') },
    { label: '绕过熔断', value: boolLabel(safety.canOverrideKillSwitch), status: statusFromBoolean(safety.canOverrideKillSwitch, 'error', 'locked') },
    { label: '修改治理结论', value: boolLabel(safety.canMutateGovernanceDecision), status: statusFromBoolean(safety.canMutateGovernanceDecision, 'error', 'locked') },
    { label: '自动升降级路线', value: boolLabel(safety.canPromoteOrDemoteRoute), status: statusFromBoolean(safety.canPromoteOrDemoteRoute, 'error', 'locked') },
    { label: '自动升实盘', value: boolLabel(safety.autoPromotionAllowed), status: statusFromBoolean(safety.autoPromotionAllowed, 'error', 'locked') },
    { label: '需要人工执行', value: boolLabel(safety.manualExecutionRequired), status: statusFromBoolean(safety.manualExecutionRequired) },
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
    { label: '模拟信号', value: shadowSignalRows.length, hint: '近 30 天' },
    { label: '模拟结果', value: shadowOutcomeRows.length, hint: '已标注样本' },
    { label: '交易记录', value: tradeRows.length + closeRows.length, hint: '流水 + 平仓' },
    { label: '研究记录', value: evaluationRows, hint: '策略 + 行情环境' },
    { label: '胜率', value: formatPercent(winRate), hint: '研究统计' },
    { label: 'Profit Factor', value: pf === null ? UNKNOWN : formatNumber(pf, 2), hint: '统计 / 推算' },
    { label: '已实现盈亏', value: realized === null ? UNKNOWN : formatNumber(realized, 2), hint: '统计 / 平仓' },
    { label: '人工 Alpha', value: rows(state.manualAlpha).length, hint: '研究线索' },
  ];
}

export function buildResearchStatsSummary(state) {
  const stats = dataOf(state.stats);
  return [
    { label: '状态', value: firstValue(stats, ['status', 'state', 'research_status'], '已读取'), status: firstValue(stats, ['status', 'state'], 'ok') },
    { label: '更新时间', value: latestTimestamp(stats, [state.statsLedger]) },
    { label: '品种数', value: firstValue(stats, ['symbols', 'symbol_count', 'symbolCount'], UNKNOWN) },
    { label: '总交易数', value: firstValue(stats, ['total_trades', 'totalTrades', 'trades', 'trade_count'], rows(state.tradeJournal).length + rows(state.closeHistory).length) },
    { label: '胜率', value: formatPercent(firstValue(stats, ['win_rate', 'winRate', 'trade_win_rate', 'tradeWinRate'], null)) },
    { label: 'Profit Factor', value: formatNumber(firstValue(stats, ['profit_factor', 'profitFactor', 'pf'], inferProfitFactor(state.closeHistory)), 2) },
    { label: '期望值', value: formatNumber(firstValue(stats, ['expectancy', 'avg_expectancy', 'averageExpectancy'], UNKNOWN), 2) },
    { label: '最大回撤', value: formatNumber(firstValue(stats, ['max_drawdown', 'maxDrawdown', 'drawdown'], UNKNOWN), 2) },
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
    { label: '信号数', value: signalRows.length, status: signalRows.length ? 'ok' : 'warn' },
    { label: '结果数', value: outcomeRows.length, status: outcomeRows.length ? 'ok' : 'warn' },
    { label: '候选数', value: candidateRows.length, status: candidateRows.length ? 'ok' : 'warn' },
    { label: '被阻断信号', value: blocked },
    { label: 'BUY / SELL', value: `${buys} / ${sells}` },
    { label: '正收益结果', value: wins },
    { label: '最新信号', value: latestTimestamp(null, [signalRows]) },
    { label: '研究模式', value: '模拟证据', status: 'locked' },
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
    { label: '平仓记录', value: closeRows.length, status: closeRows.length ? 'ok' : 'warn' },
    { label: '流水记录', value: journalRows.length, status: journalRows.length ? 'ok' : 'warn' },
    { label: '盈利 / 亏损', value: `${wins} / ${losses}` },
    { label: '已实现盈亏', value: formatNumber(realizedPnl, 2) },
    { label: '净点数', value: formatNumber(pips, 1) },
    { label: '推算 PF', value: inferProfitFactor(closeRows) },
    { label: '最新交易', value: latestTimestamp(null, [closeRows, journalRows]) },
    { label: '执行控制', value: '前端无执行入口', status: 'locked' },
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
    { label: '策略评估记录', value: strategyRows.length, status: strategyRows.length ? 'ok' : 'warn' },
    { label: '行情环境记录', value: regimeRows.length, status: regimeRows.length ? 'ok' : 'warn' },
    { label: '统计流水记录', value: statsRows.length, status: statsRows.length ? 'ok' : 'warn' },
    { label: '人工 Alpha 记录', value: manualRows.length, status: manualRows.length ? 'ok' : 'warn' },
    { label: '最佳策略', value: firstValue(bestStrategy, ['route', 'strategy', 'name', 'symbol'], UNKNOWN) },
    { label: '最佳策略 PF', value: formatNumber(firstValue(bestStrategy, ['profit_factor', 'profitFactor', 'pf'], UNKNOWN), 2) },
    { label: '最佳行情环境', value: firstValue(bestRegime, ['regime', 'name', 'market_regime', 'marketRegime'], UNKNOWN) },
    { label: '最新评估', value: latestTimestamp(null, [strategyRows, regimeRows, statsRows]) },
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
