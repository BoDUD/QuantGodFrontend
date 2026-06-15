import { fetchApiJson, postApiJson } from './apiClient.js';

export const USDJPY_FOCUS_SYMBOL = 'USDJPYc';

const USDJPY_SYMBOL_FALLBACK = [
  { symbol: USDJPY_FOCUS_SYMBOL, label: USDJPY_FOCUS_SYMBOL, assetClass: 'Forex' },
];

function isUsdJpySymbol(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .startsWith('USDJPY');
}

async function requestGetJson(endpoint, options = {}) {
  const result = await fetchApiJson(endpoint, options);
  if (!result.ok) {
    throw new Error(
      result.error?.body?.error || result.error?.message || `HTTP ${result.status} for ${endpoint}`,
    );
  }
  return result.data || {};
}

async function requestPostJson(endpoint, body = {}, options = {}) {
  const result = await postApiJson(endpoint, body, options);
  if (!result.ok) {
    throw new Error(
      result.error?.body?.error || result.error?.message || `HTTP ${result.status} for ${endpoint}`,
    );
  }
  return result.data || {};
}

export async function runAiAnalysis({ symbol, timeframes = ['M15', 'H1', 'H4', 'D1'] }) {
  return requestPostJson('/api/ai-analysis/run', { symbol, timeframes });
}

export function getAiLatest() {
  return requestGetJson('/api/ai-analysis/latest');
}

export function getAiHistory({ symbol = '', limit = 20 } = {}) {
  const params = new URLSearchParams({ limit: String(limit) });
  if (symbol) params.set('symbol', symbol);
  return requestGetJson(`/api/ai-analysis/history?${params.toString()}`);
}

export function getAiHistoryItem(id) {
  return requestGetJson(`/api/ai-analysis/history/${encodeURIComponent(id)}`);
}

export function getAiConfig() {
  return requestGetJson('/api/ai-analysis/config');
}

export function getDeepSeekTelegramLatest() {
  return requestGetJson('/api/ai-analysis/deepseek-telegram/latest');
}

export async function runDeepSeekTelegram({
  symbols = [],
  symbol = '',
  timeframes = ['M15', 'H1', 'H4', 'D1'],
  send = true,
  force = true,
  noDeepseek = false,
} = {}) {
  const normalizedSymbols = Array.isArray(symbols) && symbols.length ? symbols : [symbol].filter(Boolean);
  return requestPostJson('/api/ai-analysis/deepseek-telegram/run', {
    symbols: normalizedSymbols,
    timeframes,
    send,
    force,
    noDeepseek,
    minIntervalSeconds: force ? 0 : 900,
  });
}

export function getKline({ symbol, tf = 'H1', bars = 200, signal } = {}) {
  const params = new URLSearchParams({ symbol, tf, bars: String(bars) });
  return requestGetJson(`/api/mt5-readonly/kline?${params.toString()}`, { signal });
}

export function getQuote({ symbol, signal } = {}) {
  const params = new URLSearchParams({ symbol });
  return requestGetJson(`/api/mt5-readonly/quote?${params.toString()}`, { signal });
}

export function getChartTrades({ symbol, days = 30, signal } = {}) {
  const params = new URLSearchParams({ symbol, days: String(days) });
  return requestGetJson(`/api/mt5-readonly/trades?${params.toString()}`, { signal });
}

export function getShadowSignals({ symbol, days = 7, signal } = {}) {
  const params = new URLSearchParams({ symbol, days: String(days) });
  return requestGetJson(`/api/shadow/signals?${params.toString()}`, { signal });
}

export async function getSymbolRegistry({ signal } = {}) {
  try {
    const payload = await requestGetJson('/api/mt5-symbol-registry', { signal });
    const items = payload.items || payload.symbols || payload.registry || [];
    if (Array.isArray(items) && items.length) {
      const normalizedItems = items
        .map((item) => ({
          symbol: item.brokerSymbol || item.symbol || item.canonicalSymbol || item.name,
          label: item.displayName || item.brokerSymbol || item.symbol || item.canonicalSymbol || item.name,
          assetClass: item.assetClass || item.category || '',
        }))
        .filter((item) => item.symbol && isUsdJpySymbol(item.symbol));
      if (normalizedItems.length) return normalizedItems;
    }
  } catch (_error) {
    // Keep Phase 1 usable even when the MT5 symbol registry is not running.
  }
  return USDJPY_SYMBOL_FALLBACK;
}
