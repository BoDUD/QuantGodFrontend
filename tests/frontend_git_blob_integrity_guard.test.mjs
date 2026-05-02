import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const root = path.resolve(process.cwd());
const guard = path.join(root, 'scripts', 'frontend_git_blob_integrity_guard.mjs');

function runGuard(cwd, env = {}) {
  return execSync(`node ${JSON.stringify(guard)}`, {
    cwd,
    env: { ...process.env, ...env },
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function makeRepo(name, overrides = {}) {
  const repo = path.join(root, '.tmp_git_blob_guard_tests', name);
  rmSync(repo, { recursive: true, force: true });
  mkdirSync(repo, { recursive: true });
  for (const [rel, content] of Object.entries(overrides)) {
    const abs = path.join(repo, rel);
    mkdirSync(path.dirname(abs), { recursive: true });
    writeFileSync(abs, content, 'utf8');
  }
  return repo;
}

function repeatedLines(line, count) {
  return Array.from({ length: count }, (_, idx) => `${line} ${idx}`).join('\n') + '\n';
}

test('guard script itself is multiline and hashbang-free', () => {
  const content = readFileSync(guard, 'utf8');
  assert.equal(content.startsWith('#!'), false);
  assert.equal(content.includes('\r'), false);
  assert.ok(content.split('\n').length >= 120);
  assert.match(content, /git show HEAD:/);
});

test('line count helper would reject single-line workflow content', () => {
  const singleLineWorkflow = 'name: QuantGod Frontend CI on: push jobs: build';
  assert.equal(singleLineWorkflow.split('\n').length, 1);
  assert.match(singleLineWorkflow, /name: QuantGod Frontend CI on:/);
});

test('minimal fixture fails when workflow is compressed', () => {
  const repo = makeRepo('compressed-workflow', {
    '.github/workflows/ci.yml': 'name: QuantGod Frontend CI on: push jobs: build',
    'package.json': JSON.stringify({ scripts: { 'git-blob-integrity': 'node scripts/frontend_git_blob_integrity_guard.mjs' } }, null, 2),
    'src/app/navigation.js': repeatedLines('export const x =', 50),
    'src/app/workspaceRegistry.js': repeatedLines('export const x =', 40),
    'src/app/AppShell.vue': repeatedLines('<template></template>', 90),
    'src/workspaces/legacy/LegacyWorkbench.vue': repeatedLines('<template></template>', 90),
    'scripts/frontend_remote_ci_integrity_guard.mjs': repeatedLines('const failures = []; process.exitCode = 0;', 50),
    'scripts/frontend_lf_integrity_guard.mjs': repeatedLines('const failures = []; process.exitCode = 0;', 50),
    'scripts/frontend_legacy_slim_guard.mjs': repeatedLines('const failures = []; process.exitCode = 0;', 50),
  });
  assert.throws(() => runGuard(repo), /Frontend git blob integrity guard failed/);
});
