<template>
  <WorkspaceFrame
    eyebrow="HFM Crypto CFD"
    title="HFM Crypto CFD 影子车道"
    description="扫描 HFM/MT5 crypto CFD symbol，导入 Moss backtest 指标，只建立 shadow-only 研究映射。"
    :loading="loading"
    :error="error"
    @refresh="load"
  >
    <div class="qg-readonly-banner">
      <StatusPill :status="model.status" :label="model.statusLabel" />
      <span
        >当前页面不下单、不授权钱包、不改实盘预设；只判断 HFM crypto CFD 是否具备进入下一阶段的证据。</span
      >
    </div>

    <section
      class="qg-snapshot-root-cause"
      :class="`qg-snapshot-root-cause--${model.snapshotRootCause.status}`"
    >
      <div class="qg-snapshot-root-cause__main">
        <p class="qg-eyebrow">Live16 快照根因</p>
        <h2>{{ model.snapshotRootCause.title }}</h2>
        <p>{{ model.snapshotRootCause.rootCauseLine }}</p>
      </div>
      <StatusPill :status="model.snapshotRootCause.status" :label="model.snapshotRootCause.label" />
      <div class="qg-snapshot-root-cause__grid">
        <span>
          <strong>当前不可直接信任</strong>
          {{ model.snapshotRootCause.blockedLine }}
        </span>
        <span>
          <strong>仍可继续复核</strong>
          {{ model.snapshotRootCause.usableLine }}
        </span>
        <span>
          <strong>下一步</strong>
          {{ model.snapshotRootCause.nextAction }}
        </span>
      </div>
    </section>

    <div class="hfm-crypto-controls">
      <label>
        <span>Moss backtest JSON</span>
        <input
          v-model="mossBacktestJson"
          placeholder="/Users/.../moss_backtest_export.json"
          @keydown.enter="build"
        />
      </label>
      <label>
        <span>HFM contract spec JSON/CSV</span>
        <input
          v-model="hfmContractSpecJson"
          placeholder="/Users/.../hfm_crypto_contract_specs.json"
          @keydown.enter="build"
        />
      </label>
      <label>
        <span>MT5 registry / EA specs JSON</span>
        <input
          v-model="hfmSymbolRegistryJson"
          placeholder="留空时自动发现 QuantGod_HFMCryptoSymbolSpecs.json"
          @keydown.enter="build"
        />
      </label>
      <label>
        <span>Operator approval JSON</span>
        <input
          v-model="operatorApprovalJson"
          placeholder="/Users/.../operator_approval.json"
          @keydown.enter="build"
        />
      </label>
      <label>
        <span>Receipt JSON</span>
        <input
          v-model="receiptJson"
          placeholder="可选：未来 adapter review-only receipts"
          @keydown.enter="build"
        />
      </label>
      <button type="button" class="qg-button" :disabled="loading" @click="build">
        <RefreshCw :size="16" aria-hidden="true" />
        快速刷新接入
      </button>
      <button
        type="button"
        class="qg-button qg-button--secondary"
        :disabled="loading"
        @click="buildFullReview"
      >
        <RefreshCw :size="16" aria-hidden="true" />
        完整状态刷新
      </button>
    </div>

    <MetricGrid :items="model.metrics" />
    <EndpointHealthGrid :items="loadedEndpoints.slice(0, 12)" />

    <section class="qg-domain-panel qg-domain-panel--primary">
      <div class="qg-domain-panel__header">
        <div>
          <p class="qg-eyebrow">Live16 数据源</p>
          <h2>EA 快照新鲜度</h2>
        </div>
        <span class="qg-muted">Crypto READY 不能替代实时账号快照</span>
      </div>
      <LedgerTable title="Live16 快照" :rows="model.tables.mt5FreshnessRows" :limit="1" />
      <LedgerTable title="Live16 快照恢复矩阵" :rows="model.tables.mt5RecoveryRows" :limit="3" />
    </section>

    <div class="qg-domain-grid qg-domain-grid--two">
      <section class="qg-domain-panel qg-domain-panel--primary">
        <div class="qg-domain-panel__header">
          <div>
            <p class="qg-eyebrow">账号可用性</p>
            <h2>HFM Crypto CFD 探测结果</h2>
          </div>
          <ShieldCheck :size="20" aria-hidden="true" />
        </div>
        <KeyValueList :items="model.accountCryptoAvailabilityItems" />
      </section>

      <section class="qg-domain-panel qg-domain-panel--primary">
        <div class="qg-domain-panel__header">
          <div>
            <p class="qg-eyebrow">账号阻断清单</p>
            <h2>下一步动作</h2>
          </div>
          <ShieldCheck :size="20" aria-hidden="true" />
        </div>
        <KeyValueList :items="model.operatorChecklistItems" />
      </section>

      <section class="qg-domain-panel qg-domain-panel--primary">
        <div class="qg-domain-panel__header">
          <div>
            <p class="qg-eyebrow">接入状态</p>
            <h2>HFM symbol 与阻塞</h2>
          </div>
          <ShieldCheck :size="20" aria-hidden="true" />
        </div>
        <KeyValueList :items="model.readinessItems" />
      </section>

      <section class="qg-domain-panel qg-domain-panel--primary">
        <div class="qg-domain-panel__header">
          <div>
            <p class="qg-eyebrow">MT5 账号链路</p>
            <h2>Live 账户与 EA 快照</h2>
          </div>
          <ShieldCheck :size="20" aria-hidden="true" />
        </div>
        <KeyValueList :items="model.accountItems" />
      </section>

      <section class="qg-domain-panel">
        <div class="qg-domain-panel__header">
          <div>
            <p class="qg-eyebrow">Moss backtest</p>
            <h2>回测资料卡</h2>
          </div>
        </div>
        <KeyValueList :items="model.mossItems" />
      </section>

      <section class="qg-domain-panel">
        <div class="qg-domain-panel__header">
          <div>
            <p class="qg-eyebrow">安全边界</p>
            <h2>执行权限关闭</h2>
          </div>
        </div>
        <KeyValueList :items="model.safetyItems" />
      </section>

      <section class="qg-domain-panel">
        <div class="qg-domain-panel__header">
          <div>
            <p class="qg-eyebrow">下一步</p>
            <h2>进入实盘前要补齐</h2>
          </div>
        </div>
        <KeyValueList :items="nextStepItems" />
      </section>

      <section class="qg-domain-panel qg-domain-panel--primary">
        <div class="qg-domain-panel__header">
          <div>
            <p class="qg-eyebrow">实盘准入</p>
            <h2>自动化审查档案</h2>
          </div>
          <ShieldCheck :size="20" aria-hidden="true" />
        </div>
        <KeyValueList :items="model.liveReadinessItems" />
      </section>

      <section class="qg-domain-panel qg-domain-panel--primary">
        <div class="qg-domain-panel__header">
          <div>
            <p class="qg-eyebrow">合计 50 USD 目标</p>
            <h2>Sim-to-live 执行闸门</h2>
          </div>
          <ShieldCheck :size="20" aria-hidden="true" />
        </div>
        <KeyValueList :items="model.profitTargetItems" />
      </section>
    </div>

    <div class="qg-domain-grid qg-domain-grid--wide-tables">
      <LedgerTable title="本机 HFM crypto 证据" :rows="model.tables.findings" :limit="12" />
      <LedgerTable title="Symbol 证据来源" :rows="model.tables.symbolEvidenceSources" :limit="6" />
      <LedgerTable title="账号接入检查清单" :rows="model.tables.operatorChecklist" :limit="8" />
      <LedgerTable title="账号下发 Symbol 样本" :rows="model.tables.brokerSymbolSamples" :limit="20" />
      <LedgerTable title="HFM crypto CFD 候选名" :rows="model.tables.candidates" :limit="48" />
      <LedgerTable title="MT5 规格导出" :rows="model.tables.specExportRows" :limit="12" />
      <LedgerTable title="HFM 合约规格" :rows="model.tables.specRows" :limit="12" />
      <LedgerTable title="MT5 EA 导出器" :rows="model.tables.mt5ExporterMarkers" :limit="8" />
      <LedgerTable title="EA 升级包步骤" :rows="model.tables.mt5UpgradeBundleSteps" :limit="8" />
      <LedgerTable title="EA 部署/回滚计划" :rows="model.tables.mt5ExporterDeployPlanSteps" :limit="12" />
      <LedgerTable title="独立 Specs 导出" :rows="model.tables.standaloneExporterBundleSteps" :limit="10" />
      <LedgerTable title="升级后复核" :rows="model.tables.mt5PostUpgradeChecks" :limit="8" />
      <LedgerTable title="升级总控审查链" :rows="model.tables.postUpgradeControllerRuns" :limit="8" />
      <LedgerTable title="Filled 输入文件" :rows="model.tables.filledInputFiles" :limit="4" />
      <LedgerTable title="Filled 输入校验" :rows="model.tables.filledInputChecks" :limit="8" />
      <LedgerTable title="证据 Bootstrap 草稿" :rows="model.tables.evidenceBootstrapDrafts" :limit="6" />
      <LedgerTable title="证据接入文件" :rows="model.tables.evidenceInputs" :limit="12" />
      <LedgerTable title="实盘评审候选" :rows="model.tables.promotionCandidates" :limit="6" />
      <LedgerTable title="自动晋级审查包" :rows="model.tables.promotionControllerRuns" :limit="6" />
      <LedgerTable title="Adapter 沙盒校验" :rows="model.tables.adapterSandboxValidations" :limit="8" />
      <LedgerTable title="Adapter 合同验证" :rows="model.tables.adapterContractValidations" :limit="8" />
      <LedgerTable title="Pipeline 阻塞诊断" :rows="model.tables.simToLivePipelineBlockerRows" :limit="10" />
      <LedgerTable
        title="Sim-to-live 总控阶段"
        :rows="model.tables.simToLiveOrchestratorStages"
        :limit="12"
      />
      <LedgerTable title="执行 Release Token 清单" :rows="model.tables.executionReleaseGateRows" :limit="8" />
      <LedgerTable title="实盘释放最小 Diff" :rows="model.tables.releaseMinimalDiffChanges" :limit="8" />
      <LedgerTable title="实盘释放 Token 缺口" :rows="model.tables.releaseMinimalDiffTokens" :limit="8" />
      <LedgerTable title="Release Token 证据包" :rows="model.tables.releaseTokenEvidence" :limit="8" />
      <LedgerTable
        title="Release Token 签收草案"
        :rows="model.tables.releaseTokenSignoffDraftRows"
        :limit="8"
      />
      <LedgerTable
        title="Release Token 签收模板"
        :rows="model.tables.releaseTokenSignoffInputTemplateRows"
        :limit="8"
      />
      <LedgerTable
        title="Release Token 签收输入"
        :rows="model.tables.releaseTokenSignoffInputRows"
        :limit="8"
      />
      <LedgerTable
        title="Release Token 签收交接包"
        :rows="model.tables.releaseTokenSignoffHandoffRows"
        :limit="8"
      />
      <LedgerTable
        title="Adapter Harness 写入计划"
        :rows="model.tables.executionAdapterHarnessPlans"
        :limit="8"
      />
      <LedgerTable title="Live Pilot 激活审查" :rows="model.tables.livePilotActivationChecks" :limit="8" />
      <LedgerTable
        title="Live Pilot Preset 激活包"
        :rows="model.tables.livePilotPresetActivationRows"
        :limit="10"
      />
      <LedgerTable
        title="Live Pilot 候选配置"
        :rows="model.tables.livePilotPresetCandidateRows"
        :limit="18"
      />
      <LedgerTable title="Live Pilot 候选文件包" :rows="model.tables.livePilotCandidateFileRows" :limit="6" />
      <LedgerTable title="Receipt 对账审查" :rows="model.tables.receiptReconciliationRows" :limit="8" />
      <LedgerTable title="EA Request Reader 审查" :rows="model.tables.eaRequestReaderRows" :limit="8" />
      <LedgerTable title="Live Cutover 审查" :rows="model.tables.liveExecutionCutoverRows" :limit="8" />
      <LedgerTable title="Live 实现规格" :rows="model.tables.liveExecutionImplementationRows" :limit="8" />
      <LedgerTable
        title="执行安全追踪矩阵"
        :rows="model.tables.liveExecutionSafetyTraceabilityRows"
        :limit="6"
      />
      <LedgerTable
        title="Live Pilot 闸门切换计划"
        :rows="model.tables.livePilotGateTransitionRows"
        :limit="8"
      />
      <LedgerTable
        title="Adapter Writer 审查"
        :rows="model.tables.liveExecutionAdapterWriteRows"
        :limit="8"
      />
      <LedgerTable
        title="EA Request Consumption 审查"
        :rows="model.tables.eaRequestConsumptionRows"
        :limit="8"
      />
      <LedgerTable title="Broker Order Send 审查" :rows="model.tables.brokerOrderSendRows" :limit="8" />
      <LedgerTable title="合计 50 USD Lane" :rows="model.tables.profitTargetLanes" :limit="4" />
      <LedgerTable title="执行模式闸门清单" :rows="model.tables.activationGateChecklist" :limit="8" />
      <LedgerTable title="合约规格阻塞" :rows="model.tables.specBlockers" :limit="8" />
      <LedgerTable title="当前阻塞" :rows="model.tables.blockers" :limit="8" />
    </div>

    <details class="qg-domain-panel qg-domain-panel--details" @toggle="revealTechnicalEvidence">
      <summary>技术证据</summary>
      <p v-if="technicalEvidenceDetailsLoading" class="hfm-crypto-detail-status">正在加载完整状态证据...</p>
      <p
        v-else-if="technicalEvidenceDetailsError"
        class="hfm-crypto-detail-status hfm-crypto-detail-status--error"
      >
        {{ technicalEvidenceDetailsError }}
      </p>
      <div v-if="technicalEvidenceVisible" class="qg-domain-grid qg-domain-grid--compact">
        <JsonPreview
          title="MT5 账号快照"
          source="/api/mt5-readonly-secondary/snapshot"
          :payload="state.mt5Snapshot"
        />
        <JsonPreview
          title="HFM Crypto 状态"
          source="/api/hfm-crypto/status?view=summary&scope=secondary"
          :payload="state.status"
        />
        <JsonPreview
          title="HFM Symbol 扫描"
          source="/api/hfm-crypto/symbols?scope=secondary"
          :payload="state.symbols"
        />
        <JsonPreview
          title="HFM 合约规格导出"
          source="/api/hfm-crypto/contract-spec-export?scope=secondary"
          :payload="state.contractSpecExport"
        />
        <JsonPreview
          title="HFM 合约规格审查"
          source="/api/hfm-crypto/execution-spec?scope=secondary"
          :payload="state.executionSpec"
        />
        <JsonPreview
          title="HFM 模拟表现审查"
          source="/api/hfm-crypto/simulation-profile?scope=secondary"
          :payload="state.simulationProfile"
        />
        <JsonPreview
          title="HFM 证据采集包"
          source="/api/hfm-crypto/evidence-kit?scope=secondary"
          :payload="state.evidenceKit"
        />
        <JsonPreview
          title="HFM 证据Bootstrap"
          source="/api/hfm-crypto/evidence-bootstrap?scope=secondary"
          :payload="state.evidenceBootstrap"
        />
        <JsonPreview
          title="MT5 EA导出器"
          source="/api/hfm-crypto/mt5-exporter-review?scope=secondary"
          :payload="state.mt5ExporterReview"
        />
        <JsonPreview
          title="EA升级包"
          source="/api/hfm-crypto/mt5-upgrade-bundle?scope=secondary"
          :payload="state.mt5UpgradeBundle"
        />
        <JsonPreview
          title="EA部署/回滚计划"
          source="/api/hfm-crypto/mt5-exporter-deploy-plan?scope=secondary"
          :payload="state.mt5ExporterDeployPlan"
        />
        <JsonPreview
          title="独立Specs导出"
          source="/api/hfm-crypto/standalone-exporter-bundle?scope=secondary"
          :payload="state.standaloneExporterBundle"
        />
        <JsonPreview
          title="升级后复核"
          source="/api/hfm-crypto/mt5-post-upgrade-verify?scope=secondary"
          :payload="state.mt5PostUpgradeVerify"
        />
        <JsonPreview
          title="升级总控"
          source="/api/hfm-crypto/post-upgrade-controller?scope=secondary"
          :payload="state.postUpgradeController"
        />
        <JsonPreview
          title="Filled输入校验"
          source="/api/hfm-crypto/filled-input-validator?scope=secondary"
          :payload="state.filledInputValidator"
        />
        <JsonPreview
          title="实盘准入档案"
          source="/api/live-automation/status?scope=secondary"
          :payload="state.liveReadiness"
        />
        <JsonPreview
          title="执行审查包"
          source="/api/live-automation/review-packet?scope=secondary"
          :payload="state.liveReviewPacket"
        />
        <JsonPreview
          title="审批草案（非当前卡点）"
          source="/api/live-automation/approval-draft?scope=secondary"
          :payload="state.liveApprovalDraft"
        />
        <JsonPreview
          title="审批证据（已验收则不再等用户）"
          source="/api/live-automation/approval-evidence?scope=secondary"
          :payload="state.liveApprovalEvidence"
        />
        <JsonPreview
          title="Dry-run 实盘计划"
          source="/api/live-automation/dry-run-plan?scope=secondary"
          :payload="state.dryRunPlan"
        />
        <JsonPreview
          title="执行通道规格"
          source="/api/live-automation/execution-lane-spec?scope=secondary"
          :payload="state.executionLaneSpec"
        />
        <JsonPreview
          title="Dry-run 回放审查"
          source="/api/live-automation/dry-run-replay?scope=secondary"
          :payload="state.dryRunReplay"
        />
        <JsonPreview
          title="运行时预检"
          source="/api/live-automation/runtime-preflight?scope=secondary"
          :payload="state.runtimePreflight"
        />
        <JsonPreview
          title="MT5请求合约"
          source="/api/live-automation/order-request-contract?scope=secondary"
          :payload="state.orderRequestContract"
        />
        <JsonPreview
          title="自动化流水线"
          source="/api/live-automation/pipeline?scope=secondary"
          :payload="state.simToLivePipeline"
        />
        <JsonPreview
          title="Adapter评审"
          source="/api/live-automation/adapter-review?scope=secondary"
          :payload="state.executionAdapterReview"
        />
        <JsonPreview
          title="证据接入"
          source="/api/live-automation/evidence-intake?scope=secondary"
          :payload="state.liveEvidenceIntake"
        />
        <JsonPreview
          title="实盘评审候选"
          source="/api/live-automation/promotion-candidates?scope=secondary"
          :payload="state.livePromotionCandidates"
        />
        <JsonPreview
          title="自动晋级控制器"
          source="/api/live-automation/promotion-controller?scope=secondary"
          :payload="state.livePromotionController"
        />
        <JsonPreview
          title="Adapter沙盒"
          source="/api/live-automation/adapter-sandbox?scope=secondary"
          :payload="state.adapterSandbox"
        />
        <JsonPreview
          title="Adapter合同验证"
          source="/api/live-automation/adapter-contract-validator?scope=secondary"
          :payload="state.adapterContractValidator"
        />
        <JsonPreview
          title="Sim-to-live总控"
          source="/api/live-automation/orchestrator?scope=secondary"
          :payload="state.simToLiveOrchestrator"
        />
        <JsonPreview
          title="执行释放包"
          source="/api/live-automation/release-readiness-refresh?scope=secondary"
          :payload="state.releaseReadinessRefresh"
        />
        <JsonPreview
          title="实盘释放最小Diff审查"
          source="/api/live-automation/release-minimal-diff-review?scope=secondary"
          :payload="state.releaseMinimalDiffReview"
        />
        <JsonPreview
          title="Release Token证据审查"
          source="/api/live-automation/release-token-evidence-review?scope=secondary"
          :payload="state.releaseTokenEvidenceReview"
        />
        <JsonPreview
          title="Release Token签收草案"
          source="/api/live-automation/release-token-signoff-draft?scope=secondary"
          :payload="state.releaseTokenSignoffDraft"
        />
        <JsonPreview
          title="Release Token签收模板"
          source="/api/live-automation/release-token-signoff-input-template?scope=secondary"
          :payload="state.releaseTokenSignoffInputTemplate"
        />
        <JsonPreview
          title="Release Token签收输入"
          source="/api/live-automation/release-token-signoff-input-review?scope=secondary"
          :payload="state.releaseTokenSignoffInputReview"
        />
        <JsonPreview
          title="Release Token签收交接"
          source="/api/live-automation/release-token-signoff-handoff?scope=secondary"
          :payload="state.releaseTokenSignoffHandoff"
        />
        <JsonPreview
          title="Adapter Harness"
          source="/api/live-automation/adapter-harness?scope=secondary"
          :payload="state.executionAdapterHarness"
        />
        <JsonPreview
          title="Live Pilot激活审查"
          source="/api/live-automation/live-pilot-activation-review?scope=secondary"
          :payload="state.livePilotActivationReview"
        />
        <JsonPreview
          title="Receipt对账审查"
          source="/api/live-automation/receipt-reconciliation-review?scope=secondary"
          :payload="state.receiptReconciliationReview"
        />
        <JsonPreview
          title="EA Request Reader审查"
          source="/api/live-automation/ea-request-reader-review?scope=secondary"
          :payload="state.eaRequestReaderReview"
        />
        <JsonPreview
          title="Live Cutover审查"
          source="/api/live-automation/live-execution-cutover-review?scope=secondary"
          :payload="state.liveExecutionCutoverReview"
        />
        <JsonPreview
          title="Live 实现规格"
          source="/api/live-automation/live-execution-implementation-spec?scope=secondary"
          :payload="state.liveExecutionImplementationSpec"
        />
        <JsonPreview
          title="Adapter Writer审查"
          source="/api/live-automation/live-execution-adapter-write-review?scope=secondary"
          :payload="state.liveExecutionAdapterWriteReview"
        />
        <JsonPreview
          title="EA Request Consumption审查"
          source="/api/live-automation/ea-request-consumption-review?scope=secondary"
          :payload="state.eaRequestConsumptionReview"
        />
        <JsonPreview
          title="Broker Order Send审查"
          source="/api/live-automation/broker-order-send-review?scope=secondary"
          :payload="state.brokerOrderSendReview"
        />
        <JsonPreview
          title="合计50 USD目标"
          source="/api/profit-target/status?scope=secondary&targetUsd=50"
          :payload="state.profitTarget"
        />
      </div>
    </details>
  </WorkspaceFrame>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, shallowReactive } from 'vue';
