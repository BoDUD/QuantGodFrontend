import assert from 'node:assert/strict';
import { test } from 'node:test';

import { formatCurrency, formatPnl } from '../src/composables/useNumberFormat.js';

test('formatPnl handles boolean currency flag without double negative', () => {
  const negative = formatPnl(-2.33, { currency: true });
  assert.match(negative, /^-/);
  assert.ok(!negative.startsWith('--'));

  const positive = formatPnl(2.33, { currency: true });
  assert.match(positive, /^\+/);
});

test('formatCurrency falls back for cent-account USC labels', () => {
  assert.match(formatCurrency(12.3, { currency: 'USC' }), /USC/);
  const negative = formatPnl(-12.3, { currency: 'USC' });
  assert.match(negative, /^-/);
  assert.ok(!negative.startsWith('--'));
  assert.match(negative, /USC/);
});
