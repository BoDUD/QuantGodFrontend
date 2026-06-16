import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import phase3Api from '../src/services/phase3Api.js';

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

test('phase3Api GET calls use apiClient metadata and no-store fetch options', async () => {
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    return jsonResponse({ ok: true, config: { enabled: true } });
  };

  const payload = await phase3Api.vibeConfig();

  assert.equal(payload.ok, true);
  assert.equal(payload._api.endpoint, '/api/vibe-coding/config');
  assert.equal(payload._api.status, 200);
  assert.equal(typeof payload._api.fetchedAt, 'string');
  assert.equal(typeof payload._api.durationMs, 'number');
  assert.equal(calls[0].url, '/api/vibe-coding/config');
  assert.equal(calls[0].options.cache, 'no-store');
  assert.equal(calls[0].options.method, 'GET');
});

test('phase3Api POST calls use apiClient CSRF header and preserve metadata', async () => {
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    return jsonResponse({ ok: true, strategy: { strategy_id: 'vibe-usdjpy-001' } });
  };

  const payload = await phase3Api.generateStrategy({
    description: 'USDJPY low risk RSI research seed',
    symbol: 'USDJPYc',
  });

  assert.equal(payload.ok, true);
  assert.equal(payload._api.endpoint, '/api/vibe-coding/generate');
  assert.equal(payload.strategy.strategy_id, 'vibe-usdjpy-001');
  assert.equal(calls[0].options.method, 'POST');
  assert.equal(calls[0].options.headers['X-QuantGod-Local'], '1');
  assert.deepEqual(JSON.parse(calls[0].options.body), {
    description: 'USDJPY low risk RSI research seed',
    symbol: 'USDJPYc',
  });
});

test('phase3Api fallback keeps endpoint status when backend rejects a request', async () => {
  globalThis.fetch = async () => jsonResponse({ error: 'backend_busy' }, 503);

  const payload = await phase3Api.runAiV2({ symbol: 'USDJPYc' });

  assert.equal(payload.ok, false);
  assert.equal(payload.error, 'backend_busy');
  assert.equal(payload._api.endpoint, '/api/ai-analysis-v2/run');
  assert.equal(payload._api.status, 503);
});