import { RefreshCw, ShieldCheck } from 'lucide-vue-next';

import {
  buildAdapterContractValidator,
  buildAdapterSandbox,
  buildEaRequestReaderReview,
  buildExecutionAdapterHarness,
  buildLiveExecutionCutoverReview,
  buildLiveExecutionImplementationSpec,
  buildLiveExecutionAdapterWriteReview,
  buildEaRequestConsumptionReview,
  buildBrokerOrderSendReview,
  buildLivePilotActivationReview,
  buildReceiptReconciliationReview,
  buildSimToLiveOrchestrator,
  buildHfmCryptoEvidenceKit,
  buildHfmCryptoEvidenceBootstrap,
  buildHfmCryptoContractSpecExport,
  buildHfmCryptoExecutionSpec,
  buildHfmCryptoMt5ExporterReview,
  buildHfmCryptoMt5UpgradeBundle,
  buildHfmCryptoMt5ExporterDeployPlan,
  buildHfmCryptoStandaloneExporterBundle,
  buildHfmCryptoMt5PostUpgradeVerify,
  buildHfmCryptoPostUpgradeController,
  buildHfmCryptoFilledInputValidator,
  buildHfmCryptoSimulationProfile,
  buildHfmCryptoWorkspace,
  buildDryRunLivePlan,
  buildExecutionAdapterReview,
  buildLiveDryRunReplay,
  buildLiveEvidenceIntake,
  buildLivePromotionCandidates,
  buildLivePromotionController,
  buildLiveApprovalEvidence,
  buildLiveApprovalDraft,
  buildLiveAutomationReadiness,
  buildLiveExecutionLaneSpec,
  buildLiveOrderRequestContract,
  buildLiveRuntimePreflight,
  buildLiveReviewPacket,
  buildSimToLivePipeline,
  loadHfmCryptoWorkspaceDetails,
  loadHfmCryptoWorkspace,
} from '../../services/domainApi.js';
import WorkspaceFrame from '../shared/WorkspaceFrame.vue';
import MetricGrid from '../shared/MetricGrid.vue';
import EndpointHealthGrid from '../shared/EndpointHealthGrid.vue';
import KeyValueList from '../shared/KeyValueList.vue';
import LedgerTable from '../shared/LedgerTable.vue';
import JsonPreview from '../shared/JsonPreview.vue';
import StatusPill from '../shared/StatusPill.vue';
import { buildHfmCryptoModel } from './hfmCryptoModel.js';

