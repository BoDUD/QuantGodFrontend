<template>
  <section class="qg-automation-chain-panel" aria-label="自动化链路状态">
    <header class="qg-automation-chain-panel__header">
      <div>
        <p class="qg-automation-chain-panel__eyebrow">USDJPY 实盘 EA 恢复状态</p>
        <h2>USDJPY 实盘 EA 恢复状态</h2>
        <p class="qg-automation-chain-panel__subtitle">
          读取 USDJPY 策略政策、EA 干跑和实盘恢复闭环，告诉你现有 EA 能不能继续等 RSI 买入信号。
        </p>
      </div>
      <div class="qg-automation-chain-panel__actions">
        <button type="button" @click="loadStatus" :disabled="loading">Agent 刷新证据</button>
        <button type="button" class="primary" @click="runOnce" :disabled="running">Agent 生成恢复证据</button>
      </div>
    </header>

    <div
      v-if="actionStatus"
      class="qg-automation-chain-panel__action-result"
      :class="`qg-automation-chain-panel__action-result--${actionStatus.kind}`"
      role="status"
    >
      <div>
        <strong>{{ actionStatus.title }}</strong>
        <span>{{ actionStatus.time }}</span>
      </div>
      <p>{{ actionStatus.summary }}</p>
    </div>

    <div v-if="error" class="qg-automation-chain-panel__error">{{ error }}</div>
    <div v-else-if="loading" class="qg-automation-chain-panel__loading">正在读取自动化链路状态...</div>
    <template v-else>
      <div class="qg-automation-chain-panel__summary">
        <div>
          <span>结论</span>
          <strong :class="stateClass">{{ payload.stateZh || payload.state || '未知' }}</strong>
        </div>
        <div>
          <span>标准入场</span>
          <strong>{{ payload.standardCount || 0 }}</strong>
        </div>
        <div>
          <span>机会入场</span>
          <strong>{{ payload.opportunityCount || 0 }}</strong>
        </div>
        <div>
          <span>阻断</span>
          <strong>{{ payload.blockedCount || 0 }}</strong>
        </div>
      </div>

      <div class="qg-automation-chain-panel__truth">
        <article>
          <span>主状态来源</span>
          <strong>{{ payload.singleSourceOfTruth || 'USDJPY_LIVE_LOOP' }}</strong>
          <small>页面、Telegram 和 EA 干跑统一读取 USDJPY Live Loop</small>
        </article>
        <article>
          <span>实盘候选</span>
          <strong>{{ livePolicyLabel }}</strong>
          <small>只有 RSI_Reversal 买入路线可进入恢复复核</small>
        </article>
        <article>
          <span>影子第一名</span>
          <strong>{{ shadowPolicyLabel }}</strong>
          <small>影子研究不会抢占实盘恢复路线</small>
        </article>
        <article>
          <span>EA 干跑</span>
          <strong>{{ dryRunLabel }}</strong>
          <small>干跑只验证政策读取，不代表工具下单</small>
        </article>
      </div>

      <div class="qg-automation-chain-panel__grid">
        <article>
          <h3>技术链路详情</h3>
          <ul class="qg-automation-chain-panel__plain-list">
            <li v-for="step in steps" :key="step.name">
              <span :class="step.ok ? 'ok' : 'bad'">{{ step.ok ? '通过' : '未通过' }}</span>
              {{ cleanStepLabel(step.labelZh || step.name) }}
              <small>{{ step.summaryZh || step.reason || '' }}</small>
            </li>
          </ul>
        </article>
        <article>
          <h3>缺失证据</h3>
          <ul class="qg-automation-chain-panel__plain-list">
            <li v-for="item in missingEvidence" :key="item">{{ item }}</li>
            <li v-if="!missingEvidence.length">暂无缺失证据</li>
          </ul>
        </article>
        <article>
          <h3>阻断原因</h3>
          <ul class="qg-automation-chain-panel__plain-list">
            <li v-for="item in blockedReasons" :key="item">{{ item }}</li>
            <li v-if="!blockedReasons.length">暂无阻断原因</li>
          </ul>
        </article>
        <article>
          <h3>机会入场</h3>
          <ul class="qg-automation-chain-panel__plain-list">
            <li v-for="item in opportunities" :key="`${item.symbol}-${item.direction}`">
              {{ item.symbol }}｜{{ item.directionZh || item.direction }}｜{{
                item.entryModeZh || item.entryMode
              }}｜建议仓位 {{ item.recommendedLot || 0 }}
            </li>
            <li v-if="!opportunities.length">暂无机会入场</li>
          </ul>
        </article>
      </div>
    </template>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { fetchAutomationChainStatus, runAutomationChain } from '../services/automationChainApi.js';

