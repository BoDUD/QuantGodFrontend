import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const GUARD = path.resolve('scripts/frontend_research_workspace_guard.mjs');

function writeFile(root, rel, text) {
  const target = path.join(root, rel);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, text, 'utf8');
}

function makeRepo(overrides = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'qg-research-guard-'));
  writeFile(root, 'src/workspaces/research/ResearchWorkspace.vue', overrides.workspace ?? `
<template>
  <WorkspaceFrame>
    <MetricGrid :items="view.metrics" />
    <EndpointHealthGrid :items="view.endpoints" />
    <KeyValueList :items="view.safety" />
    <StatusPill status="locked" label="research-only" />
    <LedgerTable title="Shadow Signals" :rows="view.tables.shadowSignals" />
  </WorkspaceFrame>
</template>
<script setup>
import { loadResearchWorkspace } from '../../services/domainApi.js';
import WorkspaceFrame from '../shared/WorkspaceFrame.vue';
import MetricGrid from '../shared/MetricGrid.vue';
import EndpointHealthGrid from '../shared/EndpointHealthGrid.vue';
import KeyValueList from '../shared/KeyValueList.vue';
import LedgerTable from '../shared/LedgerTable.vue';
import StatusPill from '../shared/StatusPill.vue';
import { buildResearchViewModel } from './researchModel.js';
const view = buildResearchViewModel(await loadResearchWorkspace());
</script>
`);
  writeFile(root, 'src/workspaces/research/researchModel.js', overrides.model ?? `
export const RESEARCH_SAFETY_DEFAULTS = Object.freeze({
  researchOnly: true,
  shadowOnly: true,
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
  autoPromotionAllowed: false,
  manualExecutionRequired: true,
});
export function buildResearchEndpointHealth() { return []; }
export function buildResearchSafetyEnvelope() { return []; }
export function buildResearchMetrics() { return []; }
export function buildResearchViewModel() { return { metrics: [], endpoints: [], safety: [], tables: { shadowSignals: [] } }; }
`);
  writeFile(root, 'package.json', JSON.stringify({ scripts: { 'research-workspace': 'node scripts/frontend_research_workspace_guard.mjs' } }, null, 2));
  writeFile(root, '.github/workflows/ci.yml', 'steps:\n  - run: npm run research-workspace\n');
  fs.mkdirSync(path.join(root, 'scripts'), { recursive: true });
  fs.copyFileSync(GUARD, path.join(root, 'scripts/frontend_research_workspace_guard.mjs'));
  return root;
}

function runGuard(root) {
  return spawnSync('node', ['scripts/frontend_research_workspace_guard.mjs'], { cwd: root, encoding: 'utf8' });
}

test('accepts a structured research workspace', () => {
  const root = makeRepo();
  const result = runGuard(root);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /Research workspace guard OK/);
});

test('rejects direct fetch in ResearchWorkspace', () => {
  const root = makeRepo({ workspace: `<script setup>fetch('/api/research/stats');</script>` });
  const result = runGuard(root);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /direct fetch/);
});

test('rejects raw QuantGod runtime file reads', () => {
  const root = makeRepo({ workspace: `<template>/QuantGod_TradeJournal.csv</template>` });
  const result = runGuard(root);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /raw QuantGod runtime files/);
});

test('rejects execution affordances', () => {
  const root = makeRepo({ workspace: `<template>OrderSend</template>` });
  const result = runGuard(root);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /forbidden execution affordance/);
});
