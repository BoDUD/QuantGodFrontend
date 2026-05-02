import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { checkProject, DOMAIN_WORKSPACES } from '../scripts/frontend_domain_workspace_guard.mjs';

function write(filePath, text) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, text, 'utf8');
}

function makeFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'qg-domain-workspace-'));
  for (const [key, entry] of Object.entries(DOMAIN_WORKSPACES)) {
    write(path.join(root, 'src', 'workspaces', key, entry), '<template><div /></template>');
  }
  write(path.join(root, 'src', 'workspaces', 'legacy', 'LegacyWorkbench.vue'), '<template><div /></template>');
  write(path.join(root, 'src', 'app', 'workspaceRegistry.js'), `
import DashboardWorkspace from '../workspaces/dashboard/DashboardWorkspace.vue';
import Mt5Workspace from '../workspaces/mt5/Mt5Workspace.vue';
import GovernanceWorkspace from '../workspaces/governance/GovernanceWorkspace.vue';
import ParamLabWorkspace from '../workspaces/paramlab/ParamLabWorkspace.vue';
import ResearchWorkspace from '../workspaces/research/ResearchWorkspace.vue';
import PolymarketWorkspace from '../workspaces/polymarket/PolymarketWorkspace.vue';
import LegacyWorkbench from '../workspaces/legacy/LegacyWorkbench.vue';
export const WORKSPACE_COMPONENTS = { dashboard: DashboardWorkspace, mt5: Mt5Workspace, governance: GovernanceWorkspace, paramlab: ParamLabWorkspace, research: ResearchWorkspace, polymarket: PolymarketWorkspace, legacy: LegacyWorkbench };
`);
  write(path.join(root, 'src', 'app', 'navigation.js'), `
export const DEFAULT_WORKSPACE = 'dashboard';
export const WORKSPACE_GROUPS = [{ items: [
  { key: 'dashboard' }, { key: 'mt5' }, { key: 'governance' }, { key: 'paramlab' }, { key: 'research' }, { key: 'polymarket' }, { key: 'legacy' }
] }];
`);
  write(path.join(root, 'src', 'services', 'domainApi.js'), `
export async function loadDashboardWorkspace() { return fetch('/api/latest'); }
export async function loadMt5Workspace() { return fetch('/api/mt5-readonly/status'); }
export async function loadGovernanceWorkspace() { return fetch('/api/governance/advisor'); }
export async function loadParamLabWorkspace() { return fetch('/api/paramlab/status'); }
export async function loadResearchWorkspace() { return fetch('/api/research/stats'); }
export async function loadPolymarketWorkspace() { return fetch('/api/polymarket/radar'); }
`);
  return root;
}

test('accepts first-class domain workspaces', () => {
  const root = makeFixture();
  assert.deepEqual(checkProject(root), []);
});

test('rejects missing domain workspace entry', () => {
  const root = makeFixture();
  fs.rmSync(path.join(root, 'src', 'workspaces', 'governance', 'GovernanceWorkspace.vue'));
  assert.match(checkProject(root).join('\n'), /governance\/GovernanceWorkspace\.vue/);
});

test('rejects direct QuantGod runtime file reads', () => {
  const root = makeFixture();
  write(path.join(root, 'src', 'services', 'domainApi.js'), `
export async function loadDashboardWorkspace() { return fetch('/QuantGod_Dashboard.json'); }
export async function loadMt5Workspace() { return fetch('/api/mt5-readonly/status'); }
export async function loadGovernanceWorkspace() { return fetch('/api/governance/advisor'); }
export async function loadParamLabWorkspace() { return fetch('/api/paramlab/status'); }
export async function loadResearchWorkspace() { return fetch('/api/research/stats'); }
export async function loadPolymarketWorkspace() { return fetch('/api/polymarket/radar'); }
`);
  assert.match(checkProject(root).join('\n'), /QuantGod runtime file path|non-\/api fetch/);
});

test('rejects domain directories under generic components', () => {
  const root = makeFixture();
  write(path.join(root, 'src', 'components', 'mt5', 'Mt5Workspace.vue'), '<template><div /></template>');
  assert.match(checkProject(root).join('\n'), /components\/mt5/);
});
