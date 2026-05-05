import { formatCurrencyDisplay, formatDisplayValue, humanizeStatus } from '../../utils/displayText.js';

function isObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function pick(source, paths, fallback = null) {
  for (const path of paths) {
    const value = String(path)
      .split('.')
      .reduce((cursor, part) => (cursor == null ? undefined : cursor[part]), source);
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return fallback;
}

function unwrap(payload) {
  if (!isObject(payload)) return payload;
  if (isObject(payload.data) && Object.keys(payload.data).length) return payload.data;
  if (isObject(payload.result) && Object.keys(payload.result).length) return payload.result;
  return payload;
}

export function rowsFromPayload(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data?.rows)) return payload.data.rows;
  if (Array.isArray(payload?.rows)) return payload.rows;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.result)) return payload.result;
  if (Array.isArray(payload?.positions)) return payload.positions;
  if (Array.isArray(payload?.positions?.items)) return payload.positions.items;
  if (Array.isArray(payload?.orders)) return payload.orders;
  if (Array.isArray(payload?.orders?.items)) return payload.orders.items;
  if (Array.isArray(payload?.symbols)) return payload.symbols;
  if (Array.isArray(payload?.symbols?.items)) return payload.symbols.items;
  if (Array.isArray(payload?.data?.positions)) return payload.data.positions;
  if (Array.isArray(payload?.data?.positions?.items)) return payload.data.positions.items;
  if (Array.isArray(payload?.data?.orders)) return payload.data.orders;
  if (Array.isArray(payload?.data?.orders?.items)) return payload.data.orders.items;
  if (Array.isArray(payload?.data?.symbols)) return payload.data.symbols;
  if (Array.isArray(payload?.data?.symbols?.items)) return payload.data.symbols.items;
  return [];
}

function present(value) {
  if (Array.isArray(value)) return value.length > 0;
  if (isObject(value)) return Object.keys(value).length > 0;
  return value !== undefined && value !== null && value !== '';
}

function format(value) {
  return formatDisplayValue(value);
}

function asSummary(payload) {
  const value = unwrap(payload);
  if (isObject(value?.summary)) return value.summary;
  if (isObject(value)) return value;
  return {};
}

