#!/usr/bin/env node
/**
 * QuantGodFrontend Research workspace guard.
 *
 * Research is evidence-only. It may display Shadow, trade ledgers, strategy
 * evaluation, regime evaluation, and manual alpha. It must not expose execution,
 * route promotion, live preset mutation, or direct runtime file reads.
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const WORKSPACE = path.join(ROOT, 'src', 'workspaces', 'research', 'ResearchWorkspace.vue');
const MODEL = path.join(ROOT, 'src', 'workspaces', 'research', 'researchModel.js');
const PACKAGE_JSON = path.join(ROOT, 'package.json');
const CI = path.join(ROOT, '.github', 'workflows', 'ci.yml');

const EXECUTION_AFFORDANCES = [
  'OrderSend',
  'placeOrder',
  'sendOrder',
  'submitOrder',
  'closePosition',
  'cancelOrder',
  'mutatePreset',
  'writeLivePreset',
  'promoteRoute',
  'demoteRoute',
  'executePromotion',
  'manualAuthorize',
  'startLiveRun',
  'runLiveTester',
];

function readText(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
}

function fail(message) {
  console.error(`Research workspace guard failed: ${message}`);
  process.exitCode = 1;
}

function expectFile(file, label) {
  if (!fs.existsSync(file)) fail(`${label} missing: ${path.relative(ROOT, file)}`);
}

function assertNoRuntimeFileReads(text, label) {
  if (/\/QuantGod_[A-Za-z0-9_\-.]+\.(json|csv)/.test(text)) {
    fail(`${label} references raw QuantGod runtime files instead of /api/*`);
  }
}

function assertNoDirectFetch(text, label) {
  if (/\bfetch\s*\(/.test(text)) fail(`${label} contains direct fetch(); use src/services/domainApi.js`);
}

function assertNoExecutionAffordance(text, label) {
  const found = EXECUTION_AFFORDANCES.filter((needle) => text.includes(needle));
  if (found.length) fail(`${label} contains forbidden execution affordance: ${found.join(', ')}`);
}

function main() {
  expectFile(WORKSPACE, 'ResearchWorkspace.vue');
  expectFile(MODEL, 'researchModel.js');
  const workspace = readText(WORKSPACE);
  const model = readText(MODEL);
  const pkg = JSON.parse(readText(PACKAGE_JSON));
  const ci = readText(CI);

  if (!workspace.includes("import { loadResearchWorkspace } from '../../services/domainApi.js';")) {
    fail('ResearchWorkspace must load data through loadResearchWorkspace()');
  }
  if (!workspace.includes("import { buildResearchViewModel } from './researchModel.js';")) {
    fail('ResearchWorkspace must use researchModel.js');
  }
  for (const required of ['EndpointHealthGrid', 'KeyValueList', 'LedgerTable', 'StatusPill', 'MetricGrid']) {
    if (!workspace.includes(required)) fail(`ResearchWorkspace must use ${required}`);
  }
  if (workspace.includes('LegacyWorkbench')) fail('ResearchWorkspace must not import LegacyWorkbench');
  assertNoDirectFetch(workspace, 'ResearchWorkspace.vue');
  assertNoRuntimeFileReads(workspace, 'ResearchWorkspace.vue');
  assertNoExecutionAffordance(workspace, 'ResearchWorkspace.vue');

  for (const exported of [
    'RESEARCH_SAFETY_DEFAULTS',
    'buildResearchEndpointHealth',
    'buildResearchSafetyEnvelope',
    'buildResearchMetrics',
    'buildResearchViewModel',
  ]) {
    if (!model.includes(`export ${exported}`) && !model.includes(`export function ${exported}`) && !model.includes(`export const ${exported}`)) {
      fail(`researchModel.js must export ${exported}`);
    }
  }
  for (const safetyField of [
    'researchOnly: true',
    'shadowOnly: true',
    'advisoryOnly: true',
    'readOnlyDataPlane: true',
    'orderSendAllowed: false',
    'closeAllowed: false',
    'cancelAllowed: false',
    'credentialStorageAllowed: false',
    'livePresetMutationAllowed: false',
    'canOverrideKillSwitch: false',
    'canMutateGovernanceDecision: false',
    'canPromoteOrDemoteRoute: false',
    'autoPromotionAllowed: false',
    'manualExecutionRequired: true',
  ]) {
    if (!model.includes(safetyField)) fail(`researchModel.js missing safety default: ${safetyField}`);
  }
  assertNoRuntimeFileReads(model, 'researchModel.js');

  if (pkg.scripts?.['research-workspace'] !== 'node scripts/frontend_research_workspace_guard.mjs') {
    fail('package.json must define npm run research-workspace');
  }
  if (!ci.includes('npm run research-workspace')) {
    fail('CI must run npm run research-workspace');
  }

  if (!process.exitCode) console.log('Research workspace guard OK');
}

main();
