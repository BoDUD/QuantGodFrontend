<template>
  <WorkspaceFrame
    eyebrow="Research"
    title="Research & Trade Evidence"
    description="Shadow、交易历史、策略评估、Regime 与 Manual Alpha 的结构化研究入口。"
    :loading="loading"
    :error="error"
    @refresh="load"
  >
    <section class="qg-readonly-banner">
      <StatusPill status="locked" label="research-only" />
      <span>本工作区只展示研究与交易证据，不提供下单、平仓、撤单、路线升降级或 live preset 写入入口。</span>
    </section>

    <MetricGrid :items="view.metrics" />
    <EndpointHealthGrid :items="view.endpoints" />

    <div class="qg-domain-grid qg-domain-grid--two">
      <article class="qg-panel">
        <header class="qg-panel__header">
          <h2>Safety Envelope</h2>
          <StatusPill status="locked" label="execution locked" />
        </header>
        <KeyValueList :items="view.safety" />
      </article>

      <article class="qg-panel">
        <header class="qg-panel__header">
          <h2>Research Stats</h2>
          <StatusPill status="ok" label="stats" />
        </header>
        <KeyValueList :items="view.statsSummary" />
      </article>

      <article class="qg-panel">
        <header class="qg-panel__header">
          <h2>Shadow Research</h2>
          <StatusPill status="locked" label="shadow evidence" />
        </header>
        <KeyValueList :items="view.shadowSummary" />
      </article>

      <article class="qg-panel">
        <header class="qg-panel__header">
          <h2>Trade Ledgers</h2>
          <StatusPill status="read-only" label="read-only" />
        </header>
        <KeyValueList :items="view.tradeSummary" />
      </article>

      <article class="qg-panel qg-panel--wide">
        <header class="qg-panel__header">
          <h2>Strategy / Regime Evaluation</h2>
          <StatusPill status="ok" label="research" />
        </header>
        <KeyValueList :items="view.evaluationSummary" />
      </article>
    </div>

    <div class="qg-domain-grid qg-domain-grid--two">
      <LedgerTable title="Shadow Signals" :rows="view.tables.shadowSignals" />
      <LedgerTable title="Shadow Outcomes" :rows="view.tables.shadowOutcomes" />
      <LedgerTable title="Shadow Candidates" :rows="view.tables.shadowCandidates" />
      <LedgerTable title="Close History" :rows="view.tables.closeHistory" />
      <LedgerTable title="Trade Journal" :rows="view.tables.tradeJournal" />
      <LedgerTable title="Strategy Evaluation" :rows="view.tables.strategyEvaluation" />
      <LedgerTable title="Regime Evaluation" :rows="view.tables.regimeEvaluation" />
      <LedgerTable title="Manual Alpha" :rows="view.tables.manualAlpha" />
      <LedgerTable title="Research Stats Ledger" :rows="view.tables.statsLedger" />
    </div>

    <details class="qg-raw-evidence">
      <summary>Raw research evidence</summary>
      <div class="qg-domain-grid">
        <JsonPreview title="Research Stats" source="/api/research/stats" :payload="state.stats" />
        <JsonPreview title="Stats Ledger" source="/api/research/stats-ledger" :payload="state.statsLedger" />
        <JsonPreview title="Shadow Signals" source="/api/shadow/signals" :payload="state.shadowSignals" />
        <JsonPreview title="Shadow Outcomes" source="/api/shadow/outcomes" :payload="state.shadowOutcomes" />
        <JsonPreview title="Shadow Candidates" source="/api/shadow/candidates" :payload="state.shadowCandidates" />
        <JsonPreview title="Close History" source="/api/trades/close-history" :payload="state.closeHistory" />
        <JsonPreview title="Trade Journal" source="/api/trades/journal" :payload="state.tradeJournal" />
        <JsonPreview title="Strategy Evaluation" source="/api/research/strategy-evaluation" :payload="state.strategyEvaluation" />
        <JsonPreview title="Regime Evaluation" source="/api/research/regime-evaluation" :payload="state.regimeEvaluation" />
        <JsonPreview title="Manual Alpha" source="/api/research/manual-alpha" :payload="state.manualAlpha" />
      </div>
    </details>
  </WorkspaceFrame>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';

import { loadResearchWorkspace } from '../../services/domainApi.js';
import WorkspaceFrame from '../shared/WorkspaceFrame.vue';
import MetricGrid from '../shared/MetricGrid.vue';
import EndpointHealthGrid from '../shared/EndpointHealthGrid.vue';
import KeyValueList from '../shared/KeyValueList.vue';
import LedgerTable from '../shared/LedgerTable.vue';
import JsonPreview from '../shared/JsonPreview.vue';
import StatusPill from '../shared/StatusPill.vue';
import { buildResearchViewModel } from './researchModel.js';

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

const view = computed(() => buildResearchViewModel(state));

async function load() {
  loading.value = true;
  error.value = '';
  try {
    Object.assign(state, await loadResearchWorkspace({ limit: 300, days: 30 }));
  } catch (exc) {
    error.value = exc?.message || 'Failed to load research workspace';
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>