function numberValue(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function formatAccountAmount(value, currency = 'USC') {
  const numeric = numberValue(value);
  if (numeric === null) return format(value);
  const code = String(currency || '').toUpperCase();
  if (code === 'USC' || code === '—' || code === '-') return numeric.toFixed(2);
  return formatCurrencyDisplay(numeric, code || 'USD');
}

function formatAccountWithCurrency(value, currency = 'USC') {
  const amount = formatAccountAmount(value, currency);
  const code = String(currency || '').trim();
  if (amount === '—') return amount;
  if (!code || code === '—' || code === '-') return amount;
  return `${amount} ${code}`.trim();
}

function boolLike(value, trueStatus = 'ok', falseStatus = 'warn') {
  if (value === true || value === 'true' || value === 1 || value === '1' || value === 'yes')
    return trueStatus;
  if (value === false || value === 'false' || value === 0 || value === '0' || value === 'no')
    return falseStatus;
  return 'unknown';
}

function safetyEnvelope(raw = {}) {
  const candidates = [
    raw.status?.safety,
    raw.status?.data?.safety,
    raw.snapshot?.safety,
    raw.snapshot?.data?.safety,
    raw.account?.safety,
    raw.positions?.safety,
    raw.orders?.safety,
  ];
  return candidates.find(isObject) || {};
}

export function normalizeMt5Snapshot(raw = {}) {
  const status = unwrap(raw.status) || {};
  const accountEnvelope = unwrap(raw.account) || {};
  const account = isObject(accountEnvelope.account) ? accountEnvelope.account : accountEnvelope;
  const snapshot = unwrap(raw.snapshot) || {};
  const latest = unwrap(raw.latest) || {};
  const runtime = isObject(snapshot.runtime) ? snapshot.runtime : {};
  const positions = rowsFromPayload(raw.positions);
  const orders = rowsFromPayload(raw.orders);
  const symbols = rowsFromPayload(raw.symbols).length
    ? rowsFromPayload(raw.symbols)
    : rowsFromPayload(snapshot.symbols);
  const closeHistory = rowsFromPayload(raw.closeHistory);
  const tradeJournal = rowsFromPayload(raw.tradeJournal);
  const shadowSignals = rowsFromPayload(raw.shadowSignals);
  const shadowOutcomes = rowsFromPayload(raw.shadowOutcomes);
  const shadowCandidates = rowsFromPayload(raw.shadowCandidates);
  const shadowCandidateOutcomes = rowsFromPayload(raw.shadowCandidateOutcomes);
  const safety = safetyEnvelope(raw);
  const researchSummary = asSummary(raw.researchStats);
  const governanceSummary = asSummary(raw.governanceAdvisor);

  const bridgeStatus = pick(
    { status, raw },
    ['status.status', 'status.bridge_status', 'status.connected', 'raw.status.ok'],
    present(raw.status) ? 'available' : 'missing',
  );

  return {
    latest,
    runtime,
    bridgeStatus,
    terminal: pick(
      { status, snapshot },
      ['status.terminal', 'status.terminal_name', 'snapshot.terminal'],
      '—',
    ),
    server: pick(
      { account, status, snapshot },
      ['account.server', 'account.trade_server', 'status.server', 'snapshot.server'],
      '—',
    ),
    login: pick({ account, snapshot }, ['account.login', 'account.account', 'snapshot.account.login'], '—'),
    balance: pick({ account, snapshot }, ['account.balance', 'snapshot.account.balance'], null),
    equity: pick({ account, snapshot }, ['account.equity', 'snapshot.account.equity'], null),
    margin: pick({ account, snapshot }, ['account.margin', 'snapshot.account.margin'], null),
    freeMargin: pick(
      { account, snapshot },
      [
        'account.free_margin',
        'account.margin_free',
        'account.marginFree',
        'snapshot.account.free_margin',
        'snapshot.account.marginFree',
      ],
      null,
    ),
    currency: pick({ account, snapshot }, ['account.currency', 'snapshot.account.currency'], 'USC'),
    positions,
    orders,
    symbols,
    closeHistory,
    tradeJournal,
    shadowSignals,
    shadowOutcomes,
    shadowCandidates,
    shadowCandidateOutcomes,
    dailyReview: raw.dailyReview || {},
    dailyAutopilot: raw.dailyAutopilot || {},
    researchStats: raw.researchStats || {},
    governanceAdvisor: raw.governanceAdvisor || {},
    researchSummary,
    governanceSummary,
    safety,
    readOnly: pick(
      { safety, status },
      ['safety.readOnly', 'safety.read_only', 'status.readOnly', 'status.read_only'],
      true,
    ),
    orderSendAllowed: pick({ safety }, ['safety.orderSendAllowed', 'safety.order_send_allowed'], false),
    closeAllowed: pick({ safety }, ['safety.closeAllowed', 'safety.close_allowed'], false),
    cancelAllowed: pick({ safety }, ['safety.cancelAllowed', 'safety.cancel_allowed'], false),
    credentialStorageAllowed: pick(
      { safety },
      ['safety.credentialStorageAllowed', 'safety.credential_storage_allowed'],
      false,
    ),
    livePresetMutationAllowed: pick(
      { safety },
      ['safety.livePresetMutationAllowed', 'safety.live_preset_mutation_allowed'],
      false,
    ),
    tradeStatus: pick(
      { runtime, snapshot, latest },
      ['runtime.tradeStatus', 'snapshot.tradeStatus', 'latest.tradeStatus'],
      '—',
    ),
    livePilotMode: pick({ runtime, latest }, ['runtime.livePilotMode', 'latest.livePilotMode'], false),
    tradeAllowed: pick({ runtime }, ['runtime.tradeAllowed', 'runtime.terminalTradeAllowed'], false),
    executionEnabled: pick({ runtime }, ['runtime.executionEnabled'], false),
    killSwitch: pick({ runtime }, ['runtime.pilotKillSwitch'], false),
    startupGuardActive: pick({ runtime }, ['runtime.pilotStartupEntryGuardActive'], false),
    rsiRoute: pick(
      { latest },
      ['latest.strategies.RSI_Reversal', 'latest.symbols.0.strategies.RSI_Reversal'],
      {},
    ),
    strategies: pick({ latest }, ['latest.strategies', 'latest.symbols.0.strategies'], {}),
    eaTradeReady: Boolean(
      pick({ runtime }, ['runtime.tradeAllowed'], false) &&
      pick({ runtime }, ['runtime.executionEnabled'], false) &&
      !pick({ runtime }, ['runtime.pilotKillSwitch'], false) &&
      !pick({ runtime }, ['runtime.pilotStartupEntryGuardActive'], false),
    ),
  };
}

function asNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatSignedNumber(value, digits = 1) {
  const numeric = asNumber(value);
  if (numeric === null) return '—';
  const sign = numeric > 0 ? '+' : '';
  return `${sign}${numeric.toFixed(digits)}`;
}

function formatPct(value, digits = 1) {
  const numeric = asNumber(value);
  if (numeric === null) return '—';
  return `${numeric.toFixed(digits)}%`;
}

function sideLabel(value) {
  const text = String(value || '').toUpperCase();
  if (text.includes('BUY') || text.includes('LONG')) return '做多';
  if (text.includes('SELL') || text.includes('SHORT')) return '做空';
  if (text.includes('NONE')) return '无方向';
  return humanizeStatus(value || '—');
}

function translateOutcome(value) {
  const text = String(value || '').toUpperCase();
  if (text.includes('LOSS')) return '亏损';
  if (text.includes('WIN') || text.includes('PROFIT')) return '盈利';
  if (text.includes('LONG_OPPORTUNITY')) return '多头机会';
  if (text.includes('SHORT_OPPORTUNITY')) return '空头机会';
  if (text.includes('OBSERVED')) return '观察';
  return humanizeStatus(value || '—');
}

function routeEnabled(snapshot, key) {
  const route = snapshot.strategies?.[key] || {};
  return Boolean(route.enabled && route.active);
}

function routeMode(snapshot, key) {
  const route = snapshot.strategies?.[key] || {};
  if (!route.enabled || !route.active) return '未运行';
  if (Number(route.riskMultiplier || 0) > 0) return '实盘观察';
  if (
    route.candidate ||
    route.simulation ||
    /candidate|shadow|sim/i.test(String(route.state || route.reason || ''))
  ) {
    return '模拟候选';
  }
  return '只读观察';
}

export function buildMt5Metrics(snapshot) {
  const rsiEnabled = Boolean(snapshot.rsiRoute?.enabled && snapshot.rsiRoute?.active);
  return [
    {
      label: 'EA交易状态',
      value: snapshot.eaTradeReady ? '可按守门入场' : '等待守门条件',
      hint: humanizeStatus(snapshot.tradeStatus),
    },
    {
      label: 'RSI实盘路线',
      value: rsiEnabled ? '开启' : '未开启',
      hint: snapshot.rsiRoute?.reason || 'USDJPY 0.01 手',
    },
    {
      label: '账户净值',
      value: formatAccountAmount(snapshot.equity, snapshot.currency),
      hint: snapshot.currency,
    },
    {
      label: '账户余额',
      value: formatAccountAmount(snapshot.balance, snapshot.currency),
      hint: snapshot.server,
    },
    { label: '当前持仓', value: snapshot.positions.length, hint: '实盘账户' },
    { label: '历史成交', value: snapshot.closeHistory.length, hint: '平仓记录' },
  ];
}

export function buildSafetyItems(snapshot) {
  const rsiEnabled = Boolean(snapshot.rsiRoute?.enabled && snapshot.rsiRoute?.active);
  return [
    {
      label: '前端数据桥',
      value: snapshot.readOnly ? '只读观察' : '状态待确认',
      status: boolLike(snapshot.readOnly, 'ok', 'warn'),
    },
    {
      label: 'EA交易权限',
      value: snapshot.eaTradeReady ? '可按守门规则入场' : '当前不入场',
      status: snapshot.eaTradeReady ? 'ok' : 'warn',
    },
    {
      label: 'RSI实盘路线',
      value: rsiEnabled ? '保留实盘观察' : '未开启',
      status: rsiEnabled ? 'ok' : 'warn',
    },
    {
      label: '熔断保护',
      value: snapshot.killSwitch ? '熔断中' : '未触发',
      status: snapshot.killSwitch ? 'error' : 'ok',
    },
    {
      label: '前端下单',
      value: snapshot.orderSendAllowed ? '允许' : '禁止',
      status: snapshot.orderSendAllowed ? 'error' : 'ok',
    },
    {
      label: '前端平仓',
      value: snapshot.closeAllowed ? '允许' : '禁止',
      status: snapshot.closeAllowed ? 'error' : 'ok',
    },
    {
      label: '前端撤单',
      value: snapshot.cancelAllowed ? '允许' : '禁止',
      status: snapshot.cancelAllowed ? 'error' : 'ok',
    },
    {
      label: '保存凭据',
      value: snapshot.credentialStorageAllowed ? '允许' : '禁止',
      status: snapshot.credentialStorageAllowed ? 'error' : 'ok',
    },
    {
      label: '修改实盘配置',
      value: snapshot.livePresetMutationAllowed ? '允许' : '禁止',
      status: snapshot.livePresetMutationAllowed ? 'error' : 'ok',
    },
  ];
}

export function buildMt5SimulationItems(snapshot) {
  const summary = snapshot.dailyReview?.summary || {};
  const iteration = snapshot.dailyReview?.dailyIteration || {};
  const strategyQueue = rowsFromPayload(iteration.strategyIterationQueue);
  const evidenceQueue = rowsFromPayload(iteration.evidenceIterationQueue);
  const findings = rowsFromPayload(iteration.findings);
  const hasNoTradeFinding = findings.some((row) => row.code === 'PARAMLAB_NO_TRADE_TESTER_WINDOWS');
  const liveUniverse =
    snapshot.researchSummary.liveUniverseLabel ||
    snapshot.researchSummary.liveUniverse?.join(', ') ||
    'USDJPYc';
  const shadowUniverse =
    snapshot.researchSummary.shadowResearchUniverseLabel ||
    snapshot.researchSummary.shadowResearchUniverse?.join(', ') ||
    'USDJPYc, EURUSDc, XAUUSDc';
  const queue = rowsFromPayload(snapshot.dailyReview?.actionQueue);
  const completed = rowsFromPayload(snapshot.dailyReview?.completedActionQueue);
  const queuedText = queue.length
    ? `${queue.length} 个任务等待 ${summary.nextTesterWindowLabel || '测试窗口'}`
    : completed.length
      ? `${completed.length} 个任务已完成，暂无新队列`
      : '暂无待跑任务';
  const chanlunInQueue = [...queue, ...completed].some((row) =>
    /chanlun|缠论|macd_td/i.test(
      String(row.candidateId || row.strategy || row.routeKey || row.summary || ''),
    ),
  );
  const chanlunSeenInRuntime = snapshot.governanceSummary.strategyVersionCount
    ? chanlunInQueue
      ? '已进入待办/回测队列'
      : '研究库已接入，尚未进入 MT5 模拟队列'
    : '未发现运行证据';

  return [
    {
      label: '实盘Universe',
      value: liveUniverse,
      hint: 'EA 只允许这组品种进入实盘守门',
    },
    {
      label: '当前实盘策略',
      value: routeEnabled(snapshot, 'RSI_Reversal') ? 'RSI 买入侧观察' : '未发现开启策略',
      hint: snapshot.rsiRoute?.reason || '只在 MT5 EA 守门全部通过时自动评估',
      status: routeEnabled(snapshot, 'RSI_Reversal') ? 'ok' : 'warn',
    },
    {
      label: '模拟Universe',
      value: shadowUniverse,
      hint: 'Shadow / candidate / ParamLab 只研究，不会自动进实盘',
    },
    {
      label: '模拟规模',
      value: `${snapshot.shadowSignals.length || snapshot.governanceSummary.shadowRows || 0} 条模拟信号，${snapshot.shadowCandidates.length || snapshot.governanceSummary.candidateRows || 0} 条候选信号`,
      hint: `${snapshot.shadowCandidateOutcomes.length || snapshot.governanceSummary.candidateOutcomeRows || 0} 条候选后验；只做研究账本`,
    },
    {
      label: '今日待办',
      value: queue.length ? '等待测试窗口' : humanizeStatus(summary.todayTodoStatus || '—'),
      hint: queuedText,
      status: queue.length ? 'warn' : 'ok',
    },
    {
      label: '复盘迭代',
      value: hasNoTradeFinding ? '需要调参重跑' : summary.dailyIterationRequired ? '需要复核' : '暂无阻塞',
      hint: hasNoTradeFinding
        ? `今日 tester 已解析但无成交；策略 ${strategyQueue.length} 项、证据 ${evidenceQueue.length} 项待迭代`
        : '只影响模拟和 tester，不修改实盘 preset',
      status: hasNoTradeFinding || summary.dailyIterationRequired ? 'warn' : 'ok',
    },
    {
      label: '策略效果',
      value: `${snapshot.governanceSummary.paramLabResultParsed ?? 0} 份报告已解析`,
      hint: `${snapshot.governanceSummary.versionGatePromoteCandidates ?? 0} 个可升实盘候选`,
    },
    {
      label: '缠论/MACD-TD',
      value: chanlunSeenInRuntime,
      hint: '目前不属于 EA 实盘路线；需要先回测、ParamLab、治理和人工确认',
      status: chanlunInQueue ? 'warn' : 'locked',
    },
  ];
}

function bestOutcomeRows(rows, directionKey) {
  const byEvent = new Map();
  (rows || []).forEach((row, index) => {
    const eventId = pick(row, ['EventId', 'eventId', 'id'], `row-${index}`);
    const direction = String(pick(row, [directionKey], '') || '').toUpperCase();
    if (
      !direction.includes('BUY') &&
      !direction.includes('SELL') &&
      !direction.includes('LONG') &&
      !direction.includes('SHORT')
    ) {
      return;
    }
    const horizon = asNumber(pick(row, ['HorizonMinutes', 'horizonMinutes'], 0)) ?? 0;
    const score = Math.abs(horizon - 60);
    const current = byEvent.get(eventId);
    if (!current || score < current.score || (score === current.score && horizon > current.horizon)) {
      byEvent.set(eventId, { row, score, horizon, index });
    }
  });
  return [...byEvent.values()]
    .sort((left, right) => {
      const lt = rowTimeMs(left.row, ['OutcomeLabelTimeLocal', 'LabelTimeLocal', 'EventBarTime']);
      const rt = rowTimeMs(right.row, ['OutcomeLabelTimeLocal', 'LabelTimeLocal', 'EventBarTime']);
      if (lt !== null && rt !== null && lt !== rt) return rt - lt;
      return right.index - left.index;
    })
    .map((item) => item.row);
}

function outcomePips(row, directionKey) {
  const direction = String(pick(row, [directionKey], '') || '').toUpperCase();
  if (direction.includes('BUY') || direction.includes('LONG')) {
    return asNumber(pick(row, ['LongClosePips', 'longClosePips'], null));
  }
  if (direction.includes('SELL') || direction.includes('SHORT')) {
    return asNumber(pick(row, ['ShortClosePips', 'shortClosePips'], null));
  }
  return null;
}

function routeKey(row) {
  return pick(row, ['CandidateRoute', 'candidateRoute', 'Strategy', 'strategy'], '—');
}

export function buildMt5ShadowSummary(snapshot) {
  const candidateRows = bestOutcomeRows(snapshot.shadowCandidateOutcomes, 'CandidateDirection');
  const pips = candidateRows
    .map((row) => outcomePips(row, 'CandidateDirection'))
    .filter((value) => value !== null);
  const wins = pips.filter((value) => value > 0);
  const losses = pips.filter((value) => value < 0);
  const grossWin = wins.reduce((sum, value) => sum + value, 0);
  const grossLoss = Math.abs(losses.reduce((sum, value) => sum + value, 0));
  const netPips = pips.reduce((sum, value) => sum + value, 0);
  const profitFactor = grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? Infinity : null;
  const winRate = pips.length ? (wins.length / pips.length) * 100 : null;
  const byRoute = new Map();
  candidateRows.forEach((row) => {
    const key = routeKey(row);
    const value = outcomePips(row, 'CandidateDirection') ?? 0;
    const bucket = byRoute.get(key) || { count: 0, netPips: 0, wins: 0 };
    bucket.count += 1;
    bucket.netPips += value;
    if (value > 0) bucket.wins += 1;
    byRoute.set(key, bucket);
  });
  const blockers = new Map();
  (snapshot.shadowSignals || []).forEach((row) => {
    const blocker = humanizeStatus(
      pick(row, ['Blocker', 'blocker', 'SignalStatus', 'signalStatus'], '未分类'),
    );
    blockers.set(blocker, (blockers.get(blocker) || 0) + 1);
  });
  const topRoute = [...byRoute.entries()].sort((a, b) => b[1].count - a[1].count)[0];
  const topBlocker = [...blockers.entries()].sort((a, b) => b[1] - a[1])[0];
  const estimatedUsc = netPips * 0.1;
  return {
    candidateRows,
    pips,
    byRoute,
    blockers,
    metrics: [
      {
        label: '模拟候选样本',
        value: `${candidateRows.length} 笔`,
        hint: '按 60 分钟后验去重，不是真实成交',
      },
      {
        label: '模拟点数净值',
        value: `${formatSignedNumber(netPips, 1)} pips`,
        hint: `0.01 手粗略等价 ${formatSignedNumber(estimatedUsc, 2)} USC`,
      },
      {
        label: '模拟胜率',
        value: formatPct(winRate),
        hint: `${wins.length} 赢 / ${losses.length} 亏`,
      },
      {
        label: '模拟PF',
        value: profitFactor === Infinity ? '∞' : formatSignedNumber(profitFactor, 2).replace(/^\+/, ''),
        hint: '候选信号后验粗算',
      },
      {
        label: '主要路线',
        value: topRoute ? topRoute[0] : '—',
        hint: topRoute
          ? `${topRoute[1].count} 笔 / ${formatSignedNumber(topRoute[1].netPips, 1)} pips`
          : '暂无候选',
      },
      {
        label: '主要阻断',
        value: topBlocker ? topBlocker[0] : '—',
        hint: topBlocker ? `${topBlocker[1]} 条模拟信号` : '暂无阻断记录',
      },
    ],
  };
}

export function buildMt5ShadowEquityRows(snapshot) {
  const rows = bestOutcomeRows(snapshot.shadowCandidateOutcomes, 'CandidateDirection').reverse();
  let equity = 0;
  return rows
    .map((row) => {
      const pips = outcomePips(row, 'CandidateDirection') ?? 0;
      equity += pips;
      return {
        时间: pick(row, ['OutcomeLabelTimeLocal', 'LabelTimeLocal', 'EventBarTime'], '—'),
        品种: pick(row, ['Symbol', 'symbol'], '—'),
        路线: routeKey(row),
        方向: sideLabel(pick(row, ['CandidateDirection'], '—')),
        后验点数: formatSignedNumber(pips, 1),
        模拟净值: formatSignedNumber(equity, 1),
      };
    })
    .reverse();
}

export function buildMt5ShadowTradeRows(snapshot) {
  return bestOutcomeRows(snapshot.shadowCandidateOutcomes, 'CandidateDirection')
    .slice(0, 60)
    .map((row) => {
      const pips = outcomePips(row, 'CandidateDirection');
      return {
        时间: pick(row, ['OutcomeLabelTimeLocal', 'LabelTimeLocal', 'EventBarTime'], '—'),
        品种: pick(row, ['Symbol', 'symbol'], '—'),
        路线: routeKey(row),
        方向: sideLabel(pick(row, ['CandidateDirection'], '—')),
        后验: translateOutcome(pick(row, ['DirectionalOutcome', 'BestOpportunity'], '—')),
        点数盈亏: formatSignedNumber(pips, 1),
        价格: pick(row, ['ReferencePrice', 'referencePrice'], '—'),
      };
    });
}

export function buildMt5ShadowBlockerRows(snapshot) {
  const counts = new Map();
  (snapshot.shadowSignals || []).forEach((row) => {
    const blocker = humanizeStatus(
      pick(row, ['Blocker', 'blocker', 'SignalStatus', 'signalStatus'], '未分类'),
    );
    const key = `${blocker}||${pick(row, ['Strategy', 'strategy'], '—')}`;
    const bucket = counts.get(key) || {
      阻断原因: blocker,
      策略: pick(row, ['Strategy', 'strategy'], '—'),
      次数: 0,
      最近时间: pick(row, ['LabelTimeLocal', 'EventBarTime'], '—'),
    };
    bucket.次数 += 1;
    const current = rowTimeMs({ value: bucket.最近时间 }, ['value']) || 0;
    const next = rowTimeMs(row, ['LabelTimeLocal', 'EventBarTime']) || 0;
    if (next > current) bucket.最近时间 = pick(row, ['LabelTimeLocal', 'EventBarTime'], bucket.最近时间);
    counts.set(key, bucket);
  });
  return [...counts.values()].sort((a, b) => b.次数 - a.次数).slice(0, 20);
}

export function buildMt5RouteModeRows(snapshot) {
  return ['MA_Cross', 'RSI_Reversal', 'BB_Triple', 'MACD_Divergence', 'SR_Breakout'].map((key) => {
    const route = snapshot.strategies?.[key] || {};
    return {
      路线: key,
      当前位置: routeMode(snapshot, key),
      是否实盘: Number(route.riskMultiplier || 0) > 0 ? '是' : '否',
      说明: humanizeStatus(route.reason || route.state || route.blocker || '等待信号'),
    };
  });
}

export function buildAccountItems(snapshot) {
  return [
    { label: '账号', value: snapshot.login },
    { label: '服务器', value: snapshot.server },
    {
      label: '终端',
      value: typeof snapshot.terminal === 'object' ? snapshot.terminal.name || 'HFM MT5' : snapshot.terminal,
    },
    { label: '余额', value: formatAccountWithCurrency(snapshot.balance, snapshot.currency) },
    { label: '净值', value: formatAccountWithCurrency(snapshot.equity, snapshot.currency) },
    { label: '保证金', value: formatAccountWithCurrency(snapshot.margin, snapshot.currency) },
    { label: '可用保证金', value: formatAccountWithCurrency(snapshot.freeMargin, snapshot.currency) },
  ];
}

function compactRow(row, fields) {
  const out = {};
  for (const [label, candidates] of Object.entries(fields)) {
    out[label] = pick(row, candidates, '');
  }
  return out;
}

function parseMt5TimeMs(value) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const text = String(value).trim();
  const match = text.match(/^(\d{4})[./-](\d{2})[./-](\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (match) {
    const parsed = Date.UTC(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3]),
      Number(match[4] || 0),
      Number(match[5] || 0),
      Number(match[6] || 0),
    );
    return Number.isFinite(parsed) ? parsed : null;
  }
  const parsed = Date.parse(text);
  return Number.isFinite(parsed) ? parsed : null;
}