const loading = ref(false);
const error = ref('');
const mossBacktestJson = ref('');
const hfmContractSpecJson = ref('');
const hfmSymbolRegistryJson = ref('');
const operatorApprovalJson = ref('');
const receiptJson = ref('');
const technicalEvidenceVisible = ref(false);
const technicalEvidenceDetailsLoading = ref(false);
const technicalEvidenceDetailsError = ref('');
const technicalEvidenceDetailsLoaded = ref(false);
const state = shallowReactive({
  mt5Snapshot: null,
  status: null,
  symbols: null,
  contractSpecExport: null,
  contractSpecExportBuild: null,
  executionSpec: null,
  executionSpecBuild: null,
  simulationProfile: null,
  simulationProfileBuild: null,
  evidenceKit: null,
  evidenceKitBuild: null,
  evidenceBootstrap: null,
  evidenceBootstrapBuild: null,
  mt5ExporterReview: null,
  mt5ExporterReviewBuild: null,
  mt5UpgradeBundle: null,
  mt5UpgradeBundleBuild: null,
  mt5ExporterDeployPlan: null,
  mt5ExporterDeployPlanBuild: null,
  standaloneExporterBundle: null,
  standaloneExporterBundleBuild: null,
  mt5PostUpgradeVerify: null,
  mt5PostUpgradeVerifyBuild: null,
  postUpgradeController: null,
  postUpgradeControllerBuild: null,
  filledInputValidator: null,
  filledInputValidatorBuild: null,
  build: null,
  liveReadiness: null,
  liveBuild: null,
  liveReviewPacket: null,
  liveReviewBuild: null,
  liveApprovalDraft: null,
  liveApprovalBuild: null,
  liveApprovalEvidence: null,
  liveApprovalEvidenceBuild: null,
  dryRunPlan: null,
  dryRunBuild: null,
  executionLaneSpec: null,
  executionLaneSpecBuild: null,
  dryRunReplay: null,
  dryRunReplayBuild: null,
  runtimePreflight: null,
  runtimePreflightBuild: null,
  orderRequestContract: null,
  orderRequestContractBuild: null,
  simToLivePipeline: null,
  simToLivePipelineBuild: null,
  executionAdapterReview: null,
  executionAdapterReviewBuild: null,
  liveEvidenceIntake: null,
  liveEvidenceIntakeBuild: null,
  livePromotionCandidates: null,
  livePromotionCandidatesBuild: null,
  livePromotionController: null,
  livePromotionControllerBuild: null,
  adapterSandbox: null,
  adapterSandboxBuild: null,
  adapterContractValidator: null,
  adapterContractValidatorBuild: null,
  simToLiveOrchestrator: null,
  simToLiveOrchestratorBuild: null,
  releaseReadinessRefresh: null,
  releaseMinimalDiffReview: null,
  releaseTokenEvidenceReview: null,
  releaseTokenSignoffDraft: null,
  releaseTokenSignoffInputTemplate: null,
  releaseTokenSignoffInputReview: null,
  releaseTokenSignoffHandoff: null,
  laneSelector: null,
  executionAdapterHarness: null,
  executionAdapterHarnessBuild: null,
  livePilotActivationReview: null,
  livePilotActivationReviewBuild: null,
  receiptReconciliationReview: null,
  receiptReconciliationReviewBuild: null,
  eaRequestReaderReview: null,
  eaRequestReaderReviewBuild: null,
  liveExecutionCutoverReview: null,
  liveExecutionCutoverReviewBuild: null,
  liveExecutionImplementationSpec: null,
  liveExecutionImplementationSpecBuild: null,
  liveExecutionAdapterWriteReview: null,
  liveExecutionAdapterWriteReviewBuild: null,
  eaRequestConsumptionReview: null,
  eaRequestConsumptionReviewBuild: null,
  brokerOrderSendReview: null,
  brokerOrderSendReviewBuild: null,
  profitTarget: null,
});
let loadController = null;
let detailLoadController = null;
let loadRunId = 0;

