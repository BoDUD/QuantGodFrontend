import { fetchJson, postJson } from './domainApi.js';

const BASE = '/api/strategy-ga-factory';

export function fetchStrategyGaFactoryStatus() {
  return fetchJson(`${BASE}/status`);
}

export function buildStrategyGaFactory() {
  return postJson(`${BASE}/build`, { focusSymbol: 'USDJPYc' });
}

export function fetchStrategyGaFactoryTelegramText({ refresh = false } = {}) {
  const query = refresh ? '?refresh=1' : '';
  return fetchJson(`${BASE}/telegram-text${query}`);
}
