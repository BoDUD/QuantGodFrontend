import { fetchJson, postJson } from './domainApi.js';

const BASE = '/api/telegram-gateway';

export function fetchTelegramGatewayOpsStatus(options = {}) {
  return fetchJson(`${BASE}/status`, null, options);
}

export function collectTelegramGatewayOps() {
  return postJson(`${BASE}/collect`, { focusSymbol: 'USDJPYc' });
}

export function fetchTelegramGatewayOpsTelegramText({ refresh = false } = {}) {
  const query = refresh ? '?refresh=1' : '';
  return fetchJson(`${BASE}/telegram-text${query}`);
}
