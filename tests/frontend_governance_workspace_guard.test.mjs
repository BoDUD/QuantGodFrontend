import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { checkGovernanceWorkspace } from '../scripts/frontend_governance_workspace_guard.mjs';

function makeRepo() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'qg-governance-guard-'));
  fs.mkdirSync(path.join(root, 'src/workspaces/governance'), { recursive: true });
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ scripts: { 'governance-workspace': 'node scripts/frontend_governance_workspace_guard.mjs' } }));
  return root;
}

const goodVue = `
<template>
  <WorkspaceFrame>
    <EndpointHealthGrid :items="view.endpoints" />
    <KeyValueList :items="view.safety" />
    <LedgerTable title="Version Registry" :rows="view.versionRows" />
    <StatusPill status="locked" />
    <details>Raw governance evidence</details>
  </WorkspaceFrame>
</template>
<script setup>
import { loadGovernanceWorkspace } from '../../services/domainApi.js';
import { buildGovernanceViewModel } from './governanceModel.js';
import EndpointHealthGrid from '../shared/EndpointHealthGrid.vue';
import KeyValueList from '../shared/KeyValueList.vue';
import LedgerTable from '../shared/LedgerTable.vue';
import StatusPill from '../shared/StatusPill.vue';
</script>
`;

const goodModel = `
export const GOVERNANCE_SAFETY_DEFAULTS = Object.freeze({
  advisoryOnly: true,
  readOnlyDataPlane: true,
  orderSendAllowed: false,
  closeAllowed: false,
  cancelAllowed: false,
  credentialStorageAllowed: false,
  livePresetMutationAllowed: false,
  canOverrideKillSwitch: false,
  canMutateGovernanceDecision: false,
  canPromoteOrDemoteRoute: false,
  requiresManualAuthorization: true,
});
export function buildGovernanceViewModel() { return {}; }
export function buildSafetyEnvelope() { return []; }
export function buildAdvisorSummary() { return {}; }
export function buildPromotionGateSummary() { return {}; }
export function buildOptimizerSummary() { return {}; }
export function buildVersionRows() { return []; }
export function buildEndpointItems() { return []; }
`;

function writeGoodRepo(root) {
  fs.writeFileSync(path.join(root, 'src/workspaces/governance/GovernanceWorkspace.vue'), goodVue);
  fs.writeFileSync(path.join(root, 'src/workspaces/governance/governanceModel.js'), goodModel);
}

test('accepts read-only structured governance workspace', () => {
  const root = makeRepo();
  writeGoodRepo(root);
  assert.deepEqual(checkGovernanceWorkspace(root), []);
});

test('rejects direct fetch and runtime file reads', () => {
  const root = makeRepo();
  writeGoodRepo(root);
  fs.appendFileSync(path.join(root, 'src/workspaces/governance/GovernanceWorkspace.vue'), "\nfetch('/QuantGod_GovernanceAdvisor.json');\n");
  const errors = checkGovernanceWorkspace(root).join('\n');
  assert.match(errors, /fetch\(/);
  assert.match(errors, /\/QuantGod_/);
});

test('rejects governance mutation affordances', () => {
  const root = makeRepo();
  writeGoodRepo(root);
  fs.appendFileSync(path.join(root, 'src/workspaces/governance/governanceModel.js'), "\nfunction promoteRoute() { return true; }\n");
  assert.match(checkGovernanceWorkspace(root).join('\n'), /promoteRoute/);
});

test('requires explicit safety defaults', () => {
  const root = makeRepo();
  writeGoodRepo(root);
  fs.writeFileSync(path.join(root, 'src/workspaces/governance/governanceModel.js'), goodModel.replace('canOverrideKillSwitch: false,', ''));
  assert.match(checkGovernanceWorkspace(root).join('\n'), /canOverrideKillSwitch/);
});
