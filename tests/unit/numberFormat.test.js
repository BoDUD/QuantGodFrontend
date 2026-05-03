import { describe, expect, it } from 'vitest';

import { formatCurrency, formatPnl, formatPercent } from '../../src/composables/useNumberFormat.js';

describe('useNumberFormat', () => {
  it('formats PnL currency without double negative', () => {
    expect(formatPnl(-2.33, { currency: true })).toMatch(/^-/);
    expect(formatPnl(-2.33, { currency: true })).not.toMatch(/^--/);
    expect(formatPnl(2.33, { currency: true })).toMatch(/^\+/);
  });

  it('keeps cent-account currency labels usable', () => {
    expect(formatCurrency(12.3, { currency: 'USC' })).toContain('USC');
    expect(formatPnl(-12.3, { currency: 'USC' })).toContain('USC');
  });

  it('normalizes whole-number percent values', () => {
    expect(formatPercent(54.55)).toBe('54.55%');
  });
});
