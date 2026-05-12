import { fetchJson, postJson } from './apiClient.js';

export function fetchProductionEvidenceStatus() {
  return fetchJson('/api/production-evidence-validation/status');
}

export function runProductionEvidenceValidation() {
  return postJson('/api/production-evidence-validation/run', {});
}

export function fetchProductionEvidenceTelegramText(refresh = false) {
  const suffix = refresh ? '?refresh=1' : '';
  return fetchJson(`/api/production-evidence-validation/telegram-text${suffix}`);
}
