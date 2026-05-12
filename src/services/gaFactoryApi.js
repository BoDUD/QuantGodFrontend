import { fetchJson, postJson } from './domainApi.js';

const BASE = '/api/ga-factory';

export function fetchGAFactoryStatus() {
  return fetchJson(`${BASE}/status`);
}

export function buildGAFactory() {
  return postJson(`${BASE}/build`, { focusSymbol: 'USDJPYc' });
}

export function fetchGAFactoryTelegramText({ refresh = false } = {}) {
  const query = refresh ? '?refresh=1' : '';
  return fetchJson(`${BASE}/telegram-text${query}`);
}
