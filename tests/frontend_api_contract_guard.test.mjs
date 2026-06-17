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

function writeApiContract(root, paths) {
  const contractPath = path.join(root, 'api-contract.json');
  fs.writeFileSync(
    contractPath,
    JSON.stringify(
      {
        endpointGroups: [
          {
            name: 'fixture',
            endpoints: paths.map((apiPath) => ({
              method: 'GET',
              path: apiPath,
              mode: 'read-only',
            })),
          },
        ],
      },
      null,
      2,
    ),
    'utf8',
  );
  return contractPath;
}

function runFixtureGuard(root, options = {}) {
  return runFrontendApiContractGuard(root, {
    skipApiContractCoverage: true,
    ...options,
  });
}

test('allows apiClient-layer /api fetches', () => {
  const root = makeRepo();
  write(root, 'src/services/apiClient.js', "export const load = () => fetch('/api/dashboard/state')\n");
  const errors = runFixtureGuard(root);
  assert.deepEqual(errors, []);
});

test('blocks raw fetch calls from service modules outside apiClient', () => {
  const root = makeRepo();
  write(root, 'src/services/api.js', "export const load = () => fetch('/api/dashboard/state')\n");
  const errors = runFixtureGuard(root);
  assert.ok(errors.some((error) => error.message.includes('outside src/services/apiClient.js')));
});

test('blocks direct QuantGod JSON and CSV runtime artifact paths', () => {
  const root = makeRepo();
  write(root, 'src/services/api.js', "export const load = () => ['/QuantGod_Dashboard.json', '/QuantGod_TradeJournal.csv']\n");
  const errors = runFixtureGuard(root);
  assert.ok(errors.some((error) => error.message.includes('direct QuantGod_*.json/csv')));
});

test('allows display-only QuantGod artifact names without local path prefix', () => {
  const root = makeRepo();
  write(root, 'src/components/ReportLabel.vue', "<template>{{ 'QuantGod_Dashboard.json' }}</template>\n");
  const errors = runFixtureGuard(root);
  assert.deepEqual(errors, []);
});

test('blocks raw fetch calls from UI components', () => {
  const root = makeRepo();
  write(root, 'src/components/BadPanel.vue', "<script setup>fetch('/api/dashboard/state')</script>\n");
  const errors = runFixtureGuard(root);
  assert.ok(errors.some((error) => error.message.includes('raw fetch() outside src/services/apiClient.js')));
});

test('blocks split-boundary directories in frontend repo', () => {
  const root = makeRepo();
  fs.mkdirSync(path.join(root, 'MQL5'), { recursive: true });
  const errors = runFixtureGuard(root);
  assert.ok(errors.some((error) => error.message.includes('split-boundary violation')));
});

test('blocks non-api local fetch targets', () => {
  const root = makeRepo();
  write(root, 'src/services/apiClient.js', "export const load = () => fetch('/healthz')\n");
  const errors = runFixtureGuard(root);
  assert.ok(errors.some((error) => error.message.includes('non-API fetch target')));
});

test('checks frontend static api paths against docs contract when contract is available', () => {
  const root = makeRepo();
  const contractPath = writeApiContract(root, [
    '/api/dashboard/state',
    '/api/mt5-readonly/:endpoint',
  ]);
  write(root, 'src/services/api.js', "export const load = () => fetchJson('/api/dashboard/state')\n");
  write(root, 'src/components/Preview.vue', '<template><JsonPreview source="/api/mt5-readonly/account" /></template>\n');
  const errors = runFrontendApiContractGuard(root, { apiContractPath: contractPath });
  assert.deepEqual(errors, []);
});

test('rejects frontend static api paths missing from docs contract', () => {
  const root = makeRepo();
  const contractPath = writeApiContract(root, ['/api/dashboard/state']);
  write(root, 'src/services/newApi.js', "export const load = () => fetchJson('/api/unregistered/status')\n");
  const errors = runFrontendApiContractGuard(root, { apiContractPath: contractPath });
  assert.ok(errors.some((error) => error.message.includes('/api/unregistered/status')));
});
