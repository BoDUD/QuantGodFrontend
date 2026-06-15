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
  'package.json': JSON.stringify({
    scripts: { 'dashboard-workspace': 'node scripts/frontend_dashboard_workspace_guard.mjs' },
  }),
  'src/workspaces/shared/StatusPill.vue': '<template></template>',
  'src/workspaces/shared/KeyValueList.vue': '<template></template>',
  'src/workspaces/shared/EndpointHealthGrid.vue': '<template></template>',
  'src/workspaces/dashboard/dashboardModel.js': [
    'export function normalizeDashboardSnapshot() {}',
    'export function buildDashboardMetrics() {}',
    'export function buildEndpointHealth() {}',
    'export function buildRuntimeItems() {}',
    'export function buildDailyItems() {}',
    'export function buildAgentOpsItems() {}',
    'export function buildAgentOpsRows() {}',
    'export function buildRouteRows() {}',
    'export function buildReleaseGateRows() {}',
    'export function buildChampionMemoryItems() {}',
    'const historyProductionStatus = true;',
    'const systemStatus = true;',
    'const strategyStatus = true;',
    "'GA 历史样本';",
    "'晋级门';",
    "'策略观察健康';",
    "'HFM Crypto shadow';",
    'const brokerSymbolDiagnostics = true;',
    "'Telegram Gateway';",
    'const deliveryObservability = true;',
    "'最近真实发送';",
    "'最近抑制';",
    "'Topic 队列';",
    'function releaseTokenEvidenceProgressLine() {}',
    'function releaseTokenSignoffDraftProgressLine() {}',
    'function releaseTokenSignoffInputTemplateProgressLine() {}',
    'function releaseTokenSignoffInputProgressLine() {}',
    'function releaseTokenSignoffHandoffProgressLine() {}',
    'const longTermMemoryPromotionReview = true;',
    'const memoryBlocksLivePromotion = true;',
    "'冠军长期记忆晋级闸';",
    "'无副作用证据';",
    "'Release Token 签收模板';",
    "'Release Token 签收交接';",
    'const forexLive12RuntimeHandoff = true;',
    'const forexLive12CapacityExpansionReview = true;',
    'const forexLive12CapacityExpansionRoadmap = true;',
    'const forexLive12MicroExpansionReview = true;',
  ].join('\n'),
  'src/workspaces/dashboard/DashboardWorkspace.vue': [
    '<template><EndpointHealthGrid /><KeyValueList /><StatusPill /></template>',
    '<script setup>',
    'const state = { dailyAutopilotV2: null, agentOpsHealth: null };',
    "const label = 'Agent 日报 v2';",
    "const agentLabel = 'Agent 自动化健康';",
    "const hfmSource = '/api/hfm-crypto/status?view=summary&scope=secondary';",
    "const releaseTitle = 'Release token 闸门';",
    "const releaseEvidenceTitle = 'Release Token 证据';",
    "const releaseEvidenceSource = '/api/live-automation/release-token-evidence-review?scope=secondary';",
    'const championPromotionGate = null;',
    "const championMemoryTitle = '冠军长期记忆晋级闸';",
    "const championMemorySource = '/api/live-automation/champion-promotion-gate?scope=secondary';",
    "const releaseSignoffTitle = 'Release Token 签收草案';",
    "const releaseSignoffSource = '/api/live-automation/release-token-signoff-draft?scope=secondary';",
    "const releaseSignoffInputTitle = 'Release Token 签收输入';",
    "const releaseSignoffInputSource = '/api/live-automation/release-token-signoff-input-review?scope=secondary';",
    "const releaseSignoffHandoffTitle = 'Release Token 签收交接';",
    "const releaseSignoffHandoffSource = '/api/live-automation/release-token-signoff-handoff?scope=secondary';",
    "const forexLive12HandoffTitle = '外币 Live12 实盘交接';",
    "const forexLive12HandoffSource = '/api/live-automation/forex-live12-runtime-handoff?scope=secondary';",
    "const forexLive12CapacityTitle = '外币 Live12 扩仓评审';",
    "const forexLive12CapacitySource = '/api/live-automation/forex-live12-capacity-expansion-review?scope=secondary';",
    "const forexLive12CapacityRoadmapTitle = '外币 Live12 扩仓路线';",
    "const forexLive12CapacityRoadmapSource = '/api/live-automation/forex-live12-capacity-expansion-roadmap?scope=secondary';",
    "const forexLive12MicroTitle = '外币 Live12 2→3 微仓评审';",
    "const forexLive12MicroSource = '/api/live-automation/forex-live12-micro-expansion-review?scope=secondary';",
    "const forexLive12RsiRepairTitle = '外币 Live12 RSI 修复计划';",
    "const forexLive12RsiRepairSource = '/api/live-automation/forex-live12-rsi-repair-plan?scope=secondary';",
    "const forexLive12RsiShadowTitle = '外币 Live12 RSI 影子候选';",
    "const forexLive12RsiShadowSource = '/api/live-automation/forex-live12-rsi-shadow-candidate?scope=secondary';",
    "const forexLive12RsiTesterTitle = '外币 Live12 RSI Tester 请求';",
    "const forexLive12RsiTesterSource = '/api/live-automation/forex-live12-rsi-tester-request?scope=secondary';",
    "const forexLive12RsiTesterRunGateTitle = '外币 Live12 RSI Tester 启动闸门';",
    "const forexLive12RsiTesterRunGateSource = '/api/live-automation/forex-live12-rsi-tester-run-gate?scope=secondary';",
    "const forexLive12RsiCandidatePromotionGateTitle = '外币 Live12 RSI 候选晋级闸门';",
    "const forexLive12RsiCandidatePromotionGateSource = '/api/live-automation/forex-live12-rsi-candidate-promotion-gate?scope=secondary';",
    "const forexLive12RsiTesterLockDraftTitle = '外币 Live12 RSI Tester Lock 草案';",
    "const forexLive12RsiTesterLockDraftSource = '/api/live-automation/forex-live12-rsi-tester-lock-draft?scope=secondary';",
    "const simTargetExecutionReviewSummaryTitle = '模拟目标→实盘执行摘要';",
    "const simTargetExecutionReviewSummarySource = '/api/live-automation/sim-target-execution-review-summary?scope=secondary';",
    '<LedgerTable title="影响范围" :rows="snapshotRecoveryRows" :limit="5" />',
    '<LedgerTable title="运行数据源" :rows="runtimeSourceRows" :limit="5" />',
    "import { loadDashboardWorkspace } from '../../services/domainApi.js';",
    "import EndpointHealthGrid from '../shared/EndpointHealthGrid.vue';",
    "import KeyValueList from '../shared/KeyValueList.vue';",
    "import StatusPill from '../shared/StatusPill.vue';",
    "import { normalizeDashboardSnapshot, buildReleaseGateRows, buildChampionMemoryItems } from './dashboardModel.js';",
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
    'src/workspaces/dashboard/DashboardWorkspace.vue':
      validFiles['src/workspaces/dashboard/DashboardWorkspace.vue'] +
      "\n<script>fetch('/api/latest')</script>",
  });
  assert.match(checkProject(root).join('\n'), /must not call fetch directly/);
});

test('rejects runtime file path reads', () => {
  const root = makeProject({
    ...validFiles,
    'src/workspaces/dashboard/DashboardWorkspace.vue':
      validFiles['src/workspaces/dashboard/DashboardWorkspace.vue'] +
      "\nconst x = '/QuantGod_Dashboard.json';",
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
