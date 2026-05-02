import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const guard = path.join(root, 'scripts/frontend_legacy_deprecation_guard.mjs');

function makeRepo(overrides = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qg-legacy-guard-'));
  const write = (rel, text) => {
    const file = path.join(dir, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, text, 'utf8');
  };
  write('package.json', JSON.stringify({ scripts: { 'legacy-deprecation': 'node scripts/frontend_legacy_deprecation_guard.mjs' } }));
  write('src/App.vue', '<template><AppShell /></template>\n<script setup>import AppShell from \'./app/AppShell.vue\';</script>\n');
  write('src/stores/workspaceStore.js', "export const DEFAULT_WORKSPACE = 'dashboard';\n");
  write('src/app/navigation.js', "export const defaultWorkspace = 'dashboard';\n");
  write('src/app/workspaceRegistry.js', "import LegacyWorkbench from '../workspaces/legacy/LegacyWorkbench.vue';\nexport default { legacy: LegacyWorkbench };\n");
  write('src/workspaces/legacy/LegacyDeprecationBanner.vue', "<template><section>Legacy fallback</section></template>\n<script setup>import './legacyMigrationManifest.js';</script>\n");
  write('src/workspaces/legacy/LEGACY_MIGRATION.md', '# Legacy\n\n只作为完整回退入口。\n\n## 禁止事项\n\n统一通过 /api/*。\n\n## 删除顺序\n\n## 安全边界\n');
  write('src/workspaces/legacy/legacyMigrationManifest.js', `export const LEGACY_MIGRATION_STATUS = { status: 'frozen_fallback', noActiveDevelopment: true, orderSendAllowed: false, closeAllowed: false, cancelAllowed: false, credentialStorageAllowed: false, livePresetMutationAllowed: false, canOverrideKillSwitch: false };
export const MIGRATED_WORKSPACES = [{ key: 'dashboard', status: 'structured_parity_complete' }, { key: 'mt5' }, { key: 'governance' }, { key: 'paramlab' }, { key: 'research' }, { key: 'polymarket' }, { key: 'phase1' }, { key: 'phase2' }, { key: 'phase3' }];
`);
  write('src/workspaces/legacy/LegacyWorkbench.vue', `<template><LegacyDeprecationBanner />${'<div></div>\n'.repeat(150)}</template>\n<script setup>import LegacyDeprecationBanner from './LegacyDeprecationBanner.vue';</script>\n`);
  for (const rel of [
    'src/workspaces/dashboard/DashboardWorkspace.vue',
    'src/workspaces/mt5/Mt5Workspace.vue',
    'src/workspaces/governance/GovernanceWorkspace.vue',
    'src/workspaces/paramlab/ParamLabWorkspace.vue',
    'src/workspaces/research/ResearchWorkspace.vue',
    'src/workspaces/polymarket/PolymarketWorkspace.vue',
    'src/workspaces/phase1/Phase1Workspace.vue',
    'src/workspaces/phase2/Phase2OperationsWorkspace.vue',
    'src/workspaces/phase3/Phase3Workspace.vue',
  ]) write(rel, '<template><section /></template>\n');
  write('scripts/frontend_legacy_deprecation_guard.mjs', fs.readFileSync(guard, 'utf8'));
  for (const [rel, text] of Object.entries(overrides)) write(rel, text);
  return dir;
}

function runGuard(dir) {
  return spawnSync(process.execPath, ['scripts/frontend_legacy_deprecation_guard.mjs'], {
    cwd: dir,
    encoding: 'utf8',
  });
}

test('accepts a frozen legacy fallback with migrated workspaces', () => {
  const dir = makeRepo();
  const result = runGuard(dir);
  assert.equal(result.status, 0, result.stderr);
});

test('rejects legacy as default workspace', () => {
  const dir = makeRepo({ 'src/stores/workspaceStore.js': "export const DEFAULT_WORKSPACE = 'legacy';\n" });
  const result = runGuard(dir);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /legacy must not be the default workspace/);
});

test('rejects missing legacy deprecation banner', () => {
  const dir = makeRepo({ 'src/workspaces/legacy/LegacyWorkbench.vue': `${'<div></div>\n'.repeat(150)}` });
  const result = runGuard(dir);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /LegacyWorkbench must render\/import LegacyDeprecationBanner/);
});

test('rejects direct imports of LegacyWorkbench outside registry and legacy directory', () => {
  const dir = makeRepo({ 'src/workspaces/dashboard/DashboardWorkspace.vue': "<script setup>import LegacyWorkbench from '../legacy/LegacyWorkbench.vue';</script>\n" });
  const result = runGuard(dir);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /must not import or render LegacyWorkbench directly/);
});

test('rejects direct fetch inside legacy fallback', () => {
  const dir = makeRepo({ 'src/workspaces/legacy/LegacyWorkbench.vue': `<template><LegacyDeprecationBanner />${'<div></div>\n'.repeat(150)}</template>\n<script setup>fetch('/api/latest');</script>\n` });
  const result = runGuard(dir);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /direct fetch/);
});



test('rejects execution affordance inside legacy fallback', () => {
  const dir = makeRepo({ 'src/workspaces/legacy/LegacyWorkbench.vue': `<template><LegacyDeprecationBanner />${'<div></div>\n'.repeat(150)}</template>\n<script setup>const submitOrder = () => null;</script>\n` });
  const result = runGuard(dir);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /execution\/mutation affordance/);
});

test('rejects fallback growth beyond cap', () => {
  const dir = makeRepo({ 'src/workspaces/legacy/LegacyWorkbench.vue': `<template><LegacyDeprecationBanner />${'<div></div>\n'.repeat(5201)}</template>\n<script setup>import LegacyDeprecationBanner from './LegacyDeprecationBanner.vue';</script>\n` });
  const result = runGuard(dir);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /grew to|line count/);
});
