import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import { checkProject } from '../scripts/frontend_mt5_workspace_guard.mjs';

function makeProject(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'qg-mt5-guard-'));
  for (const [relativePath, content] of Object.entries(files)) {
    const fullPath = path.join(root, relativePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content, 'utf8');
  }
  return root;
}

const model = [
  'export function normalizeMt5Snapshot() {}',
  'export function buildMt5Metrics() {}',
  'export function buildSafetyItems() {}',
  'export function buildAccountItems() {}',
  'export function buildPositionRows() {}',
  'export function buildOrderRows() {}',
  'export function buildSymbolRows() {}',
  'export function buildRsiEntryDiagnosticRows() {}',
  'export function buildMt5EvidenceOsLiteItems() {}',
  'export function buildEndpointHealth() {}',
  'export function rowsFromPayload() {}',
  'const fields = ["orderSendAllowed", "closeAllowed", "cancelAllowed", "credentialStorageAllowed", "livePresetMutationAllowed"];',
  "const FOCUS_SYMBOL = 'USDJPYc';",
  'function isFocusSymbolRow() { return true; }',
  'function focusSymbolRows() { return []; }',
  'const evidenceOS = { executionFeedback: { promotionGate: {} }, caseMemory: { gaSeedHints: [], label: "Case Memory" } };',
].join('\n');

const workspace = [
  '<template><EndpointHealthGrid /><KeyValueList /><LedgerTable title="RSI 入场诊断" /><StatusPill />执行反馈与下一代修复 Safety Envelope Raw MT5 evidence</template>',
  '<script setup>',
  "import { loadMt5Workspace } from '../../services/domainApi.js';",
  "import { normalizeMt5Snapshot } from './mt5Model.js';",
  '</script>',
].join('\n');

const validFiles = {
  'package.json': JSON.stringify({
    scripts: { 'mt5-workspace': 'node scripts/frontend_mt5_workspace_guard.mjs' },
  }),
  'src/workspaces/mt5/mt5Model.js': model,
  'src/workspaces/mt5/Mt5Workspace.vue': workspace,
  'src/services/domainApi.js': `
export async function loadMt5Workspace() {
  const focusSymbol = 'USDJPYc';
  fetchJson(\`/api/shadow/signals\${params({ symbol: focusSymbol, limit: 500, days: 30 })}\`);
  fetchJson(\`/api/shadow/outcomes\${params({ symbol: focusSymbol, limit: 500, days: 30 })}\`);
  fetchJson(\`/api/shadow/candidates\${params({ symbol: focusSymbol, limit: 500, days: 30 })}\`);
  fetchJson(\`/api/shadow/candidate-outcomes\${params({ symbol: focusSymbol, limit: 500, days: 30 })}\`);
  fetchJson('/api/usdjpy-strategy-lab/evidence-os/status');
}`,
};

test('accepts structured MT5 workspace', () => {
  const root = makeProject(validFiles);
  assert.deepEqual(checkProject(root), []);
});

test('rejects direct fetch in MT5 workspace', () => {
  const root = makeProject({
    ...validFiles,
    'src/workspaces/mt5/Mt5Workspace.vue': `${workspace}\nfetch('/api/mt5-readonly/status')`,
  });
  assert.match(checkProject(root).join('\n'), /must not call fetch directly/);
});

test('rejects direct runtime file reads', () => {
  const root = makeProject({
    ...validFiles,
    'src/workspaces/mt5/Mt5Workspace.vue': `${workspace}\nconst x = '/QuantGod_Dashboard.json';`,
  });
  assert.match(checkProject(root).join('\n'), /runtime JSON\/CSV/);
});

test('rejects missing MT5 safety fields', () => {
  const root = makeProject({
    ...validFiles,
    'src/workspaces/mt5/mt5Model.js': 'export function normalizeMt5Snapshot() {}',
  });
  assert.match(checkProject(root).join('\n'), /missing export buildMt5Metrics/);
});

test('rejects execution affordances in MT5 workspace', () => {
  const root = makeProject({
    ...validFiles,
    'src/workspaces/mt5/Mt5Workspace.vue': `${workspace}\nfunction placeOrder() { return true; }`,
  });
  assert.match(checkProject(root).join('\n'), /forbidden MT5 execution affordance/);
});
