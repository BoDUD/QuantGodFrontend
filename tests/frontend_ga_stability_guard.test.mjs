import { test } from 'node:test';
import { execFileSync } from 'node:child_process';

test('frontend GA stability guard passes', () => {
  execFileSync('node', ['scripts/frontend_ga_stability_guard.mjs'], { stdio: 'pipe' });
});
