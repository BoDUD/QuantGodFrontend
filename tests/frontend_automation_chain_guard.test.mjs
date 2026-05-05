import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const root = process.cwd();

test('automation chain frontend uses api facade and Chinese UX', () => {
  const service = readFileSync(join(root, 'src/services/automationChainApi.js'), 'utf8');
  const panel = readFileSync(join(root, 'src/components/AutomationChainPanel.vue'), 'utf8');
  assert.match(service, /\/api\/automation-chain/);
  assert.match(service, /fetchJson/);
  assert.match(service, /postJson/);
  assert.doesNotMatch(service, /apiGet|apiPost/);
  assert.match(panel, /缺失证据/);
  assert.match(panel, /阻断原因/);
  assert.match(panel, /机会入场/);
});

test('automation chain frontend avoids direct runtime files and execution controls', () => {
  const combined = readFileSync(join(root, 'src/services/automationChainApi.js'), 'utf8') + readFileSync(join(root, 'src/components/AutomationChainPanel.vue'), 'utf8');
  assert.doesNotMatch(combined, /QuantGod_.*\.(json|csv)/i);
  assert.doesNotMatch(combined, /OrderSend|quick-trade|privateKey|password|apiKey/i);
});
