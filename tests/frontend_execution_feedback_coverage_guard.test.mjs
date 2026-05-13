import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';

test('frontend execution feedback coverage guard passes', () => {
  const result = spawnSync(process.execPath, ['scripts/frontend_execution_feedback_coverage_guard.mjs'], {
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});
