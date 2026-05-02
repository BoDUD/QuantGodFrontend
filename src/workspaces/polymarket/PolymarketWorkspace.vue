<template>
  <WorkspaceFrame
    eyebrow="Polymarket Research"
    title="Polymarket Workspace"
    description="Polymarket radar、AI score、canary、cross-linkage 与市场机会研究入口。"
    :loading="loading"
    :error="error"
    @refresh="load"
  >
    <div class="qg-search-row">
      <input v-model="query" placeholder="Search market keyword" @keydown.enter="load" />
      <button type="button" class="qg-button" @click="load">Search</button>
    </div>
    <MetricGrid :items="metrics" />
    <div class="qg-domain-grid">
      <JsonPreview title="Search" source="/api/polymarket/search" :payload="state.search" />
      <JsonPreview title="Radar" source="/api/polymarket/radar" :payload="state.radar" />
      <JsonPreview title="Radar Worker" source="/api/polymarket/radar-worker" :payload="state.worker" />
      <JsonPreview title="AI Score" source="/api/polymarket/ai-score" :payload="state.aiScore" />
      <JsonPreview title="History" source="/api/polymarket/history" :payload="state.history" />
      <JsonPreview title="Auto Governance" source="/api/polymarket/auto-governance" :payload="state.autoGovernance" />
      <JsonPreview title="Canary Contract" source="/api/polymarket/canary-executor-contract" :payload="state.canary" />
      <JsonPreview title="Canary Run" source="/api/polymarket/canary-executor-run" :payload="state.canaryRun" />
      <JsonPreview title="Real Trades" source="/api/polymarket/real-trades" :payload="state.realTrades" />
      <JsonPreview title="Cross Linkage" source="/api/polymarket/cross-linkage" :payload="state.cross" />
      <JsonPreview title="Markets" source="/api/polymarket/markets" :payload="state.markets" />
      <JsonPreview title="Asset Opportunities" source="/api/polymarket/asset-opportunities" :payload="state.assets" />
      <JsonPreview title="Single Market Analysis" source="/api/polymarket/single-market-analysis" :payload="state.singleAnalysis" />
    </div>
  </WorkspaceFrame>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { loadPolymarketWorkspace } from '../../services/domainApi.js';
import WorkspaceFrame from '../shared/WorkspaceFrame.vue';
import MetricGrid from '../shared/MetricGrid.vue';
import JsonPreview from '../shared/JsonPreview.vue';

const loading = ref(false);
const error = ref('');
const query = ref('');
const state = reactive({
  search: null,
  radar: null,
  worker: null,
  aiScore: null,
  history: null,
  autoGovernance: null,
  canary: null,
  canaryRun: null,
  realTrades: null,
  cross: null,
  markets: null,
  assets: null,
  singleAnalysis: null,
});

const metrics = computed(() => [
  { label: 'Radar', value: state.radar ? 'available' : 'missing', hint: 'research-only' },
  { label: 'AI Score', value: state.aiScore ? 'available' : 'missing', hint: 'advisory' },
  { label: 'Canary', value: state.canaryRun ? 'available' : 'missing', hint: 'contract view' },
]);

async function load() {
  loading.value = true;
  error.value = '';
  try {
    Object.assign(state, await loadPolymarketWorkspace({ q: query.value }));
  } catch (exc) {
    error.value = exc?.message || 'Failed to load Polymarket workspace';
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>
