import { execFileSync } from 'node:child_process';
import test from 'node:test';

test('frontend Telegram Gateway Ops guard passes on the repository', () => {
  execFileSync(process.execPath, ['scripts/frontend_telegram_gateway_ops_guard.mjs'], {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: 'pipe',
  });
});
