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
const fixtureServicePaths = [
  'src/services/api.js',
  'src/services/apiClient.js',
  'src/services/automationChainApi.js',
  'src/services/backtestAiApi.js',
  'src/services/caseMemoryApi.js',
  'src/services/domainApi.js',
  'src/services/gaFactoryApi.js',
  'src/services/gaStabilityApi.js',
  'src/services/phase1Api.js',
  'src/services/phase2Api.js',
  'src/services/phase3Api.js',
  'src/services/productionEvidenceApi.js',
  'src/services/strategyGaFactoryApi.js',
  'src/services/telegramGatewayOpsApi.js',
  'src/services/usdjpyStrategyLabApi.js',
];

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
export function attachApiMeta(payload, result = {}) { return { ...payload, _api: { method: result.method || '', fetchedAt: result.fetchedAt || '', durationMs: result.durationMs || 0 } }; }
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
  for (const servicePath of fixtureServicePaths) {
    const target = path.join(root, servicePath);
    if (fs.existsSync(target)) continue;
    if (servicePath === 'src/services/backtestAiApi.js') {
      fs.writeFileSync(
        target,
        "import { fetchJsonOrFallback, postJsonOrFallback } from './apiClient.js';\nfunction fetchBacktestAiJson(path, fallback = null) { return fetchJsonOrFallback(path, fallback); }\nfunction postBacktestAiJson(path, payload = {}, fallback = null) { return postJsonOrFallback(path, payload, fallback); }\nexport async function loadBacktestAiState() { return fetchBacktestAiJson('/api/latest'); }\n",
      );
      continue;
    }
    if (servicePath === 'src/services/phase3Api.js') {
      fs.writeFileSync(
        target,
        "import { fetchJsonOrFallback, postJsonOrFallback } from './apiClient.js';\nfunction fetchPhase3Json(path, fallback = null) { return fetchJsonOrFallback(path, fallback); }\nfunction postPhase3Json(path, payload = {}, fallback = null) { return postJsonOrFallback(path, payload, fallback); }\nexport const phase3Api = { latest: () => fetchPhase3Json('/api/latest'), run: () => postPhase3Json('/api/latest') };\n",
      );
      continue;
    }
    fs.writeFileSync(
      target,
      "import { fetchJson } from './apiClient.js';\nexport async function load() { return fetchJson('/api/latest'); }\n",
    );
  }

  fs.writeFileSync(
    path.join(root, 'eslint.config.js'),
    overrides.eslintConfig ??
      `
const foundationFiles = [
${fixtureServicePaths.map((servicePath) => `  '${servicePath}',`).join('\n')}
];
export default [{ files: foundationFiles }];
`,
  );

  const guardedServices = fixtureServicePaths.join(' ');

  fs.writeFileSync(
    path.join(root, 'package.json'),
    overrides.packageJson ??
      JSON.stringify(
        {
          scripts: {
            contract: 'node scripts/frontend_api_contract_guard.mjs',
            'api-client': 'node scripts/frontend_api_client_guard.mjs',
            'p0-toolchain': 'npm run contract && npm run api-client && npm run lint',
            lint: `eslint ${guardedServices}`,
            'format:check': `prettier --check ${guardedServices}`,
          },
        },
        null,
        2,
      ),
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

test('api-client guard rejects domainApi helper imports in service modules', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'qg-api-client-domain-import-'));
  writeFixture(root);
  fs.writeFileSync(
    path.join(root, 'src/services/strategyGaFactoryApi.js'),
    "import { fetchJson } from './domainApi.js';\nexport const load = () => fetchJson('/api/latest');\n",
  );
  const result = runGuard(root);
  assert.notEqual(result.status, 0);
  assert.match(
    result.stderr + result.stdout,
    /strategyGaFactoryApi\.js must import API helpers from apiClient\.js instead of domainApi\.js/,
  );
});

