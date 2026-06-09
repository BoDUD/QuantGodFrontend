import { fetchJson, postJson } from './domainApi.js';

const BASE = '/api/strategy-ga-factory';

export function fetchStrategyGaFactoryStatus(options = {}) {
  return fetchJson(`${BASE}/status`, null, options);
}

export function buildStrategyGaFactory() {
  return postJson(`${BASE}/build`, { focusSymbol: 'USDJPYc' });
}

export function fetchStrategyFactoryIntentPlan(options = {}) {
  return fetchJson(`${BASE}/intent-plan`, null, options);
}

export function buildStrategyFactoryIntentPlan({ prompt = '' } = {}) {
  const query = prompt ? `?prompt=${encodeURIComponent(prompt)}` : '';
  return postJson(`${BASE}/intent-plan/build${query}`, { focusSymbol: 'USDJPYc', prompt });
}

export function fetchHyperliquidShadowLane(options = {}) {
  return fetchJson(`${BASE}/hyperliquid-shadow`, null, options);
}

export function buildHyperliquidShadowLane({ targetAgentUrl = '', targetAgentProfileJson = '' } = {}) {
  const params = new URLSearchParams();
  if (targetAgentUrl) params.set('targetAgentUrl', targetAgentUrl);
  if (targetAgentProfileJson) params.set('targetAgentProfileJson', targetAgentProfileJson);
  const query = params.toString() ? `?${params.toString()}` : '';
  return postJson(`${BASE}/hyperliquid-shadow/build${query}`, { targetAgentUrl, targetAgentProfileJson });
}

export function fetchStrategyGaFactoryTelegramText({ refresh = false } = {}) {
  const query = refresh ? '?refresh=1' : '';
  return fetchJson(`${BASE}/telegram-text${query}`);
}
