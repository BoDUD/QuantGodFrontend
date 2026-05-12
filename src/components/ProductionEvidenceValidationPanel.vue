<template>
  <section class="production-evidence-card">
    <header class="production-evidence-card__header">
      <div>
        <p class="eyebrow">P4-6 Production Evidence</p>
        <h3>生产证据验证</h3>
        <p class="muted">验证历史数据、策略一致性、执行反馈和 GA 多代稳定性；只读，不触发交易。</p>
      </div>
      <div class="production-evidence-card__actions">
        <button type="button" @click="load" :disabled="loading">刷新</button>
        <button type="button" @click="run" :disabled="loading">生成验证报告</button>
      </div>
    </header>

    <div v-if="loading" class="muted">正在读取生产证据...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-else class="production-evidence-grid">
      <article v-for="item in cards" :key="item.key" class="production-evidence-cardlet">
        <span class="label">{{ item.label }}</span>
        <strong :class="['status', item.status.toLowerCase()]">{{ item.status }}</strong>
        <p>{{ item.detail }}</p>
      </article>
    </div>

    <div v-if="blockers.length" class="production-evidence-blockers">
      <h4>主要阻断</h4>
      <ul>
        <li v-for="item in blockers" :key="item">{{ item }}</li>
      </ul>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { fetchProductionEvidenceStatus, runProductionEvidenceValidation } from '../services/productionEvidenceApi.js';

const loading = ref(false);
const error = ref('');
const payload = ref(null);

const report = computed(() => payload.value?.report || payload.value || {});
const blockers = computed(() => report.value?.blockersZh || []);
const cards = computed(() => {
  const r = report.value || {};
  return [
    {
      key: 'history',
      label: '历史数据',
      status: r.historyProduction?.status || 'UNKNOWN',
      detail: r.historyProduction?.recommendation || '等待历史同步验证',
    },
    {
      key: 'parity',
      label: '策略一致性',
      status: r.strategyFamilyParity?.status || 'UNKNOWN',
      detail: `通过 ${r.strategyFamilyParity?.passCount || 0} / 缺失 ${r.strategyFamilyParity?.missingCount || 0} / 失败 ${r.strategyFamilyParity?.failCount || 0}`,
    },
    {
      key: 'feedback',
      label: '执行反馈',
      status: r.liveExecutionFeedbackCoverage?.status || 'UNKNOWN',
      detail: `样本 ${r.liveExecutionFeedbackCoverage?.sampleCount || 0}，字段覆盖 ${(r.liveExecutionFeedbackCoverage?.fieldCoverage || 0) * 100}%`,
    },
    {
      key: 'ga',
      label: 'GA 多代稳定性',
      status: r.gaMultiGenerationStability?.status || 'UNKNOWN',
      detail: `代数 ${r.gaMultiGenerationStability?.currentGeneration || 0}，候选 ${r.gaMultiGenerationStability?.candidateCount || 0}`,
    },
  ];
});

async function load() {
  loading.value = true;
  error.value = '';
  try {
    payload.value = await fetchProductionEvidenceStatus();
  } catch (err) {
    error.value = err?.message || String(err);
  } finally {
    loading.value = false;
  }
}

async function run() {
  loading.value = true;
  error.value = '';
  try {
    payload.value = await runProductionEvidenceValidation();
  } catch (err) {
    error.value = err?.message || String(err);
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<style scoped>
.production-evidence-card {
  border: 1px solid var(--qg-border, rgba(148, 163, 184, 0.22));
  border-radius: 16px;
  padding: 16px;
  background: var(--qg-surface, rgba(15, 23, 42, 0.72));
  margin-block: 16px;
}
.production-evidence-card__header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
}
.production-evidence-card__actions { display: flex; gap: 8px; flex-wrap: wrap; }
.production-evidence-card__actions button {
  border: 1px solid var(--qg-border, rgba(148, 163, 184, 0.3));
  border-radius: 999px;
  padding: 6px 12px;
  background: transparent;
  color: inherit;
}
.eyebrow { margin: 0 0 4px; font-size: 12px; letter-spacing: .08em; text-transform: uppercase; opacity: .72; }
.muted { opacity: .72; }
.error { color: #fca5a5; }
.production-evidence-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
.production-evidence-cardlet { padding: 12px; border-radius: 12px; background: rgba(15, 23, 42, 0.5); min-width: 0; }
.label { display: block; opacity: .72; font-size: 12px; margin-bottom: 6px; }
.status { display: block; font-size: 18px; }
.status.pass { color: #86efac; }
.status.warn, .status.unknown { color: #fde68a; }
.status.fail { color: #fca5a5; }
.production-evidence-blockers { margin-top: 12px; }
@media (max-width: 900px) { .production-evidence-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 520px) { .production-evidence-card__header { flex-direction: column; } .production-evidence-grid { grid-template-columns: 1fr; } }
</style>
