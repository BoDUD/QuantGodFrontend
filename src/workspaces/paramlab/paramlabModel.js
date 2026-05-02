/**
 * QuantGod ParamLab workspace model.
 *
 * ParamLab is a research/tester evidence plane. This model normalizes batch,
 * scheduler, recovery, report watcher, and tester-window data for display only.
 * It must never create live preset writes, route promotion/demotion actions, or
 * any MT5 execution affordance.
 */

const EMPTY_TEXT = '—';
const UNKNOWN = 'unknown';

export const PARAMLAB_SAFETY_DEFAULTS = Object.freeze({
  researchOnly: true,
  testerOnly: true,
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
  requiresManualAuthorization: true,
});

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function valueAt(payload, path) {
  if (!payload || !path) return undefined;
  const parts = Array.isArray(path) ? path : String(path).split('.');
  let current = payload;
  for (const part of parts) {
    if (current === undefined || current === null) return undefined;
    current = current[part];
  }
  return current;
}

function firstDefined(...values) {
  return values.find((value) => value !== undefined && value !== null && value !== '');
}

function pick(payload, paths, fallback = EMPTY_TEXT) {
  for (const path of paths) {
    const value = valueAt(payload, path);
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return fallback;
}

function boolFrom(value, fallback = false) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', 'yes', 'y', '1', 'enabled', 'active', 'allow', 'allowed', 'open'].includes(normalized)) return true;
    if (['false', 'no', 'n', '0', 'disabled', 'inactive', 'deny', 'denied', 'blocked', 'closed'].includes(normalized)) return false;
  }
  return fallback;
}

function numberFrom(value, fallback = null) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function statusFromText(value) {
  const normalized = String(value || '').toLowerCase();
  if (!normalized || normalized === '—') return 'unknown';
  if (['ok', 'idle', 'complete', 'completed', 'success', 'healthy', 'ready', 'available', 'passed', 'green'].some((word) => normalized.includes(word))) return 'ok';
  if (['running', 'pending', 'queued', 'watch', 'scheduled', 'recovering', 'caution', 'yellow'].some((word) => normalized.includes(word))) return 'warn';
  if (['fail', 'failed', 'error', 'blocked', 'stale', 'missing', 'red', 'critical'].some((word) => normalized.includes(word))) return 'error';
  if (['disabled', 'locked', 'manual', 'tester-only', 'read-only'].some((word) => normalized.includes(word))) return 'locked';
  return 'unknown';
}

function asArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data?.rows)) return payload.data.rows;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.rows)) return payload.rows;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.runs)) return payload.runs;
  if (Array.isArray(payload?.queue)) return payload.queue;
  if (Array.isArray(payload?.jobs)) return payload.jobs;
  if (isObject(payload?.data)) return Object.values(payload.data).filter(isObject);
  if (isObject(payload)) return Object.values(payload).filter(isObject);
  return [];
}

function payloadOf(payload) {
  return payload?.data || payload || {};
}

function rowValue(row, paths, fallback = EMPTY_TEXT) {
  return pick(row?.data || row || {}, paths, fallback);
}

function normalizeRows(rows, limit = 200) {
  return asArray(rows).slice(0, limit).map((row, index) => {
    const source = row?.data || row || {};
    return {
      '#': index + 1,
      route: rowValue(source, ['route', 'route_name', 'strategy', 'name', 'preset'], `item-${index + 1}`),
      symbol: rowValue(source, ['symbol', 'pair', 'instrument']),
      tf: rowValue(source, ['tf', 'timeframe', 'time_frame']),
      status: rowValue(source, ['status', 'state', 'result', 'decision']),
      pf: rowValue(source, ['pf', 'profit_factor', 'profitFactor', 'score']),
      winRate: rowValue(source, ['win_rate', 'winRate', 'wr']),
      trades: rowValue(source, ['trades', 'trade_count', 'n_trades']),
      updated: rowValue(source, ['updated_at', 'timestamp', 'generated_at', 'as_of']),
    };
  });
}

function statusFromAvailability(value) {
  return value ? 'ok' : 'unknown';
}

