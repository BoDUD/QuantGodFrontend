import { mkdtempSync, mkdirSync, writeFileSync, cpSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import assert from 'node:assert/strict';

const repoRoot = path.resolve(process.cwd());
const guardSource = path.join(repoRoot, 'scripts', 'frontend_lf_integrity_guard.mjs');

function makeRepo() {
  const root = mkdtempSync(path.join(tmpdir(), 'qg-frontend-lf-'));
  mkdirSync(path.join(root, 'scripts'), { recursive: true });
  mkdirSync(path.join(root, 'tests'), { recursive: true });
  mkdirSync(path.join(root, '.github', 'workflows'), { recursive: true });
  mkdirSync(path.join(root, 'src', 'workspaces', 'legacy'), { recursive: true });
  cpSync(guardSource, path.join(root, 'scripts', 'frontend_lf_integrity_guard.mjs'));
  return root;
}

function runGuard(root) {
  return spawnSync('node', ['scripts/frontend_lf_integrity_guard.mjs'], {
    cwd: root,
    encoding: 'utf8',
  });
}

function writeBaseline(root) {
  writeFileSync(
    path.join(root, 'package.json'),
    JSON.stringify({
      name: 'fixture',
      version: '0.0.0',
      private: true,
      type: 'module',
      scripts: {
        dev: 'vite',
        build: 'vite build',
        preview: 'vite preview',
        'responsive:check': 'node scripts/responsive_check.mjs',
        contract: 'node scripts/frontend_api_contract_guard.mjs',
        test: 'node --test tests/*.mjs',
        structure: 'node scripts/frontend_structure_guard.mjs',
        'workspace-boundary': 'node scripts/frontend_workspace_boundary_guard.mjs',
        'domain-workspace': 'node scripts/frontend_domain_workspace_guard.mjs',
        'lf-integrity': 'node scripts/frontend_lf_integrity_guard.mjs',
      },
      dependencies: { vue: '^3.5.13' },
      devDependencies: { vite: '^6.0.7' },
    }, null, 2) + '\n',
  );
  writeFileSync(
    path.join(root, '.github/workflows/ci.yml'),
    [
      'name: CI',
      '',
      'on:',
      '  push:',
      '    branches: [main]',
      '',
      'jobs:',
      '  frontend:',
      '    runs-on: ubuntu-latest',
      '    steps:',
      '      - uses: actions/checkout@v4',
      '      - uses: actions/setup-node@v4',
      '        with:',
      '          node-version: 20',
      '      - run: npm ci',
      '      - name: LF integrity guard',
      '        run: npm run lf-integrity',
      '      - name: Unit tests',
      '        run: npm test',
      '      - name: Build',
      '        run: npm run build',
      '',
    ].join('\n'),
  );
  writeFileSync(path.join(root, 'src/App.vue'), '<template>\n  <AppShell />\n</template>\n<script setup>\nimport AppShell from \'./app/AppShell.vue\';\n</script>\n');
  mkdirSync(path.join(root, 'archive/legacy-workbench'), { recursive: true });
  writeFileSync(path.join(root, 'archive/legacy-workbench/LegacyWorkbenchFull.vue'), `${'<template>LegacyWorkbench</template>\n'.repeat(1000)}`);
}

test('rejects CR-only hashbang files that would become Node no-op scripts', () => {
  const root = makeRepo();
  try {
    writeBaseline(root);
    writeFileSync(path.join(root, 'scripts/frontend_api_contract_guard.mjs'), '#!/usr/bin/env node\rconsole.log("hidden");\r');
    const result = runGuard(root);
    assert.notEqual(result.status, 0);
    assert.match(`${result.stderr}${result.stdout}`, /contains CR|hashbang/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('accepts LF-normalized executable guard files', () => {
  const root = makeRepo();
  try {
    writeBaseline(root);
    writeFileSync(
      path.join(root, 'scripts/frontend_api_contract_guard.mjs'),
      '#!/usr/bin/env node\n' + Array.from({ length: 45 }, (_, idx) => `const line${idx} = ${idx};`).join('\n') + '\nconsole.log(line0);\n',
    );
    writeFileSync(path.join(root, 'tests/frontend_api_contract_guard.test.mjs'), Array.from({ length: 12 }, (_, idx) => `const t${idx} = ${idx};`).join('\n') + '\n');
    const result = runGuard(root);
    assert.equal(result.status, 0, `${result.stderr}\n${result.stdout}`);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('requires package and CI to include lf-integrity', () => {
  const root = makeRepo();
  try {
    writeBaseline(root);
    writeFileSync(path.join(root, 'package.json'), JSON.stringify({ scripts: {} }, null, 2) + '\n');
    const result = runGuard(root);
    assert.notEqual(result.status, 0);
    assert.match(`${result.stderr}${result.stdout}`, /lf-integrity/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
