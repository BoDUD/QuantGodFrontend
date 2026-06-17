<template>
  <WorkspaceFrame
    eyebrow="全局总览"
    title="今日运营总览"
    description="把 MT5、Evolution、HFM Crypto、每日待办和每日复盘合在一张 Agent 自主运营看板里。自动化继续运行，真实执行释放状态在首页直接可见。"
    :loading="loading"
    :error="error"
    @refresh="load"
  >
    <section class="qg-snapshot-root-cause" :class="`qg-snapshot-root-cause--${snapshotRootCause.status}`">
      <div class="qg-snapshot-root-cause__main">
        <p class="qg-eyebrow">全局快照根因</p>
        <h2>{{ snapshotRootCause.title }}</h2>
        <p>{{ snapshotRootCause.rootCauseLine }}</p>
      </div>
      <StatusPill :status="snapshotRootCause.status" :label="snapshotRootCause.label" />
      <div class="qg-snapshot-root-cause__grid">
        <span>
          <strong>当前不可直接信任</strong>
          {{ snapshotRootCause.blockedLine }}
        </span>
        <span>
          <strong>仍可继续复核</strong>
          {{ snapshotRootCause.usableLine }}
        </span>
        <span>
          <strong>修复入口</strong>
          {{ snapshotRootCause.recoveryPathLine }}
        </span>
        <span>
          <strong>下一步</strong>
          {{ snapshotRootCause.nextAction }}
        </span>
      </div>
    </section>

    <MetricGrid :items="metrics" />
    <EndpointHealthGrid :items="endpointHealth" />

    <section class="qg-domain-panel qg-domain-panel--primary">
      <div class="qg-domain-panel__header">
        <div>
          <p class="qg-eyebrow">实时快照恢复</p>
          <h2>当前账号数据是否可信</h2>
        </div>
        <StatusPill :status="snapshot.snapshotRecovery.status" :label="snapshot.snapshotRecovery.label" />
      </div>
      <div class="qg-domain-grid qg-domain-grid--two">
        <KeyValueList :items="snapshotRecoveryItems" />
        <LedgerTable title="影响范围" :rows="snapshotRecoveryRows" :limit="5" />
      </div>
    </section>

    <section class="qg-domain-panel qg-domain-panel--primary">
      <div class="qg-domain-panel__header">
        <div>
          <p class="qg-eyebrow">整体前端诊断</p>
          <h2>快照和账号桥影响哪些页面</h2>
        </div>
        <span class="qg-muted">区分当前账号状态、研究证据和实盘释放闸门</span>
      </div>
      <LedgerTable title="整体前端修复优先级" :rows="frontendSnapshotRecoveryRows" :limit="8" />
      <LedgerTable
        v-if="coreEvidenceRecoveryRows.length"
        title="核心证据恢复队列"
        :rows="coreEvidenceRecoveryRows"
        :limit="10"
      />
    </section>

    <section class="qg-domain-panel qg-domain-panel--primary">
      <div class="qg-domain-panel__header">
        <div>
          <p class="qg-eyebrow">数据源诊断</p>
          <h2>运行快照恢复优先级</h2>
        </div>
        <span class="qg-muted">主账号、Live16 与 HFM Crypto 一起判定</span>
      </div>
      <LedgerTable title="运行数据源" :rows="runtimeSourceRows" :limit="6" />
    </section>

    <DashboardUpgradePanel :state="state" :snapshot="snapshot" :metrics="metrics" />

    <section class="qg-domain-panel qg-domain-panel--primary">
      <div class="qg-domain-panel__header">
        <div>
          <p class="qg-eyebrow">Agent 自动化健康</p>
          <h2>日报、跟单重调与 Telegram 投递</h2>
        </div>
        <StatusPill
          :status="agentOpsOverallStatus"
          :label="
            state.agentOpsHealth?.systemStatusZh ||
            state.agentOpsHealth?.overallStatusZh ||
            '等待 Agent 健康检查'
          "
        />
      </div>
      <div class="qg-domain-grid qg-domain-grid--two">
        <KeyValueList :items="agentOpsItems" />
        <LedgerTable title="自动化检查" :rows="agentOpsRows" :limit="6" />
      </div>
    </section>

    <section class="qg-domain-panel qg-domain-panel--primary">
      <div class="qg-domain-panel__header">
        <div>
          <p class="qg-eyebrow">Telegram Gateway</p>
          <h2>后台自动推送健康</h2>
        </div>
        <StatusPill :status="telegramGatewayStatus" :label="telegramGatewayStatusLabel" />
      </div>
      <KeyValueList :items="telegramGatewayItems" />
    </section>

    <section class="qg-domain-panel qg-domain-panel--primary">
      <div class="qg-domain-panel__header">
        <div>
          <p class="qg-eyebrow">每日闭环</p>
          <h2>今日待办与每日复盘</h2>
        </div>
        <span class="qg-muted">MT5 + HFM Crypto + GA + Daily Autopilot 自主闭环</span>
      </div>
      <div class="qg-domain-grid qg-domain-grid--two">
        <LedgerTable title="今日待办" :rows="todoRows" :limit="10" />
        <LedgerTable title="每日复盘" :rows="reviewRows" :limit="10" />
      </div>
    </section>

    <section class="qg-domain-panel qg-domain-panel--primary">
      <div class="qg-domain-panel__header">
        <div>
          <p class="qg-eyebrow">合计 50 USD 目标</p>
          <h2>Sim-to-live 执行闸门</h2>
        </div>
        <StatusPill :status="snapshot.profitTargetStatus" :label="snapshot.profitTargetStatusLabel" />
      </div>
      <div class="qg-domain-grid qg-domain-grid--two">
        <KeyValueList :items="profitTargetItems" />
        <KeyValueList :items="championMemoryItems" />
        <LedgerTable title="执行模式闸门" :rows="activationGateRows" :limit="8" />
        <LedgerTable title="Release token 闸门" :rows="releaseGateRows" :limit="8" />
      </div>
    </section>

    <div class="qg-dashboard-grid">
      <section class="qg-domain-panel qg-domain-panel--primary">
        <div class="qg-domain-panel__header">
          <div>
            <p class="qg-eyebrow">运行健康</p>
            <h2>本地运行健康</h2>
          </div>
          <StatusPill :status="snapshot.killSwitchStatus" :label="snapshot.killSwitchLabel" />
        </div>
        <KeyValueList :items="runtimeItems" />
      </section>

      <section class="qg-domain-panel">
        <div class="qg-domain-panel__header">
          <div>
            <p class="qg-eyebrow">每日闭环</p>
            <h2>日报、自动处理与回测摘要</h2>
          </div>
        </div>
        <KeyValueList :items="dailyItems" />
      </section>
    </div>

    <section class="qg-domain-panel">
      <div class="qg-domain-panel__header">
        <div>
          <p class="qg-eyebrow">策略观察</p>
          <h2>路线观察列表</h2>
        </div>
        <span class="qg-muted">最多显示 8 条；缺数据时可展开技术证据核对。</span>
      </div>
      <div v-if="routeRows.length" class="qg-route-table-wrap">
        <table class="qg-route-table">
          <thead>
            <tr>
              <th>路线</th>
              <th>状态</th>
              <th>评分</th>
              <th>备注</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in routeRows" :key="row.id">
              <td>{{ row.route }}</td>
              <td><StatusPill :status="row.status" :label="row.status" /></td>
              <td>{{ row.score }}</td>
              <td>{{ row.note || '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-else class="qg-empty-text">当前没有路线观察列表；需要时可展开下方技术证据查看原始数据。</p>
    </section>

    <section class="qg-domain-panel qg-dashboard-fast-lanes">
      <div class="qg-domain-panel__header">
        <div>
          <p class="qg-eyebrow">核心工作区</p>
          <h2>按需打开重证据页面</h2>
        </div>
        <span class="qg-muted">总览页保持轻量，避免重复加载 GA / 回放 / K线证据。</span>
      </div>
      <div class="qg-dashboard-fast-lanes__grid">
        <a class="qg-dashboard-fast-lanes__card" href="/vue/?workspace=mt5">
          <span>MT5</span>
          <strong>实盘状态与 K线</strong>
          <small>RSI 诊断、执行反馈、K线图和 EA 守门状态。</small>
        </a>
        <a class="qg-dashboard-fast-lanes__card" href="/vue/?workspace=evolution">
          <span>Evolution</span>
          <strong>回测 / GA / Case Memory</strong>
          <small>完整 Strategy JSON、GA 候选详情和证据链审计。</small>
        </a>
        <a class="qg-dashboard-fast-lanes__card" href="/vue/?workspace=hfm-crypto">
          <span>HFM Crypto</span>
          <strong>Crypto CFD symbol 与 Moss 回测</strong>
          <small>扫描 HFM crypto CFD，本地导入 Moss backtest 指标，只做 shadow 研究。</small>
        </a>
      </div>
    </section>
    <details class="qg-domain-panel qg-domain-panel--details" @toggle="revealAutomationPanel">
      <summary>自动化链路状态</summary>
      <Suspense v-if="automationPanelVisible">
        <AutomationChainPanel class="qg-dashboard-automation-chain" />
        <template #fallback>
          <LoadingState title="正在加载自动化链路" description="正在按需打开恢复状态证据。" />
        </template>
      </Suspense>
    </details>

    <details class="qg-domain-panel qg-domain-panel--details" @toggle="revealTechnicalEvidence">
      <summary>技术证据</summary>
      <div v-if="technicalEvidenceVisible" class="qg-domain-grid qg-domain-grid--compact">
        <JsonPreview title="最新运行状态" source="/api/latest" :payload="state.latest" />
        <JsonPreview title="总览状态" source="/api/dashboard/state" :payload="state.state" />
        <JsonPreview title="回测摘要" source="/api/dashboard/backtest-summary" :payload="state.backtest" />
        <JsonPreview title="每日复盘" source="/api/daily-review" :payload="state.dailyReview" />
        <JsonPreview title="今日自动闭环" source="/api/daily-autopilot" :payload="state.dailyAutopilot" />
        <JsonPreview
          title="USDJPY Live Loop"
          source="/api/usdjpy-strategy-lab/live-loop"
          :payload="state.usdJpyLiveLoop"
        />
        <JsonPreview
          title="Agent 日报 v2"
          source="/api/usdjpy-strategy-lab/autonomous-agent/daily-autopilot-v2?scope=secondary"
          :payload="state.dailyAutopilotV2"
        />
        <JsonPreview
          title="Agent 自动化健康"
          source="/api/usdjpy-strategy-lab/agent-ops-health/status?scope=secondary"
          :payload="state.agentOpsHealth"
        />
        <JsonPreview
          title="Telegram Gateway"
          source="/api/usdjpy-strategy-lab/telegram-gateway/status"
          :payload="state.telegramGateway"
        />
        <JsonPreview
          title="生产证据验证"
          source="/api/production-evidence-validation/status"
          :payload="state.productionEvidenceValidation"
        />
        <JsonPreview title="MT5 快照" source="/api/mt5-readonly/snapshot" :payload="state.mt5Snapshot" />
        <JsonPreview
          title="第二 MT5 快照"
          source="/api/mt5-readonly-secondary/snapshot"
          :payload="state.secondaryMt5Snapshot"
        />
        <JsonPreview
          title="HFM Crypto CFD"
          source="/api/hfm-crypto/status?view=summary&scope=secondary"
          :payload="state.hfmCrypto"
        />
        <JsonPreview
          title="合计 50 USD 目标"
          source="/api/profit-target/status?scope=secondary&targetUsd=50"
          :payload="state.profitTarget"
        />
        <JsonPreview
          title="Sim-to-live 编排器"
          source="/api/live-automation/orchestrator?scope=secondary"
          :payload="state.liveAutomationOrchestrator"
        />
        <JsonPreview
          title="冠军长期记忆晋级闸"
          source="/api/live-automation/champion-promotion-gate?scope=secondary"
          :payload="state.championPromotionGate"
        />
        <JsonPreview
          title="执行释放包"
          source="/api/live-automation/release-readiness-refresh?scope=secondary"
          :payload="state.liveAutomationReleaseReadiness"
        />
        <JsonPreview
          title="Release Token 证据"
          source="/api/live-automation/release-token-evidence-review?scope=secondary"
          :payload="state.releaseTokenEvidenceReview"
        />
        <JsonPreview
          title="Release Token 签收草案"
          source="/api/live-automation/release-token-signoff-draft?scope=secondary"
          :payload="state.releaseTokenSignoffDraft"
        />
        <JsonPreview
          title="Release Token 签收模板"
          source="/api/live-automation/release-token-signoff-input-template?scope=secondary"
          :payload="state.releaseTokenSignoffInputTemplate"
        />
        <JsonPreview
          title="Release Token 签收输入"
          source="/api/live-automation/release-token-signoff-input-review?scope=secondary"
          :payload="state.releaseTokenSignoffInputReview"
        />
        <JsonPreview
          title="Release Token 签收交接"
          source="/api/live-automation/release-token-signoff-handoff?scope=secondary"
          :payload="state.releaseTokenSignoffHandoff"
        />
        <JsonPreview
          title="外币 Live12 实盘交接"
          source="/api/live-automation/forex-live12-runtime-handoff?scope=secondary"
          :payload="state.forexLive12RuntimeHandoff"
        />
        <JsonPreview
          title="外币 Live12 扩仓评审"
          source="/api/live-automation/forex-live12-capacity-expansion-review?scope=secondary"
          :payload="state.forexLive12CapacityExpansionReview"
        />
        <JsonPreview
          title="外币 Live12 扩仓路线"
          source="/api/live-automation/forex-live12-capacity-expansion-roadmap?scope=secondary"
          :payload="state.forexLive12CapacityExpansionRoadmap"
        />
        <JsonPreview
          title="外币 Live12 2→3 微仓评审"
          source="/api/live-automation/forex-live12-micro-expansion-review?scope=secondary"
          :payload="state.forexLive12MicroExpansionReview"
        />
        <JsonPreview
          title="外币 Live12 RSI 修复计划"
          source="/api/live-automation/forex-live12-rsi-repair-plan?scope=secondary"
          :payload="state.forexLive12RsiRepairPlan"
        />
        <JsonPreview
          title="外币 Live12 RSI 影子候选"
          source="/api/live-automation/forex-live12-rsi-shadow-candidate?scope=secondary"
          :payload="state.forexLive12RsiShadowCandidate"
        />
        <JsonPreview
          title="外币 Live12 RSI Tester 请求"
          source="/api/live-automation/forex-live12-rsi-tester-request?scope=secondary"
          :payload="state.forexLive12RsiTesterRequest"
        />
        <JsonPreview
          title="外币 Live12 RSI Tester 启动闸门"
          source="/api/live-automation/forex-live12-rsi-tester-run-gate?scope=secondary"
          :payload="state.forexLive12RsiTesterRunGate"
        />
        <JsonPreview
          title="外币 Live12 RSI 候选晋级闸门"
          source="/api/live-automation/forex-live12-rsi-candidate-promotion-gate?scope=secondary"
          :payload="state.forexLive12RsiCandidatePromotionGate"
        />
        <JsonPreview
          title="外币 Live12 RSI Tester Lock 草案"
          source="/api/live-automation/forex-live12-rsi-tester-lock-draft?scope=secondary"
          :payload="state.forexLive12RsiTesterLockDraft"
        />
        <JsonPreview
          title="模拟目标→实盘执行摘要"
          source="/api/live-automation/sim-target-execution-review-summary?scope=secondary"
          :payload="state.simTargetExecutionReviewSummary"
        />
      </div>
    </details>
  </WorkspaceFrame>
</template>

<script setup>
import { computed, defineAsyncComponent, onBeforeUnmount, onMounted, ref, shallowReactive } from 'vue';
import { loadDashboardWorkspace, loadDashboardWorkspaceCore } from '../../services/domainApi.js';
import WorkspaceFrame from '../shared/WorkspaceFrame.vue';
import MetricGrid from '../shared/MetricGrid.vue';
import JsonPreview from '../shared/JsonPreview.vue';
import StatusPill from '../shared/StatusPill.vue';
import KeyValueList from '../shared/KeyValueList.vue';
import EndpointHealthGrid from '../shared/EndpointHealthGrid.vue';
import LedgerTable from '../shared/LedgerTable.vue';
import LoadingState from '../../components/LoadingState.vue';
import DashboardUpgradePanel from './DashboardUpgradePanel.vue';
import {
  normalizeDashboardSnapshot,
  buildDashboardMetrics,
  buildEndpointHealth,
  buildRuntimeSourceDiagnosticRows,
  buildSnapshotRootCauseBanner,
  buildSnapshotRecoveryItems,
  buildSnapshotRecoveryRows,
  buildFrontendSnapshotRecoveryRows,
  buildCoreEvidenceRecoveryRows,
  buildRuntimeItems,
  buildDailyItems,
  buildAgentOpsItems,
  buildAgentOpsRows,
  buildTelegramGatewayItems,
  buildProfitTargetItems,
  buildChampionMemoryItems,
  buildActivationGateRows,
  buildReleaseGateRows,
  telegramGatewayStatus as resolveTelegramGatewayStatus,
  telegramGatewayStatusLabel as resolveTelegramGatewayStatusLabel,
  buildRouteRows,
  buildDailyTodoRows,
  buildDailyReviewRows,
} from './dashboardModel.js';

const AutomationChainPanel = defineAsyncComponent(() => import('../../components/AutomationChainPanel.vue'));

const loading = ref(false);
const error = ref('');
const technicalEvidenceVisible = ref(false);
const automationPanelVisible = ref(false);
const state = shallowReactive({
  latest: null,
  state: null,
  backtest: null,
  dailyReview: null,
  dailyAutopilot: null,
  usdJpyLiveLoop: null,
  dailyAutopilotV2: null,
  agentOpsHealth: null,
  telegramGateway: null,
  productionEvidenceValidation: null,
  mt5Snapshot: null,
  secondaryMt5Snapshot: null,
  hfmCrypto: null,
  profitTarget: null,
  liveAutomationOrchestrator: null,
  championPromotionGate: null,
  liveAutomationReleaseReadiness: null,
  releaseTokenEvidenceReview: null,
  releaseTokenSignoffDraft: null,
  releaseTokenSignoffInputTemplate: null,
  releaseTokenSignoffInputReview: null,
  releaseTokenSignoffHandoff: null,
  liveExecutionLaneSelector: null,
  forexLive12RuntimeHandoff: null,
  forexLive12CapacityExpansionReview: null,
  forexLive12CapacityExpansionRoadmap: null,
  forexLive12MicroExpansionReview: null,
  forexLive12RsiRepairPlan: null,
  forexLive12RsiShadowCandidate: null,
  forexLive12RsiTesterRequest: null,
  forexLive12RsiTesterRunGate: null,
  forexLive12RsiCandidatePromotionGate: null,
  forexLive12RsiTesterLockDraft: null,
  simTargetExecutionReviewSummary: null,
});

const snapshot = computed(() => normalizeDashboardSnapshot(state));
const metrics = computed(() => buildDashboardMetrics(snapshot.value));
const endpointHealth = computed(() => buildEndpointHealth(state));
const runtimeSourceRows = computed(() => buildRuntimeSourceDiagnosticRows(state));
const snapshotRootCause = computed(() => buildSnapshotRootCauseBanner(snapshot.value));
const snapshotRecoveryItems = computed(() => buildSnapshotRecoveryItems(snapshot.value));
const snapshotRecoveryRows = computed(() => buildSnapshotRecoveryRows(snapshot.value));
const frontendSnapshotRecoveryRows = computed(() => buildFrontendSnapshotRecoveryRows(snapshot.value));
const coreEvidenceRecoveryRows = computed(() => buildCoreEvidenceRecoveryRows(snapshot.value));
const runtimeItems = computed(() => buildRuntimeItems(snapshot.value));
const dailyItems = computed(() => buildDailyItems(snapshot.value));
const agentOpsItems = computed(() => buildAgentOpsItems(state));
const agentOpsRows = computed(() => buildAgentOpsRows(state));
const telegramGatewayItems = computed(() => buildTelegramGatewayItems(state));
const profitTargetItems = computed(() => buildProfitTargetItems(snapshot.value));
const championMemoryItems = computed(() => buildChampionMemoryItems(state));
const activationGateRows = computed(() => buildActivationGateRows(snapshot.value));
const releaseGateRows = computed(() => buildReleaseGateRows(snapshot.value));
const telegramGatewayStatus = computed(() => resolveTelegramGatewayStatus(state));
const telegramGatewayStatusLabel = computed(() => resolveTelegramGatewayStatusLabel(state));
const agentOpsOverallStatus = computed(() => {
  const status = String(
    state.agentOpsHealth?.systemStatus || state.agentOpsHealth?.overallStatus || '',
  ).toUpperCase();
  if (status === 'PASS') return 'ok';
  if (status === 'BLOCKED') return 'blocked';
  return 'warn';
});
const routeRows = computed(() => buildRouteRows(snapshot.value));
const todoRows = computed(() => buildDailyTodoRows(state));
const reviewRows = computed(() => buildDailyReviewRows(state));
let loadController = null;
let loadRunId = 0;

function abortLoad() {
  loadController?.abort();
  loadController = null;
}

async function load() {
  abortLoad();
  const runId = loadRunId + 1;
  loadRunId = runId;
  const controller = new globalThis.AbortController();
  loadController = controller;
  loading.value = true;
  error.value = '';
  let coreLoaded = false;
  try {
    const coreState = await loadDashboardWorkspaceCore({ signal: controller.signal });
    if (controller.signal.aborted || runId !== loadRunId) return;
    Object.assign(state, coreState);
    coreLoaded = true;
    loading.value = false;

    const nextState = await loadDashboardWorkspace({ signal: controller.signal });
    if (controller.signal.aborted || runId !== loadRunId) return;
    Object.assign(state, nextState);
  } catch (exc) {
    if (controller.signal.aborted || runId !== loadRunId) return;
    if (!coreLoaded) {
      error.value = exc?.message || '全局总览加载失败';
    }
  } finally {
    if (runId === loadRunId) {
      loading.value = false;
      loadController = null;
    }
  }
}

function revealTechnicalEvidence(event) {
  technicalEvidenceVisible.value = technicalEvidenceVisible.value || Boolean(event.target.open);
}

function revealAutomationPanel(event) {
  automationPanelVisible.value = automationPanelVisible.value || Boolean(event.target.open);
}

onMounted(load);
onBeforeUnmount(abortLoad);
</script>

<style scoped>
.qg-snapshot-root-cause {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 14px;
  align-items: start;
  padding: 18px;
  border: 1px solid rgb(255 184 77 / 28%);
  border-radius: 8px;
  background: linear-gradient(135deg, rgb(255 184 77 / 13%), rgb(15 23 42 / 82%));
}

.qg-snapshot-root-cause--ok {
  border-color: rgb(51 217 154 / 28%);
  background: linear-gradient(135deg, rgb(51 217 154 / 10%), rgb(15 23 42 / 82%));
}

.qg-snapshot-root-cause--blocked {
  border-color: rgb(255 107 134 / 34%);
  background: linear-gradient(135deg, rgb(255 107 134 / 12%), rgb(15 23 42 / 82%));
}

.qg-snapshot-root-cause__main {
  min-width: 0;
}

.qg-snapshot-root-cause__main h2 {
  font-size: 1.15rem;
}

.qg-snapshot-root-cause__main p:last-child {
  margin: 8px 0 0;
  color: var(--muted);
  line-height: 1.45;
}

.qg-snapshot-root-cause__grid {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.qg-snapshot-root-cause__grid span {
  min-width: 0;
  padding: 10px 12px;
  color: var(--muted);
  line-height: 1.42;
  background: rgb(255 255 255 / 3.5%);
  border: 1px solid rgb(129 151 178 / 18%);
  border-radius: 8px;
}

.qg-snapshot-root-cause__grid strong {
  display: block;
  margin-bottom: 4px;
  color: var(--text);
  font-size: 0.78rem;
}

.qg-dashboard-fast-lanes__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 14px;
}

.qg-dashboard-fast-lanes__card {
  display: grid;
  gap: 8px;
  min-width: 0;
  padding: 16px;
  border: 1px solid rgb(91 161 255 / 26%);
  border-radius: 14px;
  color: inherit;
  text-decoration: none;
  background: rgb(9 20 38 / 66%);
}

.qg-dashboard-fast-lanes__card:hover {
  border-color: rgb(86 190 255 / 58%);
  background: rgb(12 35 62 / 78%);
}

.qg-dashboard-fast-lanes__card span,
.qg-dashboard-fast-lanes__card small {
  color: var(--qg-muted);
}

.qg-dashboard-fast-lanes__card strong {
  overflow-wrap: anywhere;
  color: var(--qg-text);
}

@media (width <= 720px) {
  .qg-snapshot-root-cause,
  .qg-snapshot-root-cause__grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