function rowTimeMs(row, keys) {
  for (const key of keys) {
    const value = pick(row, [key], null);
    const parsed = parseMt5TimeMs(value);
    if (parsed !== null) return parsed;
  }
  return null;
}

function latestRows(rows, keys, limit) {
  return [...(rows || [])]
    .map((row, index) => ({ row, index, timeMs: rowTimeMs(row, keys) }))
    .sort((left, right) => {
      if (left.timeMs !== null && right.timeMs !== null && left.timeMs !== right.timeMs) {
        return right.timeMs - left.timeMs;
      }
      if (left.timeMs !== null && right.timeMs === null) return -1;
      if (left.timeMs === null && right.timeMs !== null) return 1;
      return right.index - left.index;
    })
    .slice(0, limit)
    .map((item) => item.row);
}

export function buildPositionRows(snapshot) {
  return snapshot.positions.slice(0, 30).map((row) =>
    compactRow(row, {
      票号: ['ticket', 'position', 'id'],
      品种: ['symbol'],
      方向: ['type', 'side', 'action'],
      手数: ['volume', 'lots'],
      开仓价: ['priceOpen', 'price_open', 'open_price', 'entry_price'],
      当前价: ['priceCurrent', 'price_current', 'current_price'],
      浮盈: ['profit', 'pnl'],
    }),
  );
}

