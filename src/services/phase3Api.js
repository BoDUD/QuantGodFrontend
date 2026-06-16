import { fetchJsonOrFallback, postJsonOrFallback } from './apiClient.js';

const FETCH_FALLBACK = Object.freeze({ ok: false, error: 'phase3_fetch_failed' });
const POST_FALLBACK = Object.freeze({ ok: false, error: 'phase3_post_failed' });

function getJson(url, options = {}) {
  return fetchJsonOrFallback(url, FETCH_FALLBACK, { signal: options.signal });
}

function postJson(url, body = {}, options = {}) {
  return postJsonOrFallback(url, body || {}, POST_FALLBACK, { signal: options.signal });
}

export const phase3Api = {
  vibeConfig: () => getJson('/api/vibe-coding/config'),
  generateStrategy: (body) => postJson('/api/vibe-coding/generate', body),
  iterateStrategy: (body) => postJson('/api/vibe-coding/iterate', body),
  backtestStrategy: (body) => postJson('/api/vibe-coding/backtest', body),
  analyzeBacktest: (body) => postJson('/api/vibe-coding/analyze', body),
  listStrategies: () => getJson('/api/vibe-coding/strategies'),
  getStrategy: (strategyId, version) =>
    getJson(
      `/api/vibe-coding/strategy/${encodeURIComponent(strategyId)}${version ? `?version=${encodeURIComponent(version)}` : ''}`,
    ),
  aiV2Config: () => getJson('/api/ai-analysis-v2/config'),
  runAiV2: (body) => postJson('/api/ai-analysis-v2/run', body),
  aiV2Latest: () => getJson('/api/ai-analysis-v2/latest'),
  aiV2History: (params = {}) =>
    getJson(`/api/ai-analysis-v2/history?${new URLSearchParams(params).toString()}`),
  klineAiOverlays: (params = {}) =>
    getJson(`/api/kline/ai-overlays?${new URLSearchParams(params).toString()}`),
  klineVibeIndicators: (params = {}) =>
    getJson(`/api/kline/vibe-indicators?${new URLSearchParams(params).toString()}`),
  klineRealtimeConfig: () => getJson('/api/kline/realtime-config'),
};

export default phase3Api;
