import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const hasFrontendFixtures = fs.existsSync(path.join(repoRoot, 'src', 'App.vue'));

function read(rel) {
  return fs.readFileSync(path.join(repoRoot, rel), 'utf8');
}

test('git blob integrity guard runs in working-tree mode', { skip: !hasFrontendFixtures }, () => {
  execFileSync('node', ['scripts/frontend_git_blob_integrity_guard.mjs'], {
    cwd: repoRoot,
    stdio: 'pipe',
  });
});

test('workflow file is canonical multiline YAML in the working tree', { skip: !hasFrontendFixtures }, () => {
  const text = read('.github/workflows/ci.yml');
  assert.equal(text.includes('\r'), false, 'workflow must be LF-only');
  assert.ok(text.split('\n').length >= 80, 'workflow must be true multiline YAML');
  assert.ok(text.includes('\non:\n'), 'workflow must have on: on its own line');
  assert.ok(text.includes('\njobs:\n'), 'workflow must have jobs: on its own line');
  assert.ok(text.includes('npm run git-blob-integrity'));
});

test('frontend guard scripts do not use hashbangs', { skip: !hasFrontendFixtures }, () => {
  const scriptDir = path.join(repoRoot, 'scripts');
  for (const fileName of fs.readdirSync(scriptDir)) {
    if (!fileName.endsWith('.mjs')) continue;
    const text = fs.readFileSync(path.join(scriptDir, fileName), 'utf8');
    assert.equal(text.includes('\r'), false, `${fileName} must be LF-only`);
    assert.equal(text.startsWith('#!'), false, `${fileName} must not use a hashbang`);
  }
});
