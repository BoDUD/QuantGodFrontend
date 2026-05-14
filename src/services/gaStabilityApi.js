import { fetchJson } from './domainApi.js';

export async function fetchGAStability(options = {}) {
  return fetchJson('/api/production-evidence-validation/status', null, options);
}
