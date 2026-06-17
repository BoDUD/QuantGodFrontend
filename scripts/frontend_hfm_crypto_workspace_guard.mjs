/**
 * QuantGod frontend guard for the HFM Crypto CFD workspace.
 *
 * The workspace may scan local symbol evidence and import Moss backtest
 * metrics, but it must stay shadow-only and avoid execution affordances.
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const workspacePath = path.join(root, 'src', 'workspaces', 'hfm-crypto', 'HfmCryptoWorkspace.vue');
const modelPath = path.join(root, 'src', 'workspaces', 'hfm-crypto', 'hfmCryptoModel.js');
const servicePath = path.join(root, 'src', 'services', 'domainApi.js');
const packagePath = path.join(root, 'package.json');

function fail(message) {
  console.error(`[hfm-crypto-workspace-guard] ${message}`);
  process.exit(1);
}

function readFile(filePath) {
  if (!fs.existsSync(filePath)) fail(`missing required file: ${path.relative(root, filePath)}`);
  return fs.readFileSync(filePath, 'utf8');
}

const workspace = readFile(workspacePath);
const model = readFile(modelPath);
const service = readFile(servicePath);
const packageJson = JSON.parse(readFile(packagePath));

const requiredWorkspaceMarkers = [
  'buildHfmCryptoModel',
  'loadHfmCryptoWorkspaceCore',
  'loadHfmCryptoWorkspaceDetails',
  'loadTechnicalEvidenceDetails',
  'technicalEvidenceDetailsLoaded',
  'buildAdapterContractValidator',
  'buildAdapterSandbox',
  'buildExecutionAdapterHarness',
  'buildLiveExecutionCutoverReview',
  'buildLiveExecutionImplementationSpec',
  'buildLiveExecutionAdapterWriteReview',
  'buildEaRequestConsumptionReview',
  'buildBrokerOrderSendReview',
  'buildLivePilotActivationReview',
  'buildReceiptReconciliationReview',
  'buildSimToLiveOrchestrator',
  'loadHfmCryptoWorkspace',
  'buildHfmCryptoWorkspace',
  'buildHfmCryptoEvidenceKit',
  'buildHfmCryptoEvidenceBootstrap',
  'buildHfmCryptoMt5ExporterReview',
  'buildHfmCryptoMt5UpgradeBundle',
  'buildHfmCryptoMt5ExporterDeployPlan',
  'buildHfmCryptoStandaloneExporterBundle',
  'buildHfmCryptoMt5PostUpgradeVerify',
  'buildHfmCryptoPostUpgradeController',
  'buildHfmCryptoFilledInputValidator',
  'buildHfmCryptoExecutionSpec',
  'buildHfmCryptoContractSpecExport',
  'QuantGod_HFMCryptoSymbolSpecs.json',
  '账号可用性',
  'HFM Crypto CFD 探测结果',
  '账号阻断清单',
  'operatorChecklistItems',
  '账号下发 Symbol 样本',
  'MT5 账号链路',
  'Live16 快照根因',
  'Live16 快照恢复矩阵',
  'snapshotRootCause',
  'mt5RecoveryRows',
  '/api/mt5-readonly-secondary/snapshot',
  'buildHfmCryptoSimulationProfile',
  'buildLiveApprovalEvidence',
  'buildLiveExecutionLaneSpec',
  'buildLiveDryRunReplay',
  'buildLiveRuntimePreflight',
  'buildLiveOrderRequestContract',
  'buildSimToLivePipeline',
  'buildExecutionAdapterReview',
  'buildLiveEvidenceIntake',
  'buildLivePromotionCandidates',
  'buildLivePromotionController',
  'EndpointHealthGrid',
  'KeyValueList',
  'LedgerTable',
  'StatusPill',
  '/api/hfm-crypto/status',
  '/api/hfm-crypto/symbols',
  '/api/hfm-crypto/contract-spec-export',
  '/api/hfm-crypto/execution-spec',
  '/api/hfm-crypto/simulation-profile',
  '/api/hfm-crypto/evidence-kit',
  '/api/hfm-crypto/evidence-bootstrap',
  '/api/hfm-crypto/mt5-exporter-review',
  '/api/hfm-crypto/mt5-upgrade-bundle',
  '/api/hfm-crypto/mt5-exporter-deploy-plan',
  '/api/hfm-crypto/standalone-exporter-bundle',
  '/api/hfm-crypto/mt5-post-upgrade-verify',
  '/api/hfm-crypto/post-upgrade-controller',
  '/api/hfm-crypto/filled-input-validator',
  '/api/live-automation/status',
  '/api/live-automation/review-packet',
  '/api/live-automation/approval-draft',
  '/api/live-automation/approval-evidence',
  '/api/live-automation/dry-run-plan',
  '/api/live-automation/execution-lane-spec',
  '/api/live-automation/dry-run-replay',
  '/api/live-automation/runtime-preflight',
  '/api/live-automation/order-request-contract',
  '/api/live-automation/pipeline',
  '/api/live-automation/adapter-review',
  '/api/live-automation/evidence-intake',
  '/api/live-automation/promotion-candidates',
  '/api/live-automation/promotion-controller',
  '/api/live-automation/adapter-sandbox',
  '/api/live-automation/adapter-contract-validator',
  '/api/live-automation/orchestrator',
  '/api/live-automation/adapter-harness',
  '/api/live-automation/live-pilot-activation-review',
  '/api/live-automation/receipt-reconciliation-review',
  '/api/live-automation/ea-request-reader-review',
  '/api/live-automation/live-execution-cutover-review',
  '/api/live-automation/live-execution-implementation-spec',
  '/api/live-automation/live-execution-adapter-write-review',
  '/api/live-automation/ea-request-consumption-review',
  '/api/live-automation/broker-order-send-review',
  '/api/live-automation/release-minimal-diff-review',
  '/api/live-automation/release-token-evidence-review',
  '/api/live-automation/release-token-signoff-draft',
  '/api/live-automation/release-token-signoff-input-review',
  '/api/live-automation/release-token-signoff-handoff',
  '实盘释放最小Diff审查',
  '实盘释放最小 Diff',
  '实盘释放 Token 缺口',
  'Release Token 证据包',
  'Release Token 签收草案',
  'Release Token 签收输入',
  'Release Token 签收交接包',
  'Release Token证据审查',
  'Release Token签收草案',
  'Release Token签收输入',
  'Release Token签收交接',
];
for (const marker of requiredWorkspaceMarkers) {
  if (!workspace.includes(marker)) fail(`HfmCryptoWorkspace.vue missing marker: ${marker}`);
}

if (/\bfetch\s*\(/.test(workspace)) fail('HfmCryptoWorkspace.vue must not call fetch() directly');
if (/\/QuantGod_[A-Za-z0-9_-]+\.(json|csv)/.test(workspace)) {
  fail('HfmCryptoWorkspace.vue must not read local QuantGod JSON/CSV paths');
}
if (/LegacyWorkbench/.test(workspace)) fail('HfmCryptoWorkspace.vue must not import LegacyWorkbench');

const forbiddenExecutionPatterns = [
  /\bsubmitOrder\b/,
  /\bsendOrder\b/,
  /\bplaceOrder\b/,
  /\bexecuteTrade\b/,
  /\bexecuteOrder\b/,
  /\bclosePosition\b/,
  /\bcancelOrder\b/,
  /\btransferFunds\b/,
  /\bwithdrawFunds\b/,
  /\bdepositFunds\b/,
  /\bmutatePreset\b/,
  /\bwriteLivePreset\b/,
  /\bpromoteRoute\b/,
  /\bdemoteRoute\b/,
  /\bexecutePromotion\b/,
  /\bmanualAuthorize\b/,
  /\bautoExecute\b/,
];
for (const pattern of forbiddenExecutionPatterns) {
  if (pattern.test(workspace) || pattern.test(model)) {
    fail(`forbidden execution or mutation affordance matched: ${pattern}`);
  }
}

const requiredModelMarkers = [
  'HFM_CRYPTO_SAFETY_DEFAULTS',
  'buildHfmCryptoModel',
  'brokerSymbolDiagnostics',
  'brokerSymbolSampleRows',
  'accountCryptoAvailabilityItems',
  'accountNoCryptoSymbols',
  'brokerSymbolSamples',
  'accountItems',
  'mt5Snapshot',
  'hfmMt5SnapshotRootCause',
  'hfmMt5SnapshotRecoveryRows',
  '当前账号、BTC/crypto tick、持仓和执行准备度不可确认',
  'readyForExecutionSpecReview',
  'simulationQualified',
  'sourceSelection',
  'EA 自动导出的规格',
  'liveApprovalEvidence',
  'executionLaneSpec',
  'releaseUnblockPlan',
  'releaseMinimalDiffReview',
  'releaseMinimalDiffChangeRows',
  'releaseMinimalDiffTokenRows',
  'releaseTokenEvidenceReview',
  'releaseTokenEvidenceRows',
  'releaseTokenSignoffDraft',
  'releaseTokenSignoffDraftRows',
  'releaseTokenSignoffInputTemplate',
  'releaseTokenSignoffInputTemplateRows',
  'releaseTokenSignoffInputReview',
  'releaseTokenSignoffInputRows',
  '实盘释放计划',
  'Release Token 证据',
  'Release Token 签收草案',
  'Release Token 签收模板',
  'Release Token 签收输入',
  'postTargetReleaseAudit',
  'Execution release 审计',
  'authorizationBoundary',
  '授权边界',
  'dryRunReplay',
  'runtimePreflight',
  'livePilotMode',
  'orderRequestContract',
  'simToLivePipeline',
  'executionAdapterReview',
  'liveEvidenceIntake',
  'livePromotionCandidates',
  'livePromotionController',
  'adapterSandbox',
  'adapterContractValidator',
  'simToLiveOrchestrator',
  'simToLiveOrchestratorRows',
  'liveExecutionStages',
  'readyForLiveExecutionImplementationReview',
  'executionAdapterHarness',
  'executionAdapterHarnessRows',
  'livePilotActivationReview',
  'livePilotActivationRows',
  'receiptReconciliationReview',
  'receiptReconciliationRows',
  'eaRequestReaderReview',
  'eaRequestReaderRows',
  'liveExecutionCutoverReview',
  'liveExecutionCutoverRows',
  'readyForSeparateLiveExecutionCutoverImplementationReview',
  'liveExecutionImplementationSpec',
  'liveExecutionImplementationRows',
  'readyForLiveExecutionImplementationSpecReview',
  'liveExecutionAdapterWriteReview',
  'liveExecutionAdapterWriteRows',
  'readyForLiveExecutionAdapterWriteReview',
  'live_execution_adapter_write_path',
  'eaRequestConsumptionReview',
  'eaRequestConsumptionRows',
  'readyForEaRequestConsumptionReview',
  'wouldReadRequestFile',
  'brokerOrderSendReview',
  'brokerOrderSendRows',
  'readyForBrokerOrderSendReview',
  'wouldCallBroker',
  'mt5ExporterReview',
  'mt5UpgradeBundle',
  'mt5ExporterDeployPlan',
  'mt5ExporterDeployPlanRows',
  'standaloneExporterBundle',
  'standaloneExporterBundleRows',
  'standaloneExporterReady',
  'targetInstalledAndCompiled',
  'targetExpertInstalledAndCompiled',
  'targetCompiledExists',
  'targetExpertCompiledExists',
  'expectedSpecsRowCount',
  'startupConfig',
  'postRunRefreshPlan',
  'deployPlanReady',
  'rollbackPlanReady',
  'backupPlan',
  'commandsForHumanReview',
  'mt5ExporterDeployPlanSteps',
  'mt5PostUpgradeVerify',
  'postUpgradeController',
  'postUpgradeControllerRows',
  'filledInputValidator',
  'reviewInputsValid',
  'inputSources',
  'filledInputRows',
  'filledInputCheckRows',
  'evidenceInputRows',
  'promotionCandidateRows',
  'promotionControllerRows',
  'adapterSandboxRows',
  'adapterContractValidatorRows',
  'releaseTokenSignoffHandoffRows',
  'releaseTokenSignoffHandoffProgress',
  'symbolEvidenceRows',
  'symbolEvidenceSources',
  'mt5ExporterRows',
  'mt5UpgradeBundleRows',
  'mt5PostUpgradeRows',
  'evidenceKit',
  'evidenceBootstrap',
  'evidenceBootstrapDraftRows',
  'readOnly: true',
  'shadowOnly: true',
  'orderSendAllowed: false',
  'closeAllowed: false',
  'cancelAllowed: false',
  'mt5OrderSendAllowed: false',
  'walletAuthorizationAllowed: false',
  'copyTradeExecutionAllowed: false',
  'mossExecutionAllowed: false',
  'livePresetMutationAllowed: false',
  'livePilotActivationAllowed: false',
  'receiptWritesAllowed: false',
  'receiptFilesWritten: false',
  'autoDisableMutationAllowed: false',
  'eaRequestFilesRead: false',
  'eaOrderSendAllowed: false',
  'liveExecutionCutoverAllowed: false',
  'externalMarketRemoved: true',
];
for (const marker of requiredModelMarkers) {
  if (!model.includes(marker)) fail(`hfmCryptoModel.js missing safety/model marker: ${marker}`);
}

const requiredServiceMarkers = [
  'HFM_CRYPTO_ACCOUNT_SCOPE',
  'scopedHfmCryptoPath',
  'scopedLiveAutomationPath',
  'loadHfmCryptoWorkspaceCore',
  'loadHfmCryptoWorkspace',
  'loadHfmCryptoWorkspaceDetails',
  '/api/mt5-readonly-secondary/snapshot',
  '/api/hfm-crypto/status',
  '/api/live-automation/release-readiness-refresh',
  '/api/live-automation/release-minimal-diff-review',
  '/api/live-automation/release-token-signoff-input-review/build',
  '/api/live-automation/release-token-signoff-handoff/build',
  'buildReleaseTokenSignoffInputReview',
  'buildReleaseTokenSignoffHandoff',
  'postLiveAutomationBodyBuild',
  '/api/hfm-crypto/standalone-exporter-bundle',
  '/api/hfm-crypto/mt5-upgrade-bundle',
  '/api/hfm-crypto/post-upgrade-controller',
];
for (const marker of requiredServiceMarkers) {
  if (!service.includes(marker)) fail(`domainApi.js missing HFM service marker: ${marker}`);
}

const quickStart = service.indexOf('export async function loadHfmCryptoWorkspace(options = {})');
const detailsStart = service.indexOf('export async function loadHfmCryptoWorkspaceDetails(options = {})');
if (quickStart < 0 || detailsStart < 0 || detailsStart <= quickStart) {
  fail('domainApi.js must keep a lightweight HFM load before detail loading');
}
const quickLoadBody = service.slice(quickStart, detailsStart);
for (const heavyEndpoint of [
  '/api/hfm-crypto/symbols',
  '/api/hfm-crypto/simulation-profile',
  '/api/hfm-crypto/mt5-exporter-review',
  '/api/hfm-crypto/mt5-upgrade-bundle',
  '/api/hfm-crypto/standalone-exporter-bundle',
  '/api/hfm-crypto/post-upgrade-controller',
  '/api/hfm-crypto/filled-input-validator',
]) {
  if (quickLoadBody.includes(heavyEndpoint)) {
    fail(`loadHfmCryptoWorkspace must not block initial render on heavy endpoint: ${heavyEndpoint}`);
  }
}

if (packageJson.scripts?.['hfm-crypto-workspace'] !== 'node scripts/frontend_hfm_crypto_workspace_guard.mjs') {
  fail('package.json must define npm run hfm-crypto-workspace');
}

console.log('HFM Crypto workspace guard OK');
