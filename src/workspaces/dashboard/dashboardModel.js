import { formatDisplayValue, humanizeStatus } from '../../utils/displayText.js';

const PATH_SETS = {
  runtimeState: [
    'latest.runtime_state',
    'latest.state',
    'state.runtime_state',
    'state.status',
    'state.data.runtime_state',
    'state.data.status',
  ],
  updatedAt: [
    'latest.timestamp',
    'latest.updated_at',
    'state.timestamp',
    'state.updated_at',
    'state.data.timestamp',
    'state.data.updated_at',
  ],
  killSwitch: [
    'latest.kill_switch',
    'latest.killSwitch',
    'state.kill_switch',
    'state.killSwitch',
    'state.data.kill_switch',
    'state.data.killSwitch',
  ],
  dryRun: [
    'latest.dry_run',
    'latest.dryRun',
    'state.dry_run',
    'state.dryRun',
    'state.data.dry_run',
    'state.data.dryRun',
  ],
  activeRoute: [
    'latest.active_route',
    'latest.route',
    'state.active_route',
    'state.route',
    'state.data.active_route',
    'state.data.route',
  ],
  dailyPnl: [
    'latest.daily_pnl',
    'latest.pnl.daily',
    'state.daily_pnl',
    'state.pnl.daily',
    'state.data.daily_pnl',
    'state.data.pnl.daily',
  ],
};

function isObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function getPath(source, path) {
  return String(path)
    .split('.')
    .reduce((cursor, part) => (cursor == null ? undefined : cursor[part]), source);
}

function firstValue(source, paths, fallback = null) {
  for (const path of paths) {
    const value = getPath(source, path);
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return fallback;
}

function toArray(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.rows)) return value.rows;
  if (Array.isArray(value?.data?.rows)) return value.data.rows;
  if (Array.isArray(value?.data)) return value.data;
  return [];
}

function present(value) {
  if (Array.isArray(value)) return value.length > 0;
  if (isObject(value)) return Object.keys(value).length > 0;
  return value !== undefined && value !== null && value !== '';
}

function boolStatus(value, truthyLabel = 'active', falseLabel = 'inactive') {
  if (value === true || value === 'true' || value === '1' || value === 1 || value === 'ACTIVE')
    return truthyLabel;
  if (value === false || value === 'false' || value === '0' || value === 0 || value === 'INACTIVE')
    return falseLabel;
  return 'unknown';
}

function formatCompact(value) {
  return formatDisplayValue(value);
}

