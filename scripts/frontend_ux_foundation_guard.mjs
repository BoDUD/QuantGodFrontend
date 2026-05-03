import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const requiredFiles = [
  'src/styles/tokens.css',
  'src/styles/themes.css',
  'src/app/operatorExperience.js',
  'src/i18n/index.js',
  'src/locales/zh-CN.js',
  'src/locales/en-US.js',
  'src/composables/useNumberFormat.js',
  'src/components/KpiCard.vue',
  'src/components/EmptyState.vue',
  'src/components/LoadingState.vue',
  'src/components/ErrorState.vue',
  'src/components/MiniSparkline.vue',
  'src/workspaces/dashboard/DashboardUpgradePanel.vue',
];

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

function fail(message) {
  console.error(`[frontend_ux_foundation_guard] ${message}`);
  process.exitCode = 1;
}

for (const file of requiredFiles) {
  if (!exists(file)) fail(`missing required UX foundation file: ${file}`);
}

const main = exists('src/main.js') ? read('src/main.js') : '';
if (!main.includes("./styles/tokens.css")) fail('src/main.js must import src/styles/tokens.css');
if (!main.includes("./styles/themes.css")) fail('src/main.js must import src/styles/themes.css');
if (!main.includes('installOperatorExperience')) fail('src/main.js must install operator experience bootstrap');

const dashboard = exists('src/workspaces/dashboard/DashboardWorkspace.vue')
  ? read('src/workspaces/dashboard/DashboardWorkspace.vue')
  : '';
if (!dashboard.includes('DashboardUpgradePanel')) fail('DashboardWorkspace.vue must mount DashboardUpgradePanel');
if (!dashboard.includes("./DashboardUpgradePanel.vue")) fail('DashboardWorkspace.vue must import DashboardUpgradePanel');

const packageJson = JSON.parse(read('package.json'));
if (!packageJson.scripts?.['ux-foundation']) fail('package.json must expose npm run ux-foundation');
if (!String(packageJson.scripts?.test || '').includes('node --test')) fail('package.json test script must remain node --test based');

const tokens = exists('src/styles/tokens.css') ? read('src/styles/tokens.css') : '';
if (!tokens.includes('font-variant-numeric: tabular-nums')) fail('tokens.css must enforce tabular numeric rendering');
if (!tokens.includes('qg-command-palette')) fail('tokens.css must include command palette styles');

const themes = exists('src/styles/themes.css') ? read('src/styles/themes.css') : '';
for (const theme of ['data-theme="dark"', 'data-theme="light"', 'data-theme="hc"']) {
  if (!themes.includes(theme)) fail(`themes.css missing ${theme}`);
}

const unsafePatterns = [
  /fetch\s*\(/,
  /\/QuantGod_[^'"`\s]*(?:json|csv)/i,
  /localStorage\.setItem\([^)]*(token|secret|password|apiKey)/i,
  /orderSendAllowed\s*[:=]\s*true/i,
  /telegramCommand/i,
];

for (const file of requiredFiles) {
  const source = read(file);
  for (const pattern of unsafePatterns) {
    if (pattern.test(source)) fail(`${file} matches forbidden pattern ${pattern}`);
  }
}

if (!process.exitCode) {
  console.log('[frontend_ux_foundation_guard] OK');
}
