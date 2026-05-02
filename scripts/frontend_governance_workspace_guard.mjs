#!/usr/bin/env node
/**
 * QuantGodFrontend Governance workspace guard.
 *
 * Governance workspace must remain read-only evidence. It may display Advisor,
 * Version Registry, Promotion Gate, and Optimizer V2 state, but cannot expose
 * route promotion/demotion actions, direct runtime file reads, or any trade / MT5
 * execution affordance.
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

function exists(filePath) {
  try {
    return fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
}

function read(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function rel(root, target) {
  return path.relative(root, target).replaceAll(path.sep, '/') || '.';
}

function checkGovernanceWorkspace(root) {
  const errors = [];
  const workspace = path.join(root, 'src/workspaces/governance/GovernanceWorkspace.vue');
  const model = path.join(root, 'src/workspaces/governance/governanceModel.js');
  const pkg = path.join(root, 'package.json');

  for (const file of [workspace, model]) {
    if (!exists(file)) errors.push(`missing ${rel(root, file)}`);
  }
  if (!exists(pkg)) errors.push('missing package.json');
  if (errors.length) return errors;

  const vue = read(workspace);
  const modelText = read(model);
  const pkgText = read(pkg);
  const combined = `${vue}\n${modelText}`;

  const requiredVueMarkers = [
    "import { loadGovernanceWorkspace } from '../../services/domainApi.js'",
    "import { buildGovernanceViewModel } from './governanceModel.js'",
    'EndpointHealthGrid',
    'KeyValueList',
    'LedgerTable',
    'StatusPill',
    'Raw governance evidence',
  ];
  for (const marker of requiredVueMarkers) {
    if (!vue.includes(marker)) errors.push(`GovernanceWorkspace.vue missing marker: ${marker}`);
  }

  const requiredModelExports = [
    'GOVERNANCE_SAFETY_DEFAULTS',
    'buildGovernanceViewModel',
    'buildSafetyEnvelope',
    'buildAdvisorSummary',
    'buildPromotionGateSummary',
    'buildOptimizerSummary',
    'buildVersionRows',
    'buildEndpointItems',
  ];
  for (const marker of requiredModelExports) {
    if (!modelText.includes(`export function ${marker}`) && !modelText.includes(`export const ${marker}`)) {
      errors.push(`governanceModel.js missing export: ${marker}`);
    }
  }

  const forbiddenInComponent = [
    'fetch(',
    '/QuantGod_',
    'LegacyWorkbench',
    'localStorage.setItem(',
    'postJson(',
    'method: \'POST\'',
    'method: "POST"',
  ];
  for (const marker of forbiddenInComponent) {
    if (vue.includes(marker)) errors.push(`GovernanceWorkspace.vue must not contain ${marker}`);
  }

  const executionAffordances = [
    'OrderSend',
    'placeOrder',
    'sendOrder',
    'closePosition',
    'cancelOrder',
    'mutatePreset',
    'writePreset',
    'promoteRoute',
    'demoteRoute',
    'executePromotion',
    'executeDemotion',
    'manualAuthorize',
    'mutateGovernanceDecision',
  ];
  for (const marker of executionAffordances) {
    if (combined.includes(marker)) errors.push(`governance workspace must not expose execution affordance: ${marker}`);
  }

  const safetyMarkers = [
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
    'requiresManualAuthorization: true',
  ];
  for (const marker of safetyMarkers) {
    if (!modelText.includes(marker)) errors.push(`governanceModel.js missing safety marker: ${marker}`);
  }

  if (!pkgText.includes('"governance-workspace"')) {
    errors.push('package.json missing governance-workspace script');
  }

  return errors;
}

export { checkGovernanceWorkspace };

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const root = process.cwd();
  const errors = checkGovernanceWorkspace(root);
  if (errors.length) {
    console.error('Governance workspace guard failed:');
    errors.forEach((error) => console.error(`- ${error}`));
    process.exit(1);
  }
  console.log('Governance workspace guard OK');
}