function numberValue(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function formatMoney(value, currency = 'USC') {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '—';
  return `${numeric.toFixed(2)} ${currency || 'USC'}`;
}

function rowsFromObjectList(value) {
  return toArray(value).filter((row) => row && typeof row === 'object');
}

function dailySummary(raw) {
  return raw?.dailyReview?.summary || raw?.dailyAutopilot?.dailyReviewSummary || {};
}

function dailyPnl(raw) {
  return raw?.dailyReview?.dailyPnl || {};
}

function latestAccount(raw) {
  return raw?.latest?.account || raw?.mt5Snapshot?.account || {};
}

function mt5Positions(raw) {
  const direct = rowsFromObjectList(raw?.latest?.openTrades);
  if (direct.length) return direct;
  return rowsFromObjectList(raw?.mt5Snapshot?.positions);
}

function polymarketRows(raw) {
  const radarRows = rowsFromObjectList(raw?.polyRadar?.radar || raw?.polyRadar);
  if (radarRows.length) return radarRows;
  return rowsFromObjectList(raw?.polyMarkets?.marketCatalog || raw?.polyMarkets?.markets || raw?.polyMarkets);
}

function chooseRoutes(raw) {
  const candidates = [
    raw?.latest?.routes,
    raw?.latest?.route_watchlist,
    raw?.state?.routes,
    raw?.state?.route_watchlist,
    raw?.state?.data?.routes,
    raw?.state?.data?.route_watchlist,
    raw?.backtest?.routes,
    raw?.backtest?.data?.routes,
  ];
  for (const candidate of candidates) {
    const rows = toArray(candidate);
    if (rows.length) return rows;
  }
  return [];
}

export function normalizeDashboardSnapshot(raw = {}) {
  const runtimeState = firstValue(
    raw,
    PATH_SETS.runtimeState,
    present(raw.latest) || present(raw.state) ? 'available' : 'missing',
  );
  const killSwitch = firstValue(raw, PATH_SETS.killSwitch, null);
  const dryRun = firstValue(raw, PATH_SETS.dryRun, null);
  const activeRoute = firstValue(raw, PATH_SETS.activeRoute, '—');
  return {
    runtimeState,
    updatedAt: firstValue(raw, PATH_SETS.updatedAt, '—'),
    killSwitchStatus: boolStatus(killSwitch, 'blocked', 'ok'),
    killSwitchLabel: killSwitch === null ? 'unknown' : formatCompact(killSwitch),
    dryRunStatus: boolStatus(dryRun, 'locked', 'ok'),
    dryRunLabel: dryRun === null ? 'unknown' : formatCompact(dryRun),
    activeRoute,
    dailyPnl: firstValue(raw, PATH_SETS.dailyPnl, '—'),
    backtestAvailable: present(raw.backtest),
    dailyReviewAvailable: present(raw.dailyReview),
    dailyAutopilotAvailable: present(raw.dailyAutopilot),
    routes: chooseRoutes(raw),
    account: latestAccount(raw),
    positions: mt5Positions(raw),
    dailySummary: dailySummary(raw),
    dailyPnlEvidence: dailyPnl(raw),
    polymarketRows: polymarketRows(raw),
    autopilotStatus: raw?.dailyAutopilot?.status || '—',
  };
}

export function buildDashboardMetrics(snapshot) {
  const currency = snapshot.account?.currency || 'USC';
  const balance = numberValue(snapshot.account?.balance ?? snapshot.account?.equity, null);
  const equity = numberValue(snapshot.account?.equity, null);
  const polyCount = snapshot.polymarketRows?.length || 0;
  return [
    {
      label: '账户净值',
      value: equity === null ? '—' : formatMoney(equity, currency),
      hint: snapshot.account?.server || 'HFM MT5',
    },
    {
      label: '账户余额',
      value: balance === null ? '—' : formatMoney(balance, currency),
      hint: snapshot.account?.number || snapshot.account?.login || '实时快照',
    },
    { label: '当前持仓', value: snapshot.positions?.length || 0, hint: 'MT5 实盘快照' },
    {
      label: '今日净值',
      value: formatMoney(snapshot.dailyPnlEvidence?.netUSC ?? snapshot.dailyPnl, 'USC'),
      hint: '每日复盘',
    },
    {
      label: '今日待办',
      value: snapshot.dailySummary?.todayTodoStatus === 'DONE_OR_NO_ACTIONS' ? '已完成' : '待处理',
      hint: `${snapshot.dailySummary?.paramReadyToRunCount || 0} 可运行 / ${snapshot.dailySummary?.polymarketTodoCount || 0} 预测市场`,
    },
    { label: '市场雷达', value: polyCount, hint: '预测市场研究候选' },
  ];
}

export function buildEndpointHealth(raw = {}) {
  const endpoints = [
    ['MT5 实时快照', '/api/latest', raw.latest, '账户、行情、策略运行状态'],
    ['每日复盘', '/api/daily-review', raw.dailyReview, 'MT5 与 Polymarket 的日终结论'],
    ['今日自动闭环', '/api/daily-autopilot', raw.dailyAutopilot, '今日待办执行、报告回灌和复盘'],
    ['MT5 只读桥', '/api/mt5-readonly/snapshot', raw.mt5Snapshot, '持仓、报价、账户只读快照'],
    ['预测市场雷达', '/api/polymarket/radar', raw.polyRadar, '公开市场雷达与流动性证据'],
    ['策略回测摘要', '/api/dashboard/backtest-summary', raw.backtest, '候选策略研究结果'],
  ];
  return endpoints.map(([label, endpoint, payload, description]) => ({
    label,
    endpoint,
    description,
    status: present(payload) ? 'ok' : 'warn',
    statusLabel: present(payload) ? '正常' : '缺失',
  }));
}

export function buildRuntimeItems(snapshot) {
  return [
    {
      label: '运行状态',
      value: humanizeStatus(snapshot.runtimeState),
      status: snapshot.runtimeState === 'missing' ? 'warn' : 'ok',
    },
    { label: '更新时间', value: snapshot.updatedAt },
    { label: '熔断保护', value: humanizeStatus(snapshot.killSwitchLabel), status: snapshot.killSwitchStatus },
    { label: '模拟保护', value: humanizeStatus(snapshot.dryRunLabel), status: snapshot.dryRunStatus },
    { label: '当前路线', value: formatCompact(snapshot.activeRoute) },
  ];
}

export function buildDailyItems(snapshot) {
  return [
    {
      label: '每日复盘',
      value: snapshot.dailyReviewAvailable ? '已生成' : '缺失',
      status: snapshot.dailyReviewAvailable ? 'ok' : 'warn',
    },
    {
      label: '今日自动闭环',
      value: snapshot.dailyAutopilotAvailable ? snapshot.autopilotStatus : '缺失',
      status: snapshot.dailyAutopilotAvailable ? 'ok' : 'warn',
    },
    {
      label: '策略回测摘要',
      value: snapshot.backtestAvailable ? '已同步' : '缺失',
      status: snapshot.backtestAvailable ? 'ok' : 'warn',
    },
  ];
}

export function buildRouteRows(snapshot) {
  return snapshot.routes.slice(0, 8).map((route, index) => ({
    id: route.id || route.route || route.name || `route-${index}`,
    route: route.route || route.name || route.strategy || `路线 ${index + 1}`,
    status: route.status || route.decision || route.state || 'unknown',
    score: formatCompact(route.score ?? route.confidence ?? route.pf ?? route.profit_factor),
    note: route.note || route.reason || route.reasoning || route.next_step || '',
  }));
}

export function buildDailyTodoRows(raw = {}) {
  const summary = dailySummary(raw);
  const queue = rowsFromObjectList(raw?.dailyReview?.actionQueue);
  const completed = rowsFromObjectList(raw?.dailyReview?.completedActionQueue);
  const polyRows = polymarketRows(raw);
  const rows = [];

  queue.slice(0, 8).forEach((item) => {
    rows.push({
      领域: item.routeKey || item.strategy ? 'MT5 / 参数实验' : '全局',
      任务: item.candidateId || item.type || '待处理任务',
      状态: item.state || item.statusLabel || '待处理',
      结论: item.resultStatus || item.guardClass || item.statusLabel || '等待执行',
    });
  });

  if (!rows.length && completed.length) {
    completed.slice(0, 5).forEach((item) => {
      rows.push({
        领域: item.routeKey || item.strategy ? 'MT5 / 参数实验' : '全局',
        任务: item.candidateId || item.type || '已处理任务',
        状态: '已完成',
        结论: item.resultStatus || item.statusLabel || '报告已回灌',
      });
    });
  }

  if (Number(summary.polymarketTodoCount || 0) > 0 || summary.polymarketLossQuarantine) {
    rows.push({
      领域: '预测市场',
      任务: Number(summary.polymarketTodoCount || 0) > 0 ? '研究待办与亏损来源复查' : '亏损隔离保持',
      状态:
        Number(summary.polymarketTodoCount || 0) > 0 ? `${summary.polymarketTodoCount} 项待处理` : '已隔离',
      结论: `实盘 PF ${formatCompact(summary.polymarketExecutedPF)} / 模拟 PF ${formatCompact(summary.polymarketShadowPF)}`,
    });
  } else if (polyRows.length) {
    rows.push({
      领域: '预测市场',
      任务: '市场雷达与亏损来源观察',
      状态: `已同步 ${polyRows.length} 个候选`,
      结论: '只读研究，不自动下注',
    });
  }

  if (!rows.length) {
    rows.push({
      领域: '全系统',
      任务: '今日待办',
      状态: summary.todayTodoStatus === 'DONE_OR_NO_ACTIONS' ? '已完成' : '暂无动作',
      结论: 'MT5 与预测市场今日没有未处理阻塞项',
    });
  }
  return rows.slice(0, 10);
}

export function buildDailyReviewRows(raw = {}) {
  const summary = dailySummary(raw);
  const pnl = dailyPnl(raw);
  const steps = rowsFromObjectList(raw?.dailyAutopilot?.steps);
  const polyRows = polymarketRows(raw);
  const polyStep = steps.find((step) => step.name === 'polymarket_readonly_cycle');
  const testerTimeout = steps.find(
    (step) => step.name === 'auto_tester_guarded_run' && step.status === 'TIMEOUT',
  );
  return [
    {
      领域: 'MT5',
      复盘: `${pnl.date || summary.dailyReviewDateJst || '今日'} 平仓 ${pnl.closedTrades ?? summary.dailyClosedTrades ?? 0} 笔`,
      结果: formatMoney(pnl.netUSC ?? summary.dailyNetUSC ?? 0, 'USC'),
      建议: pnl.requiresReview ? '需要人工复核亏损来源' : '当前无新增亏损复核',
    },
    {
      领域: '参数实验',
      复盘: `完成 ${summary.dailyTesterCompletedCount || 0} 项 / 延后 ${summary.paramDeferredCount || 0} 项`,
      结果: summary.dailyTesterBudgetDone ? '预算已完成' : '仍有待办',
      建议: summary.promotionReviewCount ? '存在升实盘复核候选' : '暂无可自动升实盘项',
    },
    {
      领域: '预测市场',
      复盘: polyStep?.status === 'OK' ? '研究循环已执行' : '研究循环待确认',
      结果:
        summary.polymarketExecutedPF || summary.polymarketShadowPF
          ? `实盘 PF ${formatCompact(summary.polymarketExecutedPF)} / 模拟 PF ${formatCompact(summary.polymarketShadowPF)}`
          : `雷达候选 ${polyRows.length} 条`,
      建议: summary.polymarketLossQuarantine ? '保持亏损隔离，不自动下注' : '继续只读研究',
    },
    {
      领域: '自动闭环',
      复盘: raw?.dailyAutopilot?.status || '—',
      结果: testerTimeout ? '测试器运行超时但后续报告已回灌' : '闭环完成',
      建议: summary.dailyIterationRequired ? '需要代码或策略迭代' : '今日无需代码变更',
    },
  ];
}
