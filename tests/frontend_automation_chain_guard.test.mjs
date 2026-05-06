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
  assert.match(service, /symbols=USDJPYc/);
  assert.doesNotMatch(service + panel, /USDJPYc,EURUSDc,XAUUSDc/);
  assert.doesNotMatch(service, /apiGet|apiPost/);
  assert.match(panel, /USDJPY 实盘 EA 恢复状态/);
  assert.match(panel, /主状态来源/);
  assert.match(panel, /实盘候选/);
  assert.match(panel, /USDJPY Live Loop/);
  assert.match(panel, /技术链路详情/);
  assert.match(panel, /缺失证据/);
  assert.match(panel, /阻断原因/);
  assert.match(panel, /机会入场/);
});

test('automation chain frontend avoids direct runtime files and execution controls', () => {
  const combined = readFileSync(join(root, 'src/services/automationChainApi.js'), 'utf8') + readFileSync(join(root, 'src/components/AutomationChainPanel.vue'), 'utf8');
  assert.doesNotMatch(combined, /QuantGod_.*\.(json|csv)/i);
  assert.doesNotMatch(combined, /OrderSend|quick-trade|privateKey|password|apiKey/i);
});
