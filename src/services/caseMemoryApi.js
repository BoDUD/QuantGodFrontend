import { fetchJson, postJson } from './domainApi.js';

const BASE = '/api/case-memory';

export function fetchCaseMemoryStatus(options = {}) {
  return fetchJson(`${BASE}/status`, null, options);
}

export function buildCaseMemoryCandidates() {
  return postJson(`${BASE}/build`, { focusSymbol: 'USDJPYc' });
}

export function fetchCaseMemoryTelegramText({ refresh = false } = {}) {
  const query = refresh ? '?refresh=1' : '';
  return fetchJson(`${BASE}/telegram-text${query}`);
}
