<template>
  <WorkspaceFrame
    eyebrow="预测市场跟单"
    title="Polymarket 强交易员跟单工作台"
    description="只读发现公开强交易员、Telegram 钱包来源、当前持仓和已结算表现；先 shadow 跟单验证，达标后由系统自动判断 micro-live。"
    :loading="loading"
    :error="error"
    @refresh="load"
  >
    <div class="qg-readonly-banner">
      <StatusPill status="locked" label="只读研究" />
      <span
        >预测市场前端不直接下注或划转资金；真实钱包是否放行由后端自动证据门控、TP/SL 和仓位限制决定。</span
      >
    </div>

    <div class="qg-search-row">
      <input v-model="query" placeholder="筛选交易员、钱包或市场关键词" @keydown.enter="load" />
      <button type="button" class="qg-button" @click="load">刷新</button>
    </div>

    <MetricGrid :items="model.metrics" />
    <EndpointHealthGrid :items="model.endpoints" />

    <div class="qg-domain-grid qg-domain-grid--two">
      <section class="qg-section-card qg-section-card--operator">
        <header>
          <p class="qg-eyebrow">模拟 / 真实一眼看懂</p>
          <h2>预测市场现在在做什么</h2>
        </header>
        <KeyValueList :items="model.simulationItems" />
      </section>

      <section class="qg-section-card qg-section-card--operator">
        <header>
          <p class="qg-eyebrow">每日复盘</p>
          <h2>亏损隔离与效果</h2>
        </header>
        <KeyValueList :items="model.reviewItems" />
      </section>

      <section class="qg-section-card qg-section-card--operator">
        <header>
          <p class="qg-eyebrow">进展卡点</p>
          <h2>为什么还没有晋级</h2>
        </header>
        <KeyValueList :items="model.progressItems" />
      </section>
    </div>

    <section class="poly-evidence-console">
      <header class="poly-evidence-console__header">
        <div>
          <p class="qg-eyebrow">跟单证据</p>
          <h3>强交易员与当前持仓</h3>
        </div>
        <strong>{{ evidenceRows.length }} 条</strong>
      </header>
      <div class="poly-evidence-console__tabs" role="tablist" aria-label="预测市场证据视图">
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
          当前没有可读跟单证据；刷新后会读取公开排行榜和 Telegram 来源配置。
        </p>
      </div>
    </section>

    <div class="qg-domain-grid">
      <section class="qg-panel">
        <h3>强交易员发现</h3>
        <KeyValueList :items="model.copyTraderItems" />
      </section>

      <section class="qg-panel">
        <h3>研究边界</h3>
        <KeyValueList :items="model.safetyItems" />
      </section>
    </div>

    <div class="qg-domain-grid qg-domain-grid--wide-tables qg-polymarket-tables">
      <LedgerTable title="强交易员排行" :rows="model.tables.copyTraders" :limit="12" />
      <LedgerTable title="当前跟单候选持仓" :rows="model.tables.copyShadowCandidates" :limit="12" />
      <LedgerTable title="来源质量分桶" :rows="model.tables.copyTraderSourceBuckets" :limit="12" />
      <LedgerTable title="Shadow 回放样本" :rows="model.tables.copyTraderShadowReplay" :limit="12" />
      <LedgerTable title="Walk-forward 批次" :rows="model.tables.copyTraderWalkForward" :limit="12" />
      <LedgerTable title="强交易员发现流水" :rows="model.tables.copyTraderDiscoveryLedger" :limit="12" />
      <LedgerTable title="研究账本" :rows="model.tables.research" :limit="12" />
    </div>

    <details class="qg-details" @toggle="revealTechnicalEvidence">
      <!-- Raw Polymarket evidence / research-only markers retained for the safety guard; the visible label stays Chinese. -->
      <summary>技术证据</summary>
      <div v-if="technicalEvidenceVisible" class="qg-domain-grid">
        <JsonPreview
          title="强交易员发现"
          source="/api/polymarket/copy-trader-discovery"
          :payload="state.copyTraderDiscovery"
        />
        <JsonPreview
          title="Shadow 回放"
          source="/api/polymarket/copy-trader-shadow-replay"
          :payload="state.copyTraderShadowReplay"
        />
        <JsonPreview
          title="Walk-forward"
          source="/api/polymarket/copy-trader-walk-forward"
          :payload="state.copyTraderWalkForward"
        />
        <JsonPreview
          title="来源分桶"
          source="/api/polymarket/copy-trader-source-buckets"
          :payload="state.copyTraderSourceBuckets"
        />
        <JsonPreview title="研究账本" source="/api/polymarket/research" :payload="state.research" />
        <JsonPreview
          title="重调计划"
          source="/api/polymarket/retune-planner"
          :payload="state.retunePlanner"
        />
      </div>
    </details>
  </WorkspaceFrame>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, shallowReactive } from 'vue';

import { loadPolymarketWorkspace } from '../../services/domainApi.js';
import WorkspaceFrame from '../shared/WorkspaceFrame.vue';
import MetricGrid from '../shared/MetricGrid.vue';
import EndpointHealthGrid from '../shared/EndpointHealthGrid.vue';
import KeyValueList from '../shared/KeyValueList.vue';
import LedgerTable from '../shared/LedgerTable.vue';
import JsonPreview from '../shared/JsonPreview.vue';
import StatusPill from '../shared/StatusPill.vue';
import { buildPolymarketModel } from './polymarketModel.js';
import { compactDisplay, formatDisplayValue, humanizeStatus } from '../../utils/displayText.js';

