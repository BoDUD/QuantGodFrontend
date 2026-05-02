<template>
  <WorkspaceFrame
    eyebrow="Polymarket Research"
    title="Polymarket Workspace"
    description="Polymarket radar、AI score、canary、cross-linkage 与市场机会研究入口。全部为 research/advisory evidence，不提供任何交易执行入口。"
    :loading="loading"
    :error="error"
    @refresh="load"
  >
    <div class="qg-readonly-banner">
      <StatusPill status="locked" label="research-only" />
      <span>Polymarket 数据仅用于研究与治理证据。前端不允许下单、资金划转、提现、自动执行或绕过授权链路。</span>
    </div>

    <div class="qg-search-row">
      <input v-model="query" placeholder="Search market keyword" @keydown.enter="load" />
      <button type="button" class="qg-button" @click="load">Search</button>
    </div>

    <MetricGrid :items="model.metrics" />
    <EndpointHealthGrid :items="model.endpoints" />

    <div class="qg-domain-grid">
      <section class="qg-panel">
        <h3>Safety Envelope</h3>
        <KeyValueList :items="model.safetyItems" />
      </section>

      <section class="qg-panel">
        <h3>Radar Summary</h3>
        <KeyValueList :items="model.radarItems" />
      </section>

      <section class="qg-panel">
        <h3>AI Score / Auto Governance</h3>
        <KeyValueList :items="model.aiScoreItems" />
      </section>

      <section class="qg-panel">
        <h3>Canary Contract / Run</h3>
        <KeyValueList :items="model.canaryItems" />
      </section>

      <section class="qg-panel qg-panel--wide">
        <h3>Cross Linkage / Single Market Analysis</h3>
        <KeyValueList :items="model.crossLinkageItems" />
      </section>
    </div>

    <div class="qg-domain-grid">
      <LedgerTable title="Search Results" :rows="model.tables.search" :limit="12" />
      <LedgerTable title="Radar Opportunities" :rows="model.tables.radar" :limit="12" />
      <LedgerTable title="Markets" :rows="model.tables.markets" :limit="12" />
      <LedgerTable title="Asset Opportunities" :rows="model.tables.assets" :limit="12" />
      <LedgerTable title="History" :rows="model.tables.history" :limit="12" />
      <LedgerTable title="Real Trade Evidence" :rows="model.tables.realTrades" :limit="12" />
      <LedgerTable title="Cross Linkage" :rows="model.tables.cross" :limit="12" />
    </div>

    <details class="qg-details">
      <summary>Raw Polymarket evidence</summary>
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
    </details>
  </WorkspaceFrame>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';

import { loadPolymarketWorkspace } from '../../services/domainApi.js';
import WorkspaceFrame from '../shared/WorkspaceFrame.vue';
import MetricGrid from '../shared/MetricGrid.vue';
import EndpointHealthGrid from '../shared/EndpointHealthGrid.vue';
import KeyValueList from '../shared/KeyValueList.vue';
import LedgerTable from '../shared/LedgerTable.vue';
import JsonPreview from '../shared/JsonPreview.vue';
import StatusPill from '../shared/StatusPill.vue';
import { buildPolymarketModel } from './polymarketModel.js';

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

const model = computed(() => buildPolymarketModel(state));

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
