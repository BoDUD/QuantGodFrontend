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
  if (Array.isArray(payload?.orders)) return payload.orders;
  if (Array.isArray(payload?.symbols)) return payload.symbols;
  if (Array.isArray(payload?.data?.positions)) return payload.data.positions;
  if (Array.isArray(payload?.data?.orders)) return payload.data.orders;
  if (Array.isArray(payload?.data?.symbols)) return payload.data.symbols;
  return [];
}

function present(value) {
  if (Array.isArray(value)) return value.length > 0;
  if (isObject(value)) return Object.keys(value).length > 0;
  return value !== undefined && value !== null && value !== '';
}

function format(value) {
  if (value === undefined || value === null || value === '') return '—';
  if (typeof value === 'number') return Number.isFinite(value) ? value.toFixed(Math.abs(value) >= 10 ? 1 : 2) : '—';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (Array.isArray(value)) return `${value.length} rows`;
  if (isObject(value)) return `${Object.keys(value).length} keys`;
  return String(value);
}

function boolLike(value, trueStatus = 'ok', falseStatus = 'warn') {
  if (value === true || value === 'true' || value === 1 || value === '1' || value === 'yes') return trueStatus;
  if (value === false || value === 'false' || value === 0 || value === '0' || value === 'no') return falseStatus;
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
  const symbols = rowsFromPayload(raw.symbols);
  const safety = safetyEnvelope(raw);

  const bridgeStatus = pick(
    { status, raw },
    ['status.status', 'status.bridge_status', 'status.connected', 'raw.status.ok'],
    present(raw.status) ? 'available' : 'missing',
  );

  return {
    bridgeStatus,
    terminal: pick({ status, snapshot }, ['status.terminal', 'status.terminal_name', 'snapshot.terminal'], '—'),
    server: pick({ account, status, snapshot }, ['account.server', 'account.trade_server', 'status.server', 'snapshot.server'], '—'),
    login: pick({ account, snapshot }, ['account.login', 'account.account', 'snapshot.account.login'], '—'),
    balance: pick({ account, snapshot }, ['account.balance', 'snapshot.account.balance'], null),
    equity: pick({ account, snapshot }, ['account.equity', 'snapshot.account.equity'], null),
    margin: pick({ account, snapshot }, ['account.margin', 'snapshot.account.margin'], null),
    freeMargin: pick({ account, snapshot }, ['account.free_margin', 'account.margin_free', 'snapshot.account.free_margin'], null),
    currency: pick({ account, snapshot }, ['account.currency', 'snapshot.account.currency'], '—'),
    positions,
    orders,
    symbols,
    safety,
    readOnly: pick({ safety, status }, ['safety.readOnly', 'safety.read_only', 'status.readOnly', 'status.read_only'], true),
    orderSendAllowed: pick({ safety }, ['safety.orderSendAllowed', 'safety.order_send_allowed'], false),
    closeAllowed: pick({ safety }, ['safety.closeAllowed', 'safety.close_allowed'], false),
    cancelAllowed: pick({ safety }, ['safety.cancelAllowed', 'safety.cancel_allowed'], false),
    credentialStorageAllowed: pick({ safety }, ['safety.credentialStorageAllowed', 'safety.credential_storage_allowed'], false),
    livePresetMutationAllowed: pick({ safety }, ['safety.livePresetMutationAllowed', 'safety.live_preset_mutation_allowed'], false),
  };
}

export function buildMt5Metrics(snapshot) {
  return [
    { label: 'Bridge', value: format(snapshot.bridgeStatus), hint: 'read-only API' },
    { label: 'Positions', value: snapshot.positions.length, hint: 'open positions' },
    { label: 'Orders', value: snapshot.orders.length, hint: 'pending orders' },
    { label: 'Symbols', value: snapshot.symbols.length, hint: 'registry rows' },
    { label: 'Equity', value: format(snapshot.equity), hint: snapshot.currency },
  ];
}

export function buildSafetyItems(snapshot) {
  return [
    { label: 'Read-only bridge', value: snapshot.readOnly ? 'enabled' : 'unknown', status: boolLike(snapshot.readOnly, 'ok', 'warn') },
    { label: 'OrderSend allowed', value: format(snapshot.orderSendAllowed), status: snapshot.orderSendAllowed ? 'error' : 'ok' },
    { label: 'Close allowed', value: format(snapshot.closeAllowed), status: snapshot.closeAllowed ? 'error' : 'ok' },
    { label: 'Cancel allowed', value: format(snapshot.cancelAllowed), status: snapshot.cancelAllowed ? 'error' : 'ok' },
    { label: 'Credential storage', value: format(snapshot.credentialStorageAllowed), status: snapshot.credentialStorageAllowed ? 'error' : 'ok' },
    { label: 'Live preset mutation', value: format(snapshot.livePresetMutationAllowed), status: snapshot.livePresetMutationAllowed ? 'error' : 'ok' },
  ];
}

export function buildAccountItems(snapshot) {
  return [
    { label: 'Login', value: snapshot.login },
    { label: 'Server', value: snapshot.server },
    { label: 'Terminal', value: snapshot.terminal },
    { label: 'Balance', value: format(snapshot.balance), hint: snapshot.currency },
    { label: 'Equity', value: format(snapshot.equity), hint: snapshot.currency },
    { label: 'Margin', value: format(snapshot.margin), hint: snapshot.currency },
    { label: 'Free margin', value: format(snapshot.freeMargin), hint: snapshot.currency },
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
  return snapshot.positions.slice(0, 30).map((row) => compactRow(row, {
    ticket: ['ticket', 'position', 'id'],
    symbol: ['symbol'],
    type: ['type', 'side', 'action'],
    volume: ['volume', 'lots'],
    open: ['price_open', 'open_price', 'entry_price'],
    current: ['price_current', 'current_price'],
    profit: ['profit', 'pnl'],
  }));
}

export function buildOrderRows(snapshot) {
  return snapshot.orders.slice(0, 30).map((row) => compactRow(row, {
    ticket: ['ticket', 'order', 'id'],
    symbol: ['symbol'],
    type: ['type', 'side', 'action'],
    volume: ['volume', 'lots'],
    price: ['price_open', 'price', 'entry_price'],
    sl: ['sl', 'stop_loss'],
    tp: ['tp', 'take_profit'],
  }));
}

export function buildSymbolRows(snapshot) {
  return snapshot.symbols.slice(0, 40).map((row) => compactRow(row, {
    symbol: ['symbol', 'name'],
    enabled: ['enabled', 'visible', 'selected'],
    digits: ['digits'],
    spread: ['spread', 'spread_float'],
    tradeMode: ['trade_mode', 'tradeMode'],
    minLot: ['volume_min', 'min_lot'],
    maxLot: ['volume_max', 'max_lot'],
  }));
}

export function buildEndpointHealth(raw = {}) {
  const endpoints = [
    ['Status', '/api/mt5-readonly/status', raw.status],
    ['Account', '/api/mt5-readonly/account', raw.account],
    ['Positions', '/api/mt5-readonly/positions', raw.positions],
    ['Orders', '/api/mt5-readonly/orders', raw.orders],
    ['Symbol Registry', '/api/mt5-symbol-registry/symbols', raw.symbols],
    ['Snapshot', '/api/mt5-readonly/snapshot', raw.snapshot],
  ];
  return endpoints.map(([label, endpoint, payload]) => ({
    label,
    endpoint,
    status: present(payload) ? 'ok' : 'warn',
    statusLabel: present(payload) ? 'available' : 'missing',
  }));
}
