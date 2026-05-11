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
        :status="snapshot.eaTradeReady ? 'ok' : 'warn'"
        :label="snapshot.eaTradeReady ? 'EA交易权限已打开' : 'EA守门仍在等待'"
      />
      <span
        >前端数据桥保持只读，不会发单；当前 RSI 实盘路线会在 MT5 EA 的
        session、新闻、点差、熔断和单仓风控全部通过时自行评估。</span
      >
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
      title="RSI 入场诊断"
      :rows="rsiEntryDiagnosticRows"
      :limit="14"
      class="qg-ledger-table--important qg-ledger-table--mt5-full"
    />

    <section class="qg-section-card qg-section-card--operator qg-mt5-kline-panel">
      <header>
        <p class="qg-eyebrow">USDJPY 专业图表</p>
        <h2>USDJPY K线与只读交易证据</h2>
      </header>
      <KlineWorkspace />
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

    <div class="qg-domain-grid qg-domain-grid--two">
      <section class="qg-section-card">
        <header>
          <p class="qg-eyebrow">交易边界</p>
          <h2>交易边界</h2>
        </header>
        <KeyValueList :items="safetyItems" />
      </section>

      <section class="qg-section-card">
        <header>
          <p class="qg-eyebrow">账户快照</p>
          <h2>账户快照</h2>
        </header>
        <KeyValueList :items="accountItems" />
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
        title="历史交易记录"
        :rows="closeHistoryRows"
        :limit="40"
        class="qg-ledger-table--important"
      />
      <LedgerTable title="交易流水" :rows="tradeJournalRows" :limit="40" class="qg-ledger-table--important" />
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
        title="模拟阻断原因"
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

    <details class="qg-raw-evidence">
      <summary>技术证据</summary>
      <!-- Guard markers: Safety Envelope / Raw MT5 evidence. Visible copy stays Chinese and operator-facing. -->
      <div class="qg-domain-grid">
        <JsonPreview title="连接状态" source="/api/mt5-readonly/status" :payload="state.status" />
        <JsonPreview title="账户信息" source="/api/mt5-readonly/account" :payload="state.account" />
        <JsonPreview title="实时持仓" source="/api/mt5-readonly/positions" :payload="state.positions" />
        <JsonPreview title="挂单状态" source="/api/mt5-readonly/orders" :payload="state.orders" />
        <JsonPreview title="品种登记" source="/api/mt5-symbol-registry/symbols" :payload="state.symbols" />
        <JsonPreview title="MT5 快照" source="/api/mt5-readonly/snapshot" :payload="state.snapshot" />
        <JsonPreview title="每日复盘" source="/api/daily-review" :payload="state.dailyReview" />
      </div>
    </details>
  </WorkspaceFrame>
</template>

<script setup>
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue';
import { loadMt5Workspace } from '../../services/domainApi.js';
import WorkspaceFrame from '../shared/WorkspaceFrame.vue';
import MetricGrid from '../shared/MetricGrid.vue';
import JsonPreview from '../shared/JsonPreview.vue';
import KeyValueList from '../shared/KeyValueList.vue';
import LedgerTable from '../shared/LedgerTable.vue';
import EndpointHealthGrid from '../shared/EndpointHealthGrid.vue';
import StatusPill from '../shared/StatusPill.vue';
import KlineWorkspace from '../phase1/kline/KlineWorkspace.vue';
import {
  buildAccountItems,
  buildEndpointHealth,
  buildMt5Metrics,
  buildMt5ShadowBlockerRows,
  buildMt5ShadowEquityRows,
  buildMt5ShadowSummary,
  buildMt5ShadowTradeRows,
  buildOrderRows,
  buildPositionRows,
  buildCloseHistoryRows,
  buildTradeJournalRows,
  buildMt5TodoRows,
  buildMt5ReviewRows,
  buildMt5RouteModeRows,
  buildMt5SimulationItems,
  buildMt5EvidenceOsLiteItems,
  buildRsiEntryDiagnosticRows,
  buildSafetyItems,
  buildSymbolRows,
  buildUsdJpyLiveLoopItems,
  normalizeMt5Snapshot,
} from './mt5Model.js';

const loading = ref(false);
const error = ref('');
const state = reactive({
  status: null,
  account: null,
  positions: null,
  orders: null,
  symbols: null,
  snapshot: null,
  latest: null,
  closeHistory: [],
  tradeJournal: [],
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
const metrics = computed(() => buildMt5Metrics(snapshot.value));
const endpointHealth = computed(() => buildEndpointHealth(state));
const safetyItems = computed(() => buildSafetyItems(snapshot.value));
const simulationItems = computed(() => buildMt5SimulationItems(snapshot.value));
const shadowMetrics = computed(() => shadowSummary.value.metrics);
const accountItems = computed(() => buildAccountItems(snapshot.value));
const positionRows = computed(() => buildPositionRows(snapshot.value));
const orderRows = computed(() => buildOrderRows(snapshot.value));
const symbolRows = computed(() => buildSymbolRows(snapshot.value));
const closeHistoryRows = computed(() => buildCloseHistoryRows(snapshot.value));
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
let refreshTimer = null;
let loadInFlight = false;

async function load(options = {}) {
  if (loadInFlight) return;
  loadInFlight = true;
  if (!options.silent) loading.value = true;
  error.value = '';
  try {
    Object.assign(state, await loadMt5Workspace());
  } catch (exc) {
    error.value = exc?.message || 'MT5 实盘监控加载失败';
  } finally {
    loadInFlight = false;
    if (!options.silent) loading.value = false;
  }
}

onMounted(() => {
  load();
  refreshTimer = window.setInterval(() => {
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
    load({ silent: true });
  }, 30000);
});

onUnmounted(() => {
  if (refreshTimer) window.clearInterval(refreshTimer);
  refreshTimer = null;
});
</script>
