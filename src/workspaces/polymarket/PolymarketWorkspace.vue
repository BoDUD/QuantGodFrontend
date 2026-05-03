<template>
  <WorkspaceFrame
    eyebrow="Polymarket 研究"
    title="Polymarket 研究工作台"
    description="查看公开市场概率、流动性、成交量、AI 评分、亏损隔离和跨市场联动；全部只读研究，不自动下注。"
    :loading="loading"
    :error="error"
    @refresh="load"
  >
    <div class="qg-readonly-banner">
      <StatusPill status="locked" label="只读研究" />
      <span
        >Polymarket 数据仅用于研究与治理证据。前端不允许下注、资金划转、提现、自动执行或绕过授权链路。</span
      >
    </div>

    <div class="qg-search-row">
      <input v-model="query" placeholder="搜索市场关键词" @keydown.enter="load" />
      <button type="button" class="qg-button" @click="load">搜索</button>
    </div>

    <MetricGrid :items="model.metrics" />
    <EndpointHealthGrid :items="model.endpoints" />

    <section class="poly-evidence-console">
      <header class="poly-evidence-console__header">
        <div>
          <p class="qg-eyebrow">综合证据</p>
          <h3>统一搜索综合证据卡</h3>
        </div>
        <strong>{{ evidenceRows.length }} 条</strong>
      </header>
      <div class="poly-evidence-console__tabs" role="tablist" aria-label="Polymarket evidence modes">
        <button
          v-for="tabItem in evidenceTabs"
          :key="tabItem.key"
          type="button"
          role="tab"
          :aria-selected="evidenceMode === tabItem.key"
          :class="{ active: evidenceMode === tabItem.key }"
          @click="evidenceMode = tabItem.key"
        >
          <span>{{ tabItem.label }}</span>
          <small>{{ tabItem.count }}</small>
        </button>
      </div>
      <div class="poly-evidence-console__list">
        <article v-for="item in evidenceRows" :key="item.key" class="poly-evidence-console__row">
          <strong>{{ item.title }}</strong>
          <span>{{ item.summary }}</span>
          <small>{{ item.source }}</small>
        </article>
        <p v-if="!evidenceRows.length" class="qg-empty-text">
          当前分栏没有可读证据；刷新或换关键词后会自动更新。
        </p>
      </div>
    </section>

    <div class="qg-domain-grid">
      <section class="qg-panel">
        <h3>研究边界</h3>
        <KeyValueList :items="model.safetyItems" />
      </section>

      <section class="qg-panel">
        <h3>雷达摘要</h3>
        <KeyValueList :items="model.radarItems" />
      </section>

      <section class="qg-panel">
        <h3>AI 评分与治理</h3>
        <KeyValueList :items="model.aiScoreItems" />
      </section>

      <section class="qg-panel">
        <h3>模拟执行保护</h3>
        <KeyValueList :items="model.canaryItems" />
      </section>

      <section class="qg-panel qg-panel--wide">
        <h3>跨市场联动与单市场分析</h3>
        <KeyValueList :items="model.crossLinkageItems" />
      </section>
    </div>

    <div class="qg-domain-grid">
      <LedgerTable title="搜索结果" :rows="model.tables.search" :limit="12" />
      <LedgerTable title="雷达机会" :rows="model.tables.radar" :limit="12" />
      <LedgerTable title="市场金额与概率" :rows="model.tables.markets" :limit="12" />
      <LedgerTable title="资产候选" :rows="model.tables.assets" :limit="12" />
      <LedgerTable title="历史复盘" :rows="model.tables.history" :limit="12" />
      <LedgerTable title="真实交易证据" :rows="model.tables.realTrades" :limit="12" />
      <LedgerTable title="跨市场联动" :rows="model.tables.cross" :limit="12" />
    </div>

    <details class="qg-details">
      <!-- Raw Polymarket evidence / research-only markers retained for the safety guard; the visible label stays Chinese. -->
      <summary>技术证据</summary>
      <div class="qg-domain-grid">
        <JsonPreview title="Search" source="/api/polymarket/search" :payload="state.search" />
        <JsonPreview title="Radar" source="/api/polymarket/radar" :payload="state.radar" />
        <JsonPreview title="Radar Worker" source="/api/polymarket/radar-worker" :payload="state.worker" />
        <JsonPreview title="AI Score" source="/api/polymarket/ai-score" :payload="state.aiScore" />
        <JsonPreview title="History" source="/api/polymarket/history" :payload="state.history" />
        <JsonPreview
          title="Auto Governance"
          source="/api/polymarket/auto-governance"
          :payload="state.autoGovernance"
        />
        <JsonPreview
          title="Canary Contract"
          source="/api/polymarket/canary-executor-contract"
          :payload="state.canary"
        />
        <JsonPreview
          title="Canary Run"
          source="/api/polymarket/canary-executor-run"
          :payload="state.canaryRun"
        />
        <JsonPreview title="Real Trades" source="/api/polymarket/real-trades" :payload="state.realTrades" />
        <JsonPreview title="Cross Linkage" source="/api/polymarket/cross-linkage" :payload="state.cross" />
        <JsonPreview title="Markets" source="/api/polymarket/markets" :payload="state.markets" />
        <JsonPreview
          title="Asset Opportunities"
          source="/api/polymarket/asset-opportunities"
          :payload="state.assets"
        />
        <JsonPreview
          title="Single Market Analysis"
          source="/api/polymarket/single-market-analysis"
          :payload="state.singleAnalysis"
        />
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
const evidenceMode = ref('all');
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
const evidenceBuckets = computed(() => {
  const aiScoreRows = model.value.tables.aiScore.length
    ? model.value.tables.aiScore
    : model.value.aiScoreItems.map((item) => ({
        title: item.label,
        summary: `${item.value ?? '—'}${item.hint ? ` · ${item.hint}` : ''}`,
        source: 'AI Score',
      }));
  return {
    all: [
      ...toEvidenceRows(model.value.tables.search, '综合证据'),
      ...toEvidenceRows(model.value.tables.radar, 'Radar'),
      ...toEvidenceRows(model.value.tables.history, '历史分析'),
      ...toEvidenceRows(aiScoreRows, 'AI Score'),
    ].slice(0, 16),
    radar: toEvidenceRows(model.value.tables.radar, 'Radar'),
    history: toEvidenceRows(model.value.tables.history, '历史分析'),
    ai: toEvidenceRows(aiScoreRows, 'AI Score'),
  };
});
const evidenceRows = computed(() => evidenceBuckets.value[evidenceMode.value] || evidenceBuckets.value.all);
const evidenceTabs = computed(() => [
  { key: 'all', label: '综合证据', count: evidenceBuckets.value.all.length },
  { key: 'radar', label: '雷达', count: evidenceBuckets.value.radar.length },
  { key: 'history', label: '历史分析', count: evidenceBuckets.value.history.length },
  { key: 'ai', label: 'AI评分', count: evidenceBuckets.value.ai.length },
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

function toEvidenceRows(rows, fallbackSource) {
  return rows
    .filter((row) => row && typeof row === 'object')
    .map((row, index) => {
      const title = firstValue(
        row,
        ['市场', '名称', 'title', 'question', 'market', 'name', 'id', 'marketId'],
        `${fallbackSource} #${index + 1}`,
      );
      const summary = firstValue(
        row,
        [
          'summary',
          'reason',
          'reasoning',
          'recommendation',
          'decision',
          'action',
          'status',
          'state',
          'score',
          '建议',
          '状态',
          '说明',
        ],
        '等待更多证据',
      );
      const source = firstValue(row, ['来源', 'source', 'type', 'category', 'mode'], fallbackSource);
      return {
        key: `${fallbackSource}-${index}-${title}`,
        title: compactText(title, 120),
        summary: compactText(summary, 180),
        source: compactText(source, 48),
      };
    });
}

function firstValue(row, keys, fallback) {
  for (const key of keys) {
    const value = row?.[key];
    if (value !== undefined && value !== null && value !== '') return stringify(value);
  }
  return fallback;
}

function stringify(value) {
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function compactText(value, max) {
  const text = stringify(value).replace(/\s+/g, ' ').trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}
</script>
