import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const overlayRoot = path.resolve(testDir, '..');
const guardPath = path.join(overlayRoot, 'scripts/frontend_api_client_guard.mjs');

function writeFixture(root, overrides = {}) {
  fs.mkdirSync(path.join(root, 'src/services'), { recursive: true });
  fs.mkdirSync(path.join(root, 'scripts'), { recursive: true });
  fs.mkdirSync(path.join(root, '.github/workflows'), { recursive: true });

  fs.writeFileSync(
    path.join(root, 'src/services/apiClient.js'),
    overrides.apiClient ??
      `
export function assertApiPath(path) { return String(path).startsWith('/api/') ? path : (() => { throw new Error('bad'); })(); }
export function makeApiUrl(path) { return assertApiPath(path); }
export function queryString() { return ''; }
export function rowsFromPayload() { return []; }
export function attachApiMeta(payload, result = {}) { return { ...payload, _api: { fetchedAt: result.fetchedAt || '', durationMs: result.durationMs || 0 } }; }
export async function fetchApiJson() { return { ok: true, fetchedAt: '', durationMs: 0 }; }
export async function postApiJson() { return { ok: true, fetchedAt: '', durationMs: 0 }; }
export async function fetchJson() { return null; }
export async function postJson() { return null; }
export async function fetchRows() { return []; }
export function apiFallback() { return {}; }
export function apiThrowMessage() { return 'error'; }
export async function fetchJsonOrFallback() { return null; }
export async function postJsonOrFallback() { return null; }
export async function fetchJsonOrThrow() { return {}; }
export async function postJsonOrThrow() { return {}; }
const RUNTIME_FILE_PATTERN = /QuantGod_/;
`,
  );

  fs.writeFileSync(
    path.join(root, 'src/services/domainApi.js'),
    overrides.domainApi ??
      `
import { fetchJson, fetchRows, postJson, queryString as params, rowsFromPayload } from './apiClient.js';
export async function loadDashboardWorkspace() { return fetchJson('/api/latest'); }
export { fetchJson, fetchRows, postJson, rowsFromPayload };
`,
  );

  fs.writeFileSync(
    path.join(root, 'package.json'),
    JSON.stringify({ scripts: { 'api-client': 'node scripts/frontend_api_client_guard.mjs' } }, null, 2),
  );

  fs.writeFileSync(
    path.join(root, '.github/workflows/ci.yml'),
    'name: test\njobs:\n  frontend:\n    steps:\n      - run: npm run api-client\n',
  );
}

function runGuard(root) {
  return spawnSync(process.execPath, [guardPath], {
    cwd: path.resolve('.'),
    env: { ...process.env, QG_FRONTEND_ROOT: root },
    encoding: 'utf8',
  });
}

test('api-client guard accepts centralized API client wiring', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'qg-api-client-ok-'));
  writeFixture(root);
  const result = runGuard(root);
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test('api-client guard rejects direct fetch in domainApi', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'qg-api-client-fetch-'));
  writeFixture(root, {
    domainApi: `import { fetchJson, queryString as params } from './apiClient.js';\nexport async function loadDashboardWorkspace() { return fetch('/api/latest'); }`,
  });
  const result = runGuard(root);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr + result.stdout, /fetch\(\) directly/);
});

test('api-client guard rejects duplicated helpers in domainApi', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'qg-api-client-dup-'));
  writeFixture(root, {
    domainApi: `import { fetchJson, queryString as params } from './apiClient.js';\nasync function fetchJson() { return null; }`,
  });
  const result = runGuard(root);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr + result.stdout, /duplicated helper/);
});

test('api-client guard rejects direct fetch in legacy service modules', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'qg-api-client-legacy-fetch-'));
  writeFixture(root);
  fs.writeFileSync(
    path.join(root, 'src/services/phase1Api.js'),
    "export async function load() { return fetch('/api/latest'); }\n",
  );
  const result = runGuard(root);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr + result.stdout, /phase1Api\.js must not call fetch\(\) directly/);
});

test('api-client guard rejects missing raw file protection', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'qg-api-client-raw-'));
  writeFixture(root, {
    apiClient: `
export function assertApiPath(path) { return String(path).startsWith('/api/') ? path : path; }
export function makeApiUrl(path) { return path; }
export function queryString() { return ''; }
export function rowsFromPayload() { return []; }
export function attachApiMeta(payload, result = {}) { return { ...payload, _api: { fetchedAt: result.fetchedAt || '', durationMs: result.durationMs || 0 } }; }
export async function fetchApiJson() { return { ok: true }; }
export async function postApiJson() { return { ok: true }; }
export async function fetchJson() { return null; }
export async function postJson() { return null; }
export async function fetchRows() { return []; }
export function apiFallback() { return {}; }
export function apiThrowMessage() { return 'error'; }
export async function fetchJsonOrFallback() { return null; }
export async function postJsonOrFallback() { return null; }
export async function fetchJsonOrThrow() { return {}; }
export async function postJsonOrThrow() { return {}; }
`,
  });
  const result = runGuard(root);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr + result.stdout, /runtime JSON\/CSV/);
});

test('api-client guard rejects missing observability metadata', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'qg-api-client-meta-'));
  writeFixture(root, {
    apiClient: `
export function assertApiPath(path) { return String(path).startsWith('/api/') ? path : (() => { throw new Error('bad'); })(); }
export function makeApiUrl(path) { return assertApiPath(path); }
export function queryString() { return ''; }
export function rowsFromPayload() { return []; }
export function attachApiMeta(payload) { return payload; }
export async function fetchApiJson() { return { ok: true }; }
export async function postApiJson() { return { ok: true }; }
export async function fetchJson() { return null; }
export async function postJson() { return null; }
export async function fetchRows() { return []; }
export function apiFallback() { return {}; }
export function apiThrowMessage() { return 'error'; }
export async function fetchJsonOrFallback() { return null; }
export async function postJsonOrFallback() { return null; }
export async function fetchJsonOrThrow() { return {}; }
export async function postJsonOrThrow() { return {}; }
const RUNTIME_FILE_PATTERN = /QuantGod_/;
`,
  });
  const result = runGuard(root);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr + result.stdout, /observability metadata/);
});
