import { execFileSync } from 'node:child_process';
import test from 'node:test';

test('frontend Case Memory guard passes on the repository', () => {
  execFileSync(process.execPath, ['scripts/frontend_case_memory_guard.mjs'], {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: 'pipe',
  });
});