test('api-client guard requires legacy high-risk services to import apiClient directly', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'qg-api-client-required-import-'));
  writeFixture(root);
  fs.writeFileSync(
    path.join(root, 'src/services/backtestAiApi.js'),
    "export const DEFAULT_BACKTEST_SYMBOLS = ['USDJPYc'];\nexport async function loadBacktestAiState() { return { ok: false }; }\n",
  );
  const result = runGuard(root);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr + result.stdout, /backtestAiApi\.js must import API helpers from apiClient\.js/);
});

test('api-client guard rejects newly added service modules without apiClient', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'qg-api-client-new-service-'));
  writeFixture(root);
  fs.writeFileSync(
    path.join(root, 'src/services/newResearchApi.js'),
    'export async function loadResearchSummary() { return { ok: false }; }\n',
  );
  const result = runGuard(root);
  assert.notEqual(result.status, 0);
  assert.match(
    result.stderr + result.stdout,
    /newResearchApi\.js must import API helpers from apiClient\.js/,
  );
});

test('api-client guard rejects legacy requestJson wrappers in service modules', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'qg-api-client-request-json-'));
  writeFixture(root);
  fs.writeFileSync(
    path.join(root, 'src/services/phase3Api.js'),
    "import { fetchJsonOrFallback } from './apiClient.js';\nfunction requestJson(url) { return fetchJsonOrFallback(url); }\nexport const phase3Api = { latest: () => requestJson('/api/latest') };\n",
  );
  const result = runGuard(root);
  assert.notEqual(result.status, 0);
  assert.match(
    result.stderr + result.stdout,
    /phase3Api\.js still defines duplicated API helper\/header: function requestJson/,
  );
});

test('api-client guard rejects legacy postJson wrappers in service modules', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'qg-api-client-post-json-'));
  writeFixture(root);
  fs.writeFileSync(
    path.join(root, 'src/services/phase3Api.js'),
    "import { postJsonOrFallback } from './apiClient.js';\nfunction postJson(url, body = {}) { return postJsonOrFallback(url, body); }\nexport const phase3Api = { run: () => postJson('/api/latest') };\n",
  );
  const result = runGuard(root);
  assert.notEqual(result.status, 0);
  assert.match(
    result.stderr + result.stdout,
    /phase3Api\.js still defines duplicated API helper\/header: function postJson/,
  );
});

test('api-client guard requires Phase 3 semantic wrappers', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'qg-api-client-phase3-wrapper-'));
  writeFixture(root);
  fs.writeFileSync(
    path.join(root, 'src/services/phase3Api.js'),
    "import { fetchJsonOrFallback } from './apiClient.js';\nexport const phase3Api = { latest: () => fetchJsonOrFallback('/api/latest') };\n",
  );
  const result = runGuard(root);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr + result.stdout, /phase3Api\.js must expose semantic fetchPhase3Json wrapper/);
});

test('api-client guard rejects generic getJson wrapper in Phase 3 service', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'qg-api-client-phase3-get-json-'));
  writeFixture(root);
  fs.writeFileSync(
    path.join(root, 'src/services/phase3Api.js'),
    "import { fetchJsonOrFallback, postJsonOrFallback } from './apiClient.js';\nfunction fetchPhase3Json(path) { return fetchJsonOrFallback(path); }\nfunction postPhase3Json(path, payload = {}) { return postJsonOrFallback(path, payload); }\nfunction getJson(path) { return fetchPhase3Json(path); }\nexport const phase3Api = { latest: () => getJson('/api/latest') };\n",
  );
  const result = runGuard(root);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr + result.stdout, /phase3Api\.js must not use generic getJson wrapper/);
});

