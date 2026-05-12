<template>
  <section class="qg-usdjpy-evolution__list qg-usdjpy-evolution__list--case-memory">
    <div class="qg-usdjpy-evolution__section-head">
      <div>
        <h3>Case Memory → Strategy JSON Candidate</h3>
        <p>root cause、proposed mutation、shadow Strategy JSON candidate 和 GA seed 只读汇总。</p>
      </div>
      <button type="button" :disabled="loading" @click="$emit('build')">生成经验候选</button>
    </div>

    <div class="qg-usdjpy-evolution__scenario-grid">
      <article>
        <span>候选状态</span>
        <strong>{{ status }}</strong>
        <p>{{ nextAction }}</p>
      </article>
      <article>
        <span>PARITY_FAIL 门禁</span>
        <strong>{{ parityStatus }}</strong>
        <p>{{ parityReason }}</p>
      </article>
      <article>
        <span>Case Memory</span>
        <strong>{{ caseCount }} 条</strong>
        <p>{{ fallbackCaseMemory?.summaryZh || '等待 replay / execution feedback / GA blocker 生成经验。' }}</p>
      </article>
      <article>
        <span>GA seed</span>
        <strong>{{ gaSeedCount }} 条</strong>
        <p>所有候选保持 shadow，只进遗传进化种子池，不下单、不改 live preset。</p>
      </article>
    </div>

    <div v-if="candidateRows.length" class="qg-usdjpy-evolution__table-wrap">
      <table class="qg-usdjpy-evolution__table qg-usdjpy-evolution__table--compact">
        <thead>
          <tr>
            <th>经验</th>
            <th>root cause</th>
            <th>proposed mutation</th>
            <th>shadow Strategy JSON candidate</th>
            <th>GA seed</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in candidateRows" :key="item.candidateId || item.caseId">
            <td>{{ item.caseId || 'CASE_MEMORY' }}</td>
            <td>{{ item.rootCause || item.caseType || 'UNKNOWN' }}</td>
            <td>{{ mutationText(item.proposedMutation || item.mutationHint) }}</td>
            <td>{{ candidateStrategyId(item) }} / {{ validationText(item) }}</td>
            <td>{{ item.priority || 'MEDIUM' }} / {{ item.status || 'shadow' }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-else class="qg-usdjpy-evolution__mini-list">
      <article>
        <span>只读候选</span>
        <strong>{{ emptyTitle }}</strong>
        <p>{{ emptyText }}</p>
      </article>
    </div>

    <p class="qg-usdjpy-evolution__note">
      这个面板只展示 Case Memory 到 Strategy JSON candidate 的转换结果；PARITY_FAIL 会阻断候选进入
      shadow / GA elite / MICRO_LIVE。
    </p>
  </section>
</template>

<script setup>
import { computed } from 'vue';

defineEmits(['build']);

const props = defineProps({
  payload: {
    type: Object,
    default: null,
  },
  fallbackCaseMemory: {
    type: Object,
    default: null,
  },
  loading: {
    type: Boolean,
    default: false,
  },
});

const report = computed(() => props.payload?.report || props.payload || {});
const candidateRows = computed(() => {
  const rows = report.value?.candidates || report.value?.strategyCandidates || [];
  return Array.isArray(rows) ? rows.slice(0, 10) : [];
});
const gaSeedRows = computed(() => {
  const rows = report.value?.gaSeeds || report.value?.gaSeedHints || props.fallbackCaseMemory?.gaSeedHints || [];
  return Array.isArray(rows) ? rows : [];
});
const parityGate = computed(() => report.value?.parityGate || {});
const status = computed(() => report.value?.status || report.value?.candidateStatus || 'WAITING_CASE_MEMORY');
const caseCount = computed(
  () => report.value?.caseSummary?.caseCount || props.fallbackCaseMemory?.caseCount || 0,
);
const gaSeedCount = computed(() => report.value?.gaSeedCount || gaSeedRows.value.length || 0);
const parityStatus = computed(() => parityGate.value?.status || report.value?.parityStatus || 'WAITING_PARITY');
const parityReason = computed(
  () => parityGate.value?.reasonZh || report.value?.parityReasonZh || '等待 Strategy / Replay / EA 一致性结果。',
);
const nextAction = computed(
  () => report.value?.nextActionZh || props.fallbackCaseMemory?.caseMemoryToGA?.nextActionZh || '等待生成候选。',
);
const emptyTitle = computed(() =>
  parityStatus.value === 'PARITY_FAIL' ? 'PARITY_FAIL 已阻断' : '等待候选生成',
);
const emptyText = computed(() =>
  parityStatus.value === 'PARITY_FAIL'
    ? '先修复 Strategy JSON / Python Replay / MQL5 EA 差异，再允许生成 shadow Strategy JSON candidate。'
    : '点击生成经验候选后，系统会把 root cause 转成 proposed mutation 和 GA seed。',
);

function mutationText(value) {
  if (!value) return '等待 proposed mutation';
  if (typeof value === 'string') return value;
  const parts = [value.field, value.action, value.reason].filter(Boolean);
  return parts.length ? parts.join(' / ') : 'proposed mutation';
}

function candidateStrategyId(item) {
  return item?.strategyJson?.strategyId || item?.strategyId || item?.seedId || 'SHADOW_ONLY';
}

function validationText(item) {
  if (item?.validationStatus) return item.validationStatus;
  if (item?.validation?.valid === false) return 'REJECTED';
  if (item?.validation?.valid === true) return 'VALIDATED';
  return 'PENDING';
}
</script>
