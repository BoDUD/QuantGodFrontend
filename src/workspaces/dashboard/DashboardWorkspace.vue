<template>
  <WorkspaceFrame
    title="Dashboard Overview"
    description="本页是从 legacy workbench 中拆出的独立总览入口，只通过 /api/* 读取运行状态。"
    :loading="loading"
    :error="error"
    @refresh="load"
  >
    <MetricGrid :items="metrics" />
    <div class="qg-domain-grid">
      <JsonPreview title="Latest Runtime" source="/api/latest" :payload="state.latest" />
      <JsonPreview title="Dashboard State" source="/api/dashboard/state" :payload="state.state" />
      <JsonPreview title="Backtest Summary" source="/api/dashboard/backtest-summary" :payload="state.backtest" />
      <JsonPreview title="Daily Review" source="/api/daily-review" :payload="state.dailyReview" />
      <JsonPreview title="Daily Autopilot" source="/api/daily-autopilot" :payload="state.dailyAutopilot" />
    </div>
  </WorkspaceFrame>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { loadDashboardWorkspace } from '../../services/domainApi.js';
import WorkspaceFrame from '../shared/WorkspaceFrame.vue';
import MetricGrid from '../shared/MetricGrid.vue';
import JsonPreview from '../shared/JsonPreview.vue';

const loading = ref(false);
const error = ref('');
const state = reactive({ latest: null, state: null, backtest: null, dailyReview: null, dailyAutopilot: null });

const metrics = computed(() => [
  { label: 'Runtime', value: state.latest ? 'available' : 'missing', hint: '/api/latest' },
  { label: 'Dashboard', value: state.state ? 'available' : 'missing', hint: '/api/dashboard/state' },
  { label: 'Backtest', value: state.backtest ? 'available' : 'missing', hint: 'summary' },
]);

async function load() {
  loading.value = true;
  error.value = '';
  try {
    Object.assign(state, await loadDashboardWorkspace());
  } catch (exc) {
    error.value = exc?.message || 'Failed to load dashboard workspace';
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>
