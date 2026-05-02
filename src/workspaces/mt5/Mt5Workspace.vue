<template>
  <WorkspaceFrame
    eyebrow="MT5 Read-only"
    title="MT5 Monitor"
    description="只读 MT5 监控入口：账户、持仓、订单、Symbol Registry 和 snapshot 均来自 /api/*。"
    :loading="loading"
    :error="error"
    @refresh="load"
  >
    <MetricGrid :items="metrics" />
    <div class="qg-domain-grid">
      <JsonPreview title="Status" source="/api/mt5-readonly/status" :payload="state.status" />
      <JsonPreview title="Account" source="/api/mt5-readonly/account" :payload="state.account" />
      <JsonPreview title="Positions" source="/api/mt5-readonly/positions" :payload="state.positions" />
      <JsonPreview title="Orders" source="/api/mt5-readonly/orders" :payload="state.orders" />
      <JsonPreview title="Symbol Registry" source="/api/mt5-symbol-registry/symbols" :payload="state.symbols" />
      <JsonPreview title="Snapshot" source="/api/mt5-readonly/snapshot" :payload="state.snapshot" />
    </div>
  </WorkspaceFrame>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { loadMt5Workspace } from '../../services/domainApi.js';
import WorkspaceFrame from '../shared/WorkspaceFrame.vue';
import MetricGrid from '../shared/MetricGrid.vue';
import JsonPreview from '../shared/JsonPreview.vue';

const loading = ref(false);
const error = ref('');
const state = reactive({ status: null, account: null, positions: null, orders: null, symbols: null, snapshot: null });

const metrics = computed(() => [
  { label: 'Bridge', value: state.status?.ok === false ? 'offline' : 'read-only', hint: 'no order route' },
  { label: 'Positions', value: countRows(state.positions), hint: 'read-only' },
  { label: 'Orders', value: countRows(state.orders), hint: 'read-only' },
]);

function countRows(payload) {
  if (Array.isArray(payload?.data?.rows)) return payload.data.rows.length;
  if (Array.isArray(payload?.rows)) return payload.rows.length;
  if (Array.isArray(payload)) return payload.length;
  return 0;
}

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