export function buildOrderRows(snapshot) {
  return snapshot.orders.slice(0, 30).map((row) =>
    compactRow(row, {
      票号: ['ticket', 'order', 'id'],
      品种: ['symbol'],
      类型: ['type', 'side', 'action'],
      手数: ['volumeCurrent', 'volume', 'lots'],
      价格: ['priceOpen', 'price_open', 'price', 'entry_price'],
      止损: ['sl', 'stop_loss'],
      止盈: ['tp', 'take_profit'],
    }),
  );
}

export function buildSymbolRows(snapshot) {
  return snapshot.symbols.slice(0, 40).map((row) =>
    compactRow(row, {
      品种: ['symbol', 'name'],
      可见: ['enabled', 'visible', 'selected'],
      点位: ['digits'],
      点差: ['spread', 'spread_float'],
      交易模式: ['trade_mode', 'tradeMode'],
      最小手数: ['volumeMin', 'volume_min', 'min_lot'],
      最大手数: ['volumeMax', 'volume_max', 'max_lot'],
    }),
  );
}

export function buildCloseHistoryRows(snapshot) {
  return latestRows(snapshot.closeHistory, ['CloseTime', 'closeTime', 'OpenTime', 'openTime'], 40).map(
    (row) =>
      compactRow(row, {
        平仓时间: ['CloseTime', 'closeTime'],
        品种: ['Symbol', 'symbol'],
        方向: ['Type', 'type'],
        手数: ['Lots', 'lots'],
        净盈亏: ['NetProfit', 'netProfit', 'profit'],
        策略: ['Strategy', 'strategy'],
        来源: ['Source', 'source'],
        备注: ['Comment', 'comment'],
      }),
  );
}