const model = computed(() => buildHfmCryptoModel(state));
const loadedEndpoints = computed(() => {
  const rows = model.value.endpoints.filter((item) => item.status !== 'unknown');
  return rows.length ? rows : model.value.endpoints.slice(0, 4);
});
const nextStepItems = computed(() => [
  {
    label: 'MT5 Specs',
    value: model.value.statusLabel || '等待 HFM crypto 状态',
    hint: model.value.standaloneExporterNextAction || '运行后写出 QuantGod_HFMCryptoSymbolSpecs.json',
    status: model.value.standaloneExporterReadyToRun ? 'warn' : 'blocked',
  },
  {
    label: '导入 Moss',
    value: state.build?.mossBacktestProfile?.profileFound ? '已导入回测资料' : '可选填 Moss backtest JSON',
    status: state.build?.mossBacktestProfile?.profileFound ? 'ok' : 'warn',
  },
  {
    label: '合约规格',
    value: model.value.executionSpecReady ? '已有可审查规格' : '需要导入 MT5/HFM 合约规格',
    status: model.value.executionSpecReady ? 'warn' : 'blocked',
  },
  {
    label: '执行设计',
    value: '另开评审后才能进入 MT5 实盘执行',
    status: 'blocked',
  },
]);

function abortLoad() {
  loadController?.abort();
  loadController = null;
}

