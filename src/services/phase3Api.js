import { fetchApiJson, postApiJson } from './apiClient.js';

async function requestJson(url, options = {}) {
  const method = String(options.method || 'GET').toUpperCase();
  const body = typeof options.body === 'string' ? JSON.parse(options.body || '{}') : options.body || {};
  const result =
    method === 'POST' ? await postApiJson(url, body) : await fetchApiJson(url, { signal: options.signal });
  if (result.ok) return result.data || {};
  return result.error?.body || { ok: false, error: result.error?.message || `HTTP ${result.status}` };
}

export const phase3Api = {
  vibeConfig: () => requestJson('/api/vibe-coding/config'),
  generateStrategy: (body) =>
    requestJson('/api/vibe-coding/generate', { method: 'POST', body: JSON.stringify(body || {}) }),
  iterateStrategy: (body) =>
    requestJson('/api/vibe-coding/iterate', { method: 'POST', body: JSON.stringify(body || {}) }),
  backtestStrategy: (body) =>
    requestJson('/api/vibe-coding/backtest', { method: 'POST', body: JSON.stringify(body || {}) }),
  analyzeBacktest: (body) =>
    requestJson('/api/vibe-coding/analyze', { method: 'POST', body: JSON.stringify(body || {}) }),
  listStrategies: () => requestJson('/api/vibe-coding/strategies'),
  getStrategy: (strategyId, version) =>
    requestJson(
      `/api/vibe-coding/strategy/${encodeURIComponent(strategyId)}${version ? `?version=${encodeURIComponent(version)}` : ''}`,
    ),
  aiV2Config: () => requestJson('/api/ai-analysis-v2/config'),
  runAiV2: (body) =>
    requestJson('/api/ai-analysis-v2/run', { method: 'POST', body: JSON.stringify(body || {}) }),
  aiV2Latest: () => requestJson('/api/ai-analysis-v2/latest'),
  aiV2History: (params = {}) =>
    requestJson(`/api/ai-analysis-v2/history?${new URLSearchParams(params).toString()}`),
  klineAiOverlays: (params = {}) =>
    requestJson(`/api/kline/ai-overlays?${new URLSearchParams(params).toString()}`),
  klineVibeIndicators: (params = {}) =>
    requestJson(`/api/kline/vibe-indicators?${new URLSearchParams(params).toString()}`),
  klineRealtimeConfig: () => requestJson('/api/kline/realtime-config'),
};

export default phase3Api;