export function buildTradeJournalRows(snapshot) {
  return latestRows(snapshot.tradeJournal, ['EventTime', 'eventTime', 'Time', 'time'], 40).map((row) =>
    compactRow(row, {
      时间: ['EventTime', 'eventTime'],
      事件: ['EventType', 'eventType'],
      品种: ['Symbol', 'symbol'],
      方向: ['Side', 'side'],
      价格: ['Price', 'price'],
      净盈亏: ['NetProfit', 'netProfit'],
      策略: ['Strategy', 'strategy'],
    }),
  );
}

export function buildMt5TodoRows(snapshot) {
  const queue = rowsFromPayload(snapshot.dailyReview?.actionQueue);
  const completed = rowsFromPayload(snapshot.dailyReview?.completedActionQueue);
  const researchBacklog = rowsFromPayload(snapshot.dailyReview?.researchBacklogQueue);
  const sourceRows = queue.length ? queue : completed;
  if (!sourceRows.length) {
    if (researchBacklog.length) {
      return [
        {
          任务: 'MT5 今日待办',
          路线: '参数实验',
          状态: '已跑完',
          结论: `${researchBacklog.length} 个新候选进入下一轮研究 backlog`,
          测试窗口: snapshot.dailyReview?.summary?.nextTesterWindowLabel || '下一轮刷新',
        },
      ];
    }
    return [{ 任务: 'MT5 今日待办', 状态: '已完成或无待办', 结论: '当前没有阻塞项' }];
  }
  return sourceRows.slice(0, 10).map((row) => ({
    任务: row.candidateId || row.type || '待办任务',
    路线: row.routeKey || row.strategy || '—',
    状态: queue.length ? humanizeStatus(row.state || '待处理') : '已完成',
    结论: humanizeStatus(row.resultStatus || row.statusLabel || '等待报告'),
    测试窗口: row.nextTesterWindowLabel || snapshot.dailyReview?.summary?.nextTesterWindowLabel || '—',
  }));
}

