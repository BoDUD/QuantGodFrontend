import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';

test('frontend UX foundation guard passes', () => {
  const result = spawnSync(process.execPath, ['scripts/frontend_ux_foundation_guard.mjs'], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /OK/);
});
