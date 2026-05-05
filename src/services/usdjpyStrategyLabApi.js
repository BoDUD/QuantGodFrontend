import { fetchJson, postJson } from './domainApi.js';

const BASE = '/api/usdjpy-strategy-lab';

export function fetchUSDJPYStrategyLabStatus() {
  return fetchJson(`${BASE}/status`);
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
