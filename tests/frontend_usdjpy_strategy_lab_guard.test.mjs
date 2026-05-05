import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

test('frontend USDJPY strategy lab guard passes', () => {
  const result = spawnSync(
    process.execPath,
    [path.join(process.cwd(), 'scripts/frontend_usdjpy_strategy_lab_guard.mjs')],
    {
      cwd: process.cwd(),
      encoding: 'utf8',
    },
  );
  assert.equal(result.status, 0, result.stderr || result.stdout);
});
