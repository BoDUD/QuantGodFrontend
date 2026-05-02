#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const failures = [];
const LEGACY_LINE_CAP = 5200;

function rel(...parts) {
  return path.join(root, ...parts);
}

function toPosix(p) {
  return p.split(path.sep).join('/');
}

function read(relPath) {
  return readFileSync(rel(relPath), 'utf8');
}

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function fileExists(relPath) {
  return existsSync(rel(relPath));
}

function countLines(text) {
  if (!text) return 0;
  return text.split(/\r\n|\n|\r/).length;
}

function lineCount(text) {
  return text.split(/\r\n|\r|\n/).length;
}

function walkFiles(dir, predicate = () => true) {
  const abs = rel(dir);
  if (!existsSync(abs)) return [];
  const out = [];
  const stack = [abs];
  while (stack.length > 0) {
    const current = stack.pop();
    for (const name of readdirSync(current)) {
      const full = path.join(current, name);
      const st = statSync(full);
      if (st.isDirectory()) stack.push(full);
      else if (predicate(full)) out.push(full);
    }
  }
  return out;
}

function checkCoreFiles() {
  const required = [
    'src/App.vue',
    'src/app/workspaceRegistry.js',
    'src/app/navigation.js',
    'src/stores/workspaceStore.js',
    'src/workspaces/legacy/LegacyWorkbench.vue',
    'src/workspaces/legacy/LegacyDeprecationBanner.vue',
    'src/workspaces/legacy/LEGACY_MIGRATION.md',
    'src/workspaces/legacy/legacyMigrationManifest.js',
  ];
  for (const file of required) assert(fileExists(file), `${file} is required for legacy deprecation tracking`);
}

function checkPolicyFiles() {
  if (!fileExists('src/workspaces/legacy/LEGACY_MIGRATION.md')) return;
  if (!fileExists('src/workspaces/legacy/legacyMigrationManifest.js')) return;
  if (!fileExists('src/workspaces/legacy/LegacyDeprecationBanner.vue')) return;

  const migrationDoc = read('src/workspaces/legacy/LEGACY_MIGRATION.md');
  const manifest = read('src/workspaces/legacy/legacyMigrationManifest.js');
  const banner = read('src/workspaces/legacy/LegacyDeprecationBanner.vue');

  for (const phrase of ['只作为完整回退入口', '禁止事项', '/api/*', '删除顺序', '安全边界']) {
    assert(migrationDoc.includes(phrase), `LEGACY_MIGRATION.md must mention ${phrase}`);
  }

  for (const key of ['dashboard', 'mt5', 'governance', 'paramlab', 'research', 'polymarket', 'phase1', 'phase2', 'phase3']) {
    assert(manifest.includes(`key: '${key}'`) || manifest.includes(`key: "${key}"`), `legacyMigrationManifest.js must track ${key}`);
  }

  for (const phrase of [
    'frozen_fallback',
    'noActiveDevelopment: true',
    'orderSendAllowed: false',
    'closeAllowed: false',
    'cancelAllowed: false',
    'credentialStorageAllowed: false',
    'livePresetMutationAllowed: false',
    'canOverrideKillSwitch: false',
  ]) {
    assert(manifest.includes(phrase), `legacyMigrationManifest.js must include ${phrase}`);
  }

  assert(banner.includes('legacyMigrationManifest.js'), 'LegacyDeprecationBanner must read legacyMigrationManifest.js');
  assert(banner.includes('Legacy fallback') || banner.includes('旧完整工作台已冻结'), 'LegacyDeprecationBanner must clearly state legacy is frozen fallback');
}

