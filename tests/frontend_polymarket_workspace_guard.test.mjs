import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import test from 'node:test';
import assert from 'node:assert/strict';

const guardSource = fs.readFileSync(new URL('../scripts/frontend_polymarket_workspace_guard.mjs', import.meta.url), 'utf8');
const workspaceSource = fs.readFileSync(new URL('../src/workspaces/polymarket/PolymarketWorkspace.vue', import.meta.url), 'utf8');
const modelSource = fs.readFileSync(new URL('../src/workspaces/polymarket/polymarketModel.js', import.meta.url), 'utf8');

function makeRepo({ workspace = workspaceSource, model = modelSource, scripts = {} } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'qg-poly-guard-'));
  fs.mkdirSync(path.join(root, 'scripts'), { recursive: true });
  fs.mkdirSync(path.join(root, 'src', 'workspaces', 'polymarket'), { recursive: true });
  fs.writeFileSync(path.join(root, 'scripts', 'frontend_polymarket_workspace_guard.mjs'), guardSource);
  fs.writeFileSync(path.join(root, 'src', 'workspaces', 'polymarket', 'PolymarketWorkspace.vue'), workspace);
  fs.writeFileSync(path.join(root, 'src', 'workspaces', 'polymarket', 'polymarketModel.js'), model);
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ scripts: { 'polymarket-workspace': 'node scripts/frontend_polymarket_workspace_guard.mjs', ...scripts } }, null, 2));
  return root;
}

function runGuard(root) {
  return execFileSync('node', ['scripts/frontend_polymarket_workspace_guard.mjs'], { cwd: root, encoding: 'utf8' });
}

test('accepts structured research-only Polymarket workspace', () => {
  const root = makeRepo();
  assert.match(runGuard(root), /Polymarket workspace guard OK/);
});

test('rejects direct fetch in workspace component', () => {
  const root = makeRepo({ workspace: workspaceSource.replace('onMounted(load);', "fetch('/api/polymarket/radar');\nonMounted(load);") });
  assert.throws(() => runGuard(root), /must not call fetch/);
});

test('rejects direct local QuantGod JSON path', () => {
  const root = makeRepo({ workspace: workspaceSource.replace('/api/polymarket/radar', '/QuantGod_PolymarketRadar.json') });
  assert.throws(() => runGuard(root), /must not read local QuantGod JSON\/CSV/);
});

test('rejects execution affordance markers', () => {
  const root = makeRepo({ model: `${modelSource}\nexport function submitOrder() { return false; }\n` });
  assert.throws(() => runGuard(root), /forbidden execution or mutation affordance/);
});

test('rejects missing safety defaults', () => {
  const root = makeRepo({ model: modelSource.replace('polymarketTradingAllowed: false', 'polymarketTradingAllowed: true') });
  assert.throws(() => runGuard(root), /missing safety\/model marker/);
});
