import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import assert from 'node:assert/strict';

const guardPath = path.resolve('scripts/frontend_legacy_slim_guard.mjs');

function makeRepo({ legacyLines = 180, includeForbidden = false, archiveLines = 1200 } = {}) {
  const root = path.join(tmpdir(), `qg-legacy-slim-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  const dirs = [
    'src/workspaces/legacy',
    'src/app',
    'archive/legacy-workbench',
    'scripts',
    'tests',
    '.github/workflows',
  ];
  for (const dir of dirs) mkdirSync(path.join(root, dir), { recursive: true });

  const filler = Array.from({ length: legacyLines }, (_, i) => `<!-- slim ${i} -->`).join('\n');
  const forbidden = includeForbidden ? "\n<script>fetch('/QuantGod_Dashboard.json')</script>" : '';
  writeFileSync(
    path.join(root, 'src/workspaces/legacy/LegacyWorkbench.vue'),
    `<template><LegacyDeprecationBanner /> archive/legacy-workbench/LegacyWorkbenchFull.vue ${filler}</template>\n<script setup>\nimport LegacyDeprecationBanner from './LegacyDeprecationBanner.vue';\nimport { legacyMigrationCounts } from './legacyMigrationManifest.js';\nimport { useWorkspaceStore } from '../../stores/workspaceStore.js';\nconst { setActiveWorkspace } = useWorkspaceStore();\nlegacyMigrationCounts();\nsetActiveWorkspace;\n</script>${forbidden}\n`,
  );
  writeFileSync(
    path.join(root, 'archive/legacy-workbench/LegacyWorkbenchFull.vue'),
    Array.from({ length: archiveLines }, (_, i) => `<div>${i}</div>`).join('\n'),
  );
  writeFileSync(
    path.join(root, 'src/workspaces/legacy/legacyMigrationManifest.js'),
    "export const legacyArchive = { path: 'archive/legacy-workbench/LegacyWorkbenchFull.vue' };\nexport function legacyMigrationCounts() { return { total: 9, migrated: 9, pending: 0 }; }\n",
  );
  writeFileSync(
    path.join(root, 'src/workspaces/legacy/LEGACY_MIGRATION.md'),
    '# Legacy Migration\n\n## Legacy Slim\narchive/legacy-workbench/LegacyWorkbenchFull.vue\n',
  );
  writeFileSync(path.join(root, 'src/app/navigation.js'), "export const DEFAULT_WORKSPACE = 'dashboard';\n");
  writeFileSync(
    path.join(root, 'package.json'),
    JSON.stringify({ scripts: { 'legacy-slim': 'node scripts/frontend_legacy_slim_guard.mjs' } }, null, 2),
  );
  writeFileSync(path.join(root, '.github/workflows/ci.yml'), 'run: npm run legacy-slim\n');
  return root;
}

function runGuard(root) {
  return spawnSync(process.execPath, [guardPath], { cwd: root, encoding: 'utf8' });
}

test('legacy slim guard accepts slim routed fallback with archived full source', () => {
  const root = makeRepo();
  const result = runGuard(root);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Frontend legacy slim guard OK/);
});

test('legacy slim guard rejects runtime data reads in routed legacy component', () => {
  const root = makeRepo({ includeForbidden: true });
  const result = runGuard(root);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /must not contain/);
});

test('legacy slim guard rejects missing full archive', () => {
  const root = makeRepo({ archiveLines: 10 });
  const result = runGuard(root);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /full legacy source/);
});