const loading = ref(false);
const running = ref(false);
const error = ref('');
const payload = ref({});
const actionStatus = ref(null);

const steps = computed(() => payload.value.steps || []);
const missingEvidence = computed(() => payload.value.missingEvidence || []);
const blockedReasons = computed(() => payload.value.blockedReasons || []);
const opportunities = computed(() => payload.value.policySummary?.opportunities || []);
const topLive = computed(
  () => payload.value.topLiveEligiblePolicy || payload.value.liveLoopStatus?.topLiveEligiblePolicy || {},
);
const topShadow = computed(
  () => payload.value.topShadowPolicy || payload.value.liveLoopStatus?.topShadowPolicy || {},
);
const dryRun = computed(() => payload.value.dryRunDecision || payload.value.liveLoopStatus?.dryRun || {});
const livePolicyLabel = computed(() => {
  const item = topLive.value || {};
  if (!item.strategy) return '暂无实盘候选';
  return `${item.strategy}｜${directionZh(item.direction)}｜${entryModeZh(item.entryMode)}`;
});
const shadowPolicyLabel = computed(() => {
  const item = topShadow.value || {};
  if (!item.strategy) return '暂无影子候选';
  return `${item.strategy}｜${directionZh(item.direction)}｜${entryModeZh(item.entryMode)}`;
});
const dryRunLabel = computed(() => {
  const item = dryRun.value || {};
  return item.decision || '暂无干跑结果';
});
const stateClass = computed(() => {
  const state = String(payload.value.state || '');
  if (state.includes('READY')) return 'good';
  if (state.includes('BLOCKED')) return 'bad';
  return 'warn';
});

function unwrap(response) {
  return response?.payload || response || {};
}

function directionZh(value) {
  const text = String(value || '').toUpperCase();
  if (text === 'LONG' || text === 'BUY') return '买入观察';
  if (text === 'SHORT' || text === 'SELL') return '卖出观察';
  return '方向待确认';
}

function entryModeZh(value) {
  return (
    {
      STANDARD_ENTRY: '标准入场',
      OPPORTUNITY_ENTRY: '机会入场',
      BLOCKED: '阻断',
    }[String(value || '')] || '状态待确认'
  );
}

function cleanStepLabel(value) {
  const text = String(value || '').trim();
  return (
    text
      .replace(/^P3-\d+\s*/i, '')
      .replace(/^P\d+\s*/i, '')
      .replace(/^[-:：\s]+/, '')
      .trim() || '链路检查'
  );
}

function actionTime() {
  return new Date().toLocaleTimeString('zh-CN', { hour12: false });
}

function setActionStatus(kind, title, summary) {
  actionStatus.value = { kind, title, summary, time: actionTime() };
}

function statusSummary() {
  const state = payload.value.stateZh || payload.value.state || '状态待确认';
  const source = payload.value.singleSourceOfTruth || 'USDJPY_LIVE_LOOP';
  const blockers = blockedReasons.value.length;
  const missing = missingEvidence.value.length;
  return `已读取 ${source}：${state}；阻断 ${blockers} 条；缺失证据 ${missing} 条。`;
}

async function loadStatus({ silent = false } = {}) {
  loading.value = true;
  error.value = '';
  if (!silent)
    setActionStatus('running', 'Agent 正在刷新恢复证据', '正在读取 USDJPY Live Loop、EA 干跑和技术链路。');
  try {
    payload.value = unwrap(await fetchAutomationChainStatus());
    if (!silent) setActionStatus('success', 'Agent 证据已刷新', statusSummary());
  } catch (err) {
    error.value = err?.message || '读取自动化链路失败';
    if (!silent) setActionStatus('error', 'Agent 刷新失败', error.value);
  } finally {
    loading.value = false;
  }
}

async function runOnce() {
  running.value = true;
  error.value = '';
  setActionStatus('running', 'Agent 正在生成恢复证据', '正在生成 USDJPY policy、EA 干跑和 live-loop 状态。');
  try {
    payload.value = unwrap(await runAutomationChain({ send: false }));
    setActionStatus('success', 'Agent 恢复证据已生成', statusSummary());
  } catch (err) {
    error.value = err?.message || '运行自动化链路失败';
    setActionStatus('error', 'Agent 生成失败', error.value);
  } finally {
    running.value = false;
  }
}

onMounted(() => loadStatus({ silent: true }));
</script>

