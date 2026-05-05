import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync('src/styles/responsive-hardening.css', 'utf8');

describe('frontend responsive hardening', () => {
  it('defines all responsive breakpoints used by the operator workbench', () => {
    assert.match(css, /--qg-breakpoint-phone:\s*390px/);
    assert.match(css, /--qg-breakpoint-iab:\s*612px/);
    assert.match(css, /--qg-breakpoint-tablet:\s*900px/);
  });

  it('hardens narrow screens without hiding table access', () => {
    assert.match(css, /@media \(max-width: 612px\)/);
    assert.match(css, /\.ant-table-content\s*\{[^}]*overflow-x:\s*auto/s);
    assert.match(css, /\.table-panel[\s\S]*overflow-x:\s*auto/);
  });

  it('keeps automation chain visible on dashboard and prevents long text overflow', () => {
    assert.match(css, /\.automation-chain-panel/);
    assert.match(css, /overflow-wrap:\s*anywhere/);
    assert.doesNotMatch(css, /OrderSend|TRADE_ACTION_DEAL|telegramCommandExecutionAllowed\s*[:=]\s*true/);
  });
});
