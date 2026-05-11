import {
  compactDisplay,
  formatDisplayValue,
  formatCurrencyDisplay,
  humanizeStatus,
} from '../../utils/displayText.js';

const POLYMARKET_ENDPOINTS = [
  { key: 'search', label: '搜索结果', endpoint: '/api/polymarket/search', description: '关键词市场检索' },
  { key: 'radar', label: '执行雷达', endpoint: '/api/polymarket/radar', description: '机会评分与隔离证据' },
  {
    key: 'worker',
    label: '雷达后台',
    endpoint: '/api/polymarket/radar-worker',
    description: '本地只读扫描任务',
  },
  { key: 'aiScore', label: 'AI 评分', endpoint: '/api/polymarket/ai-score', description: '只读分析与建议' },
  {
    key: 'history',
    label: '历史复盘',
    endpoint: '/api/polymarket/history',
    description: '历史表现和亏损来源',
  },
  {
    key: 'autoGovernance',
    label: '自动治理',
    endpoint: '/api/polymarket/auto-governance',
    description: '隔离与复核状态',
  },
  {
    key: 'canary',
    label: '模拟合约',
    endpoint: '/api/polymarket/canary-executor-contract',
    description: '禁止真实下注的合约检查',
  },
  {
    key: 'canaryRun',
    label: '模拟执行',
    endpoint: '/api/polymarket/canary-executor-run',
    description: '模拟验证记录',
  },
  {
    key: 'realTrades',
    label: '真实交易证据',
    endpoint: '/api/polymarket/real-trades',
    description: '只读交易证据回放',
  },
  {
    key: 'cross',
    label: '跨市场联动',
    endpoint: '/api/polymarket/cross-linkage',
    description: 'MT5 与事件市场关联',
  },
  {
    key: 'markets',
    label: '市场金额',
    endpoint: '/api/polymarket/markets',
    description: '流动性、成交量和概率',
  },
  {
    key: 'assets',
    label: '资产候选',
    endpoint: '/api/polymarket/asset-opportunities',
    description: '候选资产观察池',
  },
  {
    key: 'singleAnalysis',
    label: '单市场分析',
    endpoint: '/api/polymarket/single-market-analysis',
    description: '单个市场的中文复盘',
  },
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
    value.radar,
    value.marketCatalog,
    value.markets,
    value.assetOpportunities,
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

function summaryObject(payload) {
  const value = unwrap(payload);
  if (value?.summary && typeof value.summary === 'object') return value.summary;
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

function formatUsd(value, digits = 2) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '—';
  return `$${number.toLocaleString('zh-CN', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
}

function formatSignedUsd(value, digits = 2) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '—';
  const sign = number > 0 ? '+' : number < 0 ? '-' : '';
  return `${sign}${formatUsd(Math.abs(number), digits)}`;
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

function friendlyStatusLabel(payload) {
  const status = inferStatus(payload);
  if (status === 'ok') return '正常';
  if (status === 'warn') return '待确认';
  if (status === 'error') return '异常';
  return '未同步';
}

function friendlyModeLabel(payload) {
  const raw = String(statusLabel(payload) || '').toLowerCase();
  if (!raw || raw === 'unknown') return friendlyStatusLabel(payload);
  if (raw.includes('missing_db') || raw.includes('missing')) return '待同步';
  if (raw.includes('readonly') || raw.includes('read_only')) return '只读';
  if (raw.includes('dry') || raw.includes('canary') || raw.includes('shadow')) return '模拟观察';
  if (raw.includes('ok') || raw.includes('ready') || raw.includes('available')) return '正常';
  if (raw.includes('blocked') || raw.includes('quarantine')) return '隔离中';
  if (raw.includes('error') || raw.includes('fail')) return '异常';
  return friendlyStatusLabel(payload);
}

function friendlyText(value, fallback = '—') {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'object') return formatDisplayValue(value);
  const translated = humanizeStatus(value, null);
  if (translated && translated !== value) return translated;
  const raw = String(value);
  const normalized = raw.toLowerCase();
  if (normalized.includes('keep_dry_run') || normalized.includes('dry_run')) {
    return '保持只读研究，等待策略通过';
  }
  if (normalized.includes('missing_db') || normalized.includes('missing')) return '待同步';
  if (normalized.includes('quarantine')) return '隔离中';
  if (normalized.includes('blocked')) return '已阻断';
  if (normalized.includes('readonly') || normalized.includes('read_only')) return '只读';
  if (normalized.includes('shadow') || normalized.includes('canary')) return '模拟观察';
  if (normalized.includes('ok') || normalized.includes('available') || normalized.includes('ready'))
    return '正常';
  if (normalized.includes('fail') || normalized.includes('error')) return '异常';
  if (normalized.startsWith('polymarket_')) return '预测市场证据';
  return raw;
}

function walletBalance(payload) {
  const paths = [
    'walletBalanceUSDC',
    'wallet.balanceUSDC',
    'wallet.usdc',
    'globalState.cashUSDC',
    'globalState.walletUSDC',
    'globalState.walletBalanceUSDC',
    'summary.walletBalanceUSDC',
    'summary.walletUSDC',
    'data.walletBalanceUSDC',
    'data.globalState.cashUSDC',
    'data.summary.walletBalanceUSDC',
    'data.wallet.balanceUSDC',
    'polymarket.dailyReview.copyTradingReview.capitalSimulation.accountCashUSDC',
    'dailyReview.copyTradingReview.capitalSimulation.accountCashUSDC',
    'copyTradingReview.capitalSimulation.accountCashUSDC',
  ];
  for (const part of [
    'dailyReview',
    'autoGovernance',
    'realTrades',
    'markets',
    'history',
    'aiScore',
    'worker',
  ]) {
    const value = getPath(payload?.[part], paths, null);
    const numeric = Number(value);
    if (Number.isFinite(numeric)) return numeric;
  }
  return null;
}

function bestScore(payload) {
  const candidates = [
    getPath(payload, ['score', 'ai_score', 'probability', 'confidence', 'edge', 'value_score']),
    ...asRows(payload).flatMap((row) => [
      row.score,
      row.ai_score,
      row.probability,
      row.confidence,
      row.edge,
      row.value_score,
    ]),
  ];
  const nums = candidates.map(Number).filter(Number.isFinite);
  if (!nums.length) return null;
  return Math.max(...nums);
}

function buildSafetyItems() {
  return [
    { label: '研究模式', value: '只读', status: 'ok' },
    { label: 'AI 建议', value: '仅供参考', status: 'ok' },
    { label: '自动下注', value: '禁止', status: 'locked' },
    { label: '真实交易', value: '禁止', status: 'locked' },
    { label: '资金划转', value: '禁止', status: 'locked' },
    { label: '保存凭据', value: '禁止', status: 'locked' },
    {
      label: 'Agent 治理',
      value: '只生成 shadow 证据',
      hint: 'Polymarket 永远不接真实钱包；Agent 只做模拟账本、事件风险和 shadow 策略升降级。',
      status: 'warn',
    },
  ];
}

function polymarketDailyReview(payload) {
  const daily = payload?.dailyReview || {};
  return daily?.polymarket?.dailyReview || daily?.polymarketDailyReview || {};
}

function dailyIteration(payload) {
  return payload?.dailyReview?.dailyIteration || {};
}

function queueItemDone(item) {
  const status = String(item?.status || '').toUpperCase();
  return (
    Boolean(item?.completedByAgent) ||
    Boolean(item?.autoAppliedByAgent) ||
    Boolean(item?.iterationApplied) ||
    status.includes('APPLIED') ||
    status.includes('READY') ||
    status.includes('PLAN') ||
    status.includes('COMPLETED_BY_AGENT') ||
    status.includes('STALE_REFRESH_QUEUED')
  );
}

function copyPlanReady(copyPlan, copyQueue) {
  return (
    Boolean(copyPlan?.completedByAgent) ||
    Boolean(copyPlan?.autoAppliedByAgent) ||
    queueItemDone(copyQueue) ||
    (Array.isArray(copyPlan?.candidateVariants) && copyPlan.candidateVariants.length > 0)
  );
}

function acceptanceCriteriaText(copyPlan = {}) {
  const zh = Array.isArray(copyPlan.acceptanceCriteriaZh)
    ? copyPlan.acceptanceCriteriaZh.filter(Boolean)
    : [];
  if (zh.length) return `自动治理门槛：${zh.join(' / ')}`;

  const raw = Array.isArray(copyPlan.acceptanceCriteria) ? copyPlan.acceptanceCriteria : [];
  const labels = {
    'closed >= 200': '结算样本不少于 200 笔',
    'profitFactor >= 1.10': 'Profit Factor 不低于 1.10',
    'winRatePct >= 52': '胜率不低于 52%',
    'cashScaledPnlUSDC > 0': '按真实可用资金折算后净值必须为正',
    'no single market family contributes more than 45% of positive evidence':
      '正收益证据不能由单一市场家族贡献超过 45%',
  };
  const translated = raw.map((item) => labels[item] || friendlyText(item)).filter(Boolean);
  return translated.length
    ? `自动治理门槛：${translated.join(' / ')}`
    : '必须先证明跟单模拟长期正收益；即使达标也只进入 shadow / paper-context，不恢复真钱。';
}

function agentCopyText(
  value,
  fallback = 'Agent 已生成 shadow-only 跟单重调方案；下一轮自动刷新样本和筛选来源，不连接真钱钱包。',
) {
  const raw = String(value || '').trim();
  if (!raw) return fallback;
  return raw
    .replace('生成上述 shadow-only retune 批次；通过前禁止真钱下注、钱包写入或自动恢复执行。', fallback)
    .replace(
      '下一轮会扩展到全市场模块并重新筛选来源。',
      'Agent 已生成下一轮全市场模块 shadow 重调方案，会自动扩展来源并重新筛选。',
    )
    .replace(
      '若连续批次仍通过，再进入人工恢复复核。',
      '若连续批次仍通过，也只进入 shadow / paper-context 自动治理，不恢复真钱。',
    )
    .replace(
      '仍需人工确认钱包、限额和隔离边界。',
      '仍只进入 shadow / paper-context 自动治理，不连接真钱钱包。',
    )
    .replace('人工加入观察名单', '本地观察名单');
}

function blockerText(blockers = []) {
  const labels = {
    sample_lt_200: '样本少于 200',
    pf_lt_1_10: 'PF 低于 1.10',
    win_rate_lt_52: '胜率低于 52%',
    cash_scaled_pnl_not_positive: '按当前资金估算仍未盈利',
  };
  return (Array.isArray(blockers) ? blockers : [])
    .map((item) => labels[item] || friendlyText(item))
    .filter(Boolean)
    .join(' / ');
}

function buildSimulationItems(payload) {
  const reviewSummary = summaryObject(payload.dailyReview);
  const polyDaily = polymarketDailyReview(payload);
  const copyReview = polyDaily.copyTradingReview || {};
  const copyCapital = copyReview.capitalSimulation || {};
  const copyPlan = copyReview.iterationPlan || {};
  const copyTools = Array.isArray(copyReview.sourceToolkit) ? copyReview.sourceToolkit : [];
  const iteration = dailyIteration(payload);
  const strategyQueue = Array.isArray(iteration.strategyIterationQueue)
    ? iteration.strategyIterationQueue
    : [];
  const polyRetune = strategyQueue.find((item) => item?.type === 'POLYMARKET_FILTER_RETUNE');
  const copyQueue = strategyQueue.find((item) => item?.type === 'POLYMARKET_COPY_TRADING_RETUNE');
  const polyRetuneDone = queueItemDone(polyRetune);
  const copyRetuneDone = queueItemDone(copyQueue);
  const copyAgentPlanReady = copyPlanReady(copyPlan, copyQueue);
  const displayedTodoCount =
    polyRetuneDone || copyRetuneDone || copyAgentPlanReady
      ? 0
      : Number(reviewSummary.polymarketTodoCount || 0);
  const canaryRows = countRows(payload.canaryLedger) || countRows(payload.canaryRun);
  const governanceRows = countRows(payload.autoGovernanceLedger) || countRows(payload.autoGovernance);
  const realTradeRows = countRows(payload.realTrades);
  const executedPF = reviewSummary.polymarketExecutedPF;
  const shadowPF = reviewSummary.polymarketShadowPF;
  const quarantined = Boolean(reviewSummary.polymarketLossQuarantine);
  return [
    {
      label: '真实下注',
      value: '未开启',
      hint: realTradeRows ? `${realTradeRows} 条历史证据，仅回放` : '没有真实下注执行入口',
      status: 'locked',
    },
    {
      label: '模拟在做什么',
      value: copyReview.active ? '跟单 + 雷达评分 + 阻断验证' : '雷达评分 + 阻断验证',
      hint: `${canaryRows} 条模拟执行记录；跟单可覆盖任何市场模块，所有结果只写证据`,
    },
    {
      label: '跟单策略',
      value: copyReview.active
        ? copyAgentPlanReady
          ? 'Agent 已生成重调方案'
          : copyReview.operatorStatusLabel || '正在模拟'
        : '暂无样本',
      hint: copyAgentPlanReady
        ? agentCopyText(copyReview.summary)
        : copyReview.summary ||
          '未发现跟单样本；Agent 会先收集授权频道、公开强账户或本地观察名单的 shadow 证据。',
      status: copyReview.active ? (copyAgentPlanReady ? 'ok' : 'warn') : 'unknown',
    },
    {
      label: '跟单资金模拟',
      value: copyReview.active
        ? `真实资金折算 ${formatSignedUsd(copyCapital.cashScaledPnlUSDC)} / 模拟账本 ${formatSignedUsd(copyCapital.shadowLedgerPnlUSDC)}`
        : '暂无估算',
      hint: copyReview.active
        ? `按真实可用现金 ${formatUsd(copyCapital.accountCashUSDC)}、配置模拟本金 ${formatUsd(copyCapital.configuredBankrollUSDC)} 等比例记账；这里只显示模拟盈亏，不连接钱包。`
        : '等待跟单 shadow 样本后再估算真实资金规模盈亏。',
      status: Number(copyCapital.cashScaledPnlUSDC) > 0 ? 'ok' : 'warn',
    },
    {
      label: '真钱隔离',
      value: copyCapital.restoreLiveReviewEligible ? '仅可进入模拟强化' : '继续隔离',
      hint: copyCapital.restoreLiveReviewEligible
        ? '即使模拟达标，也只允许进入 FAST_SHADOW / PAPER_CONTEXT；不会恢复真钱。'
        : blockerText(copyCapital.restoreLiveReviewBlockers) || '需要更多正收益样本；真实钱包仍关闭。',
      status: 'locked',
    },
    {
      label: '跟单工具箱',
      value: copyTools.length
        ? `${copyTools.length} 类来源 / ${Array.isArray(copyPlan.copyUniverse) ? copyPlan.copyUniverse.length : 0} 个市场模块`
        : '待接入',
      hint: copyTools.length
        ? '可用 Telegram 授权频道/导出、公开强账户、本地雷达和本地观察名单做 shadow 跟单。'
        : '跟单来源必须先转成只读证据，再进模拟账本。',
      status: copyTools.length ? 'ok' : 'unknown',
    },
    {
      label: '下一轮跟单重调',
      value:
        Array.isArray(copyPlan.candidateVariants) && copyPlan.candidateVariants.length
          ? `${copyPlan.candidateVariants.length} 个模拟变体`
          : '待生成',
      hint:
        agentCopyText(copyPlan.nextAction || copyPlan.diagnosis) ||
        '下一轮会按来源质量、市场家族、流动性和结算表现拆分验证。',
      status: copyPlan.retuneRequired && !copyAgentPlanReady ? 'warn' : 'ok',
    },
    {
      label: '当前效果',
      value: `执行PF ${formatNumber(executedPF ?? 0, 4)} / 影子PF ${formatNumber(shadowPF ?? 0, 4)}`,
      hint: quarantined ? '亏损来源未修复，继续隔离并重调策略' : '等待更多样本确认',
    },
    {
      label: '策略迭代',
      value:
        polyRetuneDone || copyRetuneDone || copyAgentPlanReady
          ? 'Agent 已生成重调'
          : polyRetune || copyQueue
            ? '需要重调模拟'
            : '暂无新增迭代',
      hint: polyRetune
        ? `${polyRetune.recommendation || '只在 shadow-only 重建筛选器'}；跟单策略不限制市场类别。`
        : copyQueue?.recommendation || agentCopyText(copyPlan.nextAction, '保持只读观察'),
      status:
        polyRetuneDone || copyRetuneDone || copyAgentPlanReady
          ? 'ok'
          : polyRetune || copyQueue
            ? 'warn'
            : 'ok',
    },
    {
      label: '今日待办',
      value: displayedTodoCount ? `${displayedTodoCount} 项` : 'Agent 已处理',
      hint: displayedTodoCount
        ? '若出现亏损复盘或证据不足，会进入每日复盘列表'
        : '跟单/亏损复盘已有 shadow-only Agent 方案；等待下一轮自动刷新样本。',
      status: displayedTodoCount ? 'warn' : 'ok',
    },
    {
      label: '治理状态',
      value: quarantined ? '隔离中' : friendlyModeLabel(payload.autoGovernance),
      hint: `${governanceRows} 条治理证据；不会自动下注或修改资金`,
      status: quarantined ? 'warn' : inferStatus(payload.autoGovernance),
    },
  ];
}

function buildReviewItems(payload) {
  const summary = summaryObject(payload.dailyReview);
  const polyDaily = polymarketDailyReview(payload);
  const polySummary = polyDaily.summary || {};
  const copyReview = polyDaily.copyTradingReview || {};
  const copyPlan = copyReview.iterationPlan || {};
  const iteration = dailyIteration(payload);
  const strategyQueue = Array.isArray(iteration.strategyIterationQueue)
    ? iteration.strategyIterationQueue
    : [];
  const polyRetune = strategyQueue.find((item) => item?.type === 'POLYMARKET_FILTER_RETUNE');
  const copyQueue = strategyQueue.find((item) => item?.type === 'POLYMARKET_COPY_TRADING_RETUNE');
  const polyRetuneDone = queueItemDone(polyRetune);
  const copyRetuneDone = queueItemDone(copyQueue);
  const copyAgentPlanReady = copyPlanReady(copyPlan, copyQueue);
  const copyVariantCount = Array.isArray(copyPlan.candidateVariants) ? copyPlan.candidateVariants.length : 0;
  return [
    {
      label: '亏损复盘',
      value: summary.polymarketLossQuarantine ? '仍在隔离' : '未触发隔离',
      hint: `执行PF ${formatNumber(summary.polymarketExecutedPF ?? 0, 4)}，影子PF ${formatNumber(summary.polymarketShadowPF ?? 0, 4)}`,
      status: summary.polymarketLossQuarantine ? 'warn' : 'ok',
    },
    {
      label: '复盘结论',
      value: polyRetuneDone
        ? '策略重调已生成'
        : polyRetune
          ? '需要策略迭代'
          : friendlyText(summary.completionReportStatus || 'COMPLETE_NO_ACTION'),
      hint: polyRetuneDone
        ? `${polyRetune?.recommendation || '今日 shadow-only retune 已生成'}；继续隔离并等待明日样本验证。`
        : polyRetune
          ? '预测市场长期隔离不是成功状态，需要继续调筛选器并模拟验证'
          : `${summary.completionRecommendationCount ?? 0} 条建议；${summary.codexReviewRequired ? '需要判断' : '暂无代码迭代'}`,
      status: polyRetuneDone ? 'ok' : summary.codexReviewRequired ? 'warn' : 'ok',
    },
    {
      label: '跟单复盘',
      value: copyRetuneDone
        ? 'Agent 已生成跟单重调'
        : copyAgentPlanReady
          ? 'Agent 已生成跟单重调'
          : copyReview.active
            ? copyReview.operatorStatusLabel || friendlyText(copyReview.status, '需要复核')
            : '暂无跟单样本',
      hint:
        copyRetuneDone || copyAgentPlanReady
          ? `${agentCopyText(copyQueue?.recommendation || copyPlan.nextAction || copyReview.summary || '跟单 shadow-only 重调方案已生成')} 当前资金估算 ${formatSignedUsd(copyReview.capitalSimulation?.cashScaledPnlUSDC)}。`
          : copyReview.active
            ? `${copyReview.summary || ''} 当前资金估算 ${formatSignedUsd(copyReview.capitalSimulation?.cashScaledPnlUSDC)}。`
            : '跟单策略会按市场家族、来源质量和流动性继续收集 shadow 证据。',
      status: copyRetuneDone || copyAgentPlanReady ? 'ok' : copyReview.active ? 'warn' : 'unknown',
    },
    {
      label: '跟单迭代方案',
      value: copyVariantCount ? `${copyVariantCount} 个 shadow-only 变体` : '等待重调证据',
      hint: acceptanceCriteriaText(copyPlan),
      status:
        copyVariantCount || copyRetuneDone || copyAgentPlanReady
          ? 'ok'
          : copyPlan.retuneRequired
            ? 'warn'
            : 'ok',
    },
    {
      label: '今日重调',
      value: `${polySummary.retuneRed || 0} 红 / ${polySummary.retuneYellow || 0} 黄 / 跟单 ${polySummary.retuneCopyTrading || 0}`,
      hint:
        polyRetuneDone || copyRetuneDone
          ? '今日 shadow-only 重调已生成；不会恢复真钱或自动下注。'
          : '红/黄只进入 shadow-only retune；不会恢复真钱或自动下注。',
      status:
        polyRetuneDone || copyRetuneDone
          ? 'ok'
          : polySummary.retuneRed || polySummary.retuneYellow
            ? 'warn'
            : 'ok',
    },
  ];
}

function buildEndpoints(payload) {
  return POLYMARKET_ENDPOINTS.map(({ key, label, endpoint, description }) => {
    const value = payload?.[key];
    const status = inferStatus(value);
    return { label, endpoint, description, status, statusLabel: friendlyStatusLabel(value) };
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
  const radar = asRows(payload.radar);
  const markets = asRows(payload.markets);
  const allMarkets = [...radar, ...markets];
  const topLiquidity = Math.max(
    0,
    ...allMarkets.map((row) => Number(row.liquidity || row.clobLiquidityUsd || 0)).filter(Number.isFinite),
  );
  const topVolume24h = Math.max(
    0,
    ...allMarkets.map((row) => Number(row.volume24h || row.volume_24h || 0)).filter(Number.isFinite),
  );
  const wallet = walletBalance(payload);
  return [
    {
      label: '钱包余额',
      value: wallet === null ? '未同步' : formatCurrencyDisplay(wallet, 'USD'),
      hint: wallet === null ? '只读钱包余额还没有回灌' : '真实钱包余额',
      status: wallet === null ? 'warn' : 'ok',
    },
    { label: '搜索结果', value: searchRows, hint: '关键词匹配' },
    { label: '雷达机会', value: radarRows, hint: '只读研究候选' },
    { label: '市场数量', value: marketRows, hint: '按成交量排序' },
    { label: '最高流动性', value: formatUsd(topLiquidity), hint: '公开市场数据' },
    { label: '最高24h成交', value: formatUsd(topVolume24h), hint: '公开市场成交量' },
    {
      label: 'AI评分',
      value: score === null ? '—' : formatNumber(score, 3),
      hint: `${assetRows} 候选 / ${historyRows} 历史 / ${tradeRows} 交易证据`,
    },
  ];
}

function buildRadarItems(payload) {
  const radarScore = bestScore(payload.radar);
  const worker = payload.worker;
  return [
    { label: '雷达状态', value: friendlyModeLabel(payload.radar), status: inferStatus(payload.radar) },
    { label: '雷达数量', value: countRows(payload.radar) },
    { label: '最高评分', value: radarScore === null ? '—' : formatNumber(radarScore, 3) },
    { label: '后台任务', value: friendlyModeLabel(worker), status: inferStatus(worker) },
    {
      label: '最近更新',
      value: getPath(worker, ['updated_at', 'timestamp', 'last_run_at', 'last_updated'], '—'),
    },
    { label: '搜索词', value: getPath(payload.search, ['query', 'q', 'keyword'], '—') },
  ];
}

function buildAiScoreItems(payload) {
  const score = payload.aiScore;
  const governance = payload.autoGovernance;
  return [
    { label: 'AI评分状态', value: friendlyModeLabel(score), status: inferStatus(score) },
    { label: '分数', value: bestScore(score) === null ? '—' : formatNumber(bestScore(score), 3) },
    {
      label: '置信度',
      value: formatPercent(getPath(score, ['confidence', 'decision.confidence', 'score.confidence'], null)),
    },
    {
      label: '建议',
      value: friendlyText(getPath(score, ['recommendation', 'decision', 'action', 'side'], '—')),
    },
    { label: '自动治理', value: friendlyModeLabel(governance), status: inferStatus(governance) },
    {
      label: '治理说明',
      value: formatDisplayValue(
        getPath(governance, ['note', 'reasoning', 'summary', 'next_action'], '仅保留证据，不自动下注'),
      ),
    },
  ];
}

function buildCanaryItems(payload) {
  const contract = payload.canary;
  const run = payload.canaryRun;
  const ledgerRows = countRows(payload.canaryLedger);
  return [
    { label: '执行合约状态', value: friendlyModeLabel(contract), status: inferStatus(contract) },
    {
      label: '合约版本',
      value: friendlyText(getPath(contract, ['version', 'schemaVersion', 'contract_version'], '—')),
    },
    { label: '最近运行', value: friendlyModeLabel(run), status: inferStatus(run) },
    { label: '模拟记录', value: `${ledgerRows} 条`, hint: '只写模拟证据，不写钱包或订单' },
    { label: '运行模式', value: friendlyText(getPath(run, ['mode', 'run_mode', 'dry_run'], '只读研究')) },
    { label: '运行时间', value: getPath(run, ['last_run_at', 'updated_at', 'timestamp'], '—') },
    { label: '真实执行', value: '前端禁止', status: 'locked' },
  ];
}

function buildCrossLinkageItems(payload) {
  const cross = payload.cross;
  const analysis = payload.singleAnalysis;
  return [
    { label: '跨市场状态', value: friendlyModeLabel(cross), status: inferStatus(cross) },
    { label: '联动数量', value: countRows(cross) },
    { label: '单市场分析', value: friendlyModeLabel(analysis), status: inferStatus(analysis) },
    {
      label: '联动资产',
      value: getPath(cross, ['asset', 'symbol', 'linked_symbol', 'market.asset'], '—'),
    },
    { label: '主题', value: getPath(analysis, ['theme', 'macro_theme', 'market.theme'], '—') },
    { label: '分析理由', value: getPath(analysis, ['reasoning', 'summary', 'thesis'], '—') },
  ];
}

function normalizeMarketRows(rows) {
  return rows.slice(0, 12).map((row) => ({
    市场: row.question || row.title || row.eventTitle || row.slug || '—',
    概率: formatPercent(row.probability ?? row.yesPrice),
    流动性: formatUsd(row.liquidity ?? row.clobLiquidityUsd),
    '24h成交': formatUsd(row.volume24h ?? row.volume_24h),
    总成交: formatUsd(row.volume),
    点差: row.clobSpread !== undefined ? formatPercent(row.clobSpread) : formatNumber(row.spread, 4),
    评分: row.aiRuleScore ?? row.ruleScore ?? row.score ?? '—',
    建议: friendlyText(row.recommendedAction || row.action, '只读观察'),
    来源: friendlyText(row.source || row.category, '预测市场'),
  }));
}

function normalizeGenericRows(rows) {
  return rows.slice(0, 12).map((row) => ({
    名称: row.question || row.title || row.market || row.name || row.id || '—',
    状态: friendlyText(row.status || row.state || row.decision || row.action),
    金额:
      row.amount !== undefined ? formatUsd(row.amount) : row.stake !== undefined ? formatUsd(row.stake) : '—',
    分数: row.score ?? row.aiScore ?? row.confidence ?? '—',
    说明: compactDisplay(row.reason || row.summary || row.note || row.source || row, 160),
  }));
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
    simulationItems: buildSimulationItems(payload),
    reviewItems: buildReviewItems(payload),
    tables: {
      search: normalizeMarketRows(asRows(payload.search)),
      radar: normalizeMarketRows(asRows(payload.radar)),
      aiScore: normalizeGenericRows(asRows(payload.aiScore)),
      markets: normalizeMarketRows(asRows(payload.markets)),
      assets: normalizeGenericRows(asRows(payload.assets)),
      history: normalizeGenericRows(asRows(payload.history)),
      realTrades: normalizeGenericRows(asRows(payload.realTrades)),
      cross: normalizeGenericRows(asRows(payload.cross)),
      canaryLedger: normalizeGenericRows(asRows(payload.canaryLedger)),
      autoGovernanceLedger: normalizeGenericRows(asRows(payload.autoGovernanceLedger)),
    },
    raw: payload,
  };
  return model;
}
