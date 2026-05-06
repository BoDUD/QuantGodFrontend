import { fetchJson, postJson } from './domainApi.js';

const BASE = '/api/usdjpy-strategy-lab';

export function fetchUSDJPYStrategyLabStatus() {
  return fetchJson(`${BASE}/status`);
}

export function fetchUSDJPYStrategyCatalog() {
  return fetchJson(`${BASE}/catalog`);
}

export function fetchUSDJPYStrategySignals({ limit = 20 } = {}) {
  return fetchJson(`${BASE}/signals?limit=${encodeURIComponent(limit)}`);
}

export function runUSDJPYStrategySignals() {
  return postJson(`${BASE}/signals/run`, { focusSymbol: 'USDJPYc' });
}

export function fetchUSDJPYStrategyBacktestPlan() {
  return fetchJson(`${BASE}/backtest-plan`);
}

export function buildUSDJPYStrategyBacktestPlan() {
  return postJson(`${BASE}/backtest-plan/build`, { focusSymbol: 'USDJPYc' });
}

export function fetchUSDJPYImportedBacktests({ limit = 20 } = {}) {
  return fetchJson(`${BASE}/imported-backtests?limit=${encodeURIComponent(limit)}`);
}

export function importUSDJPYBacktest({ source, strategy = '' }) {
  return postJson(`${BASE}/import-backtest`, { source, strategy, focusSymbol: 'USDJPYc' });
}

export function fetchUSDJPYStrategyRiskCheck() {
  return fetchJson(`${BASE}/risk-check`);
}

export function fetchUSDJPYCandidatePolicy() {
  return fetchJson(`${BASE}/candidate-policy`);
}

export function buildUSDJPYCandidatePolicy() {
  return postJson(`${BASE}/candidate-policy/build`, { focusSymbol: 'USDJPYc' });
}

export function fetchUSDJPYStrategyLabTelegramText({ refresh = false } = {}) {
  const query = refresh ? '?refresh=1' : '';
  return fetchJson(`${BASE}/telegram-text${query}`);
}

export function runUSDJPYStrategyLab() {
  return postJson(`${BASE}/run`, { focusSymbol: 'USDJPYc' });
}

export function fetchUSDJPYStrategyDryRun() {
  return fetchJson(`${BASE}/dry-run`);
}

export function fetchUSDJPYLiveLoop({ write = false } = {}) {
  const query = write ? '?write=1' : '';
  return fetchJson(`${BASE}/live-loop${query}`);
}

export function runUSDJPYLiveLoop() {
  return postJson(`${BASE}/live-loop/run`, { focusSymbol: 'USDJPYc' });
}

export function fetchUSDJPYLiveLoopTelegramText({ refresh = false } = {}) {
  const query = refresh ? '?refresh=1' : '';
  return fetchJson(`${BASE}/live-loop/telegram-text${query}`);
}
