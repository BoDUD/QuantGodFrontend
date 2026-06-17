import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';

import { fetchJson, fetchJsonOrFallback, fetchRows, postJson } from '../src/services/apiClient.js';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

test('fetchJson attaches uniform API metadata to object payloads', async () => {
  globalThis.fetch = async () =>
    jsonResponse({
      ok: true,
      value: 42,
      _api: { source: 'backend-file' },
    });

  const payload = await fetchJson('/api/latest');

  assert.equal(payload.value, 42);
  assert.equal(payload._api.source, 'backend-file');
  assert.equal(payload._api.ok, true);
  assert.equal(payload._api.endpoint, '/api/latest');
  assert.equal(payload._api.method, 'GET');
  assert.equal(payload._api.status, 200);
  assert.equal(typeof payload._api.fetchedAt, 'string');
  assert.equal(typeof payload._api.durationMs, 'number');
});

test('fetchJsonOrFallback keeps failure metadata on fallback envelopes', async () => {
  globalThis.fetch = async () => jsonResponse({ error: 'backend_unavailable' }, 503);

  const payload = await fetchJsonOrFallback('/api/dashboard/state', { ok: false, error: 'fallback' });

  assert.equal(payload.ok, false);
  assert.equal(payload.error, 'backend_unavailable');
  assert.equal(payload._api.ok, false);
  assert.equal(payload._api.endpoint, '/api/dashboard/state');
  assert.equal(payload._api.method, 'GET');
  assert.equal(payload._api.status, 503);
});

test('fetchJson keeps failure metadata instead of returning null waiting state', async () => {
  globalThis.fetch = async () => jsonResponse({ error: 'snapshot_bridge_down' }, 503);

  const payload = await fetchJson('/api/mt5-readonly-secondary/snapshot', null);

  assert.equal(payload.ok, false);
  assert.equal(payload.error, 'snapshot_bridge_down');
  assert.equal(payload._api.ok, false);
  assert.equal(payload._api.endpoint, '/api/mt5-readonly-secondary/snapshot');
  assert.equal(payload._api.status, 503);
});

test('fetchRows leaves array payloads as arrays while the underlying request remains no-store', async () => {
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    return jsonResponse({ rows: [{ id: 1 }] });
  };

  const rows = await fetchRows('/api/shadow/signals?limit=1');

  assert.deepEqual(rows, [{ id: 1 }]);
  assert.equal(calls[0].options.cache, 'no-store');
});

test('postJson attaches API metadata to local POST envelopes', async () => {
  globalThis.fetch = async (_url, options = {}) => {
    assert.equal(options.method, 'POST');
    assert.equal(options.headers['X-QuantGod-Local'], '1');
    return jsonResponse({ ok: true, accepted: true });
  };

  const payload = await postJson('/api/notify/test', { dryRun: true });

  assert.equal(payload.accepted, true);
  assert.equal(payload._api.ok, true);
  assert.equal(payload._api.endpoint, '/api/notify/test');
  assert.equal(payload._api.method, 'POST');
  assert.equal(payload._api.status, 200);
});

test('apiClient keeps method, cache, body, and local POST header under client control', async () => {
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    return jsonResponse({ ok: true });
  };

  await fetchJson('/api/latest', null, {
    method: 'POST',
    cache: 'reload',
    body: 'unsafe',
    headers: { 'X-Trace': 'ok' },
  });
  await postJson('/api/notify/test', { dryRun: true }, null, {
    method: 'GET',
    cache: 'reload',
    body: 'unsafe',
    headers: { 'X-QuantGod-Local': '0', 'X-Trace': 'ok' },
  });

  assert.equal(calls[0].options.method, 'GET');
  assert.equal(calls[0].options.cache, 'no-store');
  assert.equal(calls[0].options.body, undefined);
  assert.equal(calls[0].options.headers['X-Trace'], 'ok');
  assert.equal(calls[1].options.method, 'POST');
  assert.equal(calls[1].options.cache, 'no-store');
  assert.equal(calls[1].options.headers['X-QuantGod-Local'], '1');
  assert.equal(calls[1].options.headers['X-Trace'], 'ok');
  assert.deepEqual(JSON.parse(calls[1].options.body), { dryRun: true });
});
