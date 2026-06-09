import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { test } from 'node:test';

test('frontend GA stability guard passes', () => {
  const output = execFileSync('node', ['scripts/frontend_ga_stability_guard.mjs'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  assert.match(output, /frontend GA stability guard passed/);
});
