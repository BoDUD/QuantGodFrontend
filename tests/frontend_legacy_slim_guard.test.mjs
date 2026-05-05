import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import assert from 'node:assert/strict';

const guardPath = path.resolve('scripts/frontend_legacy_slim_guard.mjs');

function makeRepo({ includeSrcLegacy = false, archiveLines = 1200 } = {}) {
  const root = path.join(tmpdir(), `qg-legacy-slim-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  const dirs = ['src/app', 'archive/legacy-workbench', 'scripts', 'tests', '.github/workflows'];
  for (const dir of dirs) mkdirSync(path.join(root, dir), { recursive: true });

  writeFileSync(
    path.join(root, 'archive/legacy-workbench/LegacyWorkbenchFull.vue'),
    Array.from({ length: archiveLines }, (_, i) => `<div>LegacyWorkbench ${i}</div>`).join('\n'),
  );
  if (includeSrcLegacy) {
    mkdirSync(path.join(root, 'src/workspaces/legacy'), { recursive: true });
    writeFileSync(path.join(root, 'src/workspaces/legacy/LegacyWorkbench.vue'), '<template>legacy</template>\n');
  }
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

test('legacy slim guard accepts archive-only legacy source', () => {
  const root = makeRepo();
  const result = runGuard(root);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Frontend legacy slim guard OK/);
});

test('legacy slim guard rejects legacy source under src', () => {
  const root = makeRepo({ includeSrcLegacy: true });
  const result = runGuard(root);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /src\/workspaces\/legacy must not exist/);
});

test('legacy slim guard rejects missing full archive', () => {
  const root = makeRepo({ archiveLines: 10 });
  const result = runGuard(root);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /full legacy source/);
});
