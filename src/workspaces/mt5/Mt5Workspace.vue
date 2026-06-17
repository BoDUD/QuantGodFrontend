<template>
  <WorkspaceFrame
    eyebrow="MT5 实盘监控"
    title="MT5 实时交易面板"
    description="查看 HFM 账户净值、当前持仓、历史交易、策略状态、今日待办和每日复盘；前端只观察证据，EA 是否可入场以 MT5 守门状态为准。"
    :loading="loading"
    :error="error"
    @refresh="load"
  >
    <div class="qg-readonly-banner">
      <StatusPill
        :status="snapshot.dualAccountAutoEnabled ? 'ok' : 'warn'"
        :label="snapshot.dualAccountAutoEnabled ? '双账号EA已开启' : '仍有账号等待EA权限'"
      />
      <span
        >前端数据桥保持只读，不会发单；两个 MT5 终端是否真正入场仍以各自 EA 的
        session、新闻、点差、熔断、启动保护和单仓风控为准。</span
      >
    </div>

    <section class="qg-snapshot-root-cause" :class="`qg-snapshot-root-cause--${snapshotRootCause.status}`">
      <div class="qg-snapshot-root-cause__main">
        <p class="qg-eyebrow">全局快照恢复</p>
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
          <strong>下一步</strong>
          {{ snapshotRootCause.nextAction }}
        </span>
      </div>
    </section>

    <section class="qg-section-card qg-section-card--operator">
      <header>
        <p class="qg-eyebrow">整体前端诊断</p>
        <h2>MT5 快照恢复矩阵</h2>
      </header>
      <LedgerTable
        title="Live12 / Live16 只读桥"
        :rows="snapshotRecoveryRows"
        :limit="4"
        class="qg-ledger-table--important qg-ledger-table--mt5-full"
      />
    </section>

    <section class="qg-mt5-dual-accounts" aria-label="MT5 双账号 EA 状态">
      <header class="qg-mt5-dual-accounts__header">
        <div>
          <p class="qg-eyebrow">Dual MT5 Runtime</p>
          <h2>双账号 EA 运行概览</h2>
        </div>
        <StatusPill
          :status="snapshot.dualAccountEntryReady ? 'ok' : snapshot.dualAccountAutoEnabled ? 'warn' : 'error'"
          :label="
            snapshot.dualAccountEntryReady
              ? '双账号可入场'
              : snapshot.dualAccountAutoEnabled
                ? '双账号EA已开，等待守门'
                : '双账号EA未完全开启'
          "
        />
      </header>
      <div class="qg-mt5-account-cards">
        <article v-for="account in mt5AccountCards" :key="account.role" class="qg-mt5-account-card">
          <div class="qg-mt5-account-card__header">
            <div>
              <p class="qg-eyebrow">{{ account.eyebrow }}</p>
              <h3>{{ account.title }}</h3>
              <p>{{ account.subtitle }}</p>
            </div>
            <StatusPill :status="account.status" :label="account.statusLabel" />
          </div>
          <KeyValueList :items="account.items" />
          <p class="qg-section-note">{{ account.note }}</p>
        </article>
      </div>
    </section>

    <div class="qg-domain-grid qg-domain-grid--two">
      <section class="qg-section-card qg-section-card--operator">
        <header>
          <p class="qg-eyebrow">账号连接矩阵</p>
          <h2>当前连接与双账号登记</h2>
        </header>
        <KeyValueList :items="connectionItems" />
        <p class="qg-section-note">这里显示的是只读证据；EA 自动交易是否可入场仍以各终端守门状态为准。</p>
      </section>

      <LedgerTable
        title="MT5 账号 Profiles"
        :rows="accountProfileRows"
        :limit="8"
        class="qg-ledger-table--important qg-ledger-table--mt5-fit"
      />
    </div>

    <MetricGrid :items="metrics" />

    <section class="qg-section-card qg-section-card--operator">
      <header>
        <p class="qg-eyebrow">USDJPY Live Loop</p>
        <h2>USDJPY 实盘 EA 恢复状态</h2>
      </header>
      <KeyValueList :items="usdJpyLiveLoopItems" />
    </section>

    <section class="qg-section-card qg-section-card--operator">
      <header>
        <p class="qg-eyebrow">Evidence OS</p>
        <h2>执行反馈与下一代修复</h2>
      </header>
      <KeyValueList :items="evidenceOsLiteItems" />
    </section>

    <LedgerTable
      title="Live Execution Feedback"
      :rows="executionFeedbackRows"
      :limit="20"
      class="qg-ledger-table--important qg-ledger-table--mt5-full"
    />

    <LedgerTable
      title="RSI 入场诊断"
      :rows="rsiEntryDiagnosticRows"
      :limit="14"
      class="qg-ledger-table--important qg-ledger-table--mt5-full"
    />

    <section class="qg-section-card qg-section-card--operator qg-mt5-kline-panel">
      <header class="qg-mt5-kline-panel__header">
        <div>
          <p class="qg-eyebrow">USDJPY 专业图表</p>
          <h2>USDJPY K线与只读交易证据</h2>
        </div>
        <button v-if="!klineLoaded" type="button" class="qg-button" @click="enableKline">加载图表</button>
      </header>
      <Suspense v-if="klineLoaded">
        <KlineWorkspace />
        <template #fallback>
          <LoadingState title="正在加载 K 线图" description="图表引擎和实时轮询正在按需启动。" />
        </template>
      </Suspense>
      <p v-else class="qg-section-note">K 线图按需加载，避免首屏占用图表引擎内存。</p>
    </section>

    <EndpointHealthGrid :items="endpointHealth" />

    <section class="qg-section-card qg-section-card--operator">
      <header>
        <p class="qg-eyebrow">实盘 / 模拟一眼看懂</p>
        <h2>现在系统在做什么</h2>
      </header>
      <KeyValueList :items="simulationItems" />
    </section>

    <section class="qg-section-card qg-section-card--operator">
      <header>
        <p class="qg-eyebrow">MT5 Shadow 账本</p>
        <h2>模拟盘资金与交易效果</h2>
      </header>
      <MetricGrid :items="shadowMetrics" />
      <p class="qg-section-note">
        这里是模拟候选的后验账本：按信号后 60 分钟点数表现去重统计，给 0.01
        手粗略等价估算；它不是实盘成交，也不会改 EA 配置。
      </p>
    </section>

    <div class="qg-domain-grid qg-domain-grid--account-snapshots">
      <section class="qg-section-card">
        <header>
          <p class="qg-eyebrow">交易边界</p>
          <h2>交易边界</h2>
        </header>
        <KeyValueList :items="safetyItems" />
      </section>

      <section class="qg-section-card">
        <header>
          <p class="qg-eyebrow">主账号快照</p>
          <h2>主账号账户快照</h2>
        </header>
        <KeyValueList :items="accountItems" />
      </section>

      <section class="qg-section-card">
        <header>
          <p class="qg-eyebrow">第二账号快照</p>
          <h2>第二账号账户快照</h2>
        </header>
        <KeyValueList :items="secondaryAccountItems" />
      </section>
    </div>

    <div class="qg-domain-grid qg-domain-grid--wide-tables">
      <LedgerTable
        title="模拟资金曲线"
        :rows="shadowEquityRows"
        :limit="40"
        class="qg-ledger-table--important"
      />
      <LedgerTable
        title="模拟交易记录"
        :rows="shadowTradeRows"
        :limit="40"
        class="qg-ledger-table--important"
      />
    </div>

    <div class="qg-domain-grid qg-domain-grid--wide-tables">
      <LedgerTable
        title="未闭合入场线索"
        :rows="unclosedEntryRows"
        :limit="80"
        class="qg-ledger-table--important"
      />
      <LedgerTable
        title="双账号历史交易记录（最近）"
        :rows="closeHistoryRows"
        :limit="80"
        class="qg-ledger-table--important"
      />
      <LedgerTable
        title="双账号交易流水（最近）"
        :rows="tradeJournalRows"
        :limit="80"
        class="qg-ledger-table--important"
      />
    </div>

    <div class="qg-mt5-operations-grid">
      <LedgerTable
        title="实时持仓"
        :rows="positionRows"
        :limit="30"
        class="qg-ledger-table--mt5-focus qg-ledger-table--mt5-fit"
      />
      <LedgerTable
        title="挂单状态"
        :rows="orderRows"
        :limit="30"
        class="qg-ledger-table--mt5-focus qg-ledger-table--mt5-fit"
      />
      <LedgerTable
        title="策略运行位置"
        :rows="routeModeRows"
        :limit="10"
        class="qg-ledger-table--mt5-focus"
      />
      <LedgerTable
        title="近期模拟阻断原因"
        :rows="shadowBlockerRows"
        :limit="20"
        class="qg-ledger-table--mt5-focus"
      />
      <LedgerTable
        title="今日待办"
        :rows="todoRows"
        :limit="10"
        class="qg-ledger-table--mt5-focus qg-ledger-table--mt5-full"
      />
      <LedgerTable
        title="每日复盘"
        :rows="reviewRows"
        :limit="10"
        class="qg-ledger-table--mt5-focus qg-ledger-table--mt5-full"
      />
      <LedgerTable
        title="品种状态"
        :rows="symbolRows"
        :limit="40"
        class="qg-ledger-table--mt5-focus qg-ledger-table--mt5-full"
      />
    </div>

    <details class="qg-raw-evidence" @toggle="revealTechnicalEvidence">
      <summary>技术证据</summary>
      <!-- Guard markers: Safety Envelope / Raw MT5 evidence. Visible copy stays Chinese and operator-facing. -->
      <div v-if="technicalEvidenceVisible" class="qg-domain-grid">
        <JsonPreview title="连接状态" source="/api/mt5-readonly/status" :payload="state.status" />
        <JsonPreview
          title="账号 Profiles"
          source="/api/mt5/account-profiles"
          :payload="state.accountProfiles"
        />
        <JsonPreview title="账户信息" source="/api/mt5-readonly/account" :payload="state.account" />
        <JsonPreview
          title="第二账号信息"
          source="/api/mt5-readonly-secondary/account"
          :payload="state.secondaryAccount"
        />
        <JsonPreview title="实时持仓" source="/api/mt5-readonly/positions" :payload="state.positions" />
        <JsonPreview title="挂单状态" source="/api/mt5-readonly/orders" :payload="state.orders" />
        <JsonPreview title="品种登记" source="/api/mt5-symbol-registry/symbols" :payload="state.symbols" />
        <JsonPreview title="MT5 快照" source="/api/mt5-readonly/snapshot" :payload="state.snapshot" />
        <JsonPreview
          title="第二 MT5 快照"
          source="/api/mt5-readonly-secondary/snapshot"
          :payload="state.secondarySnapshot"
        />
        <JsonPreview title="每日复盘" source="/api/daily-review" :payload="state.dailyReview" />
      </div>
    </details>
  </WorkspaceFrame>
