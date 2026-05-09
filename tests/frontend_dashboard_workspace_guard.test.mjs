import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import { checkProject } from '../scripts/frontend_dashboard_workspace_guard.mjs';

function makeProject(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'qg-dashboard-guard-'));
  for (const [relativePath, content] of Object.entries(files)) {
    const fullPath = path.join(root, relativePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content, 'utf8');
  }
  return root;
}

const validFiles = {
  'package.json': JSON.stringify({ scripts: { 'dashboard-workspace': 'node scripts/frontend_dashboard_workspace_guard.mjs' } }),
  'src/workspaces/shared/StatusPill.vue': '<template></template>',
  'src/workspaces/shared/KeyValueList.vue': '<template></template>',
  'src/workspaces/shared/EndpointHealthGrid.vue': '<template></template>',
  'src/workspaces/dashboard/dashboardModel.js': [
    'export function normalizeDashboardSnapshot() {}',
    'export function buildDashboardMetrics() {}',
    'export function buildEndpointHealth() {}',
    'export function buildRuntimeItems() {}',
    'export function buildDailyItems() {}',
    'export function buildRouteRows() {}',
    'const historyProductionStatus = true;',
    "'GA 历史样本';",
    "'晋级门';",
  ].join('\n'),
  'src/workspaces/dashboard/DashboardWorkspace.vue': [
    '<template><EndpointHealthGrid /><KeyValueList /><StatusPill /></template>',
    '<script setup>',
    'const state = { dailyAutopilotV2: null };',
    "const label = 'Agent 日报 v2';",
    "import { loadDashboardWorkspace } from '../../services/domainApi.js';",
    "import EndpointHealthGrid from '../shared/EndpointHealthGrid.vue';",
    "import KeyValueList from '../shared/KeyValueList.vue';",
    "import StatusPill from '../shared/StatusPill.vue';",
    "import { normalizeDashboardSnapshot } from './dashboardModel.js';",
    '</script>',
  ].join('\n'),
};

test('accepts structured dashboard workspace', () => {
  const root = makeProject(validFiles);
  assert.deepEqual(checkProject(root), []);
});

test('rejects direct fetch in dashboard workspace', () => {
  const root = makeProject({
    ...validFiles,
    'src/workspaces/dashboard/DashboardWorkspace.vue': validFiles['src/workspaces/dashboard/DashboardWorkspace.vue'] + "\n<script>fetch('/api/latest')</script>",
  });
  assert.match(checkProject(root).join('\n'), /must not call fetch directly/);
});

test('rejects runtime file path reads', () => {
  const root = makeProject({
    ...validFiles,
    'src/workspaces/dashboard/DashboardWorkspace.vue': validFiles['src/workspaces/dashboard/DashboardWorkspace.vue'] + "\nconst x = '/QuantGod_Dashboard.json';",
  });
  assert.match(checkProject(root).join('\n'), /runtime JSON\/CSV/);
});

test('rejects missing dashboard model exports', () => {
  const root = makeProject({
    ...validFiles,
    'src/workspaces/dashboard/dashboardModel.js': 'export function normalizeDashboardSnapshot() {}',
  });
  assert.match(checkProject(root).join('\n'), /missing export buildDashboardMetrics/);
});