export function buildMt5ReviewRows(snapshot) {
  const pnl = snapshot.dailyReview?.dailyPnl || {};
  const summary = snapshot.dailyReview?.summary || {};
  const iteration = snapshot.dailyReview?.dailyIteration || {};
  const findings = rowsFromPayload(iteration.findings);
  const strategyQueue = rowsFromPayload(iteration.strategyIterationQueue);
  const evidenceQueue = rowsFromPayload(iteration.evidenceIterationQueue);
  const noTradeFinding = findings.find((row) => row.code === 'PARAMLAB_NO_TRADE_TESTER_WINDOWS');
  return [
    {
      项目: '昨日平仓',
      结果: `${pnl.closedTrades ?? summary.dailyClosedTrades ?? 0} 笔 / ${format(pnl.netUSC ?? summary.dailyNetUSC ?? 0)} USC`,
      建议: pnl.requiresReview ? '需要人工复核亏损来源' : '无需新增代码迭代',
    },
    {
      项目: '参数实验',
      结果: `完成 ${summary.dailyTesterCompletedCount || 0} 项 / 延后 ${summary.paramDeferredCount || 0} 项`,
      建议: noTradeFinding
        ? '全部无成交，需隔离 tester 调参重跑'
        : summary.promotionReviewCount
          ? '有升实盘候选需人工确认'
          : '暂无可升实盘项',
    },
    {
      项目: '策略迭代',
      结果: summary.dailyIterationRequired
        ? `策略 ${strategyQueue.length} 项 / 证据 ${evidenceQueue.length} 项`
        : '暂无',
      建议: summary.dailyIterationRequired ? '保持实盘不变，只迭代模拟候选' : '今日无需代码或策略动作',
    },
  ];
}