</template>

<script setup>
import { computed, defineAsyncComponent, onMounted, onUnmounted, ref, shallowReactive } from 'vue';
import { loadMt5Workspace, loadMt5WorkspaceCore } from '../../services/domainApi.js';
import LoadingState from '../../components/LoadingState.vue';
import WorkspaceFrame from '../shared/WorkspaceFrame.vue';
import MetricGrid from '../shared/MetricGrid.vue';
import JsonPreview from '../shared/JsonPreview.vue';
import KeyValueList from '../shared/KeyValueList.vue';
import LedgerTable from '../shared/LedgerTable.vue';
import EndpointHealthGrid from '../shared/EndpointHealthGrid.vue';
import StatusPill from '../shared/StatusPill.vue';
import {
  buildAccountItems,
  buildMt5AccountCards,
  buildMt5AccountProfileRows,
  buildMt5ConnectionItems,
  buildMt5SnapshotRecoveryRows,
  buildMt5SnapshotRootCauseBanner,
  buildEndpointHealth,
  buildMt5Metrics,
  buildMt5ShadowBlockerRows,
  buildMt5ShadowEquityRows,
  buildMt5ShadowSummary,
  buildMt5ShadowTradeRows,
  buildOrderRows,
  buildPositionRows,
  buildCloseHistoryRows,
  buildUnclosedEntryRows,
  buildTradeJournalRows,
  buildMt5TodoRows,
  buildMt5ReviewRows,
  buildMt5RouteModeRows,
  buildMt5SimulationItems,
  buildMt5EvidenceOsLiteItems,
  buildMt5ExecutionFeedbackRows,
  buildRsiEntryDiagnosticRows,
  buildSafetyItems,
  buildSecondaryAccountItems,
  buildSymbolRows,
  buildUsdJpyLiveLoopItems,
  normalizeMt5Snapshot,
} from './mt5Model.js';

