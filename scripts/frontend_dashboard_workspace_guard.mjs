/**
 * QuantGodFrontend dashboard workspace guard.
 *
 * The Dashboard workspace is the first legacy-domain migration target. It must
 * stay as a structured /api/* workspace and must not regress into raw runtime
 * file reads or direct legacy imports.
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

function checkDashboardWorkspace(root) {
  const errors = [];
  const workspace = path.join(root, 'src', 'workspaces', 'dashboard', 'DashboardWorkspace.vue');
  const model = path.join(root, 'src', 'workspaces', 'dashboard', 'dashboardModel.js');
  if (!exists(workspace)) return [`${rel(root, workspace)}: missing Dashboard workspace`];
  if (!exists(model)) errors.push(`${rel(root, model)}: missing dashboard model`);
  const text = read(workspace);
  for (const required of [
    './dashboardModel.js',
    'EndpointHealthGrid',
    'KeyValueList',
    'StatusPill',
    'loadDashboardWorkspace',
    'dailyAutopilotV2',
    'Agent 日报 v2',
    'agentOpsHealth',
    'Agent 自动化健康',
    'productionEvidenceValidation',
    '生产证据验证',
    '/api/production-evidence-validation/status',
    '/api/hfm-crypto/status?view=summary&scope=secondary',
    'Release token 闸门',
    'Release Token 证据',
    '/api/live-automation/release-token-evidence-review?scope=secondary',
    'championPromotionGate',
    '冠军长期记忆晋级闸',
    '/api/live-automation/champion-promotion-gate?scope=secondary',
    'buildChampionMemoryItems',
    'Release Token 签收草案',
    '/api/live-automation/release-token-signoff-draft?scope=secondary',
    'Release Token 签收输入',
    '/api/live-automation/release-token-signoff-input-review?scope=secondary',
    'Release Token 签收交接',
    '/api/live-automation/release-token-signoff-handoff?scope=secondary',
    '外币 Live12 实盘交接',
    '/api/live-automation/forex-live12-runtime-handoff?scope=secondary',
    'buildReleaseGateRows',
    '<LedgerTable title="影响范围" :rows="snapshotRecoveryRows" :limit="5"',
    '整体前端诊断',
    '快照过期影响哪些页面',
    'buildFrontendSnapshotRecoveryRows',
    '<LedgerTable title="整体前端修复优先级" :rows="frontendSnapshotRecoveryRows" :limit="8"',
    '<LedgerTable title="运行数据源" :rows="runtimeSourceRows" :limit="6"',
  ]) {
    if (!text.includes(required)) errors.push(`${rel(root, workspace)}: missing ${required}`);
  }
  if (/fetch\s*\(/.test(text)) errors.push(`${rel(root, workspace)}: must not call fetch directly`);
  if (/['"]\/QuantGod_[^'"]+\.(json|csv)['"]/i.test(text)) {
    errors.push(`${rel(root, workspace)}: must not read runtime JSON/CSV directly`);
  }
  if (/LegacyWorkbench/.test(text)) errors.push(`${rel(root, workspace)}: must not import legacy workbench`);
  return errors;
}

function checkDashboardModel(root) {
  const errors = [];
  const model = path.join(root, 'src', 'workspaces', 'dashboard', 'dashboardModel.js');
  if (!exists(model)) return errors;
  const text = read(model);
  for (const exportedName of [
    'normalizeDashboardSnapshot',
    'buildDashboardMetrics',
    'buildEndpointHealth',
    'buildRuntimeItems',
    'buildDailyItems',
    'buildAgentOpsItems',
    'buildAgentOpsRows',
    'buildRouteRows',
    'buildChampionMemoryItems',
    'buildFrontendSnapshotRecoveryRows',
  ]) {
    if (!text.includes(`export function ${exportedName}`)) {
      errors.push(`${rel(root, model)}: missing export ${exportedName}`);
    }
  }
  if (/['"]\/QuantGod_[^'"]+\.(json|csv)['"]/i.test(text)) {
    errors.push(`${rel(root, model)}: must not reference runtime JSON/CSV paths`);
  }
  for (const marker of [
    'historyProductionStatus',
    'GA 历史样本',
    '晋级门',
    'systemStatus',
    'strategyStatus',
    '策略观察健康',
    'HFM Crypto shadow',
    'brokerSymbolDiagnostics',
    'Telegram Gateway',
    'deliveryObservability',
    '最近真实发送',
    '最近抑制',
    'Topic 队列',
    'buildReleaseGateRows',
    'longTermMemoryPromotionReview',
    'memoryBlocksLivePromotion',
    '冠军长期记忆晋级闸',
    'releaseTokenEvidenceProgressLine',
    'releaseTokenSignoffDraftProgressLine',
    'releaseTokenSignoffInputTemplateProgressLine',
    'releaseTokenSignoffInputProgressLine',
    'releaseTokenSignoffHandoffProgressLine',
    '无副作用证据',
    'Release Token 签收模板',
    'Release Token 签收交接',
    'forexLive12RuntimeHandoff',
    'coreRuntimeEvidence',
    'Core Runtime Evidence',
    '核心证据晋级闸',
    'Sim-to-live 闸门',
  ]) {
    if (!text.includes(marker)) errors.push(`${rel(root, model)}: missing ${marker}`);
  }
  return errors;
}

function checkSharedComponents(root) {
  const errors = [];
  for (const fileName of ['StatusPill.vue', 'KeyValueList.vue', 'EndpointHealthGrid.vue']) {
    const filePath = path.join(root, 'src', 'workspaces', 'shared', fileName);
    if (!exists(filePath)) errors.push(`${rel(root, filePath)}: missing shared component`);
  }
  return errors;
}

function checkPackageScript(root) {
  const errors = [];
  const packagePath = path.join(root, 'package.json');
  if (!exists(packagePath)) return [`${rel(root, packagePath)}: missing package.json`];
  const packageJson = JSON.parse(read(packagePath));
  if (
    packageJson.scripts?.['dashboard-workspace'] !== 'node scripts/frontend_dashboard_workspace_guard.mjs'
  ) {
    errors.push('package.json: missing dashboard-workspace script');
  }
  return errors;
}

export function checkProject(root = process.cwd()) {
  const resolved = path.resolve(root);
  return [
    ...checkDashboardWorkspace(resolved),
    ...checkDashboardModel(resolved),
    ...checkSharedComponents(resolved),
    ...checkPackageScript(resolved),
  ];
}

export function main(argv = process.argv.slice(2)) {
  const root = argv[0] ? path.resolve(argv[0]) : process.cwd();
  const errors = checkProject(root);
  if (errors.length) {
    console.error('QuantGod frontend dashboard workspace guard failed:');
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
    return;
  }
  console.log('QuantGod frontend dashboard workspace guard OK');
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