function abortDetailLoad() {
  detailLoadController?.abort();
  detailLoadController = null;
}

async function withLoading(action, fallbackMessage) {
  abortLoad();
  const runId = loadRunId + 1;
  loadRunId = runId;
  const controller = new globalThis.AbortController();
  loadController = controller;
  loading.value = true;
  error.value = '';
  try {
    const nextState = await action(controller.signal);
    if (controller.signal.aborted || runId !== loadRunId) return;
    Object.assign(state, nextState);
  } catch (exc) {
    if (controller.signal.aborted || runId !== loadRunId) return;
    error.value = exc?.message || fallbackMessage;
  } finally {
    if (runId === loadRunId) {
      loading.value = false;
      loadController = null;
    }
  }
}

async function load() {
  technicalEvidenceDetailsLoaded.value = false;
  await withLoading((signal) => loadHfmCryptoWorkspace({ signal }), 'HFM Crypto CFD 状态加载失败');
  void loadTechnicalEvidenceDetails();
}

async function loadTechnicalEvidenceDetails() {
  if (technicalEvidenceDetailsLoaded.value || technicalEvidenceDetailsLoading.value) return;
  abortDetailLoad();
  const controller = new globalThis.AbortController();
  detailLoadController = controller;
  technicalEvidenceDetailsLoading.value = true;
  technicalEvidenceDetailsError.value = '';
  try {
    const details = await loadHfmCryptoWorkspaceDetails({ signal: controller.signal });
    if (controller.signal.aborted) return;
    Object.assign(state, details);
    technicalEvidenceDetailsLoaded.value = true;
  } catch (exc) {
    if (controller.signal.aborted) return;
    technicalEvidenceDetailsError.value = exc?.message || 'HFM Crypto CFD 技术证据加载失败';
  } finally {
    if (detailLoadController === controller) {
      technicalEvidenceDetailsLoading.value = false;
      detailLoadController = null;
    }
  }
}