export function buildEndpointHealth(raw = {}) {
  const hasSnapshot = present(raw.snapshot);
  const hasSymbolRegistry = present(raw.symbols);
  const symbolPayload = hasSymbolRegistry ? raw.symbols : hasSnapshot ? raw.snapshot : raw.symbols;
  const endpoints = [
    ['连接状态', '/api/mt5-readonly/status', raw.status, '终端连接与授权'],
    ['账户快照', '/api/mt5-readonly/account', raw.account, '余额、净值、服务器'],
    ['实时持仓', '/api/mt5-readonly/positions', raw.positions, '当前实盘持仓'],
    ['挂单状态', '/api/mt5-readonly/orders', raw.orders, '当前挂单'],
    [
      '品种状态',
      '/api/mt5-symbol-registry/symbols',
      symbolPayload,
      hasSymbolRegistry ? '实盘与模拟品种池' : '快照可用，登记文件待同步',
    ],
    ['完整快照', '/api/mt5-readonly/snapshot', raw.snapshot, 'EA 快照兜底'],
  ];
  return endpoints.map(([label, endpoint, payload, description]) => ({
    label,
    endpoint,
    description,
    status: present(payload) ? 'ok' : 'warn',
    statusLabel: present(payload) ? '正常' : '待同步',
  }));
}
