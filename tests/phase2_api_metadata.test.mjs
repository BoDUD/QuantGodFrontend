import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  endpointErrorMessage,
  endpointFailureDetail,
  endpointSummary,
} from '../src/services/phase2Api.js';

test('endpointSummary exposes API failure metadata for operator pages', () => {
  const payload = {
    ok: false,
    error: 'snapshot_bridge_down',
    _api: {
      ok: false,
      endpoint: '/api/mt5-readonly-secondary/snapshot',
      method: 'GET',
      status: 503,
      fetchedAt: '2026-06-17T09:00:00.000Z',
      durationMs: 37,
      error: {
        message: 'HTTP 503',
        bodyError: 'snapshot_bridge_down',
      },
    },
  };

  const summary = endpointSummary(payload);

  assert.equal(summary.ok, false);
  assert.equal(summary.endpoint, '/api/mt5-readonly-secondary/snapshot');
  assert.equal(summary.httpStatus, 'GET 503');
  assert.equal(summary.fetchedAt, '2026-06-17T09:00:00.000Z');
  assert.equal(summary.durationLabel, '37 ms');
  assert.equal(summary.error, 'snapshot_bridge_down');
  assert.match(summary.failureDetail, /\/api\/mt5-readonly-secondary\/snapshot/);
  assert.match(summary.failureDetail, /GET 503/);
});

test('endpointErrorMessage prefers backend Chinese status when present', () => {
  const payload = {
    ok: false,
    _api: {
      endpoint: '/api/latest',
      method: 'GET',
      status: 0,
      fetchedAt: '2026-06-17T09:01:00.000Z',
      error: {
        message: 'AbortError',
        bodyStatusZh: 'MT5 dashboard 快照已过期',
      },
    },
  };

  assert.equal(endpointErrorMessage(payload), 'MT5 dashboard 快照已过期');
  assert.match(endpointFailureDetail(payload), /GET 无响应/);
});