export function buildEndpointItems(state = {}) {
  return [
    { label: 'Status', endpoint: '/api/paramlab/status', status: statusFromAvailability(state.status) },
    { label: 'Results', endpoint: '/api/paramlab/results', status: statusFromAvailability(state.results) },
    { label: 'Scheduler', endpoint: '/api/paramlab/scheduler', status: statusFromAvailability(state.scheduler) },
    { label: 'Recovery', endpoint: '/api/paramlab/recovery', status: statusFromAvailability(state.recovery) },
    { label: 'Report Watcher', endpoint: '/api/paramlab/report-watcher', status: statusFromAvailability(state.reportWatcher) },
    { label: 'Tester Window', endpoint: '/api/paramlab/tester-window', status: statusFromAvailability(state.testerWindow) },
    { label: 'Results Ledger', endpoint: '/api/paramlab/results-ledger', status: state.resultRows?.length ? 'ok' : 'unknown' },
    { label: 'Scheduler Ledger', endpoint: '/api/paramlab/scheduler-ledger', status: state.schedulerRows?.length ? 'ok' : 'unknown' },
  ];
}

export function buildSafetyEnvelope(state = {}) {
  const statusSafety = state.status?.safety || state.status?.data?.safety || {};
  const schedulerSafety = state.scheduler?.safety || state.scheduler?.data?.safety || {};
  const testerSafety = state.testerWindow?.safety || state.testerWindow?.data?.safety || {};
  const merged = { ...PARAMLAB_SAFETY_DEFAULTS, ...statusSafety, ...schedulerSafety, ...testerSafety };
  const rows = [
    ['Research only', boolFrom(merged.researchOnly, true), 'ok'],
    ['Tester only', boolFrom(merged.testerOnly, true), 'locked'],
    ['Read-only data plane', boolFrom(merged.readOnlyDataPlane, true), 'ok'],
    ['Order send allowed', boolFrom(merged.orderSendAllowed, false), boolFrom(merged.orderSendAllowed, false) ? 'error' : 'ok'],
    ['Close allowed', boolFrom(merged.closeAllowed, false), boolFrom(merged.closeAllowed, false) ? 'error' : 'ok'],
    ['Cancel allowed', boolFrom(merged.cancelAllowed, false), boolFrom(merged.cancelAllowed, false) ? 'error' : 'ok'],
    ['Credential storage', boolFrom(merged.credentialStorageAllowed, false), boolFrom(merged.credentialStorageAllowed, false) ? 'error' : 'ok'],
    ['Live preset mutation', boolFrom(merged.livePresetMutationAllowed, false), boolFrom(merged.livePresetMutationAllowed, false) ? 'error' : 'ok'],
    ['Override Kill Switch', boolFrom(merged.canOverrideKillSwitch, false), boolFrom(merged.canOverrideKillSwitch, false) ? 'error' : 'ok'],
    ['Mutate governance decision', boolFrom(merged.canMutateGovernanceDecision, false), boolFrom(merged.canMutateGovernanceDecision, false) ? 'error' : 'ok'],
    ['Promote/demote route', boolFrom(merged.canPromoteOrDemoteRoute, false), boolFrom(merged.canPromoteOrDemoteRoute, false) ? 'error' : 'ok'],
    ['Auto promotion', boolFrom(merged.autoPromotionAllowed, false), boolFrom(merged.autoPromotionAllowed, false) ? 'error' : 'ok'],
    ['Manual authorization', boolFrom(merged.requiresManualAuthorization, true), boolFrom(merged.requiresManualAuthorization, true) ? 'locked' : 'warn'],
  ];
  return rows.map(([label, value, status]) => ({
    label,
    value: typeof value === 'boolean' ? (value ? 'true' : 'false') : String(value),
    status,
  }));
}