const KlineWorkspace = defineAsyncComponent({
  loader: () => import('../phase1/kline/KlineWorkspace.vue'),
  delay: 80,
  timeout: 30000,
});

const loading = ref(false);
const error = ref('');
const klineLoaded = ref(false);
const technicalEvidenceVisible = ref(false);
const state = shallowReactive({
  status: null,
  accountProfiles: null,
  account: null,
  secondaryAccount: null,
  positions: null,
  orders: null,
  symbols: null,
  snapshot: null,
  secondarySnapshot: null,
  latest: null,
  closeHistory: [],
  secondaryCloseHistory: [],
  tradeJournal: [],
  secondaryTradeJournal: [],
  dailyReview: null,
  dailyAutopilot: null,
  researchStats: null,
  governanceAdvisor: null,
  shadowSignals: null,
  shadowOutcomes: null,
  shadowCandidates: null,
  shadowCandidateOutcomes: null,
  usdJpyLiveLoop: null,
  evidenceOS: null,
});

const snapshot = computed(() => normalizeMt5Snapshot(state));
const shadowSummary = computed(() => buildMt5ShadowSummary(snapshot.value));
const snapshotRootCause = computed(() => buildMt5SnapshotRootCauseBanner(snapshot.value));
const snapshotRecoveryRows = computed(() => buildMt5SnapshotRecoveryRows(snapshot.value));
const metrics = computed(() => buildMt5Metrics(snapshot.value));
const endpointHealth = computed(() => buildEndpointHealth(state));
const safetyItems = computed(() => buildSafetyItems(snapshot.value));
const simulationItems = computed(() => buildMt5SimulationItems(snapshot.value));
const shadowMetrics = computed(() => shadowSummary.value.metrics);
const connectionItems = computed(() => buildMt5ConnectionItems(snapshot.value));
const accountProfileRows = computed(() => buildMt5AccountProfileRows(snapshot.value));
const mt5AccountCards = computed(() => buildMt5AccountCards(snapshot.value));
const accountItems = computed(() => buildAccountItems(snapshot.value));
const secondaryAccountItems = computed(() => buildSecondaryAccountItems(snapshot.value));
const positionRows = computed(() => buildPositionRows(snapshot.value));
const orderRows = computed(() => buildOrderRows(snapshot.value));
const symbolRows = computed(() => buildSymbolRows(snapshot.value));
const closeHistoryRows = computed(() => buildCloseHistoryRows(snapshot.value));
const unclosedEntryRows = computed(() => buildUnclosedEntryRows(snapshot.value));
const tradeJournalRows = computed(() => buildTradeJournalRows(snapshot.value));
const shadowEquityRows = computed(() => buildMt5ShadowEquityRows(snapshot.value));
const shadowTradeRows = computed(() => buildMt5ShadowTradeRows(snapshot.value));
const shadowBlockerRows = computed(() => buildMt5ShadowBlockerRows(snapshot.value));
const todoRows = computed(() => buildMt5TodoRows(snapshot.value));
const reviewRows = computed(() => buildMt5ReviewRows(snapshot.value));
const routeModeRows = computed(() => buildMt5RouteModeRows(snapshot.value));
const rsiEntryDiagnosticRows = computed(() => buildRsiEntryDiagnosticRows(snapshot.value));
const usdJpyLiveLoopItems = computed(() => buildUsdJpyLiveLoopItems(snapshot.value));
const evidenceOsLiteItems = computed(() => buildMt5EvidenceOsLiteItems(snapshot.value));
const executionFeedbackRows = computed(() => buildMt5ExecutionFeedbackRows(snapshot.value));
let refreshTimer = null;
let loadInFlight = false;
let loadController = null;
let loadRunId = 0;
const MT5_REFRESH_MS = 60000;

