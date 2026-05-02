import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import { runFrontendApiContractGuard } from '../scripts/frontend_api_contract_guard.mjs';

function makeRepo() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'qg-frontend-contract-'));
  fs.mkdirSync(path.join(root, 'src', 'services'), { recursive: true });
  fs.mkdirSync(path.join(root, 'src', 'components'), { recursive: true });
  return root;
}

function write(root, relativePath, text) {
  const fullPath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, text, 'utf8');
}

test('allows service-layer /api fetches', () => {
  const root = makeRepo();
  write(root, 'src/services/api.js', "export const load = () => fetch('/api/dashboard/state')\n");
  const errors = runFrontendApiContractGuard(root);
  assert.deepEqual(errors, []);
});

test('blocks direct QuantGod JSON and CSV runtime artifact paths', () => {
  const root = makeRepo();
  write(root, 'src/services/api.js', "export const load = () => ['/QuantGod_Dashboard.json', '/QuantGod_TradeJournal.csv']\n");
  const errors = runFrontendApiContractGuard(root);
  assert.ok(errors.some((error) => error.message.includes('direct QuantGod_*.json/csv')));
});

test('allows display-only QuantGod artifact names without local path prefix', () => {
  const root = makeRepo();
  write(root, 'src/components/ReportLabel.vue', "<template>{{ 'QuantGod_Dashboard.json' }}</template>\n");
  const errors = runFrontendApiContractGuard(root);
  assert.deepEqual(errors, []);
});

test('blocks raw fetch calls from UI components', () => {
  const root = makeRepo();
  write(root, 'src/components/BadPanel.vue', "<script setup>fetch('/api/dashboard/state')</script>\n");
  const errors = runFrontendApiContractGuard(root);
  assert.ok(errors.some((error) => error.message.includes('raw fetch() outside src/services')));
});

test('blocks split-boundary directories in frontend repo', () => {
  const root = makeRepo();
  fs.mkdirSync(path.join(root, 'MQL5'), { recursive: true });
  const errors = runFrontendApiContractGuard(root);
  assert.ok(errors.some((error) => error.message.includes('split-boundary violation')));
});

test('blocks non-api local fetch targets', () => {
  const root = makeRepo();
  write(root, 'src/services/api.js', "export const load = () => fetch('/QuantGod_Dashboard.json')\n");
  const errors = runFrontendApiContractGuard(root);
  assert.ok(errors.some((error) => error.message.includes('non-API fetch target')));
});
