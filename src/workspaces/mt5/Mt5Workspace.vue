<template>
  <WorkspaceFrame
    eyebrow="MT5 Read-only"
    title="MT5 Monitor"
    description="只读 MT5 监控入口：账户、持仓、订单、Symbol Registry 和 snapshot 均来自 /api/*，不提供任何交易执行能力。"
    :loading="loading"
    :error="error"
    @refresh="load"
  >
    <div class="qg-readonly-banner">
      <StatusPill status="ok" label="read-only" />
      <span>此工作区只展示 MT5 evidence。OrderSend / close / cancel / credential storage / live preset mutation 必须保持禁用。</span>
    </div>

    <MetricGrid :items="metrics" />
    <EndpointHealthGrid :items="endpointHealth" />

    <div class="qg-domain-grid qg-domain-grid--two">
      <section class="qg-section-card">
        <header>
          <p class="qg-eyebrow">Safety Envelope</p>
          <h2>交易边界</h2>
        </header>
        <KeyValueList :items="safetyItems" />
      </section>

      <section class="qg-section-card">
        <header>
          <p class="qg-eyebrow">Account Evidence</p>
          <h2>账户快照</h2>
        </header>
        <KeyValueList :items="accountItems" />
      </section>
    </div>

    <div class="qg-domain-grid">
      <LedgerTable title="Open Positions" :rows="positionRows" :limit="30" />
      <LedgerTable title="Pending Orders" :rows="orderRows" :limit="30" />
      <LedgerTable title="Symbol Registry" :rows="symbolRows" :limit="40" />
    </div>

    <details class="qg-raw-evidence">
      <summary>Raw MT5 evidence</summary>
      <div class="qg-domain-grid">
        <JsonPreview title="Status" source="/api/mt5-readonly/status" :payload="state.status" />
        <JsonPreview title="Account" source="/api/mt5-readonly/account" :payload="state.account" />
        <JsonPreview title="Positions" source="/api/mt5-readonly/positions" :payload="state.positions" />
        <JsonPreview title="Orders" source="/api/mt5-readonly/orders" :payload="state.orders" />
        <JsonPreview title="Symbol Registry" source="/api/mt5-symbol-registry/symbols" :payload="state.symbols" />
        <JsonPreview title="Snapshot" source="/api/mt5-readonly/snapshot" :payload="state.snapshot" />
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
});

const snapshot = computed(() => normalizeMt5Snapshot(state));
const metrics = computed(() => buildMt5Metrics(snapshot.value));
const endpointHealth = computed(() => buildEndpointHealth(state));
const safetyItems = computed(() => buildSafetyItems(snapshot.value));
const accountItems = computed(() => buildAccountItems(snapshot.value));
const positionRows = computed(() => buildPositionRows(snapshot.value));
const orderRows = computed(() => buildOrderRows(snapshot.value));
const symbolRows = computed(() => buildSymbolRows(snapshot.value));

async function load() {
  loading.value = true;
  error.value = '';
  try {
    Object.assign(state, await loadMt5Workspace());
  } catch (exc) {
    error.value = exc?.message || 'Failed to load MT5 workspace';
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>
