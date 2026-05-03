<template>
  <WorkspaceFrame
    eyebrow="模拟研究"
    title="模拟研究与交易证据"
    description="查看模拟信号、交易历史、策略评估、行情环境和人工 Alpha；全部只读，不触发实盘。"
    :loading="loading"
    :error="error"
    @refresh="load"
  >
    <section class="qg-readonly-banner">
      <StatusPill status="locked" label="只读研究" />
      <span>本工作区只展示研究与交易证据，不提供下单、平仓、撤单、路线升降级或 live preset 写入入口。</span>
    </section>

    <MetricGrid :items="view.metrics" />
    <EndpointHealthGrid :items="view.endpoints" />

    <div class="qg-domain-grid qg-domain-grid--two">
      <article class="qg-panel">
        <header class="qg-panel__header">
          <h2>研究边界</h2>
          <StatusPill status="locked" label="执行锁定" />
        </header>
        <KeyValueList :items="view.safety" />
      </article>

      <article class="qg-panel">
        <header class="qg-panel__header">
          <h2>研究统计</h2>
          <StatusPill status="ok" label="已读取" />
        </header>
        <KeyValueList :items="view.statsSummary" />
      </article>

      <article class="qg-panel">
        <header class="qg-panel__header">
          <h2>模拟信号</h2>
          <StatusPill status="locked" label="模拟证据" />
        </header>
        <KeyValueList :items="view.shadowSummary" />
      </article>

      <article class="qg-panel">
        <header class="qg-panel__header">
          <h2>交易流水</h2>
          <StatusPill status="read-only" label="只读" />
        </header>
        <KeyValueList :items="view.tradeSummary" />
      </article>

      <article class="qg-panel qg-panel--wide">
        <header class="qg-panel__header">
          <h2>策略与行情环境评估</h2>
          <StatusPill status="ok" label="研究" />
        </header>
        <KeyValueList :items="view.evaluationSummary" />
      </article>
    </div>

    <div class="qg-domain-grid qg-domain-grid--two">
      <LedgerTable title="模拟信号" :rows="view.tables.shadowSignals" />
      <LedgerTable title="模拟结果" :rows="view.tables.shadowOutcomes" />
      <LedgerTable title="模拟候选" :rows="view.tables.shadowCandidates" />
      <LedgerTable title="历史平仓" :rows="view.tables.closeHistory" />
      <LedgerTable title="交易流水" :rows="view.tables.tradeJournal" />
      <LedgerTable title="策略评估" :rows="view.tables.strategyEvaluation" />
      <LedgerTable title="行情环境评估" :rows="view.tables.regimeEvaluation" />
      <LedgerTable title="人工 Alpha" :rows="view.tables.manualAlpha" />
      <LedgerTable title="研究统计流水" :rows="view.tables.statsLedger" />
    </div>

    <details class="qg-raw-evidence">
      <summary>技术证据</summary>
      <div class="qg-domain-grid">
        <JsonPreview title="研究统计" source="/api/research/stats" :payload="state.stats" />
        <JsonPreview title="统计流水" source="/api/research/stats-ledger" :payload="state.statsLedger" />
        <JsonPreview title="模拟信号" source="/api/shadow/signals" :payload="state.shadowSignals" />
        <JsonPreview title="模拟结果" source="/api/shadow/outcomes" :payload="state.shadowOutcomes" />
        <JsonPreview title="模拟候选" source="/api/shadow/candidates" :payload="state.shadowCandidates" />
        <JsonPreview title="历史平仓" source="/api/trades/close-history" :payload="state.closeHistory" />
        <JsonPreview title="交易流水" source="/api/trades/journal" :payload="state.tradeJournal" />
        <JsonPreview title="策略评估" source="/api/research/strategy-evaluation" :payload="state.strategyEvaluation" />
        <JsonPreview title="行情环境评估" source="/api/research/regime-evaluation" :payload="state.regimeEvaluation" />
        <JsonPreview title="人工 Alpha" source="/api/research/manual-alpha" :payload="state.manualAlpha" />
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
    error.value = exc?.message || '模拟研究加载失败';
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>
