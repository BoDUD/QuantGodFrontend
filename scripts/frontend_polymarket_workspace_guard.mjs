/**
 * QuantGod frontend guard for the Polymarket workspace.
 *
 * Polymarket is research/advisory evidence only. This guard keeps the Vue
 * workspace on the service-layer /api/* path and blocks trading, funds, or
 * governance mutation affordances from entering the UI.
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const workspacePath = path.join(root, 'src', 'workspaces', 'polymarket', 'PolymarketWorkspace.vue');
const modelPath = path.join(root, 'src', 'workspaces', 'polymarket', 'polymarketModel.js');
const packagePath = path.join(root, 'package.json');

function fail(message) {
  console.error(`[polymarket-workspace-guard] ${message}`);
  process.exit(1);
}

function readFile(filePath) {
  if (!fs.existsSync(filePath)) fail(`missing required file: ${path.relative(root, filePath)}`);
  return fs.readFileSync(filePath, 'utf8');
}

const workspace = readFile(workspacePath);
const model = readFile(modelPath);
const packageJson = JSON.parse(readFile(packagePath));

const requiredWorkspaceMarkers = [
  'buildPolymarketModel',
  'loadPolymarketWorkspace',
  'EndpointHealthGrid',
  'KeyValueList',
  'LedgerTable',
  'StatusPill',
  'Raw Polymarket evidence',
  'research-only',
];
for (const marker of requiredWorkspaceMarkers) {
  if (!workspace.includes(marker)) fail(`PolymarketWorkspace.vue missing marker: ${marker}`);
}

if (/\bfetch\s*\(/.test(workspace)) fail('PolymarketWorkspace.vue must not call fetch() directly');
if (/\/QuantGod_[A-Za-z0-9_-]+\.(json|csv)/.test(workspace)) fail('PolymarketWorkspace.vue must not read local QuantGod JSON/CSV paths');
if (/LegacyWorkbench/.test(workspace)) fail('PolymarketWorkspace.vue must not import LegacyWorkbench');

const forbiddenExecutionPatterns = [
  /\bsubmitOrder\b/,
  /\bsendOrder\b/,
  /\bplaceOrder\b/,
  /\bexecuteTrade\b/,
  /\bexecuteOrder\b/,
  /\bclosePosition\b/,
  /\bcancelOrder\b/,
  /\btransferFunds\b/,
  /\bwithdrawFunds\b/,
  /\bdepositFunds\b/,
  /\bmutatePreset\b/,
  /\bwriteLivePreset\b/,
  /\bpromoteRoute\b/,
  /\bdemoteRoute\b/,
  /\bexecutePromotion\b/,
  /\bmanualAuthorize\b/,
  /\bautoExecute\b/,
];
for (const pattern of forbiddenExecutionPatterns) {
  if (pattern.test(workspace) || pattern.test(model)) {
    fail(`forbidden execution or mutation affordance matched: ${pattern}`);
  }
}

const requiredModelMarkers = [
  'POLYMARKET_SAFETY_DEFAULTS',
  'buildPolymarketModel',
  'researchOnly: true',
  'advisoryOnly: true',
  'readOnlyDataPlane: true',
  'polymarketTradingAllowed: false',
  'canaryExecutionAllowed: false',
  'realTradeExecutionAllowed: false',
  'orderSendAllowed: false',
  'closeAllowed: false',
  'cancelAllowed: false',
  'credentialStorageAllowed: false',
  'fundTransferAllowed: false',
  'withdrawalAllowed: false',
  'livePresetMutationAllowed: false',
  'canOverrideKillSwitch: false',
  'canMutateGovernanceDecision: false',
  'canPromoteOrDemoteRoute: false',
  'autoExecutionAllowed: false',
  'requiresManualAuthorization: true',
];
for (const marker of requiredModelMarkers) {
  if (!model.includes(marker)) fail(`polymarketModel.js missing safety/model marker: ${marker}`);
}

const requiredEndpoints = [
  '/api/polymarket/search',
  '/api/polymarket/radar',
  '/api/polymarket/radar-worker',
  '/api/polymarket/ai-score',
  '/api/polymarket/history',
  '/api/polymarket/auto-governance',
  '/api/polymarket/canary-executor-contract',
  '/api/polymarket/canary-executor-run',
  '/api/polymarket/real-trades',
  '/api/polymarket/cross-linkage',
  '/api/polymarket/markets',
  '/api/polymarket/asset-opportunities',
  '/api/polymarket/single-market-analysis',
];
for (const endpoint of requiredEndpoints) {
  if (!workspace.includes(endpoint) && !model.includes(endpoint)) fail(`missing Polymarket endpoint marker: ${endpoint}`);
}

if (packageJson.scripts?.['polymarket-workspace'] !== 'node scripts/frontend_polymarket_workspace_guard.mjs') {
  fail('package.json must define npm run polymarket-workspace');
}

console.log('Polymarket workspace guard OK');
