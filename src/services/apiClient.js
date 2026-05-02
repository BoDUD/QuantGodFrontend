const VITE_ENV = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : {};

export const DEFAULT_TIMEOUT_MS = Number(VITE_ENV.VITE_QG_API_TIMEOUT_MS || 15000);
export const API_BASE_URL = normalizeBaseUrl(VITE_ENV.VITE_QG_API_BASE_URL || '');

const JSON_HEADERS = { Accept: 'application/json' };
const RUNTIME_FILE_PATTERN = /\/QuantGod_[^\s'"?#]+\.(json|csv)\b/i;

function normalizeBaseUrl(value) {
  const text = String(value || '').trim();
  return text.endsWith('/') ? text.slice(0, -1) : text;
}

function nowMs() {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }
  return Date.now();
}

function safeDuration(startedAtMs) {
  return Math.max(0, Math.round(nowMs() - startedAtMs));
}

function asErrorPayload(error) {
  if (!error) return null;
  return {
    name: error.name || 'Error',
    message: error.message || String(error),
  };
}

async function parseJsonSafe(response) {
  try {
    return await response.json();
  } catch (_) {
    return null;
  }
}

export function assertApiPath(path) {
  const endpoint = String(path || '').trim();
  if (!endpoint) {
    throw new Error('QuantGod API client requires a non-empty /api/* path');
  }
  if (/^https?:\/\//i.test(endpoint)) {
    throw new Error(`QuantGod API client rejects absolute URLs: ${endpoint}`);
  }
  if (!endpoint.startsWith('/api/')) {
    throw new Error(`QuantGod API client only allows /api/* paths: ${endpoint}`);
  }
  if (RUNTIME_FILE_PATTERN.test(endpoint)) {
    throw new Error(`QuantGod API client rejects raw runtime files: ${endpoint}`);
  }
  return endpoint;
}

export function makeApiUrl(path) {
  const endpoint = assertApiPath(path);
  return `${API_BASE_URL}${endpoint}`;
}

export function queryString(query = {}) {
  const search = new URLSearchParams();
  Object.entries(query || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value));
    }
  });
  const text = search.toString();
  return text ? `?${text}` : '';
}

export function rowsFromPayload(payload) {
  if (Array.isArray(payload?.data?.rows)) return payload.data.rows;
  if (Array.isArray(payload?.rows)) return payload.rows;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload)) return payload;
  return [];
}

export async function fetchApiJson(path, options = {}) {
  const endpoint = assertApiPath(path);
  const startedAtMs = nowMs();
  const timeoutMs = Number(options.timeoutMs || DEFAULT_TIMEOUT_MS);
  const controller = new AbortController();
  const timer = timeoutMs > 0 ? setTimeout(() => controller.abort(), timeoutMs) : null;

  try {
    const response = await fetch(makeApiUrl(endpoint), {
      method: 'GET',
      headers: JSON_HEADERS,
      cache: 'no-store',
      ...options,
      signal: options.signal || controller.signal,
    });
    const data = await parseJsonSafe(response);
    return {
      ok: response.ok,
      endpoint,
      status: response.status,
      data: response.ok ? data : null,
      error: response.ok ? null : { message: `HTTP ${response.status}`, body: data },
      fetchedAt: new Date().toISOString(),
      durationMs: safeDuration(startedAtMs),
    };
  } catch (error) {
    return {
      ok: false,
      endpoint,
      status: 0,
      data: null,
      error: asErrorPayload(error),
      fetchedAt: new Date().toISOString(),
      durationMs: safeDuration(startedAtMs),
    };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function postApiJson(path, payload = {}, options = {}) {
  const endpoint = assertApiPath(path);
  const startedAtMs = nowMs();
  const timeoutMs = Number(options.timeoutMs || DEFAULT_TIMEOUT_MS);
  const controller = new AbortController();
  const timer = timeoutMs > 0 ? setTimeout(() => controller.abort(), timeoutMs) : null;

  try {
    const response = await fetch(makeApiUrl(endpoint), {
      method: 'POST',
      headers: { ...JSON_HEADERS, 'Content-Type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify(payload || {}),
      ...options,
      signal: options.signal || controller.signal,
    });
    const data = await parseJsonSafe(response);
    return {
      ok: response.ok,
      endpoint,
      status: response.status,
      data: response.ok ? data : null,
      error: response.ok ? null : { message: `HTTP ${response.status}`, body: data },
      fetchedAt: new Date().toISOString(),
      durationMs: safeDuration(startedAtMs),
    };
  } catch (error) {
    return {
      ok: false,
      endpoint,
      status: 0,
      data: null,
      error: asErrorPayload(error),
      fetchedAt: new Date().toISOString(),
      durationMs: safeDuration(startedAtMs),
    };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function fetchJson(path, fallback = null, options = {}) {
  const result = await fetchApiJson(path, options);
  return result.ok ? result.data : fallback;
}

export async function postJson(path, payload = {}, fallback = null, options = {}) {
  const result = await postApiJson(path, payload, options);
  return result.ok ? result.data : fallback;
}

export async function fetchRows(path, options = {}) {
  return rowsFromPayload(await fetchJson(path, null, options));
}