export function buildBatchSummary(state = {}) {
  const statusPayload = payloadOf(state.status);
  const resultsPayload = payloadOf(state.results);
  const rows = normalizeRows(state.resultRows?.length ? state.resultRows : resultsPayload, 200);
  const queueLength = firstDefined(
    valueAt(statusPayload, 'queue_length'),
    valueAt(statusPayload, 'queue.length'),
    valueAt(statusPayload, 'pending'),
    valueAt(resultsPayload, 'pending'),
    null,
  );
  const stateText = pick(statusPayload, ['state', 'status', 'phase', 'mode']);
  const activeRoute = pick(statusPayload, ['active_route', 'route', 'current.route', 'current_route']);
  const currentRun = pick(statusPayload, ['current_run', 'run_id', 'batch_id', 'current.run_id']);
  const lastResult = rows[0]?.status || pick(resultsPayload, ['status', 'last_status', 'summary.status']);
  const updatedAt = pick(statusPayload, ['updated_at', 'timestamp', 'generated_at', 'as_of']);
  return {
    status: statusFromText(stateText || lastResult),
    statusLabel: stateText || lastResult || UNKNOWN,
    rows: [
      { label: 'ParamLab state', value: stateText, status: statusFromText(stateText) },
      { label: 'Active route', value: activeRoute, status: activeRoute !== EMPTY_TEXT ? 'ok' : 'unknown' },
      { label: 'Current run', value: currentRun, status: currentRun !== EMPTY_TEXT ? 'ok' : 'unknown' },
      { label: 'Queue length', value: numberFrom(queueLength, rows.length), status: Number(numberFrom(queueLength, rows.length)) > 0 ? 'warn' : 'ok' },
      { label: 'Result rows', value: rows.length, status: rows.length ? 'ok' : 'unknown' },
      { label: 'Last result', value: lastResult, status: statusFromText(lastResult) },
      { label: 'Updated at', value: updatedAt, status: updatedAt !== EMPTY_TEXT ? 'ok' : 'unknown' },
    ],
    resultRows: rows,
  };
}

export function buildSchedulerSummary(state = {}) {
  const payload = payloadOf(state.scheduler);
  const schedulerRows = normalizeRows(state.schedulerRows?.length ? state.schedulerRows : payload, 200);
  const schedulerState = pick(payload, ['state', 'status', 'scheduler_state', 'mode']);
  const enabled = firstDefined(valueAt(payload, 'enabled'), valueAt(payload, 'is_enabled'), valueAt(payload, 'scheduler.enabled'), null);
  const nextAction = pick(payload, ['next_action', 'nextAction', 'next_run', 'next_window', 'scheduler.next_action']);
  const activeRoute = pick(payload, ['route', 'active_route', 'scheduler.route']);
  const pending = firstDefined(valueAt(payload, 'pending'), valueAt(payload, 'pending_jobs'), valueAt(payload, 'queue_length'), schedulerRows.length);
  const updatedAt = pick(payload, ['updated_at', 'timestamp', 'generated_at', 'as_of']);
  const label = schedulerState !== EMPTY_TEXT ? schedulerState : (boolFrom(enabled, false) ? 'enabled' : UNKNOWN);
  return {
    status: statusFromText(label),
    statusLabel: label,
    rows: [
      { label: 'Scheduler state', value: schedulerState, status: statusFromText(schedulerState) },
      { label: 'Enabled', value: enabled === null ? EMPTY_TEXT : (boolFrom(enabled, false) ? 'true' : 'false'), status: enabled === null ? 'unknown' : (boolFrom(enabled, false) ? 'warn' : 'locked') },
      { label: 'Next action', value: nextAction, status: statusFromText(nextAction) },
      { label: 'Active route', value: activeRoute, status: activeRoute !== EMPTY_TEXT ? 'ok' : 'unknown' },
      { label: 'Pending jobs', value: numberFrom(pending, schedulerRows.length), status: Number(numberFrom(pending, schedulerRows.length)) > 0 ? 'warn' : 'ok' },
      { label: 'Updated at', value: updatedAt, status: updatedAt !== EMPTY_TEXT ? 'ok' : 'unknown' },
    ],
    schedulerRows,
  };
}

