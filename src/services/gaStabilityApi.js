import { fetchJson } from './domainApi.js';

export async function fetchGAStability() {
  return fetchJson('/api/production-evidence-validation/status');
}