test('api-client guard rejects generic phase2 apiGet/apiPost wrappers', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'qg-api-client-phase2-wrapper-'));
  writeFixture(root);
  fs.writeFileSync(
    path.join(root, 'src/services/phase2Api.js'),
    "import { fetchJsonOrFallback, postJsonOrFallback } from './apiClient.js';\nexport async function apiGet(url) { return fetchJsonOrFallback(url); }\nexport async function apiPost(url, body = {}) { return postJsonOrFallback(url, body); }\n",
  );
  const result = runGuard(root);
  assert.notEqual(result.status, 0);
  assert.match(
    result.stderr + result.stdout,
    /phase2Api\.js still defines duplicated API helper\/header: async function apiGet/,
  );
});

test('api-client guard rejects naked fallback helpers in Backtest AI service methods', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'qg-api-client-backtest-fallback-'));
  writeFixture(root);
  fs.writeFileSync(
    path.join(root, 'src/services/backtestAiApi.js'),
    "import { fetchJsonOrFallback, postJsonOrFallback } from './apiClient.js';\nfunction fetchBacktestAiJson(path, fallback = null) { return fetchJsonOrFallback(path, fallback); }\nfunction postBacktestAiJson(path, payload = {}, fallback = null) { return postJsonOrFallback(path, payload, fallback); }\nexport async function loadBacktestAiState() { return fetchJsonOrFallback('/api/latest'); }\n",
  );
  const result = runGuard(root);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr + result.stdout, /backtestAiApi\.js must call fetchJsonOrFallback\(/);
});

test('api-client guard requires p0-toolchain to run contract and api-client guards', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'qg-api-client-p0-'));
  writeFixture(root);
  fs.writeFileSync(
    path.join(root, 'package.json'),
    JSON.stringify(
      {
        scripts: {
          contract: 'node scripts/frontend_api_contract_guard.mjs',
          'api-client': 'node scripts/frontend_api_client_guard.mjs',
          'p0-toolchain': 'npm run lint && npm run test:unit',
        },
      },
      null,
      2,
    ),
  );
  const result = runGuard(root);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr + result.stdout, /p0-toolchain must run contract and api-client guards/);
});

test('api-client guard requires high-risk services in lint and format scripts', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'qg-api-client-scripts-'));
  writeFixture(root, {
    packageJson: JSON.stringify(
      {
        scripts: {
          contract: 'node scripts/frontend_api_contract_guard.mjs',
          'api-client': 'node scripts/frontend_api_client_guard.mjs',
          'p0-toolchain': 'npm run contract && npm run api-client && npm run lint',
          lint: 'eslint src/services/api.js src/services/backtestAiApi.js src/services/phase1Api.js src/services/phase2Api.js',
          'format:check':
            'prettier --check src/services/api.js src/services/backtestAiApi.js src/services/phase1Api.js src/services/phase2Api.js',
        },
      },
      null,
      2,
    ),
  });
  const result = runGuard(root);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr + result.stdout, /format:check must include src\/services\/phase3Api\.js/);
});

test('api-client guard requires high-risk services in eslint foundation files', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'qg-api-client-eslint-'));
  writeFixture(root, {
    eslintConfig: `
const foundationFiles = [
  'src/services/api.js',
  'src/services/backtestAiApi.js',
  'src/services/phase1Api.js',
  'src/services/phase2Api.js',
];
export default [{ files: foundationFiles }];
`,
  });
  const result = runGuard(root);
  assert.notEqual(result.status, 0);
  assert.match(
    result.stderr + result.stdout,
    /eslint\.config\.js foundationFiles must include src\/services\/phase3Api\.js/,
  );
});

test('api-client guard rejects missing raw file protection', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'qg-api-client-raw-'));
  writeFixture(root, {
    apiClient: `
export function assertApiPath(path) { return String(path).startsWith('/api/') ? path : path; }
export function makeApiUrl(path) { return path; }
export function queryString() { return ''; }
export function rowsFromPayload() { return []; }
export function attachApiMeta(payload, result = {}) { return { ...payload, _api: { method: result.method || '', fetchedAt: result.fetchedAt || '', durationMs: result.durationMs || 0 } }; }
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
