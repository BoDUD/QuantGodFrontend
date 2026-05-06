<template>
  <section class="qg-usdjpy-evolution">
    <header class="qg-usdjpy-evolution__header">
      <div>
        <p class="qg-usdjpy-evolution__eyebrow">USDJPY 自学习闭环</p>
        <h2>数据集、回放、调参与提案</h2>
        <p>每天把 EA 守门、错失机会、过早出场和参数候选整理成只读证据；不会自动改实盘。</p>
      </div>
      <div class="qg-usdjpy-evolution__actions">
        <button type="button" :disabled="loading" @click="load">刷新</button>
        <button type="button" :disabled="loading" @click="runFullEvolution">生成复盘闭环</button>
      </div>
    </header>

    <div v-if="loading" class="qg-usdjpy-evolution__state">正在读取 USDJPY 自学习证据...</div>
    <div v-else-if="error" class="qg-usdjpy-evolution__state qg-usdjpy-evolution__state--error">{{ error }}</div>
    <div v-else class="qg-usdjpy-evolution__grid">
      <article class="qg-usdjpy-evolution__card">
        <span>运行数据集</span>
        <strong>{{ datasetSummary.sampleCount || 0 }}</strong>
        <p>
          准入 {{ datasetSummary.readySignalCount || 0 }} / 实盘 {{ datasetSummary.actualEntryCount || 0 }} /
          阻断 {{ datasetSummary.blockedCount || 0 }}
        </p>
      </article>

      <article class="qg-usdjpy-evolution__card">
        <span>回放复盘</span>
        <strong>{{ replayStatus }}</strong>
        <p>错失 {{ replaySummary.missedOpportunityCount || 0 }} / 过早出场 {{ replaySummary.earlyExitCount || 0 }}</p>
      </article>

      <article class="qg-usdjpy-evolution__card">
        <span>参数候选</span>
        <strong>{{ tuningSummary.candidateCount || 0 }}</strong>
        <p>{{ tuning?.statusZh || '等待回放数据生成候选' }}</p>
      </article>

      <article class="qg-usdjpy-evolution__card">
        <span>实盘配置提案</span>
        <strong>{{ proposal?.statusZh || '暂无提案' }}</strong>
        <p>必须人工复核；系统不会自动修改 live preset。</p>
      </article>
    </div>

    <section v-if="scenarioItems.length" class="qg-usdjpy-evolution__list qg-usdjpy-evolution__list--scenarios">
      <h3>回放候选对比</h3>
      <div class="qg-usdjpy-evolution__scenario-grid">
        <article v-for="item in scenarioItems" :key="item.scenario">
          <span>{{ item.labelZh || item.scenario }}</span>
          <strong>{{ formatScenarioDelta(item) }}</strong>
          <p>
            样本 {{ item.sampleCount || 0 }} /
            {{ item.verdict === 'shadow_only' ? '只进入影子验证' : scenarioVerdictZh(item.verdict) }}
          </p>
        </article>
      </div>
      <p class="qg-usdjpy-evolution__note">{{ unitPolicy.note || '回放主口径使用 R 倍数，pips 辅助；USC 只作为账面参考。' }}</p>
    </section>

    <section v-if="candidateItems.length" class="qg-usdjpy-evolution__list">
      <h3>下一轮 tester-only 参数候选</h3>
      <article v-for="item in candidateItems.slice(0, 4)" :key="item.param">
        <strong>{{ item.param }}</strong>
        <span>{{ item.current }} → {{ item.proposed }}</span>
        <p>{{ item.reason }}</p>
        <p>预期影响：{{ item.expectedImpact || '等待回放补证' }}</p>
        <p>风险变化：{{ item.riskDelta || '未知，禁止直接改实盘' }}</p>
      </article>
    </section>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import {
  fetchUSDJPYEvolutionStatus,
  runUSDJPYEvolutionBuild,
  runUSDJPYConfigProposal,
  runUSDJPYParamTuning,
  runUSDJPYReplayReport,
} from '../services/usdjpyStrategyLabApi.js';

const payload = ref(null);
const loading = ref(false);
const error = ref('');

