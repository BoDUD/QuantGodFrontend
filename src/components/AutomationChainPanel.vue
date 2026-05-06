<template>
  <section class="qg-automation-chain-panel" aria-label="自动化链路状态">
    <header class="qg-automation-chain-panel__header">
      <div>
        <p class="qg-automation-chain-panel__eyebrow">USDJPY 自动化链路</p>
        <h2>USDJPY 证据链与入场政策</h2>
        <p class="qg-automation-chain-panel__subtitle">只检查 USDJPYc 的行情质量、策略资格、止盈止损、入场触发和建议仓位；其他品种不再参与阻断判断。</p>
      </div>
      <div class="qg-automation-chain-panel__actions">
        <button type="button" @click="loadStatus" :disabled="loading">刷新</button>
        <button type="button" class="primary" @click="runOnce" :disabled="running">运行一次</button>
      </div>
    </header>

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

      <div class="qg-automation-chain-panel__grid">
        <article>
          <h3>链路步骤</h3>
          <ul>
            <li v-for="step in steps" :key="step.name">
              <span :class="step.ok ? 'ok' : 'bad'">{{ step.ok ? '通过' : '未通过' }}</span>
              {{ step.labelZh || step.name }}
              <small>{{ step.summaryZh || step.reason || '' }}</small>
            </li>
          </ul>
        </article>
        <article>
          <h3>缺失证据</h3>
          <ul>
            <li v-for="item in missingEvidence" :key="item">{{ item }}</li>
            <li v-if="!missingEvidence.length">暂无缺失证据</li>
          </ul>
        </article>
        <article>
          <h3>阻断原因</h3>
          <ul>
            <li v-for="item in blockedReasons" :key="item">{{ item }}</li>
            <li v-if="!blockedReasons.length">暂无阻断原因</li>
          </ul>
        </article>
        <article>
          <h3>机会入场</h3>
          <ul>
            <li v-for="item in opportunities" :key="`${item.symbol}-${item.direction}`">
              {{ item.symbol }}｜{{ item.directionZh || item.direction }}｜{{ item.entryModeZh || item.entryMode }}｜建议仓位 {{ item.recommendedLot || 0 }}
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

const steps = computed(() => payload.value.steps || []);
const missingEvidence = computed(() => payload.value.missingEvidence || []);
const blockedReasons = computed(() => payload.value.blockedReasons || []);
const opportunities = computed(() => payload.value.policySummary?.opportunities || []);
const stateClass = computed(() => {
  const state = String(payload.value.state || '');
  if (state.includes('READY')) return 'good';
  if (state.includes('BLOCKED')) return 'bad';
  return 'warn';
});

function unwrap(response) {
  return response?.payload || response || {};
}

async function loadStatus() {
  loading.value = true;
  error.value = '';
  try {
    payload.value = unwrap(await fetchAutomationChainStatus());
  } catch (err) {
    error.value = err?.message || '读取自动化链路失败';
  } finally {
    loading.value = false;
  }
}

async function runOnce() {
  running.value = true;
  error.value = '';
  try {
    payload.value = unwrap(await runAutomationChain({ send: false }));
  } catch (err) {
    error.value = err?.message || '运行自动化链路失败';
  } finally {
    running.value = false;
  }
}

onMounted(loadStatus);
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

.qg-automation-chain-panel__summary {
  grid-template-columns: repeat(4, minmax(0, 1fr));
  margin-top: 14px;
}

.qg-automation-chain-panel__summary > div,
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

.qg-automation-chain-panel__summary strong {
  display: block;
  margin-top: 4px;
  font-size: 18px;
  font-variant-numeric: tabular-nums;
}

.qg-automation-chain-panel__grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin-top: 14px;
}

.qg-automation-chain-panel ul {
  margin: 10px 0 0;
  padding-left: 18px;
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
  .qg-automation-chain-panel__grid {
    grid-template-columns: 1fr;
  }
}
</style>