async function build() {
  await withLoading(async (signal) => {
    const contractSpecExportBuild = await buildHfmCryptoContractSpecExport(
      { hfmSymbolRegistryJson: hfmSymbolRegistryJson.value },
      { signal, timeoutMs: 30000 },
    );
    const contractSpecJson = hfmContractSpecJson.value || contractSpecExportBuild?.contractSpecJsonPath || '';
    const [buildState, standaloneExporterBundleBuild, liveBuild, loaded] = await Promise.all([
      buildHfmCryptoWorkspace(
        { mossBacktestJson: mossBacktestJson.value, hfmContractSpecJson: contractSpecJson },
        { signal, timeoutMs: 30000 },
      ),
      buildHfmCryptoStandaloneExporterBundle({ signal, timeoutMs: 30000 }),
      buildLiveAutomationReadiness(
        { mossBacktestJson: mossBacktestJson.value, hfmContractSpecJson: contractSpecJson },
        { signal, timeoutMs: 60000 },
      ),
      loadHfmCryptoWorkspace({ signal }),
    ]);
    return {
      ...loaded,
      build: buildState,
      contractSpecExportBuild,
      contractSpecExport: contractSpecExportBuild || loaded.contractSpecExport,
      standaloneExporterBundleBuild,
      standaloneExporterBundle: standaloneExporterBundleBuild,
      liveBuild,
      liveReadiness: liveBuild,
    };
  }, 'HFM Crypto CFD 快速接入刷新失败');
}

