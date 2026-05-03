import { formatDisplayValue, humanizeStatus } from '../../utils/displayText.js';

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
  const account = unwrap(raw.account) || {};
  const snapshot = unwrap(raw.snapshot) || {};
  const positions = rowsFromPayload(raw.positions);
  const orders = rowsFromPayload(raw.orders);
  const symbols = rowsFromPayload(raw.symbols).length
    ? rowsFromPayload(raw.symbols)
    : rowsFromPayload(snapshot.symbols);
  const closeHistory = rowsFromPayload(raw.closeHistory);
  const tradeJournal = rowsFromPayload(raw.tradeJournal);
  const safety = safetyEnvelope(raw);

  const bridgeStatus = pick(
    { status, raw },
    ['status.status', 'status.bridge_status', 'status.connected', 'raw.status.ok'],
    present(raw.status) ? 'available' : 'missing',
  );

  return {
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
    currency: pick({ account, snapshot }, ['account.currency', 'snapshot.account.currency'], '—'),
    positions,
    orders,
    symbols,
    closeHistory,
    tradeJournal,
    dailyReview: raw.dailyReview || {},
    dailyAutopilot: raw.dailyAutopilot || {},
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
  };
}

export function buildMt5Metrics(snapshot) {
  return [
    { label: '连接状态', value: humanizeStatus(snapshot.bridgeStatus), hint: 'HFM EA 快照' },
    { label: '账户净值', value: format(snapshot.equity), hint: snapshot.currency },
    { label: '账户余额', value: format(snapshot.balance), hint: snapshot.server },
    { label: '当前持仓', value: snapshot.positions.length, hint: '实盘账户' },
    { label: '历史成交', value: snapshot.closeHistory.length, hint: '平仓记录' },
    { label: '观察品种', value: snapshot.symbols.length, hint: '实盘与模拟品种池' },
  ];
}

export function buildSafetyItems(snapshot) {
  return [
    {
      label: '只读监控',
      value: snapshot.readOnly ? '开启' : '未知',
      status: boolLike(snapshot.readOnly, 'ok', 'warn'),
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

export function buildAccountItems(snapshot) {
  return [
    { label: '账号', value: snapshot.login },
    { label: '服务器', value: snapshot.server },
    {
      label: '终端',
      value: typeof snapshot.terminal === 'object' ? snapshot.terminal.name || 'HFM MT5' : snapshot.terminal,
    },
    { label: '余额', value: format(snapshot.balance), hint: snapshot.currency },
    { label: '净值', value: format(snapshot.equity), hint: snapshot.currency },
    { label: '保证金', value: format(snapshot.margin), hint: snapshot.currency },
    { label: '可用保证金', value: format(snapshot.freeMargin), hint: snapshot.currency },
  ];
}

function compactRow(row, fields) {
  const out = {};
  for (const [label, candidates] of Object.entries(fields)) {
    out[label] = format(pick(row, candidates, ''));
  }
  return out;
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
  return snapshot.closeHistory.slice(0, 40).map((row) =>
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
  return snapshot.tradeJournal.slice(0, 40).map((row) =>
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
  const sourceRows = queue.length ? queue : completed;
  if (!sourceRows.length) {
    return [{ 任务: 'MT5 今日待办', 状态: '已完成或无待办', 结论: '当前没有阻塞项' }];
  }
  return sourceRows.slice(0, 10).map((row) => ({
    任务: row.candidateId || row.type || '待办任务',
    路线: row.routeKey || row.strategy || '—',
    状态: queue.length ? humanizeStatus(row.state || '待处理') : '已完成',
    结论: humanizeStatus(row.resultStatus || row.statusLabel || '等待报告'),
  }));
}

export function buildMt5ReviewRows(snapshot) {
  const pnl = snapshot.dailyReview?.dailyPnl || {};
  const summary = snapshot.dailyReview?.summary || {};
  return [
    {
      项目: '昨日平仓',
      结果: `${pnl.closedTrades ?? summary.dailyClosedTrades ?? 0} 笔 / ${format(pnl.netUSC ?? summary.dailyNetUSC ?? 0)} USC`,
      建议: pnl.requiresReview ? '需要人工复核亏损来源' : '无需新增代码迭代',
    },
    {
      项目: '参数实验',
      结果: `完成 ${summary.dailyTesterCompletedCount || 0} 项 / 延后 ${summary.paramDeferredCount || 0} 项`,
      建议: summary.promotionReviewCount ? '有升实盘候选需人工确认' : '暂无可升实盘项',
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