function checkDefaultWorkspace() {
  const storePath = 'src/stores/workspaceStore.js';
  const navigationPath = 'src/app/navigation.js';
  const store = fileExists(storePath) ? read(storePath) : '';
  const navigation = fileExists(navigationPath) ? read(navigationPath) : '';
  assert(!/DEFAULT_WORKSPACE\s*=\s*['"]legacy['"]/.test(store), 'legacy must not be the default workspace');
  assert(!/currentWorkspace\s*=\s*['"]legacy['"]/.test(store), 'legacy must not be the initial workspace');
  assert(!/defaultWorkspace\s*:\s*['"]legacy['"]/.test(navigation), 'navigation must not default to legacy');
  assert(store.includes('dashboard') || navigation.includes('dashboard'), 'dashboard should remain the default operational workspace');
}

function checkRegistryBoundary() {
  const registryPath = 'src/app/workspaceRegistry.js';
  if (!fileExists(registryPath)) return;
  const registry = read(registryPath);
  assert(registry.includes('LegacyWorkbench'), 'workspaceRegistry should keep legacy fallback registered');
  assert(registry.includes('workspaces/legacy') || registry.includes('../workspaces/legacy/LegacyWorkbench.vue'), 'workspaceRegistry should import legacy from src/workspaces/legacy');

  const srcFiles = walkFiles('src', (full) => /\.(vue|js|mjs|ts)$/.test(full));
  for (const full of srcFiles) {
    const relPath = toPosix(path.relative(root, full));
    if (relPath === 'src/app/workspaceRegistry.js') continue;
    if (relPath.startsWith('src/workspaces/legacy/')) continue;
    const content = readFileSync(full, 'utf8');
    assert(!content.includes('LegacyWorkbench'), `${relPath} must not import or render LegacyWorkbench directly`);
    assert(!content.includes('workspaces/legacy/LegacyWorkbench.vue'), `${relPath} must not import LegacyWorkbench directly`);
  }
}

function checkLegacyFrozen() {
  const legacyPath = 'src/workspaces/legacy/LegacyWorkbench.vue';
  if (!fileExists(legacyPath)) return;
  const legacy = read(legacyPath);
  assert(legacy.includes('LegacyDeprecationBanner'), 'LegacyWorkbench must render/import LegacyDeprecationBanner');
  assert(!/\bfetch\s*\(/.test(legacy), 'LegacyWorkbench must not introduce direct fetch calls');
  assert(!/['"]\/QuantGod_[^'"]+\.(json|csv)['"]/.test(legacy), 'LegacyWorkbench must not directly read /QuantGod_*.json or /QuantGod_*.csv');

  const forbiddenExecutionTokens = [
    'submitOrder',
    'sendOrder',
    'placeOrder',
    'executeTrade',
    'executeOrder',
    'closePosition',
    'cancelOrder',
    'transferFunds',
    'withdrawFunds',
    'depositFunds',
    'mutatePreset',
    'writeLivePreset',
    'promoteRoute',
    'demoteRoute',
    'executePromotion',
    'manualAuthorize',
    'autoExecute',
  ];
  for (const token of forbiddenExecutionTokens) {
    assert(!legacy.includes(token), `LegacyWorkbench must not introduce execution/mutation affordance: ${token}`);
  }

  const count = lineCount(legacy);
  assert(count >= 100, 'LegacyWorkbench should remain a real fallback until deliberate duplicate-section removal begins');
  assert(count <= 5200, `LegacyWorkbench grew to ${count} lines; new work belongs in dedicated workspaces`);
}

function checkLegacyGrowthBudget() {
  const legacyPath = 'src/workspaces/legacy/LegacyWorkbench.vue';
  if (!fileExists(legacyPath)) return;
  const lineCount = countLines(read(legacyPath));
  assert(
    lineCount <= LEGACY_LINE_CAP,
    `LegacyWorkbench line count ${lineCount} exceeds cap ${LEGACY_LINE_CAP}; do not add new feature code to fallback`,
  );
}

function checkMigratedWorkspacesExist() {
  const expected = [
    'src/workspaces/dashboard/DashboardWorkspace.vue',
    'src/workspaces/mt5/Mt5Workspace.vue',
    'src/workspaces/governance/GovernanceWorkspace.vue',
    'src/workspaces/paramlab/ParamLabWorkspace.vue',
    'src/workspaces/research/ResearchWorkspace.vue',
    'src/workspaces/polymarket/PolymarketWorkspace.vue',
    'src/workspaces/phase1/Phase1Workspace.vue',
    'src/workspaces/phase2/Phase2OperationsWorkspace.vue',
    'src/workspaces/phase3/Phase3Workspace.vue',
  ];
  for (const file of expected) assert(fileExists(file), `${file} must exist before legacy can be frozen`);
}

function checkAppShell() {
  const app = fileExists('src/App.vue') ? read('src/App.vue') : '';
  assert(!app.includes('LegacyWorkbench'), 'src/App.vue must not import LegacyWorkbench');
  assert(app.includes('AppShell'), 'src/App.vue should remain a light AppShell entry');
  assert(lineCount(app) <= 80, 'src/App.vue must remain lightweight');
}

function checkPackageScript() {
  if (!fileExists('package.json')) return;
  const pkg = JSON.parse(read('package.json'));
  assert(pkg.scripts && pkg.scripts['legacy-deprecation'] === 'node scripts/frontend_legacy_deprecation_guard.mjs', 'package.json must include npm run legacy-deprecation');
}

checkCoreFiles();
checkPolicyFiles();
checkDefaultWorkspace();
checkRegistryBoundary();
checkLegacyFrozen();
checkMigratedWorkspacesExist();
checkAppShell();
checkPackageScript();

if (failures.length > 0) {
  console.error('Frontend legacy deprecation guard failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Frontend legacy deprecation guard OK');