export function buildRecoverySummary(state = {}) {
  const recoveryPayload = payloadOf(state.recovery);
  const watcherPayload = payloadOf(state.reportWatcher);
  const testerPayload = payloadOf(state.testerWindow);
  const recoveryState = pick(recoveryPayload, ['state', 'status', 'recovery_state', 'mode']);
  const watcherState = pick(watcherPayload, ['state', 'status', 'watcher_state', 'mode']);
  const testerState = pick(testerPayload, ['state', 'status', 'window_state', 'mode']);
  const testerOpen = firstDefined(valueAt(testerPayload, 'open'), valueAt(testerPayload, 'is_open'), valueAt(testerPayload, 'tester_window.open'), null);
  const nextWindow = pick(testerPayload, ['next_window', 'window', 'time_window', 'tester_window.next']);
  const lastRecovered = pick(recoveryPayload, ['last_recovered', 'last_recovery', 'last_run', 'recovery.last_recovered']);
  const reportPath = pick(watcherPayload, ['report_path', 'latest_report', 'last_report', 'watcher.latest_report']);
  const statusLabel = recoveryState !== EMPTY_TEXT ? recoveryState : watcherState !== EMPTY_TEXT ? watcherState : testerState;
  return {
    status: statusFromText(statusLabel),
    statusLabel: statusLabel || UNKNOWN,
    rows: [
      { label: 'Recovery state', value: recoveryState, status: statusFromText(recoveryState) },
      { label: 'Last recovered', value: lastRecovered, status: lastRecovered !== EMPTY_TEXT ? 'ok' : 'unknown' },
      { label: 'Report watcher', value: watcherState, status: statusFromText(watcherState) },
      { label: 'Latest report', value: reportPath, status: reportPath !== EMPTY_TEXT ? 'ok' : 'unknown' },
      { label: 'Tester window', value: testerState, status: statusFromText(testerState) },
      { label: 'Tester open', value: testerOpen === null ? EMPTY_TEXT : (boolFrom(testerOpen, false) ? 'true' : 'false'), status: testerOpen === null ? 'unknown' : (boolFrom(testerOpen, false) ? 'warn' : 'locked') },
      { label: 'Next tester window', value: nextWindow, status: nextWindow !== EMPTY_TEXT ? 'ok' : 'unknown' },
    ],
  };
}

export function buildMetricItems(state = {}) {
  const batch = buildBatchSummary(state);
  const scheduler = buildSchedulerSummary(state);
  const recovery = buildRecoverySummary(state);
  const bestPf = batch.resultRows.reduce((best, row) => {
    const value = numberFrom(row.pf, null);
    return value === null ? best : Math.max(best, value);
  }, null);
  return [
    { label: 'Result rows', value: batch.resultRows.length, hint: 'ParamLab result ledger', status: batch.resultRows.length ? 'ok' : 'unknown' },
    { label: 'Scheduler rows', value: scheduler.schedulerRows.length, hint: 'scheduled experiments', status: scheduler.schedulerRows.length ? 'ok' : 'unknown' },
    { label: 'Scheduler', value: scheduler.statusLabel || UNKNOWN, hint: 'automation state', status: scheduler.status },
    { label: 'Best PF', value: bestPf === null ? EMPTY_TEXT : bestPf.toFixed(2), hint: 'from visible result rows', status: bestPf === null ? 'unknown' : (bestPf >= 1 ? 'ok' : 'warn') },
    { label: 'Recovery', value: recovery.statusLabel || UNKNOWN, hint: 'run recovery state', status: recovery.status },
    { label: 'Safety', value: 'tester-only', hint: 'no live preset write', status: 'locked' },
  ];
}

export function buildParamLabViewModel(state = {}) {
  const batch = buildBatchSummary(state);
  const scheduler = buildSchedulerSummary(state);
  const recovery = buildRecoverySummary(state);
  return {
    metrics: buildMetricItems(state),
    endpoints: buildEndpointItems(state),
    safety: buildSafetyEnvelope(state),
    batch,
    scheduler,
    recovery,
    resultRows: batch.resultRows,
    schedulerRows: scheduler.schedulerRows,
    rawEvidence: [
      { title: 'Status raw evidence', source: '/api/paramlab/status', payload: state.status },
      { title: 'Results raw evidence', source: '/api/paramlab/results', payload: state.results },
      { title: 'Scheduler raw evidence', source: '/api/paramlab/scheduler', payload: state.scheduler },
      { title: 'Recovery raw evidence', source: '/api/paramlab/recovery', payload: state.recovery },
      { title: 'Report watcher raw evidence', source: '/api/paramlab/report-watcher', payload: state.reportWatcher },
      { title: 'Tester window raw evidence', source: '/api/paramlab/tester-window', payload: state.testerWindow },
    ],
  };
}