async function buildFullReview() {
  await withLoading(async (signal) => {
    const contractSpecExportBuild = await buildHfmCryptoContractSpecExport(
      { hfmSymbolRegistryJson: hfmSymbolRegistryJson.value },
      { signal, timeoutMs: 30000 },
    );
    const contractSpecJson = hfmContractSpecJson.value || contractSpecExportBuild?.contractSpecJsonPath || '';
    const buildState = await buildHfmCryptoWorkspace(
      { mossBacktestJson: mossBacktestJson.value, hfmContractSpecJson: contractSpecJson },
      { signal, timeoutMs: 30000 },
    );
    const executionSpecBuild = await buildHfmCryptoExecutionSpec(
      { hfmContractSpecJson: contractSpecJson },
      { signal, timeoutMs: 30000 },
    );
    const simulationProfileBuild = await buildHfmCryptoSimulationProfile(
      { simulationProfileJson: mossBacktestJson.value },
      { signal, timeoutMs: 30000 },
    );
    const evidenceKitBuild = await buildHfmCryptoEvidenceKit({ signal, timeoutMs: 30000 });
    const evidenceBootstrapBuild = await buildHfmCryptoEvidenceBootstrap({}, { signal, timeoutMs: 60000 });
    const mt5ExporterReviewBuild = await buildHfmCryptoMt5ExporterReview({ signal, timeoutMs: 30000 });
    const mt5UpgradeBundleBuild = await buildHfmCryptoMt5UpgradeBundle({ signal, timeoutMs: 30000 });
    const mt5ExporterDeployPlanBuild = await buildHfmCryptoMt5ExporterDeployPlan({
      signal,
      timeoutMs: 30000,
    });
    const standaloneExporterBundleBuild = await buildHfmCryptoStandaloneExporterBundle({
      signal,
      timeoutMs: 30000,
    });
    const mt5PostUpgradeVerifyBuild = await buildHfmCryptoMt5PostUpgradeVerify({ signal, timeoutMs: 30000 });
    const postUpgradeControllerBuild = await buildHfmCryptoPostUpgradeController({
      signal,
      timeoutMs: 45000,
    });
    const filledInputValidatorBuild = await buildHfmCryptoFilledInputValidator({ signal, timeoutMs: 30000 });
    const liveBuild = await buildLiveAutomationReadiness(
      { mossBacktestJson: mossBacktestJson.value, hfmContractSpecJson: contractSpecJson },
      { signal, timeoutMs: 60000 },
    );
    const liveReviewBuild = await buildLiveReviewPacket(
      { mossBacktestJson: mossBacktestJson.value, hfmContractSpecJson: contractSpecJson },
      { signal, timeoutMs: 60000 },
    );
    const liveApprovalBuild = await buildLiveApprovalDraft(
      { mossBacktestJson: mossBacktestJson.value, hfmContractSpecJson: contractSpecJson },
      { signal, timeoutMs: 60000 },
    );
    const liveApprovalEvidenceBuild = await buildLiveApprovalEvidence(
      {
        operatorApprovalJson: operatorApprovalJson.value,
        mossBacktestJson: mossBacktestJson.value,
        hfmContractSpecJson: contractSpecJson,
      },
      { signal, timeoutMs: 60000 },
    );
    const dryRunBuild = await buildDryRunLivePlan(
      { mossBacktestJson: mossBacktestJson.value, hfmContractSpecJson: contractSpecJson },
      { signal, timeoutMs: 60000 },
    );
    const executionLaneSpecBuild = await buildLiveExecutionLaneSpec(
      {
        operatorApprovalJson: operatorApprovalJson.value,
        mossBacktestJson: mossBacktestJson.value,
        hfmContractSpecJson: contractSpecJson,
      },
      { signal, timeoutMs: 60000 },
    );
    const dryRunReplayBuild = await buildLiveDryRunReplay(
      {
        operatorApprovalJson: operatorApprovalJson.value,
        mossBacktestJson: mossBacktestJson.value,
        hfmContractSpecJson: contractSpecJson,
      },
      { signal, timeoutMs: 60000 },
    );
    const runtimePreflightBuild = await buildLiveRuntimePreflight(
      {
        operatorApprovalJson: operatorApprovalJson.value,
        mossBacktestJson: mossBacktestJson.value,
        hfmContractSpecJson: contractSpecJson,
      },
      { signal, timeoutMs: 60000 },
    );
    const orderRequestContractBuild = await buildLiveOrderRequestContract(
      {
        operatorApprovalJson: operatorApprovalJson.value,
        mossBacktestJson: mossBacktestJson.value,
        hfmContractSpecJson: contractSpecJson,
      },
      { signal, timeoutMs: 60000 },
    );
    const simToLivePipelineBuild = await buildSimToLivePipeline(
      {
        operatorApprovalJson: operatorApprovalJson.value,
        mossBacktestJson: mossBacktestJson.value,
        hfmContractSpecJson: contractSpecJson,
      },
      { signal, timeoutMs: 90000 },
    );
    const executionAdapterReviewBuild = await buildExecutionAdapterReview(
      {
        operatorApprovalJson: operatorApprovalJson.value,
        mossBacktestJson: mossBacktestJson.value,
        hfmContractSpecJson: contractSpecJson,
      },
      { signal, timeoutMs: 90000 },
    );
    const liveEvidenceIntakeBuild = await buildLiveEvidenceIntake(
      {
        operatorApprovalJson: operatorApprovalJson.value,
        mossBacktestJson: mossBacktestJson.value,
        hfmContractSpecJson: contractSpecJson,
        refreshSources: true,
      },
      { signal, timeoutMs: 90000 },
    );
    const livePromotionCandidatesBuild = await buildLivePromotionCandidates(
      {
        operatorApprovalJson: operatorApprovalJson.value,
        mossBacktestJson: mossBacktestJson.value,
        hfmContractSpecJson: contractSpecJson,
        refreshSources: true,
      },
      { signal, timeoutMs: 90000 },
    );
    const livePromotionControllerBuild = await buildLivePromotionController(
      {
        operatorApprovalJson: operatorApprovalJson.value,
        mossBacktestJson: mossBacktestJson.value,
        hfmContractSpecJson: contractSpecJson,
        refreshSources: true,
      },
      { signal, timeoutMs: 90000 },
    );
    const adapterSandboxBuild = await buildAdapterSandbox(
      {
        operatorApprovalJson: operatorApprovalJson.value,
        mossBacktestJson: mossBacktestJson.value,
        hfmContractSpecJson: contractSpecJson,
        refreshSources: true,
      },
      { signal, timeoutMs: 90000 },
    );
    const adapterContractValidatorBuild = await buildAdapterContractValidator(
      {
        operatorApprovalJson: operatorApprovalJson.value,
        mossBacktestJson: mossBacktestJson.value,
        hfmContractSpecJson: contractSpecJson,
        refreshSources: true,
      },
      { signal, timeoutMs: 90000 },
    );
    const simToLiveOrchestratorBuild = await buildSimToLiveOrchestrator(
      {
        operatorApprovalJson: operatorApprovalJson.value,
        mossBacktestJson: mossBacktestJson.value,
        hfmContractSpecJson: contractSpecJson,
        refreshSources: true,
      },
      { signal, timeoutMs: 120000 },
    );
    const executionAdapterHarnessBuild = await buildExecutionAdapterHarness(
      {
        operatorApprovalJson: operatorApprovalJson.value,
        mossBacktestJson: mossBacktestJson.value,
        hfmContractSpecJson: contractSpecJson,
        refreshSources: true,
      },
      { signal, timeoutMs: 120000 },
    );
    const livePilotActivationReviewBuild = await buildLivePilotActivationReview(
      {
        operatorApprovalJson: operatorApprovalJson.value,
        mossBacktestJson: mossBacktestJson.value,
        hfmContractSpecJson: contractSpecJson,
        refreshSources: true,
      },
      { signal, timeoutMs: 120000 },
    );
    const receiptReconciliationReviewBuild = await buildReceiptReconciliationReview(
      {
        operatorApprovalJson: operatorApprovalJson.value,
        receiptJson: receiptJson.value,
        mossBacktestJson: mossBacktestJson.value,
        hfmContractSpecJson: contractSpecJson,
        refreshSources: true,
      },
      { signal, timeoutMs: 120000 },
    );
    const eaRequestReaderReviewBuild = await buildEaRequestReaderReview({}, { signal, timeoutMs: 120000 });
    const liveExecutionCutoverReviewBuild = await buildLiveExecutionCutoverReview(
      {
        operatorApprovalJson: operatorApprovalJson.value,
        receiptJson: receiptJson.value,
        mossBacktestJson: mossBacktestJson.value,
        hfmContractSpecJson: contractSpecJson,
        refreshSources: true,
      },
      { signal, timeoutMs: 120000 },
    );
    const liveExecutionImplementationSpecBuild = await buildLiveExecutionImplementationSpec(
      {
        operatorApprovalJson: operatorApprovalJson.value,
        receiptJson: receiptJson.value,
        mossBacktestJson: mossBacktestJson.value,
        hfmContractSpecJson: contractSpecJson,
        refreshSources: true,
      },
      { signal, timeoutMs: 120000 },
    );
    const liveExecutionAdapterWriteReviewBuild = await buildLiveExecutionAdapterWriteReview(
      {
        operatorApprovalJson: operatorApprovalJson.value,
        receiptJson: receiptJson.value,
        mossBacktestJson: mossBacktestJson.value,
        hfmContractSpecJson: contractSpecJson,
        refreshSources: true,
      },
      { signal, timeoutMs: 120000 },
    );
    const eaRequestConsumptionReviewBuild = await buildEaRequestConsumptionReview(
      {
        operatorApprovalJson: operatorApprovalJson.value,
        receiptJson: receiptJson.value,
        mossBacktestJson: mossBacktestJson.value,
        hfmContractSpecJson: contractSpecJson,
        refreshSources: true,
      },
      { signal, timeoutMs: 120000 },
    );
    const brokerOrderSendReviewBuild = await buildBrokerOrderSendReview(
      {
        operatorApprovalJson: operatorApprovalJson.value,
        receiptJson: receiptJson.value,
        mossBacktestJson: mossBacktestJson.value,
        hfmContractSpecJson: contractSpecJson,
        refreshSources: true,
      },
      { signal, timeoutMs: 120000 },
    );
    const loaded = await loadHfmCryptoWorkspace({ signal });
    return {
      ...loaded,
      build: buildState,
      contractSpecExportBuild,
      contractSpecExport: contractSpecExportBuild || loaded.contractSpecExport,
      executionSpecBuild,
      executionSpec: executionSpecBuild,
      simulationProfileBuild,
      simulationProfile: simulationProfileBuild,
      evidenceKitBuild,
      evidenceKit: evidenceKitBuild,
      evidenceBootstrapBuild,
      evidenceBootstrap: evidenceBootstrapBuild,
      mt5ExporterReviewBuild,
      mt5ExporterReview: mt5ExporterReviewBuild,
      mt5UpgradeBundleBuild,
      mt5UpgradeBundle: mt5UpgradeBundleBuild,
      mt5ExporterDeployPlanBuild,
      mt5ExporterDeployPlan: mt5ExporterDeployPlanBuild,
      standaloneExporterBundleBuild,
      standaloneExporterBundle: standaloneExporterBundleBuild,
      mt5PostUpgradeVerifyBuild,
      mt5PostUpgradeVerify: mt5PostUpgradeVerifyBuild,
      postUpgradeControllerBuild,
      postUpgradeController: postUpgradeControllerBuild,
      filledInputValidatorBuild,
      filledInputValidator: filledInputValidatorBuild,
      liveBuild,
      liveReadiness: liveBuild,
      liveReviewBuild,
      liveReviewPacket: liveReviewBuild,
      liveApprovalBuild,
      liveApprovalDraft: liveApprovalBuild,
      liveApprovalEvidenceBuild,
      liveApprovalEvidence: liveApprovalEvidenceBuild,
      dryRunBuild,
      dryRunPlan: dryRunBuild,
      executionLaneSpecBuild,
      executionLaneSpec: executionLaneSpecBuild,
      dryRunReplayBuild,
      dryRunReplay: dryRunReplayBuild,
      runtimePreflightBuild,
      runtimePreflight: runtimePreflightBuild,
      orderRequestContractBuild,
      orderRequestContract: orderRequestContractBuild,
      simToLivePipelineBuild,
      simToLivePipeline: simToLivePipelineBuild,
      executionAdapterReviewBuild,
      executionAdapterReview: executionAdapterReviewBuild,
      liveEvidenceIntakeBuild,
      liveEvidenceIntake: liveEvidenceIntakeBuild,
      livePromotionCandidatesBuild,
      livePromotionCandidates: livePromotionCandidatesBuild,
      livePromotionControllerBuild,
      livePromotionController: livePromotionControllerBuild,
      adapterSandboxBuild,
      adapterSandbox: adapterSandboxBuild,
      adapterContractValidatorBuild,
      adapterContractValidator: adapterContractValidatorBuild,
      simToLiveOrchestratorBuild,
      simToLiveOrchestrator: simToLiveOrchestratorBuild,
      executionAdapterHarnessBuild,
      executionAdapterHarness: executionAdapterHarnessBuild,
      livePilotActivationReviewBuild,
      livePilotActivationReview: livePilotActivationReviewBuild,
      receiptReconciliationReviewBuild,
      receiptReconciliationReview: receiptReconciliationReviewBuild,
      eaRequestReaderReviewBuild,
      eaRequestReaderReview: eaRequestReaderReviewBuild,
      liveExecutionCutoverReviewBuild,
      liveExecutionCutoverReview: liveExecutionCutoverReviewBuild,
      liveExecutionImplementationSpecBuild,
      liveExecutionImplementationSpec: liveExecutionImplementationSpecBuild,
      liveExecutionAdapterWriteReviewBuild,
      liveExecutionAdapterWriteReview: liveExecutionAdapterWriteReviewBuild,
      eaRequestConsumptionReviewBuild,
      eaRequestConsumptionReview: eaRequestConsumptionReviewBuild,
      brokerOrderSendReviewBuild,
      brokerOrderSendReview: brokerOrderSendReviewBuild,
    };
  }, 'HFM Crypto CFD 影子状态构建失败');
}