const dataset = computed(() => payload.value?.dataset || {});
const replay = computed(() => payload.value?.replay || {});
const tuning = computed(() => payload.value?.tuning || {});
const proposal = computed(() => payload.value?.proposal || {});
const datasetSummary = computed(() => dataset.value?.summary || {});
const replaySummary = computed(() => replay.value?.summary || {});
const tuningSummary = computed(() => tuning.value?.summary || {});
const candidateItems = computed(() => (Array.isArray(tuning.value?.candidates) ? tuning.value.candidates : []));
const scenarioItems = computed(() => (Array.isArray(replay.value?.scenarioComparisons) ? replay.value.scenarioComparisons : []));
const unitPolicy = computed(() => replay.value?.unitPolicy || {});
const replayStatus = computed(() => replay.value?.statusZh || replay.value?.status || '等待回放');

function formatScenarioDelta(item) {
  if (item.scenario === 'current') {
    return item.netR == null ? '基准待补样本' : `${item.netR}R`;
  }
  if (item.netRDelta == null) {
    return '需要补回放';
  }
  return `${item.netRDelta > 0 ? '+' : ''}${item.netRDelta}R`;
}

function scenarioVerdictZh(verdict) {
  const map = {
    baseline: '当前基准',
    needs_bar_replay: '需要 bar/tick 回放',
    no_action: '暂无动作',
  };
  return map[verdict] || verdict || '待验证';
}

async function load() {
  loading.value = true;
  error.value = '';
  try {
    payload.value = await fetchUSDJPYEvolutionStatus();
  } catch (err) {
    error.value = err?.message || 'USDJPY 自学习闭环加载失败';
  } finally {
    loading.value = false;
  }
}

async function runFullEvolution() {
  loading.value = true;
  error.value = '';
  try {
    await runUSDJPYEvolutionBuild();
    await runUSDJPYReplayReport();
    await runUSDJPYParamTuning();
    await runUSDJPYConfigProposal();
    payload.value = await fetchUSDJPYEvolutionStatus();
  } catch (err) {
    error.value = err?.message || 'USDJPY 自学习闭环生成失败';
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<style scoped>
.qg-usdjpy-evolution {
  border: 1px solid rgba(80, 171, 255, 0.35);
  border-radius: 18px;
  background: linear-gradient(135deg, rgba(8, 29, 53, 0.96), rgba(8, 18, 34, 0.98));
  padding: 22px;
  color: #eaf2ff;
}

.qg-usdjpy-evolution__header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
  margin-bottom: 18px;
}

.qg-usdjpy-evolution__eyebrow {
  margin: 0 0 6px;
  color: #7ecbff;
  font-size: 13px;
  font-weight: 800;
}

.qg-usdjpy-evolution h2,
.qg-usdjpy-evolution h3,
.qg-usdjpy-evolution p {
  margin: 0;
}

.qg-usdjpy-evolution__header p:not(.qg-usdjpy-evolution__eyebrow) {
  color: #aebbd0;
  margin-top: 8px;
}

.qg-usdjpy-evolution__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.qg-usdjpy-evolution button {
  border: 1px solid rgba(126, 203, 255, 0.45);
  border-radius: 12px;
  background: rgba(12, 39, 66, 0.9);
  color: #dff2ff;
  padding: 10px 14px;
  font-weight: 800;
}

.qg-usdjpy-evolution__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 12px;
}

.qg-usdjpy-evolution__card,
.qg-usdjpy-evolution__list article {
  border: 1px solid rgba(145, 170, 210, 0.22);
  border-radius: 14px;
  background: rgba(6, 18, 34, 0.7);
  padding: 16px;
  min-width: 0;
}

.qg-usdjpy-evolution__card span {
  color: #aebbd0;
  font-weight: 700;
}

.qg-usdjpy-evolution__card strong {
  display: block;
  margin-top: 8px;
  font-size: clamp(24px, 3vw, 34px);
  line-height: 1.1;
}

.qg-usdjpy-evolution__card p,
.qg-usdjpy-evolution__list p,
.qg-usdjpy-evolution__list span {
  color: #aebbd0;
  margin-top: 8px;
}

.qg-usdjpy-evolution__list {
  margin-top: 18px;
  display: grid;
  gap: 10px;
}

.qg-usdjpy-evolution__scenario-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  gap: 10px;
}

.qg-usdjpy-evolution__note {
  color: #8ea3bd;
  font-size: 14px;
}

.qg-usdjpy-evolution__state {
  border: 1px solid rgba(145, 170, 210, 0.22);
  border-radius: 14px;
  padding: 18px;
  color: #aebbd0;
}

.qg-usdjpy-evolution__state--error {
  color: #ffb3bd;
}

@media (max-width: 720px) {
  .qg-usdjpy-evolution__header {
    flex-direction: column;
  }
}
</style>
