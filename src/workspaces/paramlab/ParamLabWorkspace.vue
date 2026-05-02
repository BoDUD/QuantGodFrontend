<template>
  <WorkspaceFrame
    eyebrow="ParamLab"
    title="ParamLab Operations"
    description="批处理、结果、调度、恢复与 Tester Window 的独立入口。"
    :loading="loading"
    :error="error"
    @refresh="load"
  >
    <MetricGrid :items="metrics" />
    <div class="qg-domain-grid">
      <JsonPreview title="Status" source="/api/paramlab/status" :payload="state.status" />
      <JsonPreview title="Results" source="/api/paramlab/results" :payload="state.results" />
      <JsonPreview title="Scheduler" source="/api/paramlab/scheduler" :payload="state.scheduler" />
      <JsonPreview title="Recovery" source="/api/paramlab/recovery" :payload="state.recovery" />
      <JsonPreview title="Report Watcher" source="/api/paramlab/report-watcher" :payload="state.reportWatcher" />
      <JsonPreview title="Tester Window" source="/api/paramlab/tester-window" :payload="state.testerWindow" />
    </div>
    <LedgerTable title="Result Ledger" :rows="state.resultRows" />
    <LedgerTable title="Scheduler Ledger" :rows="state.schedulerRows" />
  </WorkspaceFrame>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { loadParamLabWorkspace } from '../../services/domainApi.js';
import WorkspaceFrame from '../shared/WorkspaceFrame.vue';
import MetricGrid from '../shared/MetricGrid.vue';
import JsonPreview from '../shared/JsonPreview.vue';
import LedgerTable from '../shared/LedgerTable.vue';

const loading = ref(false);
const error = ref('');
const state = reactive({
  status: null,
  results: null,
  scheduler: null,
  recovery: null,
  reportWatcher: null,
  testerWindow: null,
  resultRows: [],
  schedulerRows: [],
});

const metrics = computed(() => [
  { label: 'Results', value: state.resultRows.length, hint: 'ledger rows' },
  { label: 'Scheduler', value: state.schedulerRows.length, hint: 'ledger rows' },
  { label: 'Safety', value: 'tester-only', hint: 'no live preset write' },
]);

async function load() {
  loading.value = true;
  error.value = '';
  try {
    Object.assign(state, await loadParamLabWorkspace());
  } catch (exc) {
    error.value = exc?.message || 'Failed to load ParamLab workspace';
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>
