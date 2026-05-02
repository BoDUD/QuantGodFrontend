import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { main as runGuard } from '../scripts/frontend_paramlab_workspace_guard.mjs';

function write(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
}

function withTempRepo(files, callback) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'qg-paramlab-guard-'));
  try {
    for (const [relativePath, content] of Object.entries(files)) {
      write(path.join(root, relativePath), content);
    }
    callback(root);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

function captureExit(callback) {
  const originalExitCode = process.exitCode;
  process.exitCode = 0;
  try {
    callback();
    return process.exitCode || 0;
  } finally {
    process.exitCode = originalExitCode || 0;
  }
}

const validWorkspace = `
<template>
  <WorkspaceFrame>
    <section>tester-only evidence</section>
    <EndpointHealthGrid :items="viewModel.endpoints" />
    <KeyValueList :items="viewModel.safety" />
    <LedgerTable title="Top ParamLab Results" :rows="viewModel.resultRows" />
    <StatusPill status="locked" label="safe" />
  </WorkspaceFrame>
</template>
<script setup>
import { loadParamLabWorkspace } from '../../services/domainApi.js';
import { buildParamLabViewModel } from './paramlabModel.js';
</script>
`;

const validModel = `
export const PARAMLAB_SAFETY_DEFAULTS = Object.freeze({
  researchOnly: true,
  testerOnly: true,
  readOnlyDataPlane: true,
  orderSendAllowed: false,
  closeAllowed: false,
  cancelAllowed: false,
  credentialStorageAllowed: false,
  livePresetMutationAllowed: false,
  canOverrideKillSwitch: false,
  canMutateGovernanceDecision: false,
  canPromoteOrDemoteRoute: false,
  autoPromotionAllowed: false,
  requiresManualAuthorization: true,
});
export function buildEndpointItems() {}
export function buildSafetyEnvelope() {}
export function buildBatchSummary() {}
export function buildSchedulerSummary() {}
export function buildRecoverySummary() {}
export function buildMetricItems() {}
export function buildParamLabViewModel() {}
`;

const packageJson = JSON.stringify({
  scripts: {
    'paramlab-workspace': 'node scripts/frontend_paramlab_workspace_guard.mjs',
  },
});

test('accepts a read-only ParamLab workspace with safety defaults', () => {
  withTempRepo({
    'src/workspaces/paramlab/ParamLabWorkspace.vue': validWorkspace,
    'src/workspaces/paramlab/paramlabModel.js': validModel,
    'package.json': packageJson,
  }, (root) => {
    assert.equal(captureExit(() => runGuard(root)), 0);
  });
});

test('rejects direct local runtime file reads', () => {
  withTempRepo({
    'src/workspaces/paramlab/ParamLabWorkspace.vue': `${validWorkspace}\nconst bad = '/QuantGod_ParamLabStatus.json';`,
    'src/workspaces/paramlab/paramlabModel.js': validModel,
    'package.json': packageJson,
  }, (root) => {
    assert.notEqual(captureExit(() => runGuard(root)), 0);
  });
});

test('rejects execution affordances', () => {
  withTempRepo({
    'src/workspaces/paramlab/ParamLabWorkspace.vue': `${validWorkspace}\nfunction startLiveRun() {}`,
    'src/workspaces/paramlab/paramlabModel.js': validModel,
    'package.json': packageJson,
  }, (root) => {
    assert.notEqual(captureExit(() => runGuard(root)), 0);
  });
});

test('rejects missing ParamLab safety defaults', () => {
  withTempRepo({
    'src/workspaces/paramlab/ParamLabWorkspace.vue': validWorkspace,
    'src/workspaces/paramlab/paramlabModel.js': validModel.replace('livePresetMutationAllowed: false,', ''),
    'package.json': packageJson,
  }, (root) => {
    assert.notEqual(captureExit(() => runGuard(root)), 0);
  });
});