function abortLoad() {
  loadController?.abort();
  loadController = null;
}

async function load(options = {}) {
  if (loadInFlight) return;
  const runId = loadRunId + 1;
  loadRunId = runId;
  const controller = new globalThis.AbortController();
  loadController = controller;
  loadInFlight = true;
  if (!options.silent) loading.value = true;
  error.value = '';
  let coreLoaded = false;
  try {
    const coreState = await loadMt5WorkspaceCore({ signal: controller.signal });
    if (controller.signal.aborted || runId !== loadRunId) return;
    Object.assign(state, coreState);
    coreLoaded = true;
    if (!options.silent) loading.value = false;

    const nextState = await loadMt5Workspace({ signal: controller.signal });
    if (controller.signal.aborted || runId !== loadRunId) return;
    Object.assign(state, nextState);
  } catch (exc) {
    if (controller.signal.aborted || runId !== loadRunId) return;
    if (!coreLoaded) {
      error.value = exc?.message || 'MT5 实盘监控加载失败';
    }
  } finally {
    if (runId === loadRunId) {
      loadInFlight = false;
      loadController = null;
      if (!options.silent) loading.value = false;
    }
  }
}

function enableKline() {
  klineLoaded.value = true;
}

function revealTechnicalEvidence(event) {
  technicalEvidenceVisible.value = technicalEvidenceVisible.value || Boolean(event.target.open);
}

onMounted(() => {
  load();
  refreshTimer = window.setInterval(() => {
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
    load({ silent: true });
  }, MT5_REFRESH_MS);
});

onUnmounted(() => {
  if (refreshTimer) window.clearInterval(refreshTimer);
  refreshTimer = null;
  abortLoad();
});
</script>
