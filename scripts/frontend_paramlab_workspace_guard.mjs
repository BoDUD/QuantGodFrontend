/**
 * QuantGodFrontend ParamLab workspace guard.
 *
 * ParamLab is tester/research evidence. The workspace may show batch, scheduler,
 * recovery, report watcher, and tester-window state, but cannot expose live
 * preset writes, route promotion/demotion actions, direct file reads, or MT5
 * execution affordances.
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

function fail(message) {
  console.error(`[paramlab-workspace-guard] ${message}`);
  process.exitCode = 1;
}

function assertContains(text, needle, filePath) {
  if (!text.includes(needle)) fail(`${filePath} must include ${needle}`);
}

function assertNotContains(text, pattern, filePath, description = String(pattern)) {
  const matched = pattern instanceof RegExp ? pattern.test(text) : text.includes(pattern);
  if (matched) fail(`${filePath} must not contain ${description}`);
}

function main(repoRoot = process.cwd()) {
  const workspacePath = path.join(repoRoot, 'src', 'workspaces', 'paramlab', 'ParamLabWorkspace.vue');
  const modelPath = path.join(repoRoot, 'src', 'workspaces', 'paramlab', 'paramlabModel.js');
  const packagePath = path.join(repoRoot, 'package.json');

  for (const filePath of [workspacePath, modelPath, packagePath]) {
    if (!exists(filePath)) fail(`Missing required file: ${filePath}`);
  }

  const workspace = exists(workspacePath) ? read(workspacePath) : '';
  const model = exists(modelPath) ? read(modelPath) : '';
  const packageJson = exists(packagePath) ? JSON.parse(read(packagePath)) : { scripts: {} };

  assertContains(workspace, 'buildParamLabViewModel', workspacePath);
  assertContains(workspace, 'loadParamLabWorkspace', workspacePath);
  assertContains(workspace, 'EndpointHealthGrid', workspacePath);
  assertContains(workspace, 'KeyValueList', workspacePath);
  assertContains(workspace, 'LedgerTable', workspacePath);
  assertContains(workspace, 'StatusPill', workspacePath);
  assertContains(workspace, 'tester-only evidence', workspacePath);

  assertNotContains(workspace, /\bfetch\s*\(/, workspacePath, 'direct fetch()');
  assertNotContains(workspace, /\/QuantGod_[^'"`\s]+\.(json|csv)/i, workspacePath, 'direct runtime file path');
  assertNotContains(workspace, 'LegacyWorkbench', workspacePath);

  const forbiddenExecution = [
    'OrderSend',
    'placeOrder',
    'sendOrder',
    'closePosition',
    'cancelOrder',
    'mutatePreset',
    'writeLivePreset',
    'promoteRoute',
    'demoteRoute',
    'executePromotion',
    'manualAuthorize',
    'runLiveTester',
    'startLiveRun',
  ];
  for (const token of forbiddenExecution) {
    assertNotContains(workspace, token, workspacePath, token);
    assertNotContains(model, token, modelPath, token);
  }

  const requiredSafetyTokens = [
    'PARAMLAB_SAFETY_DEFAULTS',
    'researchOnly',
    'testerOnly',
    'readOnlyDataPlane',
    'orderSendAllowed: false',
    'closeAllowed: false',
    'cancelAllowed: false',
    'credentialStorageAllowed: false',
    'livePresetMutationAllowed: false',
    'canOverrideKillSwitch: false',
    'canMutateGovernanceDecision: false',
    'canPromoteOrDemoteRoute: false',
    'autoPromotionAllowed: false',
    'requiresManualAuthorization: true',
  ];
  for (const token of requiredSafetyTokens) {
    assertContains(model, token, modelPath);
  }

  const requiredModelExports = [
    'buildEndpointItems',
    'buildSafetyEnvelope',
    'buildBatchSummary',
    'buildSchedulerSummary',
    'buildRecoverySummary',
    'buildMetricItems',
    'buildParamLabViewModel',
  ];
  for (const token of requiredModelExports) {
    assertContains(model, `export function ${token}`, modelPath);
  }

  if (packageJson.scripts?.['paramlab-workspace'] !== 'node scripts/frontend_paramlab_workspace_guard.mjs') {
    fail('package.json must define scripts.paramlab-workspace');
  }

  if (process.exitCode) return;
  console.log('ParamLab workspace guard OK');
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.cwd());
}

export { main };