const loading = ref(false);
const error = ref('');
const query = ref('');
const evidenceMode = ref('all');
const technicalEvidenceVisible = ref(false);
const state = shallowReactive({
  search: null,
  radar: null,
  worker: null,
  candidateQueue: null,
  aiScore: null,
  dryRunOrders: null,
  outcomeWatcher: null,
  executionGate: null,
  history: null,
  historyDb: null,
  research: null,
  retunePlanner: null,
  copyTraderDiscovery: null,
  autoGovernance: null,
  canary: null,
  canaryRun: null,
  realTrades: null,
  cross: null,
  markets: null,
  assets: null,
  singleAnalysis: null,
  dailyReview: null,
  canaryLedger: null,
  autoGovernanceLedger: null,
  copyTraderDiscoveryLedger: null,
  copyTraderShadowReplay: null,
  copyTraderShadowReplayLedger: null,
  copyTraderOutcomeLedger: null,
  copyTraderWalkForward: null,
  copyTraderWalkForwardLedger: null,
  copyTraderSourceBuckets: null,
  copyTraderSourceBucketsLedger: null,
});
let loadController = null;
let loadRunId = 0;

const model = computed(() => buildPolymarketModel(state));
const evidenceBuckets = computed(() => {
  const copyRows = [...model.value.tables.copyShadowCandidates, ...model.value.tables.copyTraders];
  const aiScoreRows = model.value.tables.aiScore.length
    ? model.value.tables.aiScore
    : model.value.aiScoreItems.map((item) => ({
        title: item.label,
        summary: `${item.value ?? '等待数据'}${item.hint ? ` · ${item.hint}` : ''}`,
        source: 'AI Score',
      }));
  return {
    all: [
      ...toEvidenceRows(model.value.tables.copyTraderSourceBuckets, '来源质量'),
      ...toEvidenceRows(model.value.tables.copyTraderShadowReplay, '回放样本'),
      ...toEvidenceRows(copyRows, '跟单'),
      ...toEvidenceRows(model.value.tables.research, '研究分析'),
    ].slice(0, 16),
    radar: toEvidenceRows(model.value.tables.copyTraders, '强交易员'),
    history: toEvidenceRows(model.value.tables.copyShadowCandidates, '当前持仓'),
    buckets: toEvidenceRows(model.value.tables.copyTraderSourceBuckets, '来源质量'),
    replay: toEvidenceRows(model.value.tables.copyTraderShadowReplay, '回放样本'),
    ai: toEvidenceRows(aiScoreRows, '旧AI评分'),
  };
});
const evidenceRows = computed(() => evidenceBuckets.value[evidenceMode.value] || evidenceBuckets.value.all);
const evidenceTabs = computed(() => [
  { key: 'all', label: '综合证据', count: evidenceBuckets.value.all.length },
  { key: 'radar', label: '强交易员', count: evidenceBuckets.value.radar.length },
  { key: 'history', label: '当前持仓', count: evidenceBuckets.value.history.length },
  { key: 'buckets', label: '来源质量', count: evidenceBuckets.value.buckets.length },
  { key: 'replay', label: '回放样本', count: evidenceBuckets.value.replay.length },
  { key: 'ai', label: '旧AI评分', count: evidenceBuckets.value.ai.length },
]);

async function load() {
  loadController?.abort();
  const runId = loadRunId + 1;
  loadRunId = runId;
  const controller = new globalThis.AbortController();
  loadController = controller;
  loading.value = true;
  error.value = '';
  try {
    const nextState = await loadPolymarketWorkspace({ q: query.value }, { signal: controller.signal });
    if (controller.signal.aborted || runId !== loadRunId) return;
    Object.assign(state, nextState);
  } catch (exc) {
    if (controller.signal.aborted || runId !== loadRunId) return;
    error.value = exc?.message || 'Failed to load Polymarket workspace';
  } finally {
    if (runId === loadRunId) {
      loading.value = false;
      loadController = null;
    }
  }
}

onMounted(load);
onBeforeUnmount(() => loadController?.abort());

function revealTechnicalEvidence(event) {
  technicalEvidenceVisible.value = technicalEvidenceVisible.value || Boolean(event.target.open);
}

function toEvidenceRows(rows, fallbackSource) {
  return rows
    .filter((row) => row && typeof row === 'object')
    .map((row, index) => {
      const title = firstValue(
        row,
        [
          '市场',
          '名称',
          'userName',
          'trader',
          'marketTitle',
          'title',
          'question',
          'market',
          'proxyWallet',
          'name',
          'id',
          'marketId',
        ],
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
          'copyScore',
          'candidateScore',
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
        summary: compactText(humanizeStatus(summary, formatDisplayValue(summary)), 180),
        source: compactText(humanizeStatus(source, formatDisplayValue(source)), 48),
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
  return formatDisplayValue(value);
}

function compactText(value, max) {
  return compactDisplay(stringify(value), max);
}
</script>
