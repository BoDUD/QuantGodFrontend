import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import assert from 'node:assert/strict';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const guardPath = path.join(repoRoot, 'scripts', 'frontend_workspace_deeplink_guard.mjs');

function mkdirp(relPath, root) {
  fs.mkdirSync(path.join(root, relPath), { recursive: true });
}

function write(relPath, content, root) {
  const fullPath = path.join(root, relPath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content, 'utf8');
}

function makeFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'qg-deeplink-'));
  mkdirp('src/app', root);
  mkdirp('src/stores', root);
  mkdirp('scripts', root);
  mkdirp('tests', root);
  mkdirp('.github/workflows', root);

  write(
    'src/app/navigation.js',
    "export const DEFAULT_WORKSPACE = 'dashboard'; export const WORKSPACE_GROUPS = [{items:[{key:'dashboard'},{key:'mt5'},{key:'evolution'},{key:'hfm-crypto'}]}]; export const HIDDEN_WORKSPACES = [{key:'governance'},{key:'paramlab'},{key:'research'},{key:'backtest-ai'},{key:'phase1'},{key:'phase2'},{key:'phase3'}]; export const FLAT_WORKSPACES = WORKSPACE_GROUPS.flatMap((g)=>g.items).concat(HIDDEN_WORKSPACES);",
    root,
  );
  write(
    'src/app/workspaceRegistry.js',
    "export const WORKSPACE_COMPONENTS = { dashboard: {}, mt5: {}, evolution: {}, governance: {}, paramlab: {}, research: {}, 'hfm-crypto': {}, 'backtest-ai': {}, phase1: {}, phase2: {}, phase3: {} }; export function workspaceExists(){} export function resolveWorkspaceComponent(){} export function workspaceMeta(){}",
    root,
  );
  write(
    'src/app/workspaceUrl.js',
    'export const WORKSPACE_QUERY_PARAM = "workspace"; export function readWorkspaceFromUrl(){ return new URLSearchParams(); } export function writeWorkspaceToUrl(){} export function buildWorkspaceUrl(){} export function workspaceShareUrl(){}',
    root,
  );
  write(
    'src/stores/workspaceStore.js',
    'import { readWorkspaceFromUrl, writeWorkspaceToUrl } from "../app/workspaceUrl.js"; export function initializeWorkspaceUrlSync(){ window.addEventListener("popstate", () => readWorkspaceFromUrl()); writeWorkspaceToUrl(); } export function useWorkspaceStore(){ return { workspaceShareLink(){}, copyWorkspaceLink(){} }; }',
    root,
  );
  write(
    'src/app/AppShell.vue',
    '<template><span class="app-shell__workspace-url" :data-url="activeWorkspaceUrl"></span><SnapshotHealthStrip /><component :is="activeComponent" /></template><script setup>import SnapshotHealthStrip from "./SnapshotHealthStrip.vue"; const activeWorkspaceUrl = ""; const activeComponent = {}; function copyLink(){} function initializeWorkspaceUrlSync(){}</script>',
    root,
  );
  write(
    'src/app/SnapshotHealthStrip.vue',
    '<template><section aria-label="Snapshot bridge impact"><div aria-label="Snapshot recovery priority">系统数据源</div><span :title="usableLine">{{ usableLine }}</span><a v-for="row in rows" :title="row.核对端点">{{ row.可信范围 }}{{ row.下一步 }}</a></section></template><script setup>import { loadSnapshotHealthCore } from "../services/domainApi.js"; import { normalizeDashboardSnapshot, buildSnapshotRootCauseBanner, buildSnapshotImpactSummary, buildFrontendSnapshotRecoveryRows } from "../workspaces/dashboard/dashboardModel.js"; const rows = []; const usableLine = ""; setInterval(load, 30000); function load(){ return loadSnapshotHealthCore().then(normalizeDashboardSnapshot).then(buildSnapshotRootCauseBanner).then(buildSnapshotImpactSummary).then(buildFrontendSnapshotRecoveryRows); }</script>',
    root,
  );
  write(
    'package.json',
    '{"scripts":{"deeplink":"node scripts/frontend_workspace_deeplink_guard.mjs"}}',
    root,
  );
  write(
    '.github/workflows/ci.yml',
    'name: ci\njobs:\n  build:\n    steps:\n      - run: npm run deeplink\n',
    root,
  );
  return root;
}

