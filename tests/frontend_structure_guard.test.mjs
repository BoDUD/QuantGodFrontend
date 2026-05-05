import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { runFrontendStructureGuard } from '../scripts/frontend_structure_guard.mjs';

function makeTempRepo() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'qg-frontend-structure-'));
  for (const dir of [
    'src/app',
    'src/stores',
  ]) {
    fs.mkdirSync(path.join(root, dir), { recursive: true });
  }
  fs.writeFileSync(path.join(root, 'src/App.vue'), "<template><AppShell /></template>\n<script setup>\nimport AppShell from './app/AppShell.vue';\n</script>\n");
  fs.writeFileSync(path.join(root, 'src/app/AppShell.vue'), '<template><main /></template>\n');
  fs.writeFileSync(path.join(root, 'src/app/navigation.js'), 'export const DEFAULT_WORKSPACE = \'dashboard\';\n');
  fs.writeFileSync(path.join(root, 'src/app/workspaceRegistry.js'), 'export function workspaceExists() { return true; }\n');
  fs.writeFileSync(path.join(root, 'src/stores/workspaceStore.js'), 'export function useWorkspaceStore() { return {}; }\n');
  return root;
}

test('structure guard passes modular shell layout', () => {
  const root = makeTempRepo();
  assert.deepEqual(runFrontendStructureGuard(root), []);
});

test('structure guard rejects monolithic App.vue', () => {
  const root = makeTempRepo();
  fs.writeFileSync(path.join(root, 'src/App.vue'), `${'<template></template>\n'.repeat(100)}fetch('/api/latest')`);
  const errors = runFrontendStructureGuard(root).join('\n');
  assert.match(errors, /lightweight shell wrapper/);
  assert.match(errors, /raw fetch/);
});

test('structure guard rejects legacy archive routing', () => {
  const root = makeTempRepo();
  fs.writeFileSync(
    path.join(root, 'src/app/workspaceRegistry.js'),
    "import LegacyWorkbench from '../workspaces/legacy/LegacyWorkbench.vue';\nexport const WORKSPACE_COMPONENTS = { legacy: LegacyWorkbench };\n",
  );
  assert.match(runFrontendStructureGuard(root).join('\n'), /legacy archive must not be routed/);
});
