import { fetchJson, postJson } from './domainApi.js';

export function fetchAutomationChainStatus() {
  return fetchJson('/api/automation-chain/status');
}

export function runAutomationChain({ send = false } = {}) {
  const query = send ? '?send=1' : '';
  return postJson(`/api/automation-chain/run${query}`, {});
}

export function fetchAutomationChainTelegramText({ refresh = false } = {}) {
  const query = refresh ? '?refresh=1' : '';
  return fetchJson(`/api/automation-chain/telegram-text${query}`);
}