<style scoped>
.qg-automation-chain-panel {
  border: 1px solid var(--qg-border-subtle, rgba(148, 163, 184, 0.22));
  border-radius: 18px;
  padding: 16px;
  background: var(--qg-surface-panel, rgba(15, 23, 42, 0.72));
  color: var(--qg-text-primary, #e5e7eb);
}

.qg-automation-chain-panel__header,
.qg-automation-chain-panel__summary,
.qg-automation-chain-panel__truth,
.qg-automation-chain-panel__grid {
  display: grid;
  gap: 12px;
}

.qg-automation-chain-panel__header {
  grid-template-columns: 1fr auto;
  align-items: center;
}

.qg-automation-chain-panel__eyebrow {
  margin: 0 0 4px;
  color: var(--qg-text-muted, #94a3b8);
  font-size: 12px;
}

.qg-automation-chain-panel h2,
.qg-automation-chain-panel h3 {
  margin: 0;
}

.qg-automation-chain-panel__subtitle {
  max-width: 720px;
  margin: 6px 0 0;
  color: var(--qg-text-muted, #94a3b8);
  line-height: 1.55;
}

.qg-automation-chain-panel__actions {
  display: flex;
  gap: 8px;
}

.qg-automation-chain-panel button {
  border: 1px solid var(--qg-border-subtle, rgba(148, 163, 184, 0.22));
  border-radius: 999px;
  padding: 8px 12px;
  background: transparent;
  color: inherit;
  cursor: pointer;
}

.qg-automation-chain-panel button.primary {
  background: var(--qg-accent, #38bdf8);
  color: #020617;
}

.qg-automation-chain-panel__action-result {
  border: 1px solid rgba(56, 189, 248, 0.35);
  border-radius: 14px;
  background: rgba(2, 6, 23, 0.34);
  padding: 12px;
  margin-top: 14px;
}

.qg-automation-chain-panel__action-result div {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}

.qg-automation-chain-panel__action-result span,
.qg-automation-chain-panel__action-result p {
  color: var(--qg-text-muted, #94a3b8);
}

.qg-automation-chain-panel__action-result p {
  margin: 6px 0 0;
  line-height: 1.45;
  overflow-wrap: anywhere;
}

.qg-automation-chain-panel__action-result--running {
  border-color: rgba(56, 189, 248, 0.55);
}

.qg-automation-chain-panel__action-result--success {
  border-color: rgba(34, 197, 94, 0.45);
}

.qg-automation-chain-panel__action-result--error {
  border-color: rgba(248, 113, 113, 0.55);
}

.qg-automation-chain-panel__summary {
  grid-template-columns: repeat(4, minmax(0, 1fr));
  margin-top: 14px;
}

.qg-automation-chain-panel__summary > div,
.qg-automation-chain-panel__truth > article,
.qg-automation-chain-panel__grid > article {
  border: 1px solid var(--qg-border-subtle, rgba(148, 163, 184, 0.18));
  border-radius: 14px;
  padding: 12px;
  background: rgba(2, 6, 23, 0.28);
}

.qg-automation-chain-panel__summary span {
  display: block;
  color: var(--qg-text-muted, #94a3b8);
  font-size: 12px;
}

.qg-automation-chain-panel__summary strong,
.qg-automation-chain-panel__truth strong {
  display: block;
  margin-top: 4px;
  font-size: 18px;
  font-variant-numeric: tabular-nums;
}

.qg-automation-chain-panel__truth {
  grid-template-columns: repeat(4, minmax(0, 1fr));
  margin-top: 14px;
}

.qg-automation-chain-panel__truth span,
.qg-automation-chain-panel__truth small {
  display: block;
  color: var(--qg-text-muted, #94a3b8);
}

.qg-automation-chain-panel__truth small {
  margin-top: 6px;
  line-height: 1.45;
}

.qg-automation-chain-panel__grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin-top: 14px;
}

.qg-automation-chain-panel ul {
  margin: 10px 0 0;
  padding-left: 18px;
}

.qg-automation-chain-panel__plain-list {
  list-style: none;
  padding-left: 0 !important;
}

.qg-automation-chain-panel li {
  margin: 6px 0;
}

.qg-automation-chain-panel small {
  display: block;
  color: var(--qg-text-muted, #94a3b8);
}

.good,
.ok {
  color: #22c55e;
}

.warn {
  color: #f59e0b;
}

.bad {
  color: #ef4444;
}

.qg-automation-chain-panel__error {
  margin-top: 12px;
  color: #f87171;
}

.qg-automation-chain-panel__loading {
  margin-top: 12px;
  color: var(--qg-text-muted, #94a3b8);
}

@media (max-width: 900px) {
  .qg-automation-chain-panel__header,
  .qg-automation-chain-panel__summary,
  .qg-automation-chain-panel__truth,
  .qg-automation-chain-panel__grid {
    grid-template-columns: 1fr;
  }
}
</style>
