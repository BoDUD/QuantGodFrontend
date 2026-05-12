import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import assert from 'node:assert/strict';

test('frontend production evidence guard passes', () => {
  const result = spawnSync(process.execPath, ['scripts/frontend_production_evidence_guard.mjs'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});
