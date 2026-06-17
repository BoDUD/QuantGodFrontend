import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const guardSource = fs.readFileSync(
  new URL('../scripts/frontend_hfm_crypto_workspace_guard.mjs', import.meta.url),
  'utf8',
);
const workspace = fs.readFileSync(
  new URL('../src/workspaces/hfm-crypto/HfmCryptoWorkspace.vue', import.meta.url),
  'utf8',
);
const model = fs.readFileSync(
  new URL('../src/workspaces/hfm-crypto/hfmCryptoModel.js', import.meta.url),
  'utf8',
);
const service = fs.readFileSync(new URL('../src/services/domainApi.js', import.meta.url), 'utf8');

function makeFixture(overrides = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'qg-hfm-crypto-guard-'));
  fs.mkdirSync(path.join(root, 'scripts'), { recursive: true });
  fs.mkdirSync(path.join(root, 'src', 'services'), { recursive: true });
  fs.mkdirSync(path.join(root, 'src', 'workspaces', 'hfm-crypto'), { recursive: true });
  fs.writeFileSync(path.join(root, 'scripts', 'frontend_hfm_crypto_workspace_guard.mjs'), guardSource);
  fs.writeFileSync(path.join(root, 'src', 'services', 'domainApi.js'), overrides.service || service);
  fs.writeFileSync(path.join(root, 'src', 'workspaces', 'hfm-crypto', 'HfmCryptoWorkspace.vue'), overrides.workspace || workspace);
  fs.writeFileSync(path.join(root, 'src', 'workspaces', 'hfm-crypto', 'hfmCryptoModel.js'), overrides.model || model);
  fs.writeFileSync(
    path.join(root, 'package.json'),
    JSON.stringify({
      type: 'module',
      scripts: {
        'hfm-crypto-workspace': 'node scripts/frontend_hfm_crypto_workspace_guard.mjs',
      },
    }),
  );
  return root;
}

function runGuard(root) {
  return execFileSync('node', ['scripts/frontend_hfm_crypto_workspace_guard.mjs'], {
    cwd: root,
    encoding: 'utf8',
  });
}

test('accepts structured shadow-only HFM Crypto workspace', () => {
  const root = makeFixture();
  assert.match(runGuard(root), /HFM Crypto workspace guard OK/);
});

test('rejects direct fetch in HFM Crypto workspace', () => {
  const root = makeFixture({
    workspace: workspace.replace('onMounted(load);', "fetch('/api/hfm-crypto/status');\nonMounted(load);"),
  });
  assert.throws(() => runGuard(root), /must not call fetch/);
});

test('rejects execution affordance in HFM Crypto model', () => {
  const root = makeFixture({
    model: `${model}\nconst executeOrder = true;\n`,
  });
  assert.throws(() => runGuard(root), /forbidden execution/);
});

test('rejects heavy HFM detail endpoints in initial workspace load', () => {
  const root = makeFixture({
    service: service.replace(
      'export async function loadHfmCryptoWorkspaceDetails(options = {})',
      "const leakedHeavyEndpoint = '/api/hfm-crypto/standalone-exporter-bundle';\nexport async function loadHfmCryptoWorkspaceDetails(options = {})",
    ),
  });
  assert.throws(() => runGuard(root), /must not block initial render on heavy endpoint/);
});

test('keeps release readiness summary in initial HFM workspace load', () => {
  const quickStart = service.indexOf('export async function loadHfmCryptoWorkspace(options = {})');
  const detailsStart = service.indexOf('export async function loadHfmCryptoWorkspaceDetails(options = {})');
  const quickLoadBody = service.slice(quickStart, detailsStart);
  assert.match(quickLoadBody, /releaseReadinessRefresh/);
  assert.match(quickLoadBody, /\/api\/live-automation\/release-readiness-refresh/);
});

test('keeps Live16 stale root cause in the HFM core load', () => {
  const coreStart = service.indexOf('export async function loadHfmCryptoWorkspaceCore(options = {})');
  const quickStart = service.indexOf('export async function loadHfmCryptoWorkspace(options = {})');
  const coreLoadBody = service.slice(coreStart, quickStart);
  assert.match(coreLoadBody, /\/api\/mt5-readonly-secondary\/snapshot/);
  assert.match(coreLoadBody, /\/api\/hfm-crypto\/status/);
  assert.match(coreLoadBody, /profitTarget/);
  assert.match(coreLoadBody, /releaseReadinessRefresh/);
  assert.doesNotMatch(coreLoadBody, /\/api\/hfm-crypto\/standalone-exporter-bundle/);
  assert.doesNotMatch(coreLoadBody, /\/api\/hfm-crypto\/mt5-exporter-review/);
});

test('requires POST body signoff input review service', () => {
  const root = makeFixture({
    service: service
      .replaceAll('buildReleaseTokenSignoffInputReview', 'removedSignoffInputReview')
      .replaceAll('postLiveAutomationBodyBuild', 'removedBodyBuildHelper'),
  });
  assert.throws(() => runGuard(root), /missing HFM service marker/);
});

assert.ok(__dirname);
