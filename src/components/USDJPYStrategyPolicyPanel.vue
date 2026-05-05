<template>
  <section class="qg-usdjpy-panel">
    <header class="qg-usdjpy-panel__header">
      <div>
        <p class="qg-usdjpy-panel__eyebrow">USDJPY 单品种策略实验室</p>
        <h2>只研究 USDJPYc，多策略评分与 EA 干跑</h2>
        <p class="qg-usdjpy-panel__subtitle">
          其他品种数据会被忽略；这里只展示策略是否标准入场、机会入场或阻断，以及缺失证据。
        </p>
      </div>
      <div class="qg-usdjpy-panel__actions">
        <button type="button" :disabled="loading" @click="load">刷新</button>
        <button type="button" :disabled="loading" @click="runChain">生成政策</button>
      </div>
    </header>

    <div v-if="loading" class="qg-usdjpy-panel__state">正在加载 USDJPY 策略政策...</div>
    <div v-else-if="error" class="qg-usdjpy-panel__state qg-usdjpy-panel__state--error">{{ error }}</div>
    <template v-else>
      <div class="qg-usdjpy-panel__kpis">
        <article>
          <span>标准入场</span>
          <strong>{{ status?.standardEntryCount ?? 0 }}</strong>
        </article>
        <article>
          <span>机会入场</span>
          <strong>{{ status?.opportunityEntryCount ?? 0 }}</strong>
        </article>
        <article>
          <span>阻断</span>
          <strong>{{ status?.blockedCount ?? 0 }}</strong>
        </article>
        <article>
          <span>最高允许仓位</span>
          <strong>{{ formatLot(status?.maxLot ?? 2) }}</strong>
        </article>
      </div>

      <div class="qg-usdjpy-panel__grid">
        <article class="qg-usdjpy-panel__card qg-usdjpy-panel__card--primary">
          <h3>当前优先策略</h3>
          <template v-if="topPolicy">
            <div class="qg-usdjpy-panel__topline">
              <strong>{{ topPolicy.strategy }}</strong>
              <span :class="['qg-usdjpy-pill', pillClass(topPolicy.entryMode)]">{{
                entryModeLabel(topPolicy.entryMode)
              }}</span>
            </div>
            <dl>
              <div>
                <dt>方向</dt>
                <dd>{{ directionLabel(topPolicy.direction) }}</dd>
              </div>
              <div>
                <dt>建议仓位</dt>
                <dd>{{ formatLot(topPolicy.recommendedLot) }} / {{ formatLot(topPolicy.maxLot) }}</dd>
              </div>
              <div>
                <dt>评分</dt>
                <dd>{{ formatScore(topPolicy.score) }}</dd>
              </div>
              <div>
                <dt>出场模式</dt>
                <dd>{{ exitLabel(topPolicy.exitMode) }}</dd>
              </div>
            </dl>
            <ul>
              <li v-for="reason in topReasons" :key="reason">{{ reason }}</li>
            </ul>
          </template>
          <p v-else>暂无 USDJPY 策略政策。</p>
        </article>

        <article class="qg-usdjpy-panel__card">
          <h3>证据链</h3>
          <ul class="qg-usdjpy-panel__evidence">
            <li :class="evidenceClass(status?.evidence?.runtimeOk)">
              运行快照：{{ boolLabel(status?.evidence?.runtimeOk) }}
            </li>
            <li :class="evidenceClass(status?.evidence?.fastlaneOk)">
              快通道质量：{{ boolLabel(status?.evidence?.fastlaneOk) }}
            </li>
            <li :class="evidenceClass(status?.evidence?.triggerPlanFound)">
              入场触发计划：{{ boolLabel(status?.evidence?.triggerPlanFound) }}
            </li>
            <li :class="evidenceClass(status?.evidence?.dynamicSltpFound)">
              动态止盈止损：{{ boolLabel(status?.evidence?.dynamicSltpFound) }}
            </li>
          </ul>
        </article>
      </div>

      <article class="qg-usdjpy-panel__table-card">
        <h3>USDJPY 多策略矩阵</h3>
        <div class="qg-usdjpy-panel__table-wrap">
          <table>
            <thead>
              <tr>
                <th>策略</th>
                <th>方向</th>
                <th>状态</th>
                <th>建议仓位</th>
                <th>评分</th>
                <th>原因</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in strategies" :key="`${item.strategy}-${item.direction}-${item.regime}`">
                <td data-label="策略">{{ item.strategy }}</td>
                <td data-label="方向">{{ directionLabel(item.direction) }}</td>
                <td data-label="状态">
                  <span :class="['qg-usdjpy-pill', pillClass(item.entryMode)]">{{
                    entryModeLabel(item.entryMode)
                  }}</span>
                </td>
                <td data-label="建议仓位">{{ formatLot(item.recommendedLot) }}</td>
                <td data-label="评分">{{ formatScore(item.score) }}</td>
                <td data-label="原因">{{ firstReason(item) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </article>
    </template>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { fetchUSDJPYStrategyLabStatus, runUSDJPYStrategyLab } from '../services/usdjpyStrategyLabApi.js';

const status = ref(null);
const loading = ref(false);
const error = ref('');

const topPolicy = computed(() => status.value?.topPolicy || null);
const strategies = computed(() => (Array.isArray(status.value?.strategies) ? status.value.strategies : []));
const topReasons = computed(() =>
  Array.isArray(topPolicy.value?.reasons) ? topPolicy.value.reasons.slice(0, 5) : [],
);

function entryModeLabel(mode) {
  return (
    {
      STANDARD_ENTRY: '标准入场',
      OPPORTUNITY_ENTRY: '机会入场',
      BLOCKED: '阻断',
    }[mode] || '未知'
  );
}

function directionLabel(direction) {
  return direction === 'LONG' ? '买入观察' : direction === 'SHORT' ? '卖出观察' : '方向待确认';
}

function exitLabel(mode) {
  return mode === 'LET_PROFIT_RUN' ? '让利润奔跑' : '不持仓';
}

function pillClass(mode) {
  if (mode === 'STANDARD_ENTRY') return 'qg-usdjpy-pill--standard';
  if (mode === 'OPPORTUNITY_ENTRY') return 'qg-usdjpy-pill--opportunity';
  return 'qg-usdjpy-pill--blocked';
}

function evidenceClass(ok) {
  return ok ? 'qg-usdjpy-ok' : 'qg-usdjpy-bad';
}

function boolLabel(ok) {
  return ok ? '通过' : '缺失或未通过';
}

function formatLot(value) {
  const number = Number(value || 0);
  return number.toFixed(2);
}

function formatScore(value) {
  const number = Number(value || 0);
  return number.toFixed(1);
}

function firstReason(item) {
  const reasons = Array.isArray(item?.reasons) ? item.reasons : [];
  return reasons[0] || '无';
}

async function load() {
  loading.value = true;
  error.value = '';
  try {
    status.value = await fetchUSDJPYStrategyLabStatus();
  } catch (err) {
    error.value = err?.message || 'USDJPY 策略政策加载失败';
  } finally {
    loading.value = false;
  }
}

async function runChain() {
  loading.value = true;
  error.value = '';
  try {
    status.value = await runUSDJPYStrategyLab();
  } catch (err) {
    error.value = err?.message || 'USDJPY 策略政策生成失败';
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<style scoped>
.qg-usdjpy-panel {
  border: 1px solid var(--qg-border-subtle, rgb(148, 163, 184, 0.22));
  border-radius: 20px;
  padding: 18px;
  background: var(--qg-surface-elevated, rgb(15, 23, 42, 0.72));
  color: var(--qg-text-primary, #e5e7eb);
  overflow: hidden;
}

.qg-usdjpy-panel__header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
  margin-bottom: 16px;
}

.qg-usdjpy-panel__eyebrow {
  margin: 0 0 4px;
  font-size: 12px;
  color: var(--qg-text-muted, #94a3b8);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.qg-usdjpy-panel h2,
.qg-usdjpy-panel h3,
.qg-usdjpy-panel__subtitle {
  margin: 0;
}

.qg-usdjpy-panel h2 {
  font-size: 20px;
}

.qg-usdjpy-panel h3 {
  font-size: 15px;
  margin-bottom: 12px;
}

.qg-usdjpy-panel__subtitle {
  margin-top: 6px;
  color: var(--qg-text-secondary, #cbd5e1);
  line-height: 1.5;
}

.qg-usdjpy-panel__actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.qg-usdjpy-panel button {
  border: 1px solid var(--qg-border-subtle, rgb(148, 163, 184, 0.28));
  border-radius: 12px;
  background: var(--qg-surface-muted, rgb(30, 41, 59, 0.84));
  color: inherit;
  padding: 8px 12px;
  cursor: pointer;
}

.qg-usdjpy-panel button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.qg-usdjpy-panel__kpis {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 14px;
}

.qg-usdjpy-panel__kpis article,
.qg-usdjpy-panel__card,
.qg-usdjpy-panel__table-card {
  border: 1px solid var(--qg-border-subtle, rgb(148, 163, 184, 0.18));
  border-radius: 16px;
  background: var(--qg-surface, rgb(2, 6, 23, 0.36));
}

.qg-usdjpy-panel__kpis article {
  padding: 12px;
  min-width: 0;
}

.qg-usdjpy-panel__kpis span {
  color: var(--qg-text-muted, #94a3b8);
  font-size: 12px;
}

.qg-usdjpy-panel__kpis strong {
  display: block;
  margin-top: 6px;
  font-size: 24px;
  font-variant-numeric: tabular-nums;
}

.qg-usdjpy-panel__grid {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(260px, 0.8fr);
  gap: 12px;
  margin-bottom: 14px;
}

.qg-usdjpy-panel__card,
.qg-usdjpy-panel__table-card {
  padding: 14px;
  min-width: 0;
}

.qg-usdjpy-panel__topline {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.qg-usdjpy-panel dl {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin: 0 0 12px;
}

.qg-usdjpy-panel dt {
  color: var(--qg-text-muted, #94a3b8);
  font-size: 12px;
}

.qg-usdjpy-panel dd {
  margin: 2px 0 0;
  font-variant-numeric: tabular-nums;
}

.qg-usdjpy-panel ul {
  margin: 0;
  padding-left: 18px;
  color: var(--qg-text-secondary, #cbd5e1);
}

.qg-usdjpy-pill {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 3px 9px;
  font-size: 12px;
  white-space: nowrap;
}

.qg-usdjpy-pill--standard {
  background: rgb(34, 197, 94, 0.18);
  color: #86efac;
}

.qg-usdjpy-pill--opportunity {
  background: rgb(234, 179, 8, 0.18);
  color: #fde68a;
}

.qg-usdjpy-pill--blocked {
  background: rgb(248, 113, 113, 0.18);
  color: #fecaca;
}

.qg-usdjpy-ok {
  color: #86efac;
}

.qg-usdjpy-bad {
  color: #fecaca;
}

.qg-usdjpy-panel__table-wrap {
  width: 100%;
  overflow-x: auto;
}

.qg-usdjpy-panel table {
  width: 100%;
  border-collapse: collapse;
  min-width: 720px;
}

.qg-usdjpy-panel th,
.qg-usdjpy-panel td {
  border-bottom: 1px solid var(--qg-border-subtle, rgb(148, 163, 184, 0.16));
  padding: 8px;
  text-align: left;
  vertical-align: top;
}

.qg-usdjpy-panel th {
  color: var(--qg-text-muted, #94a3b8);
  font-weight: 600;
}

.qg-usdjpy-panel__state {
  padding: 18px;
  border-radius: 12px;
  background: rgb(15, 23, 42, 0.42);
}

.qg-usdjpy-panel__state--error {
  color: #fecaca;
}

@media (width <= 900px) {
  .qg-usdjpy-panel__header,
  .qg-usdjpy-panel__grid {
    grid-template-columns: 1fr;
    display: grid;
  }

  .qg-usdjpy-panel__kpis {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (width <= 520px) {
  .qg-usdjpy-panel {
    padding: 12px;
    border-radius: 14px;
  }

  .qg-usdjpy-panel__kpis {
    grid-template-columns: 1fr;
  }

  .qg-usdjpy-panel dl {
    grid-template-columns: 1fr;
  }

  .qg-usdjpy-panel__table-wrap {
    overflow-x: visible;
  }

  .qg-usdjpy-panel table,
  .qg-usdjpy-panel tbody,
  .qg-usdjpy-panel tr,
  .qg-usdjpy-panel td {
    display: block;
    width: 100%;
    min-width: 0;
  }

  .qg-usdjpy-panel table {
    border-collapse: separate;
    border-spacing: 0;
  }

  .qg-usdjpy-panel thead {
    display: none;
  }

  .qg-usdjpy-panel tr {
    border: 1px solid var(--qg-border-subtle, rgb(148, 163, 184, 0.16));
    border-radius: 12px;
    padding: 10px;
    margin-bottom: 10px;
    background: rgb(15, 23, 42, 0.34);
  }

  .qg-usdjpy-panel td {
    display: grid;
    grid-template-columns: minmax(68px, 0.42fr) minmax(0, 1fr);
    gap: 10px;
    border-bottom: 0;
    padding: 5px 0;
    overflow-wrap: anywhere;
  }

  .qg-usdjpy-panel td::before {
    content: attr(data-label);
    color: var(--qg-text-muted, #94a3b8);
    font-size: 12px;
    font-weight: 600;
  }
}
</style>