function revealTechnicalEvidence(event) {
  const opened = Boolean(event.target.open);
  technicalEvidenceVisible.value = technicalEvidenceVisible.value || opened;
  if (opened) {
    void loadTechnicalEvidenceDetails();
  }
}

onMounted(load);
onBeforeUnmount(() => {
  abortLoad();
  abortDetailLoad();
});
</script>

<style scoped>
.hfm-crypto-controls {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr)) auto auto;
  gap: 12px;
  align-items: end;
}

.hfm-crypto-controls label {
  display: grid;
  gap: 6px;
  min-width: 0;
  color: var(--qg-muted);
  font-size: 0.86rem;
}

.hfm-crypto-controls input {
  width: 100%;
  min-width: 0;
  padding: 11px 12px;
  border: 1px solid rgb(114 153 211 / 28%);
  border-radius: 8px;
  color: var(--qg-text);
  background: rgb(6 16 30 / 72%);
}

.hfm-crypto-controls .qg-button {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  justify-content: center;
  min-height: 42px;
}

.hfm-crypto-detail-status {
  margin: 10px 0 0;
  color: var(--qg-muted);
  font-size: 0.88rem;
}

.hfm-crypto-detail-status--error {
  color: var(--qg-danger);
}

@media (width <= 720px) {
  .hfm-crypto-controls {
    grid-template-columns: 1fr;
  }
}
</style>
