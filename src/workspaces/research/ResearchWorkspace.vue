<template>
  <WorkspaceFrame
    eyebrow="Research"
    title="Research & Trade Ledgers"
    description="Shadow、交易历史、策略评估、Regime 与手动 Alpha 的独立研究入口。"
    :loading="loading"
    :error="error"
    @refresh="load"
  >
    <MetricGrid :items="metrics" />
    <div class="qg-domain-grid">
      <JsonPreview title="Research Stats" source="/api/research/stats" :payload="state.stats" />
    </div>
    <LedgerTable title="Shadow Signals" :rows="state.shadowSignals" />
    <LedgerTable title="Shadow Outcomes" :rows="state.shadowOutcomes" />
    <LedgerTable title="Shadow Candidates" :rows="state.shadowCandidates" />
    <LedgerTable title="Close History" :rows="state.closeHistory" />
    <LedgerTable title="Trade Journal" :rows="state.tradeJournal" />
    <LedgerTable title="Strategy Evaluation" :rows="state.strategyEvaluation" />
    <LedgerTable title="Regime Evaluation" :rows="state.regimeEvaluation" />
    <LedgerTable title="Manual Alpha" :rows="state.manualAlpha" />
  </WorkspaceFrame>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { loadResearchWorkspace } from '../../services/domainApi.js';
import WorkspaceFrame from '../shared/WorkspaceFrame.vue';
import MetricGrid from '../shared/MetricGrid.vue';
import JsonPreview from '../shared/JsonPreview.vue';
import LedgerTable from '../shared/LedgerTable.vue';

const loading = ref(false);
const error = ref('');
const state = reactive({
  stats: null,
  statsLedger: [],
  shadowSignals: [],
  shadowOutcomes: [],
  shadowCandidates: [],
  closeHistory: [],
  tradeJournal: [],
  strategyEvaluation: [],
  regimeEvaluation: [],
  manualAlpha: [],
});

const metrics = computed(() => [
  { label: 'Shadow Signals', value: state.shadowSignals.length, hint: 'last 30d' },
  { label: 'Trades', value: state.tradeJournal.length, hint: 'journal rows' },
  { label: 'Research', value: state.strategyEvaluation.length + state.regimeEvaluation.length, hint: 'evaluation rows' },
]);

async function load() {
  loading.value = true;
  error.value = '';
  try {
    Object.assign(state, await loadResearchWorkspace());
  } catch (exc) {
    error.value = exc?.message || 'Failed to load research workspace';
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>
