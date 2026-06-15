import { fetchJsonOrFallback, postJsonOrFallback } from './apiClient.js';

function requestJson(url, options = {}) {
  const method = String(options.method || 'GET').toUpperCase();
  const body = typeof options.body === 'string' ? JSON.parse(options.body || '{}') : options.body || {};
  return method === 'POST'
    ? postJsonOrFallback(url, body, { ok: false, error: 'phase3_post_failed' })
    : fetchJsonOrFallback(url, { ok: false, error: 'phase3_fetch_failed' }, { signal: options.signal });
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
