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
  if (value === true || value === 'true' || value === '1' || value === 1 || value === 'ACTIVE') return truthyLabel;
  if (value === false || value === 'false' || value === '0' || value === 0 || value === 'INACTIVE') return falseLabel;
  return 'unknown';
}

function formatCompact(value) {
  if (value === undefined || value === null || value === '') return '—';
  if (typeof value === 'number') return Number.isFinite(value) ? value.toFixed(Math.abs(value) >= 10 ? 1 : 2) : '—';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (Array.isArray(value)) return `${value.length} rows`;
  if (isObject(value)) return `${Object.keys(value).length} keys`;
  return String(value);
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
  const runtimeState = firstValue(raw, PATH_SETS.runtimeState, present(raw.latest) || present(raw.state) ? 'available' : 'missing');
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
  };
}

export function buildDashboardMetrics(snapshot) {
  return [
    { label: 'Runtime', value: formatCompact(snapshot.runtimeState), hint: snapshot.updatedAt },
    { label: 'Kill Switch', value: snapshot.killSwitchLabel, hint: 'must not be bypassed' },
    { label: 'dryRun', value: snapshot.dryRunLabel, hint: 'execution guard' },
    { label: 'Active Route', value: formatCompact(snapshot.activeRoute), hint: 'dashboard state' },
    { label: 'Daily PnL', value: formatCompact(snapshot.dailyPnl), hint: 'runtime evidence' },
  ];
}

export function buildEndpointHealth(raw = {}) {
  const endpoints = [
    ['Latest Runtime', '/api/latest', raw.latest],
    ['Dashboard State', '/api/dashboard/state', raw.state],
    ['Backtest Summary', '/api/dashboard/backtest-summary', raw.backtest],
    ['Daily Review', '/api/daily-review', raw.dailyReview],
    ['Daily Autopilot', '/api/daily-autopilot', raw.dailyAutopilot],
  ];
  return endpoints.map(([label, endpoint, payload]) => ({
    label,
    endpoint,
    status: present(payload) ? 'ok' : 'warn',
    statusLabel: present(payload) ? 'available' : 'missing',
  }));
}

export function buildRuntimeItems(snapshot) {
  return [
    { label: 'Runtime state', value: formatCompact(snapshot.runtimeState), status: snapshot.runtimeState === 'missing' ? 'warn' : 'ok' },
    { label: 'Updated at', value: snapshot.updatedAt },
    { label: 'Kill Switch', value: snapshot.killSwitchLabel, status: snapshot.killSwitchStatus },
    { label: 'dryRun', value: snapshot.dryRunLabel, status: snapshot.dryRunStatus },
    { label: 'Active route', value: formatCompact(snapshot.activeRoute) },
  ];
}

export function buildDailyItems(snapshot) {
  return [
    { label: 'Daily review', value: snapshot.dailyReviewAvailable ? 'available' : 'missing', status: snapshot.dailyReviewAvailable ? 'ok' : 'warn' },
    { label: 'Daily autopilot', value: snapshot.dailyAutopilotAvailable ? 'available' : 'missing', status: snapshot.dailyAutopilotAvailable ? 'ok' : 'warn' },
    { label: 'Backtest summary', value: snapshot.backtestAvailable ? 'available' : 'missing', status: snapshot.backtestAvailable ? 'ok' : 'warn' },
  ];
}

export function buildRouteRows(snapshot) {
  return snapshot.routes.slice(0, 8).map((route, index) => ({
    id: route.id || route.route || route.name || `route-${index}`,
    route: route.route || route.name || route.strategy || `Route ${index + 1}`,
    status: route.status || route.decision || route.state || 'unknown',
    score: formatCompact(route.score ?? route.confidence ?? route.pf ?? route.profit_factor),
    note: route.note || route.reason || route.reasoning || route.next_step || '',
  }));
}
