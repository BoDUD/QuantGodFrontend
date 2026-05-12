import { execFileSync } from 'node:child_process';
import test from 'node:test';

test('frontend Strategy GA Factory guard passes on the repository', () => {
  execFileSync(process.execPath, ['scripts/frontend_strategy_ga_factory_guard.mjs'], {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: 'pipe',
  });
});