test('deep-link guard passes on current repository', () => {
  const result = spawnSync(process.execPath, [guardPath], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test('snapshot health core load includes whole-frontend execution readiness signals', () => {
  const service = fs.readFileSync(path.join(repoRoot, 'src', 'services', 'domainApi.js'), 'utf8');
  const coreStart = service.indexOf('export async function loadDashboardWorkspaceCore(options = {})');
  const fullStart = service.indexOf('export async function loadDashboardWorkspace(options = {})');
  const coreLoadBody = service.slice(coreStart, fullStart);

  for (const required of [
    'liveAutomationOrchestrator',
    '/api/live-automation/orchestrator',
    'championPromotionGate',
    '/api/live-automation/champion-promotion-gate',
    'liveAutomationReleaseReadiness',
    '/api/live-automation/release-readiness-refresh',
    'releaseTokenEvidenceReview',
    '/api/live-automation/release-token-evidence-review',
    'liveExecutionLaneSelector',
    '/api/live-automation/lane-selector',
    'simTargetExecutionReviewSummary',
    '/api/live-automation/sim-target-execution-review-summary',
  ]) {
    assert.match(coreLoadBody, new RegExp(required.replaceAll('/', '\\/')));
  }
});

test('snapshot health strip first paint uses only fast snapshot endpoints', () => {
  const service = fs.readFileSync(path.join(repoRoot, 'src', 'services', 'domainApi.js'), 'utf8');
  const healthStart = service.indexOf('export async function loadSnapshotHealthCore(options = {})');
  const fullStart = service.indexOf('export async function loadDashboardWorkspace(options = {})');
  const healthLoadBody = service.slice(healthStart, fullStart);

  assert.notEqual(healthStart, -1, 'loadSnapshotHealthCore should exist');
  for (const required of [
    '/api/dashboard/state',
    '/api/latest',
    '/api/mt5-readonly/snapshot',
    '/api/mt5-readonly-secondary/snapshot',
    '/api/hfm-crypto/status',
    '/api/profit-target/status',
    '/api/usdjpy-strategy-lab/live-loop',
  ]) {
    assert.match(healthLoadBody, new RegExp(required.replaceAll('/', '\\/')));
  }
  for (const slowReviewEndpoint of [
    '/api/live-automation/orchestrator',
    '/api/live-automation/release-readiness-refresh',
    '/api/live-automation/release-token-evidence-review',
    '/api/live-automation/lane-selector',
    '/api/live-automation/sim-target-execution-review-summary',
  ]) {
    assert.doesNotMatch(healthLoadBody, new RegExp(slowReviewEndpoint.replaceAll('/', '\\/')));
  }
});

test('snapshot health strip surfaces root cause and affected frontend scope on first paint', () => {
  const component = fs.readFileSync(path.join(repoRoot, 'src', 'app', 'SnapshotHealthStrip.vue'), 'utf8');

  for (const required of [
    'rootCause.value.label',
    'impactSummary.value.affectedAreaLine',
    'impactSummary.value.usableLine',
    'rootCause.value.evidenceLine',
    'usableLine',
    ':title="rootCause.rootCauseLine"',
    ':title="detailLine"',
    ':title="evidenceLine"',
    ':title="usableLine"',
    'row.可信范围',
    'row.核对端点',
    'row.下一步',
  ]) {
    assert.match(component, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});

test('deep-link guard accepts a valid fixture', () => {
  const root = makeFixture();
  const result = spawnSync(process.execPath, [guardPath], {
    cwd: repoRoot,
    env: { ...process.env, QG_FRONTEND_ROOT: root },
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test('deep-link guard rejects missing URL synchronization', () => {
  const root = makeFixture();
  write('src/stores/workspaceStore.js', 'export function useWorkspaceStore(){}', root);
  const result = spawnSync(process.execPath, [guardPath], {
    cwd: repoRoot,
    env: { ...process.env, QG_FRONTEND_ROOT: root },
    encoding: 'utf8',
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /initializeWorkspaceUrlSync/);
});

test('deep-link guard rejects component-level local file reads', () => {
  const root = makeFixture();
  write(
    'src/app/AppShell.vue',
    '<template></template><script setup>fetch("/QuantGod_Dashboard.json"); const activeWorkspaceUrl = ""; function copyLink(){} function initializeWorkspaceUrlSync(){}</script>',
    root,
  );
  const result = spawnSync(process.execPath, [guardPath], {
    cwd: repoRoot,
    env: { ...process.env, QG_FRONTEND_ROOT: root },
    encoding: 'utf8',
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /must not include/);
});

test('deep-link guard rejects any legacy archive navigation', () => {
  const root = makeFixture();
  write(
    'src/app/navigation.js',
    "export const DEFAULT_WORKSPACE = 'dashboard'; export const WORKSPACE_GROUPS = [{items:[{key:'dashboard'},{key:'mt5'},{key:'evolution'},{key:'hfm-crypto'},{key:'legacy', label:'旧版归档'}]}]; export const HIDDEN_WORKSPACES = []; export const FLAT_WORKSPACES = WORKSPACE_GROUPS.flatMap((g)=>g.items);",
    root,
  );
  const result = spawnSync(process.execPath, [guardPath], {
    cwd: repoRoot,
    env: { ...process.env, QG_FRONTEND_ROOT: root },
    encoding: 'utf8',
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /legacy workspace route|visible navigation/);
});

test('deep-link guard rejects registered workspaces without navigation metadata', () => {
  const root = makeFixture();
  write(
    'src/app/navigation.js',
    "export const DEFAULT_WORKSPACE = 'dashboard'; export const WORKSPACE_GROUPS = [{items:[{key:'dashboard'},{key:'mt5'},{key:'evolution'},{key:'hfm-crypto'}]}]; export const HIDDEN_WORKSPACES = [{key:'governance'}]; export const FLAT_WORKSPACES = WORKSPACE_GROUPS.flatMap((g)=>g.items).concat(HIDDEN_WORKSPACES);",
    root,
  );
  const result = spawnSync(process.execPath, [guardPath], {
    cwd: repoRoot,
    env: { ...process.env, QG_FRONTEND_ROOT: root },
    encoding: 'utf8',
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /registered workspace paramlab/);
});
