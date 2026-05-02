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
    "export const DEFAULT_WORKSPACE = 'dashboard'; export const WORKSPACE_GROUPS = [{items:[{key:'dashboard'},{key:'mt5'},{key:'governance'},{key:'paramlab'},{key:'research'},{key:'polymarket'},{key:'phase1'},{key:'phase2'},{key:'phase3'},{key:'legacy'}]}]; export const FLAT_WORKSPACES = WORKSPACE_GROUPS.flatMap((g)=>g.items);",
    root,
  );
  write(
    'src/app/workspaceRegistry.js',
    'export function workspaceExists(){} export function resolveWorkspaceComponent(){} export function workspaceMeta(){}',
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
    '<template><code class="app-shell__workspace-url">{{ activeWorkspaceUrl }}</code></template><script setup>const activeWorkspaceUrl = ""; function copyLink(){} function initializeWorkspaceUrlSync(){}</script>',
    root,
  );
  write('package.json', '{"scripts":{"deeplink":"node scripts/frontend_workspace_deeplink_guard.mjs"}}', root);
  write('.github/workflows/ci.yml', 'name: ci\njobs:\n  build:\n    steps:\n      - run: npm run deeplink\n', root);
  return root;
}

test('deep-link guard passes on current repository', () => {
  const result = spawnSync(process.execPath, [guardPath], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
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
