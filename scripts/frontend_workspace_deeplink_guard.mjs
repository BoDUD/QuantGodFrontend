import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.env.QG_FRONTEND_ROOT ? path.resolve(process.env.QG_FRONTEND_ROOT) : process.cwd();

const errors = [];

function fail(message) {
  errors.push(message);
}

function read(relPath) {
  const fullPath = path.join(root, relPath);
  if (!fs.existsSync(fullPath)) {
    fail(`${relPath} is missing`);
    return '';
  }
  return fs.readFileSync(fullPath, 'utf8');
}

function assertIncludes(content, needle, relPath) {
  if (!content.includes(needle)) {
    fail(`${relPath} must include ${needle}`);
  }
}

function assertNotIncludes(content, needle, relPath) {
  if (content.includes(needle)) {
    fail(`${relPath} must not include ${needle}`);
  }
}

const appShell = read('src/app/AppShell.vue');
const store = read('src/stores/workspaceStore.js');
const workspaceUrl = read('src/app/workspaceUrl.js');
const registry = read('src/app/workspaceRegistry.js');
const navigation = read('src/app/navigation.js');
const pkg = read('package.json');
const ci = read('.github/workflows/ci.yml');

assertIncludes(workspaceUrl, 'WORKSPACE_QUERY_PARAM', 'src/app/workspaceUrl.js');
assertIncludes(workspaceUrl, 'readWorkspaceFromUrl', 'src/app/workspaceUrl.js');
assertIncludes(workspaceUrl, 'writeWorkspaceToUrl', 'src/app/workspaceUrl.js');
assertIncludes(workspaceUrl, 'buildWorkspaceUrl', 'src/app/workspaceUrl.js');
assertIncludes(workspaceUrl, 'workspaceShareUrl', 'src/app/workspaceUrl.js');
assertIncludes(workspaceUrl, 'URLSearchParams', 'src/app/workspaceUrl.js');

assertIncludes(store, 'initializeWorkspaceUrlSync', 'src/stores/workspaceStore.js');
assertIncludes(store, 'popstate', 'src/stores/workspaceStore.js');
assertIncludes(store, 'writeWorkspaceToUrl', 'src/stores/workspaceStore.js');
assertIncludes(store, 'readWorkspaceFromUrl', 'src/stores/workspaceStore.js');
assertIncludes(store, 'workspaceShareLink', 'src/stores/workspaceStore.js');
assertIncludes(store, 'copyWorkspaceLink', 'src/stores/workspaceStore.js');

assertIncludes(appShell, 'initializeWorkspaceUrlSync', 'src/app/AppShell.vue');
assertIncludes(appShell, 'activeWorkspaceUrl', 'src/app/AppShell.vue');
assertIncludes(appShell, 'copyLink', 'src/app/AppShell.vue');
assertIncludes(appShell, 'app-shell__workspace-url', 'src/app/AppShell.vue');
assertNotIncludes(appShell, 'fetch(', 'src/app/AppShell.vue');
assertNotIncludes(appShell, '/QuantGod_', 'src/app/AppShell.vue');

assertIncludes(navigation, "DEFAULT_WORKSPACE = 'dashboard'", 'src/app/navigation.js');
assertIncludes(registry, 'workspaceExists', 'src/app/workspaceRegistry.js');
assertNotIncludes(registry, 'vue-router', 'src/app/workspaceRegistry.js');
assertNotIncludes(appShell, 'createRouter', 'src/app/AppShell.vue');
assertIncludes(navigation, 'HIDDEN_WORKSPACES', 'src/app/navigation.js');

const visibleNavigation = navigation.split('export const HIDDEN_WORKSPACES')[0] || navigation;
assertNotIncludes(visibleNavigation, "key: 'legacy'", 'src/app/navigation.js visible navigation');
assertNotIncludes(visibleNavigation, '旧版归档', 'src/app/navigation.js visible navigation');

for (const key of [
  'dashboard',
  'mt5',
  'governance',
  'paramlab',
  'research',
  'polymarket',
  'backtest-ai',
  'phase1',
  'phase2',
  'phase3',
]) {
  assertIncludes(navigation, `'${key}'`, 'src/app/navigation.js');
}

if (/key\s*:\s*['"]legacy['"]/.test(navigation)) {
  fail('src/app/navigation.js must not expose or hide a legacy workspace route');
}
assertNotIncludes(registry, 'LegacyWorkbench', 'src/app/workspaceRegistry.js');
assertNotIncludes(registry, 'workspaces/legacy', 'src/app/workspaceRegistry.js');

assertIncludes(pkg, '"deeplink"', 'package.json');
assertIncludes(pkg, 'frontend_workspace_deeplink_guard.mjs', 'package.json');
assertIncludes(ci, 'npm run deeplink', '.github/workflows/ci.yml');

if (errors.length > 0) {
  console.error('Frontend workspace deep-link guard failed:');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log('Frontend workspace deep-link guard OK');
