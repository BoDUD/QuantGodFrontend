<template>
  <WorkspaceFrame
    eyebrow="MT5 实盘监控"
    title="MT5 实时交易面板"
    description="查看 HFM 账户净值、当前持仓、历史交易、策略状态、今日待办和每日复盘；页面只读，不发出交易指令。"
    :loading="loading"
    :error="error"
    @refresh="load"
  >
    <div class="qg-readonly-banner">
      <StatusPill status="ok" label="只读监控" />
      <span>这里用于观察真实账户和策略证据；下单、平仓、撤单和实盘配置修改仍由 MT5 EA 的安全链路控制。</span>
    </div>

    <MetricGrid :items="metrics" />
    <EndpointHealthGrid :items="endpointHealth" />

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

    <div class="qg-domain-grid">
      <LedgerTable title="实时持仓" :rows="positionRows" :limit="30" />
      <LedgerTable title="挂单状态" :rows="orderRows" :limit="30" />
      <LedgerTable title="历史交易记录" :rows="closeHistoryRows" :limit="40" />
      <LedgerTable title="交易流水" :rows="tradeJournalRows" :limit="40" />
      <LedgerTable title="今日待办" :rows="todoRows" :limit="10" />
      <LedgerTable title="每日复盘" :rows="reviewRows" :limit="10" />
      <LedgerTable title="品种状态" :rows="symbolRows" :limit="40" />
    </div>

    <details class="qg-raw-evidence">
      <summary>技术证据</summary>
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
import { computed, onMounted, reactive, ref } from 'vue';
import { loadMt5Workspace } from '../../services/domainApi.js';
import WorkspaceFrame from '../shared/WorkspaceFrame.vue';
import MetricGrid from '../shared/MetricGrid.vue';
import JsonPreview from '../shared/JsonPreview.vue';
import KeyValueList from '../shared/KeyValueList.vue';
import LedgerTable from '../shared/LedgerTable.vue';
import EndpointHealthGrid from '../shared/EndpointHealthGrid.vue';
import StatusPill from '../shared/StatusPill.vue';
import {
  buildAccountItems,
  buildEndpointHealth,
  buildMt5Metrics,
  buildOrderRows,
  buildPositionRows,
  buildCloseHistoryRows,
  buildTradeJournalRows,
  buildMt5TodoRows,
  buildMt5ReviewRows,
  buildSafetyItems,
  buildSymbolRows,
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
  closeHistory: [],
  tradeJournal: [],
  dailyReview: null,
  dailyAutopilot: null,
});

const snapshot = computed(() => normalizeMt5Snapshot(state));
const metrics = computed(() => buildMt5Metrics(snapshot.value));
const endpointHealth = computed(() => buildEndpointHealth(state));
const safetyItems = computed(() => buildSafetyItems(snapshot.value));
const accountItems = computed(() => buildAccountItems(snapshot.value));
const positionRows = computed(() => buildPositionRows(snapshot.value));
const orderRows = computed(() => buildOrderRows(snapshot.value));
const symbolRows = computed(() => buildSymbolRows(snapshot.value));
const closeHistoryRows = computed(() => buildCloseHistoryRows(snapshot.value));
const tradeJournalRows = computed(() => buildTradeJournalRows(snapshot.value));
const todoRows = computed(() => buildMt5TodoRows(snapshot.value));
const reviewRows = computed(() => buildMt5ReviewRows(snapshot.value));

async function load() {
  loading.value = true;
  error.value = '';
  try {
    Object.assign(state, await loadMt5Workspace());
  } catch (exc) {
    error.value = exc?.message || 'MT5 实盘监控加载失败';
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>
