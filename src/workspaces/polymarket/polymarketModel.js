import {
  compactDisplay,
  formatDisplayValue,
  formatCurrencyDisplay,
  humanizeStatus,
} from '../../utils/displayText.js';

const POLYMARKET_ENDPOINTS = [
  {
    key: 'copyTraderDiscovery',
    label: '强交易员发现',
    endpoint: '/api/polymarket/copy-trader-discovery',
    description: '只读排行榜、当前持仓、Telegram 来源',
  },
  {
    key: 'copyTraderDiscoveryLedger',
    label: '发现流水',
    endpoint: '/api/polymarket/copy-trader-discovery-ledger',
    description: '强交易员评分流水',
  },
  {
    key: 'copyTraderShadowReplay',
    label: 'Shadow回放',
    endpoint: '/api/polymarket/copy-trader-shadow-replay',
    description: 'Telegram跟单回放汇总',
  },
  {
    key: 'copyTraderWalkForward',
    label: 'Walk-forward',
    endpoint: '/api/polymarket/copy-trader-walk-forward',
    description: '分批前推验证',
  },
  {
    key: 'copyTraderSourceBuckets',
    label: '来源分桶',
    endpoint: '/api/polymarket/copy-trader-source-buckets',
    description: '按来源和交易员淘汰弱信号',
  },
  {
    key: 'research',
    label: '研究账本',
    endpoint: '/api/polymarket/research',
    description: 'shadow 研究效果',
  },
  {
    key: 'retunePlanner',
    label: '重调计划',
    endpoint: '/api/polymarket/retune-planner',
    description: '只读重调建议',
  },
  {
    key: 'isolatedClobRuntime',
    label: '隔离CLOB',
    endpoint: '/api/polymarket/isolated-clob-runtime',
    description: '真钱适配器隔离运行时预检',
  },
  {
    key: 'canaryRun',
    label: '真实执行',
    endpoint: '/api/polymarket/canary-executor-run',
    description: '真实订单发送与成交响应',
  },
  {
    key: 'canaryExitMonitorRun',
    label: '退出监控',
    endpoint: '/api/polymarket/canary-exit-monitor-run',
    description: '真实持仓 TP/SL/trailing 监控',
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

const DATA_PENDING = '等待数据';
const NOT_SYNCED = '未同步';
const NO_SIGNAL = '暂无信号';

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
    value.candidateQueue,
    value.dryRunOrders,
    value.outcomes,
    value.governanceDecisions,
    value.candidateContracts,
    value.traders,
    value.shadowCandidates,
    value.scores,
    value.recommendations,
    value.experiments,
    value.sources,
    value.marketCatalog,
    value.markets,
    value.assetOpportunities,
    value.events,
    value.results,
    value.opportunities,
    value.trades,
    value.positions,
    value.plannedOrders,
    value.orders,
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

function fallbackValue(value, fallback = DATA_PENDING) {
  if (value === undefined || value === null || value === '') return fallback;
  return formatDisplayValue(value);
}

function formatNumber(value, digits = 2, fallback = DATA_PENDING) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallbackValue(value, fallback);
  return number.toLocaleString(undefined, { maximumFractionDigits: digits });
}

function formatUsd(value, digits = 2, fallback = DATA_PENDING) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return `$${number.toLocaleString('zh-CN', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
}

function formatSignedUsd(value, digits = 2, fallback = DATA_PENDING) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  const sign = number > 0 ? '+' : number < 0 ? '-' : '';
  return `${sign}${formatUsd(Math.abs(number), digits)}`;
}

function formatPercent(value, fallback = DATA_PENDING) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallbackValue(value, fallback);
  const normalized = Math.abs(number) <= 1 ? number * 100 : number;
  return `${normalized.toFixed(1)}%`;
}

function formatDateTime(value, fallback = NOT_SYNCED) {
  if (!value) return fallback;
  const parsed = Date.parse(String(value));
  if (!Number.isFinite(parsed)) return String(value);
  return new Date(parsed).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatShares(value, digits = 4, fallback = DATA_PENDING) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return `${formatNumber(number, digits)} shares`;
}

function shortenId(value, front = 8, back = 6, fallback = DATA_PENDING) {
  const text = String(value || '').trim();
  if (!text) return fallback;
  if (text.length <= front + back + 3) return text;
  return `${text.slice(0, front)}...${text.slice(-back)}`;
}

function responseObject(row = {}) {
  return row.response && typeof row.response === 'object' && !Array.isArray(row.response) ? row.response : {};
}

function responseTxHash(row = {}) {
  const response = responseObject(row);
  if (Array.isArray(response.transactionsHashes) && response.transactionsHashes.length) {
    return response.transactionsHashes[0];
  }
  if (Array.isArray(response.transactionHashes) && response.transactionHashes.length) {
    return response.transactionHashes[0];
  }
  return response.transactionHash || row.txHash || row.transactionHash || '';
}

function responseOrderId(row = {}) {
  const response = responseObject(row);
  return row.orderID || row.orderId || response.orderID || response.orderId || row.response_id || '';
}

function responseStatus(row = {}) {
  const response = responseObject(row);
  return response.status || row.status || row.adapterStatus || row.decision || '';
}

function hasRealOrderEvidence(row = {}) {
  return Boolean(
    row.orderSent ||
    String(row.order_sent ?? '').toLowerCase() === 'true' ||
    responseOrderId(row) ||
    responseTxHash(row) ||
    row.response_status ||
    Object.keys(responseObject(row)).length,
  );
}

function auditOrderRows(payload = {}) {
  return asRows(payload.canaryOrderAuditLedger)
    .filter((row) => String(row.order_sent ?? row.orderSent ?? '').toLowerCase() === 'true')
    .map((row) => ({
      generatedAt: row.generated_at || row.generatedAt,
      candidateId: row.candidate_id || row.candidateId,
      marketId: row.market_id || row.marketId,
      question: row.question,
      track: row.track,
      side: row.side,
      limitPrice: row.limit_price ?? row.limitPrice,
      stakeUSDC: row.stake_usdc ?? row.stakeUSDC,
      size: row.size,
      decision: row.decision,
      orderSent: true,
      adapterStatus: row.adapter_status || row.adapterStatus,
      response: {
        orderID: row.response_id || row.orderID || row.orderId,
        status: row.response_status || row.status,
        transactionsHashes: row.tx_hash ? [row.tx_hash] : [],
      },
    }));
}

function realOrderRows(payload = {}) {
  const run = firstObject(payload.canaryRun);
  const direct = Array.isArray(run.plannedOrders) ? run.plannedOrders : asRows(payload.canaryRun);
  const rows = [
    ...direct.filter((row) => row && typeof row === 'object' && hasRealOrderEvidence(row)),
    ...auditOrderRows(payload),
  ];
  const seen = new Set();
  return rows.filter((row) => {
    const key = responseOrderId(row) || row.candidateId || JSON.stringify(row);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function exitMonitorPositions(payload = {}) {
  const run = firstObject(payload.canaryExitMonitorRun);
  const direct = Array.isArray(run.positions) ? run.positions : asRows(payload.canaryExitMonitorRun);
  return direct.filter((row) => row && typeof row === 'object');
}

function rowKey(row = {}) {
  return row.candidateId || row.orderID || row.orderId || row.marketId || row.tokenId || JSON.stringify(row);
}

function realPositionRows(payload = {}) {
  const merged = new Map();
  for (const row of asRows(payload.canaryPositionLedger)) {
    merged.set(rowKey(row), { ...row });
  }
  for (const row of exitMonitorPositions(payload)) {
    const key = rowKey(row);
    merged.set(key, { ...(merged.get(key) || {}), ...row });
  }

  const ordersByKey = new Map();
  for (const order of realOrderRows(payload)) {
    const orderId = responseOrderId(order);
    if (order.candidateId) ordersByKey.set(order.candidateId, order);
    if (orderId) ordersByKey.set(orderId, order);
    if (order.marketId) ordersByKey.set(order.marketId, order);
  }

  const rows = [...merged.values()].map((row) => {
    const order =
      ordersByKey.get(row.candidateId) ||
      ordersByKey.get(row.orderID) ||
      ordersByKey.get(row.orderId) ||
      ordersByKey.get(row.marketId) ||
      {};
    return {
      ...order,
      ...row,
      orderStatus: responseStatus(order),
      txHash: responseTxHash(order),
      orderID: responseOrderId({ ...order, ...row }),
    };
  });

  if (rows.length) return rows;
  return realOrderRows(payload)
    .filter((order) => hasRealOrderEvidence(order))
    .map((order) => ({
      ...order,
      positionSize: order.size,
      entryPrice:
        order.response?.makingAmount && order.response?.takingAmount
          ? Number(order.response.makingAmount) / Number(order.response.takingAmount)
          : order.limitPrice,
      currentExitPrice: null,
      decision: order.orderSent ? 'OPEN_TRACKING' : order.decision,
      orderStatus: responseStatus(order),
      txHash: responseTxHash(order),
      orderID: responseOrderId(order),
    }));
}

function realExecutionRows(payload = {}) {
  const executions = [];
  for (const order of realOrderRows(payload)) {
    executions.push({
      type: '真实成交',
      generatedAt: firstObject(payload.canaryRun).generatedAt,
      question: order.question,
      marketId: order.marketId,
      copiedTrader: order.copiedTrader,
      side: order.side,
      outcome: order.outcome,
      stakeUSDC: order.stakeUSDC,
      size: order.size,
      price: order.limitPrice,
      status: responseStatus(order),
      adapterStatus: order.adapterStatus,
      orderID: responseOrderId(order),
      txHash: responseTxHash(order),
      reason: order.decision,
    });
  }
  for (const position of exitMonitorPositions(payload)) {
    executions.push({
      type: '退出监控',
      generatedAt: firstObject(payload.canaryExitMonitorRun).generatedAt,
      question: position.question,
      marketId: position.marketId,
      side: 'SELL_CHECK',
      outcome: '',
      stakeUSDC: '',
      size: position.positionSize,
      price: position.currentExitPrice,
      status: position.decision,
      adapterStatus: position.adapterStatus,
      orderID: responseOrderId(position),
      txHash: responseTxHash(position),
      reason: position.reason,
    });
  }
  for (const row of asRows(payload.canaryExitLedger)) {
    const duplicate = executions.some(
      (item) => item.type === '退出监控' && item.orderID && item.orderID === responseOrderId(row),
    );
    if (!duplicate) {
      executions.push({
        type: '退出账本',
        generatedAt: row.generated_at || row.generatedAt,
        question: row.question,
        marketId: row.marketId,
        side: 'SELL_CHECK',
        size: row.positionSize,
        price: row.currentExitPrice,
        status: row.decision,
        adapterStatus: row.adapterStatus,
        orderID: responseOrderId(row),
        reason: row.reason,
      });
    }
  }
  return executions;
}

function realPositionSummary(payload = {}) {
  const rows = realPositionRows(payload);
  const openRows = rows.filter((row) => {
    const decision = String(row.decision || '').toUpperCase();
    const exitSent = String(row.exitSent || '').toLowerCase() === 'true' || row.exitSent === true;
    return !exitSent && !decision.includes('EXIT_SENT') && !decision.includes('CLOSED');
  });
  const tracked = openRows.length ? openRows : rows;
  const totalShares = tracked.reduce((sum, row) => sum + (Number(row.positionSize ?? row.size) || 0), 0);
  const currentValue = tracked.reduce(
    (sum, row) => sum + (Number(row.positionSize ?? row.size) || 0) * (Number(row.currentExitPrice) || 0),
    0,
  );
  const entryValue = tracked.reduce(
    (sum, row) => sum + (Number(row.positionSize ?? row.size) || 0) * (Number(row.entryPrice) || 0),
    0,
  );
  const first = tracked[0] || {};
  return {
    rows: tracked,
    count: tracked.length,
    totalShares,
    currentValue,
    entryValue,
    unrealizedPnl: currentValue && entryValue ? currentValue - entryValue : null,
    first,
  };
}

function realExecutionSummary(payload = {}) {
  const run = firstObject(payload.canaryRun);
  const exitRun = firstObject(payload.canaryExitMonitorRun);
  const executions = realExecutionRows(payload);
  const orderRows = realOrderRows(payload);
  const positionsTracked = Number(exitRun.summary?.positionsTracked ?? 0);
  const exitPlanOnly = boolValue(exitRun.planOnly, true);
  return {
    executions,
    orderRows,
    ordersSent:
      Number(run.summary?.ordersSent ?? 0) || orderRows.filter((row) => hasRealOrderEvidence(row)).length,
    matched: orderRows.filter((row) => String(responseStatus(row)).toLowerCase() === 'matched').length,
    exitsSent: Number(exitRun.summary?.exitsSent ?? 0),
    exitSignals: Number(exitRun.summary?.exitSignals ?? 0),
    positionsTracked,
    exitPlanOnly,
    exitRealEnabled: positionsTracked > 0 && !exitPlanOnly,
    mode:
      Number(run.summary?.ordersSent ?? 0) > 0
        ? run.executionMode || run.mode || ''
        : orderRows.length
          ? 'REAL_ORDER_AUDIT_LEDGER'
          : run.executionMode || run.mode || '',
    policy: run.summary?.walletPolicyStatus || run.envPreflight?.autonomousPolicyStatus || '',
  };
}

function realExecutionHint(summary = {}) {
  const exitHint = summary.exitRealEnabled
    ? '退出监控实盘启用，TP/SL/源交易员卖出会发送 SELL。'
    : summary.exitPlanOnly
      ? '退出监控仍是计划模式，不会发送 SELL。'
      : '退出监控等待持仓同步。';

  if (summary.mode === 'REAL_ORDER_AUDIT_LEDGER') {
    return `真实成交来自订单审计账本；${exitHint}`;
  }
  if (summary.policy) {
    return `钱包策略 ${friendlyText(summary.policy)}；${exitHint}`;
  }
  return '还没有真实执行运行记录。';
}

function latestGeneratedAt(payloads = []) {
  const values = payloads
    .flatMap((payload) => [
      getPath(payload, ['generatedAt', 'generatedAtIso', 'lastGeneratedAt', 'summary.latestAt'], null),
      getPath(payload, ['data.generatedAt', 'data.generatedAtIso', 'data.summary.latestAt'], null),
      getPath(payload, ['source.mtimeIso', '_service.sourceMtimeIso', '_service.fileMtimeIso'], null),
    ])
    .map((value) => {
      const parsed = Date.parse(String(value || ''));
      return Number.isFinite(parsed) ? { value, parsed } : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.parsed - a.parsed);
  return values[0]?.value || null;
}

function inferStatus(payload) {
  if (!payload) return 'unknown';
  if (payload.ok === false || payload.error) return 'error';
  const value = unwrap(payload);
  if (Array.isArray(value)) return value.length ? 'ok' : 'warn';
  if (value && typeof value === 'object') {
    const state = String(value.status || value.state || value.health || value.mode || '').toLowerCase();
    if (state.includes('prepared_real_wallet_blocked')) return 'locked';
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
  if (status === 'locked') return '已锁定';
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

function friendlyText(value, fallback = DATA_PENDING) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'object') return formatDisplayValue(value);
  const translated = humanizeStatus(value, null);
  if (translated && translated !== value) return translated;
  const raw = String(value);
  const normalized = raw.toLowerCase();
  if (normalized.includes('keep_dry_run') || normalized.includes('dry_run')) {
    return '保持只读研究，等待策略通过';
  }
  if (normalized.includes('promotable')) return '可晋级';
  if (normalized.includes('passed') || normalized === 'pass') return '已通过';
  if (normalized.includes('collect_more') || normalized.includes('collecting')) return '收集中';
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

function boolValue(value, fallback = false) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase();
  if (!normalized) return fallback;
  if (['true', '1', 'yes', 'y', 'on'].includes(normalized)) return true;
  if (['false', '0', 'no', 'n', 'off'].includes(normalized)) return false;
  return fallback;
}

function realPositionStatusText(value, fallback = DATA_PENDING) {
  const raw = String(value || '').trim();
  const normalized = raw.toUpperCase();
  if (!raw) return fallback;
  if (normalized === 'HOLD') return '持仓中';
  if (normalized === 'OPEN_TRACKING') return '已成交，等待退出监控';
  if (normalized === 'EXIT_NOT_TRIGGERED') return '未触发退出';
  if (normalized.includes('EXIT_SENT')) return '退出单已发送';
  if (normalized.includes('CLOSED')) return '已退出';
  if (normalized.includes('NOT_ATTEMPTED')) return '未触发退出';
  return friendlyText(value, fallback);
}

function sourcePositionStatusText(value, fallback = DATA_PENDING) {
  const normalized = String(value || '')
    .trim()
    .toUpperCase();
  if (!normalized) return fallback;
  if (normalized === 'SOURCE_POSITION_STILL_HELD') return '源交易员仍持有';
  if (normalized === 'SOURCE_POSITION_NOT_HELD') return '源交易员已卖出';
  if (normalized === 'SOURCE_CHECK_UNAVAILABLE') return '源持仓待同步';
  return realPositionStatusText(value, fallback);
}

function friendlyTelegramError(error) {
  const raw = String(error || '');
  const lower = raw.toLowerCase();
  if (!raw) return '';
  if (lower.includes('telethon_api_id_hash_missing')) return 'Telethon待配置';
  if (lower.includes('telethon_session_not_authorized')) return 'Telethon待登录';
  if (lower.includes('telethon_channel_not_found')) return '频道未匹配';
  if (lower.includes('no_bot_updates')) return 'Bot无更新';
  if (lower.includes('telegram_bot_token_missing')) return 'Bot待配置';
  return friendlyText(raw, raw);
}

function telegramIntakeState(telegram = {}, summary = {}) {
  const sources = telegram.sources || {};
  const botApi = sources.botApi || {};
  const telethon = sources.telethon || {};
  const exportSource = sources.export || {};
  const walletCount = Number(summary.telegramWallets ?? telegram.walletCount ?? 0);
  const signalCount = Number(summary.telegramSignals ?? telegram.signalCount ?? 0);
  if (walletCount > 0) {
    return {
      value: `${formatNumber(walletCount, 0)} 个钱包`,
      hint: telegram.nextAction || `频道 ${telegram.channelName || '预测市场内幕钱包监控'} 已进入排序。`,
      status: 'ok',
    };
  }
  if (signalCount > 0) {
    return {
      value: `${formatNumber(signalCount, 0)} 个交易员信号`,
      hint: telegram.nextAction || 'Telegram 用户名/Rank 信号已进入强交易员排序。',
      status: 'ok',
    };
  }
  if (telethon.configured && Number(telethon.messagesRead ?? 0) > 0) {
    return {
      value: `Telethon已读 ${formatNumber(telethon.messagesRead, 0)} 条`,
      hint: telethon.nextAction || '已读取频道历史，等待可解析完整钱包地址。',
      status: 'warn',
    };
  }
  if (telethon.configured) {
    return {
      value: friendlyTelegramError(telethon.error) || 'Telethon待登录',
      hint: telethon.nextAction || telegram.nextAction || '登录本地 Telethon user session 后可读取该频道。',
      status: 'warn',
    };
  }
  if (botApi.configured) {
    return {
      value: friendlyTelegramError(botApi.error) || 'Bot已配置无更新',
      hint: botApi.nextAction || telegram.nextAction || '把 bot 加入频道后才能收到 channel_post。',
      status: 'warn',
    };
  }
  if (exportSource.configured) {
    return {
      value: friendlyTelegramError(exportSource.error) || '导出待解析',
      hint: exportSource.nextAction || telegram.nextAction || '导出 Telegram 历史后解析钱包。',
      status: 'warn',
    };
  }
  return {
    value: telegram.configured ? '已配置待解析' : '待接入',
    hint: telegram.nextAction || telegram.channelName || '预测市场内幕钱包监控',
    status: 'warn',
  };
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

function buildSafetyItems(payload = {}) {
  const policy = firstObject(payload.copyTraderDiscovery).walletRiskPolicy || {};
  const isolated = isolatedRuntime(payload);
  const trading = realTradingState(payload);
  const autoUnlock = policy.autonomousUnlockAllowed !== false;
  const liveAllowed = Boolean(policy.realWalletExecutionAllowed) || realTradingConnected(trading);
  return [
    { label: '研究模式', value: '只读', status: 'ok' },
    { label: 'AI 建议', value: '仅供参考', status: 'ok' },
    { label: '自动下注', value: autoUnlock ? '证据门控' : '关闭', status: autoUnlock ? 'warn' : 'locked' },
    {
      label: '真实交易',
      value: walletGateValue(policy, isolated, trading),
      hint: walletGateHint(policy, isolated, '', trading),
      status: walletGateStatus(policy, trading),
    },
    {
      label: 'CLOB隔离',
      value: isolatedRuntimeValue(isolated, trading),
      hint: isolatedRuntimeLiveHint(isolated, trading),
      status: isolatedRuntimeStatus(isolated, trading),
    },
    { label: '资金划转', value: '禁止', status: 'locked' },
    { label: '保存凭据', value: '禁止', status: 'locked' },
    {
      label: 'Agent 治理',
      value: liveAllowed ? 'micro-live 自动放行' : '自动证据门控',
      hint:
        policy.nextAction ||
        'Agent 先做强交易员发现、模拟跟单账本和 shadow 策略升降级；达标后系统自动判断真实钱包。',
      status: liveAllowed ? 'ok' : 'warn',
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
    : '必须先证明跟单模拟长期正收益；达标后由自动钱包门控决定是否恢复 micro-live。';
}

function agentCopyText(
  value,
  fallback = 'Agent 已生成 shadow-only 跟单重调方案；下一轮自动刷新样本和筛选来源，达标后由系统自动判断真实钱包。',
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
      '若连续批次仍通过，交给自动钱包门控决定是否恢复 micro-live。',
    )
    .replace('真钱钱包保持隔离', '新增开仓保持隔离')
    .replace('真钱钱包仍锁定', '新增开仓仍锁定')
    .replace(
      '通过前禁止真钱下注、钱包写入或自动恢复执行。',
      '通过前新增开仓保持隔离；已接入真实持仓继续由退出监控管理。',
    )
    .replace('仍需人工确认钱包、限额和隔离边界。', '不需要人工确认；系统按钱包门控、限额和隔离边界自动判断。')
    .replace('人工加入观察名单', '本地观察名单');
}

function blockerText(blockers = []) {
  const labels = {
    sample_lt_200: '样本少于 200',
    pf_lt_1_10: 'PF 低于 1.10',
    win_rate_lt_52: '胜率低于 52%',
    cash_scaled_pnl_not_positive: '按当前资金估算仍未盈利',
    real_execution_switch_false: '真钱执行开关未打开',
    wallet_kill_switch_on_or_unset: '真钱 kill switch 仍开启或未配置',
    wallet_adapter_not_isolated_clob: '未配置 isolated CLOB adapter',
    private_key_env_missing: '真钱钱包私钥环境变量缺失',
    clob_host_env_missing: 'CLOB host 未配置',
    clob_host_missing: 'CLOB host 未配置',
    py_clob_client_missing: 'py-clob-client 未安装',
  };
  return (Array.isArray(blockers) ? blockers : [])
    .map((item) => labels[item] || friendlyText(item))
    .filter(Boolean)
    .join(' / ');
}

function isolatedRuntime(payload) {
  return firstObject(payload.isolatedClobRuntime);
}

function isolatedRuntimeBlockers(runtime = {}) {
  const blockers = runtime.preflight?.blockers;
  return Array.isArray(blockers) ? blockers : [];
}

function isolatedRuntimeHint(runtime = {}) {
  if (!runtime || !Object.keys(runtime).length) return '等待 isolated CLOB runtime manifest。';
  const blockers = blockerText(isolatedRuntimeBlockers(runtime));
  const adapter = runtime.adapter?.name || 'isolated_clob';
  const host = runtime.clob?.hostConfigured ? 'host 已配置' : 'host 待配置';
  const sendAllowed = Boolean(runtime.safety?.orderSendAllowed);
  if (sendAllowed) return `${adapter} / ${host}；订单发送已由后端策略放行。`;
  return `${adapter} / ${host}；CLOB 已配置，真钱钱包仍锁定；${blockers || 'prepare-only 模式，未开放真钱订单发送。'}`;
}

function realTradingConnected(trading = {}) {
  const execution = trading.executionSummary || {};
  const position = trading.positionSummary || {};
  return Boolean(
    trading.connected ||
    Number(execution.ordersSent ?? 0) > 0 ||
    Number(execution.matched ?? 0) > 0 ||
    Number(execution.positionsTracked ?? 0) > 0 ||
    Number(position.count ?? 0) > 0,
  );
}

function realTradingExitHint(trading = {}) {
  const execution = trading.executionSummary || {};
  if (execution.exitRealEnabled) return '退出监控实盘启用，TP/SL/源交易员卖出会发 SELL';
  if (execution.exitPlanOnly) return '退出监控仍是计划模式，不会发 SELL';
  return '退出监控等待持仓同步';
}

function realTradingConnectedHint(trading = {}) {
  const execution = trading.executionSummary || {};
  const position = trading.positionSummary || {};
  return `已有真实订单 ${formatNumber(execution.ordersSent ?? 0, 0)} 笔 / matched ${formatNumber(execution.matched ?? 0, 0)} 笔；当前真实持仓 ${formatNumber(position.count ?? 0, 0)} 个 / ${formatShares(position.totalShares ?? 0)}；${realTradingExitHint(trading)}。`;
}

function realTradingState(payload = {}) {
  const executionSummary = realExecutionSummary(payload);
  const positionSummary = realPositionSummary(payload);
  return {
    executionSummary,
    positionSummary,
    connected: realTradingConnected({ executionSummary, positionSummary }),
  };
}

function isolatedRuntimeValue(isolated = {}, trading = {}) {
  if (realTradingConnected(trading)) return 'CLOB已配置 / 实盘监控';
  if (isolated.runtimePrepared) return 'CLOB已配置 / 新开仓锁定';
  return '等待配置';
}

function isolatedRuntimeStatus(isolated = {}, trading = {}) {
  if (realTradingConnected(trading)) return 'ok';
  return isolated.runtimePrepared ? 'locked' : 'warn';
}

function isolatedRuntimeLiveHint(runtime = {}, trading = {}) {
  if (!realTradingConnected(trading)) return isolatedRuntimeHint(runtime);
  const blockers = blockerText(isolatedRuntimeBlockers(runtime));
  const adapter = runtime.adapter?.name || 'isolated_clob';
  const host = runtime.clob?.hostConfigured ? 'host 已配置' : 'host 待配置';
  const expandGate = blockers
    ? `新开仓扩容门控：${blockers}。`
    : '新开仓扩容仍按后端策略、限额和 kill switch 管理。';
  return `${adapter} / ${host}；真实交易已接入，${realTradingExitHint(trading)}；${expandGate}`;
}

function policyBlockers(policy = {}) {
  const blockers = policy.hardBlockers?.length ? policy.hardBlockers : policy.runtimePreflight?.blockers;
  return Array.isArray(blockers) ? blockers : [];
}

function walletGateValue(policy = {}, isolated = {}, trading = {}) {
  if (realTradingConnected(trading)) return '真实已接入 / 持仓监控';
  if (policy.realWalletExecutionAllowed) return '已自动放行';
  const blockers = policyBlockers(policy);
  if (blockers.length === 1 && blockers.includes('private_key_env_missing')) return '软件已开 / 缺私钥';
  if (isolated.runtimePrepared) return 'CLOB已配 / 新开仓锁定';
  return '真钱钱包锁定';
}

function walletGateStatus(policy = {}, trading = {}) {
  if (realTradingConnected(trading)) return 'ok';
  return policy.realWalletExecutionAllowed ? 'ok' : 'locked';
}

function walletGateHint(policy = {}, isolated = {}, fallback = '', trading = {}) {
  if (realTradingConnected(trading)) {
    const blockers = blockerText(policyBlockers(policy));
    const expandGate = blockers
      ? `新开仓扩容当前仍受门控：${blockers}。`
      : '新开仓扩容仍由后端证据门控、仓位上限和 kill switch 管理。';
    return `${realTradingConnectedHint(trading)} ${expandGate}`;
  }
  if (policy.realWalletExecutionAllowed) {
    return '已满足钱包门控；真实执行仍受 TP/SL、仓位、日亏损和 kill switch 约束。';
  }
  const blockers = blockerText(policyBlockers(policy));
  if (isolated.runtimePrepared) {
    return `CLOB adapter 和 host 已配置；新开仓扩容未放行是因为 ${blockers || fallback || '真钱执行闸门仍未通过'}。`;
  }
  return blockers || fallback || '先准备 isolated CLOB runtime，再由系统按证据门控判断是否进入 micro-live。';
}

function microProfitPolicyText(policy = {}) {
  const value = Number(policy.takeProfitUSDC ?? 0);
  return value > 0 ? `微利 ${formatUsd(value)} 先到先走；` : '';
}

function microProfitPositionText(row = {}) {
  const value = Number(row.takeProfitUSDC ?? 0);
  if (value <= 0) return '';
  const price = Number(row.takeProfitUSDCPrice ?? 0);
  const priceText = price > 0 ? `，约价格 ${formatNumber(price, 4)}` : '';
  return `或浮盈 ${formatUsd(value)}${priceText} 先走；`;
}

function policyValidation(payload, key) {
  const policy = firstObject(payload.copyTraderDiscovery).walletRiskPolicy || {};
  return policy.validation?.[key] && typeof policy.validation[key] === 'object' ? policy.validation[key] : {};
}

function shadowReplaySummary(payload) {
  const direct = summaryObject(payload.copyTraderShadowReplay);
  const validation = policyValidation(payload, 'shadowReplay');
  return { ...validation, ...direct };
}

function walkForwardSummary(payload) {
  const direct = summaryObject(payload.copyTraderWalkForward);
  const validation = policyValidation(payload, 'walkForward');
  const rows = asRows(payload.copyTraderWalkForward);
  return {
    ...validation,
    ...direct,
    batches: direct.batches ?? direct.windows ?? validation.batches ?? rows.length,
    rows: direct.rows ?? rows.length,
  };
}

function sourceBucketPayload(payload) {
  return firstObject(payload.copyTraderSourceBuckets);
}

function sourceBucketRows(payload) {
  const buckets = sourceBucketPayload(payload);
  const rows = [
    ...(Array.isArray(buckets.bySource) ? buckets.bySource : []),
    ...(Array.isArray(buckets.byTrader) ? buckets.byTrader : []),
    ...(Array.isArray(buckets.bySourceTrader) ? buckets.bySourceTrader : []),
    ...(Array.isArray(buckets.byMarketFamily) ? buckets.byMarketFamily : []),
    ...(Array.isArray(buckets.byEntryPriceBand) ? buckets.byEntryPriceBand : []),
    ...(Array.isArray(buckets.byTraderMarketFamily) ? buckets.byTraderMarketFamily : []),
    ...(Array.isArray(buckets.byTraderEntryPriceBand) ? buckets.byTraderEntryPriceBand : []),
  ];
  return rows.length ? rows : asRows(payload.copyTraderSourceBucketsLedger);
}

function sourceBucketSummary(payload) {
  const discovery = firstObject(payload.copyTraderDiscovery);
  const qualityGate = discovery.copyReplayQualityGate || {};
  const buckets = sourceBucketPayload(payload);
  const quarantine = buckets.quarantine || {};
  const microPolicy = buckets.microScalpPolicy || {};
  const rows = sourceBucketRows(payload);
  const quarantinedTraders = qualityGate.quarantinedTraders || quarantine.quarantinedTraders || [];
  const weakSources = qualityGate.weakSources || quarantine.weakSources || [];
  const weakSourceTraders = qualityGate.quarantinedSourceTraders || quarantine.quarantinedSourceTraders || [];
  const promotedMicroBuckets =
    Number(qualityGate.promotedCompositeBucketCount ?? 0) ||
    Number(microPolicy.promotedCompositeBucketCount ?? 0);
  const weakCount =
    Number(qualityGate.weakBucketCount ?? 0) ||
    rows.filter((row) => {
      const status = String(row.status || '').toUpperCase();
      return status.includes('QUARANTINE') || status.includes('WEAK');
    }).length;
  return {
    rows,
    quarantinedTraders,
    weakSources,
    weakSourceTraders,
    promotedMicroBuckets,
    weakCount,
  };
}

function replayStatusText(summary) {
  if (summary.passed === true || String(summary.status || '').toUpperCase() === 'PASSED') return '已通过';
  if (summary.present === false) return '未产出';
  if (summary.samples || summary.outcomeSamples || summary.rows) return '未通过';
  return '等待样本';
}

function replayStatus(summary) {
  if (summary.passed === true || String(summary.status || '').toUpperCase() === 'PASSED') return 'ok';
  if (summary.present === false) return 'locked';
  if (summary.samples || summary.outcomeSamples || summary.rows) return 'warn';
  return 'unknown';
}

function sourceBucketHint(bucketSummary) {
  if (bucketSummary.promotedMicroBuckets) {
    return `${formatNumber(bucketSummary.promotedMicroBuckets, 0)} 个交易员+市场/价带组合已证明适合微利重复；真钱候选只允许这些组合继续。`;
  }
  const blocked = [
    ...(bucketSummary.quarantinedTraders || []).map((item) => `交易员 ${item}`),
    ...(bucketSummary.weakSources || []).map((item) => `来源 ${item}`),
  ];
  if (blocked.length) return `${blocked.slice(0, 3).join(' / ')} 已隔离，后续候选会自动排除。`;
  return '暂未发现需要淘汰的弱来源；继续按来源分桶观察。';
}

function buildSimulationItems(payload) {
  const reviewSummary = summaryObject(payload.dailyReview);
  const polyDaily = polymarketDailyReview(payload);
  const copyReview =
    firstObject(payload.retunePlanner).copyTradingReview || polyDaily.copyTradingReview || {};
  const copyCapital = copyReview.capitalSimulation || {};
  const copyPlan = copyReview.iterationPlan || {};
  const copyTools = Array.isArray(copyReview.sourceToolkit) ? copyReview.sourceToolkit : [];
  const copyPolicy =
    copyReview.walletRiskPolicy || firstObject(payload.copyTraderDiscovery).walletRiskPolicy || {};
  const isolated = isolatedRuntime(payload);
  const copySourceMissing = copyReview.status === 'COPY_TRADER_DISCOVERY_SOURCE_MISSING';
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
  const canaryRows = countRows(payload.canaryLedger) || realOrderRows(payload).length;
  const governanceRows = countRows(payload.autoGovernanceLedger) || countRows(payload.autoGovernance);
  const positionSummary = realPositionSummary(payload);
  const executionSummary = realExecutionSummary(payload);
  const trading = { executionSummary, positionSummary };
  const executedPF = reviewSummary.polymarketExecutedPF;
  const shadowPF = reviewSummary.polymarketShadowPF;
  const quarantined = Boolean(reviewSummary.polymarketLossQuarantine);
  return [
    {
      label: '真实下注',
      value: executionSummary.ordersSent ? '已开启' : '未开启',
      hint: executionSummary.ordersSent
        ? `已发送 ${formatNumber(executionSummary.ordersSent, 0)} 笔，成交 ${formatNumber(executionSummary.matched, 0)} 笔；当前真实持仓 ${formatNumber(positionSummary.count, 0)} 个 / ${formatShares(positionSummary.totalShares)}。`
        : '真实钱包由后端证据门控，前端只显示结果。',
      status: executionSummary.ordersSent ? 'ok' : 'locked',
    },
    {
      label: '模拟在做什么',
      value: copySourceMissing
        ? '雷达评分 + 阻断验证（跟单来源缺失）'
        : copyReview.active
          ? '跟单 + 雷达评分 + 阻断验证'
          : '雷达评分 + 阻断验证',
      hint: copySourceMissing
        ? `${canaryRows} 条模拟执行记录；旧 copy_archive 只作历史对照，不能当作当前跟单来源`
        : `${canaryRows} 条模拟执行记录；跟单可覆盖任何市场模块，所有结果只写证据`,
    },
    {
      label: '跟单策略',
      value: copySourceMissing
        ? '来源缺失'
        : copyReview.active
          ? copyAgentPlanReady
            ? 'Agent 已生成重调方案'
            : copyReview.operatorStatusLabel || '正在模拟'
          : '暂无样本',
      hint: copyAgentPlanReady
        ? agentCopyText(copyReview.summary)
        : copyReview.summary ||
          '未发现跟单样本；Agent 会先收集授权频道、公开强账户或本地观察名单的 shadow 证据。',
      status: copySourceMissing
        ? 'warn'
        : copyReview.active
          ? copyAgentPlanReady
            ? 'ok'
            : 'warn'
          : 'unknown',
    },
    {
      label: '跟单资金模拟',
      value: copyReview.active
        ? `真实资金折算 ${formatSignedUsd(copyCapital.cashScaledPnlUSDC)} / 模拟账本 ${formatSignedUsd(copyCapital.shadowLedgerPnlUSDC)}`
        : '暂无估算',
      hint: copyReview.active
        ? `按真实可用现金 ${formatUsd(copyCapital.accountCashUSDC)}、配置模拟本金 ${formatUsd(copyCapital.configuredBankrollUSDC)} 等比例记账；这里只显示模拟盈亏，执行由自动钱包门控决定。`
        : '等待跟单 shadow 样本后再估算真实资金规模盈亏。',
      status: Number(copyCapital.cashScaledPnlUSDC) > 0 ? 'ok' : 'warn',
    },
    {
      label: '真钱钱包门控',
      value: walletGateValue(copyPolicy, isolated, trading),
      hint: walletGateHint(
        copyPolicy,
        isolated,
        blockerText(copyCapital.restoreLiveReviewBlockers) || '需要更多正收益样本；系统会自动判断。',
        trading,
      ),
      status: walletGateStatus(copyPolicy, trading),
    },
    {
      label: '跟单工具箱',
      value: copyTools.length
        ? `${copyTools.length} 类来源 / ${Array.isArray(copyPlan.copyUniverse) ? copyPlan.copyUniverse.length : 0} 个市场模块`
        : '待接入',
      hint: copySourceMissing
        ? '这些只是允许接入的来源类型；当前没有 fresh copied-trader ranking。'
        : copyTools.length
          ? '可用 Telegram 授权频道/导出、公开强账户、当前持仓和本地观察名单做 shadow 跟单。'
          : '跟单来源必须先转成只读证据，再进模拟账本。',
      status: copySourceMissing ? 'warn' : copyTools.length ? 'ok' : 'unknown',
    },
    {
      label: '下一轮跟单重调',
      value: copySourceMissing
        ? '先接入来源'
        : Array.isArray(copyPlan.candidateVariants) && copyPlan.candidateVariants.length
          ? `${copyPlan.candidateVariants.length} 个模拟变体`
          : '待生成',
      hint:
        agentCopyText(copyPlan.nextAction || copyPlan.diagnosis || copyReview.nextActions?.[0]) ||
        '下一轮会按来源质量、市场家族、流动性和结算表现拆分验证。',
      status: copySourceMissing || (copyPlan.retuneRequired && !copyAgentPlanReady) ? 'warn' : 'ok',
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
      hint: `${governanceRows} 条治理证据；前端只读，是否下注由后端自动门控`,
      status: quarantined ? 'warn' : inferStatus(payload.autoGovernance),
    },
  ];
}

function buildReviewItems(payload) {
  const summary = summaryObject(payload.dailyReview);
  const polyDaily = polymarketDailyReview(payload);
  const polySummary = polyDaily.summary || {};
  const copyReview =
    polyDaily.copyTradingReview || firstObject(payload.retunePlanner).copyTradingReview || {};
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
  const copySourceMissing = copyReview.status === 'COPY_TRADER_DISCOVERY_SOURCE_MISSING';
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
          : copySourceMissing
            ? '来源缺失'
            : copyReview.active
              ? copyReview.operatorStatusLabel || friendlyText(copyReview.status, '等待自动门控')
              : '暂无跟单样本',
      hint:
        copyRetuneDone || copyAgentPlanReady
          ? `${agentCopyText(copyQueue?.recommendation || copyPlan.nextAction || copyReview.summary || '跟单 shadow-only 重调方案已生成')} 当前资金估算 ${formatSignedUsd(copyReview.capitalSimulation?.cashScaledPnlUSDC)}。`
          : copySourceMissing
            ? copyReview.summary || '当前没有 fresh copied-trader ranking；旧 copy_archive 只作历史对照。'
            : copyReview.active
              ? `${copyReview.summary || ''} 当前资金估算 ${formatSignedUsd(copyReview.capitalSimulation?.cashScaledPnlUSDC)}。`
              : '跟单策略会按市场家族、来源质量和流动性继续收集 shadow 证据。',
      status:
        copyRetuneDone || copyAgentPlanReady
          ? 'ok'
          : copySourceMissing || copyReview.active
            ? 'warn'
            : 'unknown',
    },
    {
      label: '跟单迭代方案',
      value: copySourceMissing
        ? '先接入来源'
        : copyVariantCount
          ? `${copyVariantCount} 个 shadow-only 变体`
          : '等待重调证据',
      hint: copySourceMissing
        ? agentCopyText(copyReview.nextActions?.[0], '先生成当前强交易员只读排名，再做 shadow replay。')
        : acceptanceCriteriaText(copyPlan),
      status: copySourceMissing
        ? 'warn'
        : copyVariantCount || copyRetuneDone || copyAgentPlanReady
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
          ? '今日 shadow-only 重调已生成；达标后由自动钱包门控决定 micro-live。'
          : '红/黄先进入 shadow-only retune；达标后由自动钱包门控决定 micro-live。',
      status:
        polyRetuneDone || copyRetuneDone
          ? 'ok'
          : polySummary.retuneRed || polySummary.retuneYellow
            ? 'warn'
            : 'ok',
    },
  ];
}

function buildProgressItems(payload) {
  const copySummary = summaryObject(payload.copyTraderDiscovery);
  const discovery = firstObject(payload.copyTraderDiscovery);
  const source = discovery.sourceStatus || {};
  const telegram = source.telegramChannel || {};
  const telegramState = telegramIntakeState(telegram, copySummary);
  const policy = discovery.walletRiskPolicy || {};
  const retune = firstObject(payload.retunePlanner);
  const copyReview = retune.copyTradingReview || polymarketDailyReview(payload).copyTradingReview || {};
  const replay = shadowReplaySummary(payload);
  const walk = walkForwardSummary(payload);
  const buckets = sourceBucketSummary(payload);
  const isolated = isolatedRuntime(payload);
  const trading = realTradingState(payload);
  const latestAt = latestGeneratedAt([
    payload.copyTraderDiscovery,
    payload.copyTraderShadowReplay,
    payload.copyTraderWalkForward,
    payload.copyTraderSourceBuckets,
    payload.retunePlanner,
    payload.research,
    payload.isolatedClobRuntime,
    payload.canaryRun,
    payload.canaryExitMonitorRun,
  ]);
  const replaySamples = Number(replay.samples ?? replay.outcomeSamples ?? replay.validatedCandidates ?? 0);
  const walkBatches = Number(walk.batches ?? 0);

  return [
    {
      label: '强交易员发现',
      value: `${formatNumber(copySummary.eligibleTraders ?? 0, 0)} 可跟 / ${formatNumber(copySummary.rankedTraders ?? 0, 0)} 排名`,
      hint: `当前持仓候选 ${formatNumber(copySummary.shadowCandidates ?? 0, 0)}；Telegram 钱包 ${formatNumber(copySummary.telegramWallets ?? 0, 0)} / 信号 ${formatNumber(copySummary.telegramSignals ?? 0, 0)}。`,
      status: Number(copySummary.shadowCandidates ?? 0) ? 'ok' : 'warn',
    },
    {
      label: '最新证据',
      value: formatDateTime(latestAt),
      hint: '前端只读强交易员发现、回放、walk-forward、来源分桶和重调计划。',
      status: latestAt ? 'ok' : 'warn',
    },
    {
      label: 'Shadow replay',
      value: `${replayStatusText(replay)} / ${formatNumber(replaySamples, 0)} 样本`,
      hint: replaySamples
        ? `PF ${formatNumber(replay.profitFactor, 4)}；净盈亏 ${formatSignedUsd(replay.netPnlUSDC)}；未结算 ${formatNumber(replay.openOrUnresolved ?? 0, 0)}。`
        : copyReview.summary || '等待跟单候选写入回放账本。',
      status: replayStatus(replay),
    },
    {
      label: 'Walk-forward',
      value: walkBatches
        ? `${replayStatusText(walk)} / ${formatNumber(walkBatches, 0)} 批 / ${formatPercent(walk.passRatePct ?? 0)}`
        : '等待回放样本',
      hint: walkBatches
        ? `净盈亏 ${formatSignedUsd(walk.netPnlUSDC)}；阻断 ${blockerText(walk.blockers) || '无硬阻断'}。`
        : 'shadow replay 产出后自动做分批前推验证。',
      status: replayStatus(walk),
    },
    {
      label: '微利分桶',
      value: `${formatNumber(buckets.promotedMicroBuckets, 0)} 可跟 / ${formatNumber(buckets.weakCount, 0)} 弱桶`,
      hint: sourceBucketHint(buckets),
      status: buckets.promotedMicroBuckets ? 'ok' : buckets.weakCount ? 'warn' : 'unknown',
    },
    {
      label: 'Telegram来源',
      value: telegramState.value,
      hint: telegramState.hint,
      status: telegramState.status,
    },
    {
      label: '真钱钱包',
      value: walletGateValue(policy, isolated, trading),
      hint: walletGateHint(
        policy,
        isolated,
        policy.nextAction ||
          'discovery -> shadow replay -> walk-forward 全部通过后，系统自动决定是否放开钱包。',
        trading,
      ),
      status: walletGateStatus(policy, trading),
    },
    {
      label: 'Isolated CLOB',
      value: isolatedRuntimeValue(isolated, trading),
      hint: isolatedRuntimeLiveHint(isolated, trading),
      status: isolatedRuntimeStatus(isolated, trading),
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
  const copySummary = summaryObject(payload.copyTraderDiscovery);
  const copySource = firstObject(payload.copyTraderDiscovery).sourceStatus || {};
  const telegram = copySource.telegramChannel || {};
  const telegramState = telegramIntakeState(telegram, copySummary);
  const policy = firstObject(payload.copyTraderDiscovery).walletRiskPolicy || {};
  const isolated = isolatedRuntime(payload);
  const replay = shadowReplaySummary(payload);
  const walk = walkForwardSummary(payload);
  const buckets = sourceBucketSummary(payload);
  const wallet = walletBalance(payload);
  const replaySamples = Number(replay.samples ?? replay.outcomeSamples ?? replay.validatedCandidates ?? 0);
  const walkBatches = Number(walk.batches ?? 0);
  const positionSummary = realPositionSummary(payload);
  const executionSummary = realExecutionSummary(payload);
  const trading = { executionSummary, positionSummary };
  return [
    {
      label: '真实持仓',
      value: `${formatNumber(positionSummary.count, 0)} 个 / ${formatShares(positionSummary.totalShares)}`,
      hint: positionSummary.count
        ? `当前价值 ${formatUsd(positionSummary.currentValue)}，浮动 ${formatSignedUsd(positionSummary.unrealizedPnl)}`
        : '真实钱包当前没有可显示持仓',
      status: positionSummary.count ? 'ok' : 'warn',
    },
    {
      label: '真实成交',
      value: `${formatNumber(executionSummary.matched, 0)} matched`,
      hint: `订单 ${formatNumber(executionSummary.ordersSent, 0)}；退出信号 ${formatNumber(executionSummary.exitSignals, 0)}；已退出 ${formatNumber(executionSummary.exitsSent, 0)}。`,
      status: executionSummary.ordersSent ? 'ok' : 'warn',
    },
    {
      label: '钱包余额',
      value: wallet === null ? '未同步' : formatCurrencyDisplay(wallet, 'USD'),
      hint: wallet === null ? '只读钱包余额还没有回灌' : '真实钱包余额',
      status: wallet === null ? 'warn' : 'ok',
    },
    {
      label: '强交易员',
      value: formatNumber(copySummary.rankedTraders ?? 0, 0),
      hint: `公开排行榜钱包 ${formatNumber(copySummary.candidateWallets ?? 0, 0)} 个`,
      status: Number(copySummary.rankedTraders ?? 0) ? 'ok' : 'warn',
    },
    {
      label: '可跟来源',
      value: formatNumber(copySummary.eligibleTraders ?? 0, 0),
      hint: `Top ${copySummary.topTrader || '等待排名'} / 分数 ${formatNumber(copySummary.topScore ?? 0, 2)}`,
      status: Number(copySummary.eligibleTraders ?? 0) ? 'ok' : 'warn',
    },
    {
      label: 'Replay PF',
      value: replaySamples ? formatNumber(replay.profitFactor, 4) : '等待回放',
      hint: replaySamples
        ? `${formatNumber(replaySamples, 0)} 个已验证样本，净盈亏 ${formatSignedUsd(replay.netPnlUSDC)}`
        : 'shadow replay 尚未产出可展示样本',
      status: replayStatus(replay),
    },
    {
      label: 'Walk-forward',
      value: walkBatches ? formatPercent(walk.passRatePct ?? 0) : '等待批次',
      hint: walkBatches
        ? `${formatNumber(walkBatches, 0)} 批，净盈亏 ${formatSignedUsd(walk.netPnlUSDC)}`
        : '回放通过后自动分批验证',
      status: replayStatus(walk),
    },
    {
      label: '弱源隔离',
      value: formatNumber(buckets.weakCount, 0),
      hint: sourceBucketHint(buckets),
      status: buckets.weakCount ? 'warn' : 'ok',
    },
    {
      label: '跟单候选',
      value: formatNumber(copySummary.shadowCandidates ?? 0, 0),
      hint: `当前持仓 ${formatNumber(copySummary.currentPositions ?? 0, 0)} 个，只进 shadow`,
      status: Number(copySummary.shadowCandidates ?? 0) ? 'ok' : 'warn',
    },
    {
      label: 'Telegram来源',
      value: telegramState.value,
      hint: telegramState.hint,
      status: telegramState.status,
    },
    {
      label: '真实钱包TP/SL',
      value: `${formatNumber(policy.takeProfitPct ?? 0, 0)}% / ${formatNumber(policy.stopLossPct ?? 0, 0)}%`,
      hint: `单笔上限 ${formatUsd(policy.maxPositionUSDC ?? 0)}；${microProfitPolicyText(policy)}${walletGateHint(policy, isolated, '', trading)}`,
      status: walletGateStatus(policy, trading),
    },
    {
      label: 'Isolated CLOB',
      value: isolatedRuntimeValue(isolated, trading),
      hint: isolatedRuntimeLiveHint(isolated, trading),
      status: isolatedRuntimeStatus(isolated, trading),
    },
  ];
}

function buildRadarItems(payload) {
  const radarScore = bestScore(payload.radar);
  const worker = payload.worker;
  return [
    { label: '雷达状态', value: friendlyModeLabel(payload.radar), status: inferStatus(payload.radar) },
    { label: '雷达数量', value: countRows(payload.radar) },
    { label: '最高评分', value: radarScore === null ? DATA_PENDING : formatNumber(radarScore, 3) },
    { label: '后台任务', value: friendlyModeLabel(worker), status: inferStatus(worker) },
    {
      label: '最近更新',
      value: getPath(worker, ['updated_at', 'timestamp', 'last_run_at', 'last_updated'], NOT_SYNCED),
    },
    { label: '搜索词', value: getPath(payload.search, ['query', 'q', 'keyword'], NO_SIGNAL) },
  ];
}

function buildCopyTraderItems(payload) {
  const discovery = firstObject(payload.copyTraderDiscovery);
  const summary = discovery.summary || {};
  const source = discovery.sourceStatus || {};
  const topTrader = Array.isArray(discovery.traders) ? discovery.traders[0] || {} : {};
  const telegram = source.telegramChannel || {};
  const telegramState = telegramIntakeState(telegram, summary);
  const policy = discovery.walletRiskPolicy || {};
  const replay = shadowReplaySummary(payload);
  const walk = walkForwardSummary(payload);
  const isolated = isolatedRuntime(payload);
  const trading = realTradingState(payload);
  const replaySamples = Number(replay.samples ?? replay.outcomeSamples ?? replay.validatedCandidates ?? 0);
  const walkBatches = Number(walk.batches ?? 0);
  const runtimeBlockers = blockerText(policyBlockers(policy));
  return [
    {
      label: '发现状态',
      value: friendlyText(discovery.status || 'UNKNOWN'),
      hint: '只读读取公开排行榜、已结算仓位、当前持仓和最近活动',
      status: inferStatus(payload.copyTraderDiscovery),
    },
    {
      label: '强交易员排行',
      value: `${formatNumber(summary.rankedTraders ?? 0, 0)} 个`,
      hint: `可跟 ${formatNumber(summary.eligibleTraders ?? 0, 0)}；候选钱包 ${formatNumber(summary.candidateWallets ?? 0, 0)}`,
      status: Number(summary.eligibleTraders ?? 0) ? 'ok' : 'warn',
    },
    {
      label: 'Top trader',
      value: topTrader.userName || summary.topTrader || '等待排名',
      hint: `copyScore ${formatNumber(topTrader.copyScore ?? summary.topScore ?? 0, 2)} / 月PnL ${formatUsd(topTrader.monthPnl ?? 0)}`,
      status: topTrader.eligibleForShadowCopy ? 'ok' : 'warn',
    },
    {
      label: '当前可跟持仓',
      value: `${formatNumber(summary.shadowCandidates ?? 0, 0)} 个`,
      hint: realTradingConnected(trading)
        ? '已有 micro-live 真实仓位；新增候选仍按证据门控、TP/SL 和仓位上限自动判断'
        : policy.realWalletExecutionAllowed
          ? '已通过自动钱包门控；候选仍必须带 TP/SL 和仓位上限'
          : '先写 shadow copy watch，未通过自动钱包门控前不下单',
      status: Number(summary.shadowCandidates ?? 0) ? 'ok' : 'warn',
    },
    {
      label: 'Telegram频道',
      value: telegramState.value,
      hint: telegramState.hint,
      status: telegramState.status,
    },
    {
      label: 'Shadow replay',
      value: `${replayStatusText(replay)} / ${formatNumber(replaySamples, 0)} 样本`,
      hint: replaySamples
        ? `胜负 ${formatNumber(replay.wins ?? 0, 0)}W/${formatNumber(replay.losses ?? 0, 0)}L；PF ${formatNumber(replay.profitFactor, 4)}。`
        : '等待 Telegram 跟单信号结算后入账。',
      status: replayStatus(replay),
    },
    {
      label: 'Walk-forward',
      value: walkBatches
        ? `${formatNumber(walkBatches, 0)} 批 / ${formatPercent(walk.passRatePct ?? 0)}`
        : '等待批次',
      hint: walkBatches
        ? `分批净盈亏 ${formatSignedUsd(walk.netPnlUSDC)}；${replayStatusText(walk)}。`
        : 'shadow replay 有足够结算样本后自动运行。',
      status: replayStatus(walk),
    },
    {
      label: '真实钱包止盈止损',
      value: `${formatNumber(policy.takeProfitPct ?? 0, 0)}% TP / ${formatNumber(policy.stopLossPct ?? 0, 0)}% SL`,
      hint: `${microProfitPolicyText(policy)}${walletGateHint(policy, isolated, '', trading)}；追踪止损 ${formatNumber(policy.trailingStopPct ?? 0, 0)}%；单笔 ${formatUsd(policy.maxPositionUSDC ?? 0)}，日亏损上限 ${formatUsd(policy.maxDailyLossUSDC ?? 0)}。`,
      status: walletGateStatus(policy, trading),
    },
    {
      label: '下一步',
      value: realTradingConnected(trading)
        ? '监控持仓 / 扩容验证'
        : policy.realWalletExecutionAllowed
          ? 'micro-live 受限执行'
          : replay.passed && walk.passed
            ? '真钱钱包待解锁'
            : Number(summary.shadowCandidates ?? 0)
              ? '继续回放验证'
              : '继续找来源',
      hint:
        runtimeBlockers || agentCopyText(discovery.nextActions?.[0], '把强交易员当前持仓写入跟单回放账本。'),
      status:
        realTradingConnected(trading) || policy.realWalletExecutionAllowed
          ? 'ok'
          : replay.passed && walk.passed
            ? 'warn'
            : 'ok',
    },
  ];
}

function buildRealPositionItems(payload) {
  const summary = realPositionSummary(payload);
  const row = summary.first || {};
  const sideText = [row.side || 'BUY', row.outcome || ''].filter(Boolean).join(' ');
  const floating =
    summary.unrealizedPnl === null || summary.unrealizedPnl === undefined
      ? DATA_PENDING
      : formatSignedUsd(summary.unrealizedPnl);
  return [
    {
      label: '真实持仓数量',
      value: summary.count
        ? `${formatNumber(summary.count, 0)} 个 / ${formatShares(summary.totalShares)}`
        : '暂无持仓',
      hint: summary.count
        ? `入场价值 ${formatUsd(summary.entryValue)}；当前价值 ${formatUsd(summary.currentValue)}；浮动 ${floating}。`
        : '没有从真实钱包监控读到未退出仓位。',
      status: summary.count ? 'ok' : 'warn',
    },
    {
      label: '目前持仓',
      value: row.question || '暂无持仓',
      hint: summary.count
        ? `${sideText || '方向待同步'}；源持仓 ${sourcePositionStatusText(row.sourcePositionStatus)}。`
        : '等待 canary executor 或 exit monitor 写入持仓。',
      status: summary.count ? 'ok' : 'warn',
    },
    {
      label: '跟单交易员',
      value: row.copiedTrader || row.sourceTrader || '待同步',
      hint: summary.count
        ? `钱包 ${shortenId(row.sourceProxyWallet, 10, 8, '待同步')}；${sourcePositionStatusText(row.sourcePositionStatus)}。`
        : '暂无源交易员信息。',
      status: row.sourcePositionPresent === false ? 'warn' : summary.count ? 'ok' : 'warn',
    },
    {
      label: '价格状态',
      value: summary.count
        ? `入场 ${formatNumber(row.entryPrice, 4)} / 当前 ${formatNumber(row.currentExitPrice, 4)}`
        : DATA_PENDING,
      hint: summary.count
        ? `触发价：${microProfitPositionText(row)}涨到 ${formatNumber(row.takeProfitPrice, 4)} 止盈；跌到 ${formatNumber(row.stopLossPrice, 4)} 止损；回落到 ${Number(row.trailingStopPrice) ? formatNumber(row.trailingStopPrice, 4) : '未激活'} 追踪止损。`
        : '没有持仓价格可展示。',
      status: summary.count ? 'ok' : 'warn',
    },
    {
      label: '持仓状态',
      value: summary.count ? realPositionStatusText(row.decision || row.orderStatus || 'HOLD') : '无持仓',
      hint: summary.count
        ? `${realPositionStatusText(row.reason || row.adapterStatus || 'exit_not_triggered')}；${sourcePositionStatusText(row.sourcePositionStatus)}。`
        : '无需退出监控动作。',
      status: summary.count ? 'ok' : 'warn',
    },
    {
      label: '订单证据',
      value: summary.count ? shortenId(row.orderID) : DATA_PENDING,
      hint: summary.count
        ? `订单状态 ${friendlyText(row.orderStatus || row.adapterStatus || 'matched')}；tx ${shortenId(row.txHash, 10, 8, '待同步')}。`
        : '暂无真实订单 id。',
      status: summary.count ? 'ok' : 'warn',
    },
  ];
}

function buildRealExecutionItems(payload) {
  const summary = realExecutionSummary(payload);
  const order = summary.orderRows[0] || {};
  const position = realPositionSummary(payload).first || {};
  return [
    {
      label: '执行模式',
      value: summary.ordersSent ? friendlyText(summary.mode || 'REAL_ORDER_ATTEMPTED') : '等待订单',
      hint: realExecutionHint(summary),
      status: summary.ordersSent ? 'ok' : 'warn',
    },
    {
      label: '成交记录',
      value: `${formatNumber(summary.ordersSent, 0)} 发送 / ${formatNumber(summary.matched, 0)} matched`,
      hint: order.question
        ? `${order.side || 'BUY'} ${order.outcome || ''}；${formatUsd(order.stakeUSDC)}，${formatShares(order.size)}。`
        : '没有最新成交订单。',
      status: summary.ordersSent ? 'ok' : 'warn',
    },
    {
      label: '退出监控',
      value: summary.exitSignals ? `${formatNumber(summary.exitSignals, 0)} 个退出信号` : '持仓中未触发',
      hint: `跟踪 ${formatNumber(summary.positionsTracked, 0)} 个持仓；已发送退出 ${formatNumber(summary.exitsSent, 0)} 笔；当前决策 ${realPositionStatusText(position.decision || 'HOLD')}。`,
      status: summary.exitsSent ? 'ok' : 'warn',
    },
    {
      label: '最近订单',
      value: shortenId(responseOrderId(order)),
      hint: responseTxHash(order)
        ? `tx ${shortenId(responseTxHash(order), 10, 8)}；状态 ${friendlyText(responseStatus(order))}。`
        : '订单 hash 待同步。',
      status: summary.ordersSent ? 'ok' : 'warn',
    },
    {
      label: '账本同步',
      value: `${formatNumber(countRows(payload.canaryPositionLedger), 0)} 持仓 / ${formatNumber(countRows(payload.canaryExitLedger), 0)} 退出记录`,
      hint: '前端读取 executor run、position ledger、exit monitor 和 exit ledger。',
      status: countRows(payload.canaryPositionLedger) || summary.positionsTracked ? 'ok' : 'warn',
    },
  ];
}

function buildAiScoreItems(payload) {
  const score = payload.aiScore;
  const governance = payload.autoGovernance;
  return [
    { label: 'AI评分状态', value: friendlyModeLabel(score), status: inferStatus(score) },
    { label: '分数', value: bestScore(score) === null ? DATA_PENDING : formatNumber(bestScore(score), 3) },
    {
      label: '置信度',
      value: formatPercent(getPath(score, ['confidence', 'decision.confidence', 'score.confidence'], null)),
    },
    {
      label: '建议',
      value: friendlyText(getPath(score, ['recommendation', 'decision', 'action', 'side'], '只读观察')),
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
      value: friendlyText(getPath(contract, ['version', 'schemaVersion', 'contract_version'], NOT_SYNCED)),
    },
    { label: '最近运行', value: friendlyModeLabel(run), status: inferStatus(run) },
    { label: '模拟记录', value: `${ledgerRows} 条`, hint: '只写模拟证据，不写钱包或订单' },
    { label: '运行模式', value: friendlyText(getPath(run, ['mode', 'run_mode', 'dry_run'], '只读研究')) },
    { label: '运行时间', value: getPath(run, ['last_run_at', 'updated_at', 'timestamp'], NOT_SYNCED) },
    { label: '真实执行', value: '自动钱包门控', status: 'locked' },
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
      value: getPath(cross, ['asset', 'symbol', 'linked_symbol', 'market.asset'], DATA_PENDING),
    },
    { label: '主题', value: getPath(analysis, ['theme', 'macro_theme', 'market.theme'], DATA_PENDING) },
    { label: '分析理由', value: getPath(analysis, ['reasoning', 'summary', 'thesis'], DATA_PENDING) },
  ];
}

function normalizeMarketRows(rows) {
  return rows.slice(0, 12).map((row) => ({
    市场: row.question || row.title || row.eventTitle || row.slug || DATA_PENDING,
    概率: formatPercent(row.probability ?? row.yesPrice),
    流动性: formatUsd(row.liquidity ?? row.clobLiquidityUsd),
    '24h成交': formatUsd(row.volume24h ?? row.volume_24h),
    总成交: formatUsd(row.volume),
    点差: row.clobSpread !== undefined ? formatPercent(row.clobSpread) : formatNumber(row.spread, 4),
    评分: row.aiRuleScore ?? row.ruleScore ?? row.score ?? DATA_PENDING,
    建议: friendlyText(row.recommendedAction || row.action, '只读观察'),
    来源: friendlyText(row.source || row.category, '预测市场'),
  }));
}

function normalizeGenericRows(rows) {
  return rows.slice(0, 12).map((row) => ({
    名称:
      row.userName ||
      row.trader ||
      row.bucketKey ||
      row.question ||
      row.title ||
      row.marketTitle ||
      row.market ||
      row.name ||
      row.id ||
      DATA_PENDING,
    状态: friendlyText(row.status || row.state || row.decision || row.action || row.exitReason),
    金额:
      row.netPnlUSDC !== undefined
        ? formatSignedUsd(row.netPnlUSDC)
        : row.amount !== undefined
          ? formatUsd(row.amount)
          : row.stake !== undefined
            ? formatUsd(row.stake)
            : DATA_PENDING,
    分数: row.copyScore ?? row.profitFactor ?? row.score ?? row.aiScore ?? row.confidence ?? DATA_PENDING,
    说明: compactDisplay(row.reason || row.summary || row.note || row.marketTitle || row.source || row, 160),
  }));
}

function normalizeReplayRows(rows) {
  return rows.slice(0, 24).map((row) => ({
    交易员: row.trader || row.userName || DATA_PENDING,
    市场: row.marketTitle || row.marketSlug || row.matchedQuestion || DATA_PENDING,
    方向: friendlyText(row.side || row.outcome, DATA_PENDING),
    结果: friendlyText(row.exitReason || row.status, DATA_PENDING),
    盈亏: formatSignedUsd(row.netPnlUSDC),
    回报: formatPercent(row.returnPct),
    入场: row.entryPrice !== undefined ? formatNumber(row.entryPrice, 4) : DATA_PENDING,
    出场: row.exitPrice !== undefined ? formatNumber(row.exitPrice, 4) : DATA_PENDING,
    时间: formatDateTime(row.messageDate || row.timestamp || row.time),
  }));
}

function normalizeWalkForwardRows(rows) {
  return rows.slice(0, 12).map((row) => ({
    批次: row.batch ?? row.window ?? DATA_PENDING,
    样本: formatNumber(row.samples ?? row.rows ?? 0, 0),
    净盈亏: formatSignedUsd(row.netPnlUSDC),
    PF: formatNumber(row.profitFactor, 4),
    结果: row.passed === true || String(row.passed).toLowerCase() === 'true' ? '已通过' : '未通过',
  }));
}

function normalizeSourceBucketRows(rows) {
  return rows.slice(0, 24).map((row) => ({
    分桶: row.bucketKey || row.source || row.trader || DATA_PENDING,
    类型: friendlyText(row.bucketType || 'source', '来源'),
    状态: friendlyText(row.status || row.action, '收集中'),
    样本: formatNumber(row.samples ?? row.outcomeSamples ?? 0, 0),
    胜负: `${formatNumber(row.wins ?? 0, 0)}W/${formatNumber(row.losses ?? 0, 0)}L`,
    PF: formatNumber(row.profitFactor, 4),
    净盈亏: formatSignedUsd(row.netPnlUSDC),
    动作: friendlyText(row.action, '继续观察'),
  }));
}

function normalizeRealPositionRows(rows) {
  return rows.slice(0, 24).map((row) => {
    const size = Number(row.positionSize ?? row.size);
    const entryPrice = Number(row.entryPrice);
    const currentPrice = Number(row.currentExitPrice);
    const floating =
      Number.isFinite(size) && Number.isFinite(entryPrice) && Number.isFinite(currentPrice)
        ? (currentPrice - entryPrice) * size
        : null;
    return {
      状态: realPositionStatusText(row.decision || row.orderStatus || row.adapterStatus, DATA_PENDING),
      市场: row.question || row.marketTitle || row.marketId || DATA_PENDING,
      方向: [row.side || 'BUY', row.outcome || ''].filter(Boolean).join(' '),
      数量: formatShares(row.positionSize ?? row.size),
      入场: formatNumber(row.entryPrice, 4),
      当前: row.currentExitPrice === null ? DATA_PENDING : formatNumber(row.currentExitPrice, 4),
      浮动: floating === null ? DATA_PENDING : formatSignedUsd(floating),
      止盈: formatNumber(row.takeProfitPrice, 4),
      微利止盈: Number(row.takeProfitUSDC) > 0 ? formatUsd(row.takeProfitUSDC) : DATA_PENDING,
      止损: formatNumber(row.stopLossPrice, 4),
      跟单交易员: row.copiedTrader || row.sourceTrader || DATA_PENDING,
      源持仓: sourcePositionStatusText(row.sourcePositionStatus),
      订单: shortenId(row.orderID || row.orderId),
      说明: realPositionStatusText(row.reason || row.adapterStatus || row.orderStatus, DATA_PENDING),
    };
  });
}

function normalizeRealExecutionRows(rows) {
  return rows.slice(0, 24).map((row) => ({
    类型: row.type || '真实记录',
    状态: String(row.type || '').includes('退出')
      ? realPositionStatusText(row.status || row.adapterStatus || row.reason, DATA_PENDING)
      : friendlyText(row.status || row.adapterStatus || row.reason, DATA_PENDING),
    市场: row.question || row.marketId || DATA_PENDING,
    方向:
      row.side === 'SELL_CHECK'
        ? '退出检查'
        : [row.side, row.outcome].filter(Boolean).join(' ') || DATA_PENDING,
    金额: row.stakeUSDC !== undefined && row.stakeUSDC !== '' ? formatUsd(row.stakeUSDC) : DATA_PENDING,
    数量: formatShares(row.size),
    价格: row.price !== undefined && row.price !== '' ? formatNumber(row.price, 4) : DATA_PENDING,
    订单: shortenId(row.orderID || row.orderId),
    Tx: shortenId(row.txHash, 10, 8),
    时间: formatDateTime(row.generatedAt || row.generated_at),
    说明: friendlyText(row.reason || row.adapterStatus, DATA_PENDING),
  }));
}

export function buildPolymarketModel(payload = {}) {
  const model = {
    safety: POLYMARKET_SAFETY_DEFAULTS,
    metrics: buildMetrics(payload),
    endpoints: buildEndpoints(payload),
    safetyItems: buildSafetyItems(payload),
    copyTraderItems: buildCopyTraderItems(payload),
    realPositionItems: buildRealPositionItems(payload),
    realExecutionItems: buildRealExecutionItems(payload),
    radarItems: buildRadarItems(payload),
    aiScoreItems: buildAiScoreItems(payload),
    canaryItems: buildCanaryItems(payload),
    crossLinkageItems: buildCrossLinkageItems(payload),
    simulationItems: buildSimulationItems(payload),
    reviewItems: buildReviewItems(payload),
    progressItems: buildProgressItems(payload),
    tables: {
      realPositions: normalizeRealPositionRows(realPositionRows(payload)),
      realExecutions: normalizeRealExecutionRows(realExecutionRows(payload)),
      copyTraders: normalizeGenericRows(firstObject(payload.copyTraderDiscovery).traders || []),
      copyShadowCandidates: normalizeGenericRows(
        firstObject(payload.copyTraderDiscovery).shadowCandidates || [],
      ),
      copyTraderDiscoveryLedger: normalizeGenericRows(asRows(payload.copyTraderDiscoveryLedger)),
      copyTraderShadowReplay: normalizeReplayRows(
        asRows(payload.copyTraderShadowReplayLedger).length
          ? asRows(payload.copyTraderShadowReplayLedger)
          : asRows(payload.copyTraderShadowReplay),
      ),
      copyTraderOutcomeLedger: normalizeReplayRows(asRows(payload.copyTraderOutcomeLedger)),
      copyTraderWalkForward: normalizeWalkForwardRows(
        asRows(payload.copyTraderWalkForwardLedger).length
          ? asRows(payload.copyTraderWalkForwardLedger)
          : asRows(payload.copyTraderWalkForward),
      ),
      copyTraderSourceBuckets: normalizeSourceBucketRows(sourceBucketRows(payload)),
      isolatedClobRuntime: normalizeGenericRows(asRows(payload.isolatedClobRuntimeLedger)),
      search: normalizeMarketRows(asRows(payload.search)),
      radar: normalizeMarketRows(asRows(payload.radar)),
      candidateQueue: normalizeMarketRows(asRows(payload.candidateQueue)),
      aiScore: normalizeGenericRows(asRows(payload.aiScore)),
      dryRunOrders: normalizeGenericRows(asRows(payload.dryRunOrders)),
      outcomeWatcher: normalizeGenericRows(asRows(payload.outcomeWatcher)),
      executionGate: normalizeGenericRows(asRows(payload.executionGate)),
      markets: normalizeMarketRows(asRows(payload.markets)),
      assets: normalizeGenericRows(asRows(payload.assets)),
      history: normalizeGenericRows(asRows(payload.history)),
      research: normalizeGenericRows(asRows(payload.research)),
      realTrades: normalizeGenericRows(asRows(payload.realTrades)),
      cross: normalizeGenericRows(asRows(payload.cross)),
      canaryLedger: normalizeGenericRows(asRows(payload.canaryLedger)),
      autoGovernanceLedger: normalizeGenericRows(asRows(payload.autoGovernanceLedger)),
    },
    raw: payload,
  };
  return model;
}
