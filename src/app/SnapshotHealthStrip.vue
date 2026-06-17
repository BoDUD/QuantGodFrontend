<template>
  <!-- eslint-disable vue/max-attributes-per-line, vue/singleline-html-element-content-newline -->
  <section class="snapshot-health" :class="`snapshot-health--${tone}`" aria-live="polite">
    <div class="snapshot-health__summary">
      <p class="snapshot-health__eyebrow">系统数据源</p>
      <strong :title="rootCause.rootCauseLine">{{ title }}</strong>
      <span :title="detailLine">{{ detailLine }}</span>
      <span v-if="evidenceLine" class="snapshot-health__evidence" :title="evidenceLine">
        {{ evidenceLine }}
      </span>
      <span v-if="usableLine" class="snapshot-health__usable" :title="usableLine">
        {{ usableLine }}
      </span>
      <span v-if="actionLine" class="snapshot-health__action" :title="actionLine">{{ actionLine }}</span>
      <div v-if="initialized" class="snapshot-health__badges" aria-label="Snapshot recovery priority">
        <span>P0 {{ impactSummary.p0Count }}</span>
        <span>P1 {{ impactSummary.p1Count }}</span>
        <span>P2 {{ impactSummary.p2Count }}</span>
      </div>
    </div>

    <div class="snapshot-health__lanes" aria-label="Snapshot bridge impact">
      <a
        v-for="row in laneRows"
        :key="row.前端区域"
        class="snapshot-health__lane"
        :data-priority="row.修复优先级"
        :href="row.打开页面"
        :title="`${row.前端区域}｜${row.核对端点}｜${row.下一步}`"
      >
        <span>{{ row.前端区域 }} · {{ row.修复优先级 }}</span>
        <strong>{{ row.状态 }}</strong>
        <small>{{ row.可信范围 }}</small>
        <small class="snapshot-health__lane-action">{{ row.下一步 }}</small>
      </a>
    </div>

    <button type="button" class="snapshot-health__refresh" :disabled="loading" @click="load">
      {{ loading ? '刷新中' : '刷新' }}
    </button>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, shallowReactive } from 'vue';
import { loadSnapshotHealthCore } from '../services/domainApi.js';
import {
  buildFrontendSnapshotRecoveryRows,
  buildSnapshotImpactSummary,
  buildSnapshotRootCauseBanner,
  normalizeDashboardSnapshot,
} from '../workspaces/dashboard/dashboardModel.js';

const state = shallowReactive({
  latest: null,
  state: null,
  mt5Snapshot: null,
  secondaryMt5Snapshot: null,
  hfmCrypto: null,
  profitTarget: null,
  usdJpyLiveLoop: null,
  productionEvidenceValidation: null,
  liveAutomationOrchestrator: null,
  championPromotionGate: null,
  liveAutomationReleaseReadiness: null,
  releaseTokenEvidenceReview: null,
  liveExecutionLaneSelector: null,
  simTargetExecutionReviewSummary: null,
});

const loading = ref(false);
const initialized = ref(false);
const error = ref('');
let loadController = null;
let refreshTimer = null;
let loadRunId = 0;

const snapshot = computed(() => normalizeDashboardSnapshot(state));
const rootCause = computed(() => buildSnapshotRootCauseBanner(snapshot.value));
const impactSummary = computed(() => buildSnapshotImpactSummary(snapshot.value));
const laneRows = computed(() => buildFrontendSnapshotRecoveryRows(snapshot.value));
const tone = computed(() => {
  if (error.value) return 'blocked';
  if (!initialized.value) return 'warn';
  return rootCause.value.status || 'warn';
});
const title = computed(() => {
  if (error.value) return '核心快照桥读取失败';
  if (!initialized.value) return '正在核对全局快照桥';
  if (rootCause.value.status === 'blocked' && rootCause.value.label) return rootCause.value.label;
  return rootCause.value.title;
});
const detailLine = computed(() => {
  if (error.value) return error.value;
  if (!initialized.value) return '正在读取 /api/latest、Live12、Live16 和 HFM Crypto 核心状态。';
  return [
    rootCause.value.rootCauseLine,
    impactSummary.value.affectedAreaLine,
    impactSummary.value.priorityLine,
  ]
    .filter(Boolean)
    .join('；');
});
const evidenceLine = computed(() => {
  if (error.value || !initialized.value) return '';
  return rootCause.value.evidenceLine || impactSummary.value.evidenceLine || '';
});
const usableLine = computed(() => {
  if (error.value || !initialized.value) return '';
  return impactSummary.value.usableLine || rootCause.value.usableLine || '';
});
const actionLine = computed(() => {
  if (error.value || !initialized.value) return '';
  return [impactSummary.value.trustedScopeLine, impactSummary.value.nextActionLine]
    .filter(Boolean)
    .join('；');
});

function abortLoad() {
  loadController?.abort();
  loadController = null;
}

async function load() {
  abortLoad();
  const runId = loadRunId + 1;
  loadRunId = runId;
  const controller = new globalThis.AbortController();
  loadController = controller;
  loading.value = true;
  error.value = '';
  try {
    const coreState = await loadSnapshotHealthCore({ signal: controller.signal });
    if (controller.signal.aborted || runId !== loadRunId) return;
    Object.assign(state, coreState);
    initialized.value = true;
  } catch (exc) {
    if (controller.signal.aborted || runId !== loadRunId) return;
    error.value = exc?.message || '无法读取核心快照桥。';
  } finally {
    if (runId === loadRunId) {
      loading.value = false;
      loadController = null;
    }
  }
}

onMounted(() => {
  load();
  refreshTimer = globalThis.setInterval(load, 30000);
});

onBeforeUnmount(() => {
  abortLoad();
  if (refreshTimer) globalThis.clearInterval(refreshTimer);
});
</script>

<style scoped>
.snapshot-health {
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(340px, 1fr) auto;
  gap: 12px;
  align-items: center;
  min-width: 0;
  padding: 10px clamp(16px, 2vw, 28px);
  background: rgb(9 20 38 / 88%);
  border-bottom: 1px solid rgb(129 151 178 / 22%);
}

.snapshot-health--ok {
  background: rgb(8 34 31 / 88%);
  border-bottom-color: rgb(51 217 154 / 24%);
}

.snapshot-health--blocked {
  background: rgb(39 16 27 / 88%);
  border-bottom-color: rgb(255 107 134 / 28%);
}

.snapshot-health__summary {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.snapshot-health__eyebrow {
  margin: 0;
  color: var(--qg-text-muted);
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0;
  text-transform: uppercase;
}

.snapshot-health__summary strong {
  overflow-wrap: anywhere;
  color: var(--qg-text);
  font-size: 14px;
  line-height: 1.25;
}

.snapshot-health__summary span {
  display: block;
  max-height: 34px;
  overflow: hidden;
  overflow-wrap: anywhere;
  color: var(--qg-text-muted);
  font-size: 12px;
  line-height: 1.35;
}

.snapshot-health__action {
  color: rgb(226 232 240 / 92%);
}

.snapshot-health__evidence {
  color: rgb(255 255 255 / 78%);
  font-size: 11px;
}

.snapshot-health__usable {
  color: rgb(134 239 172 / 88%);
  font-size: 11px;
}

.snapshot-health__badges {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  min-width: 0;
}

.snapshot-health__badges span {
  border: 1px solid rgb(148 163 184 / 18%);
  border-radius: 999px;
  padding: 2px 7px;
  background: rgb(255 255 255 / 5%);
  color: var(--qg-text);
  font-size: 11px;
  font-weight: 800;
  line-height: 1.25;
}

.snapshot-health__lanes {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  min-width: 0;
}

.snapshot-health__lane {
  display: grid;
  gap: 2px;
  min-width: 0;
  padding: 8px 10px;
  color: inherit;
  text-decoration: none;
  background: rgb(255 255 255 / 4%);
  border: 1px solid rgb(148 163 184 / 18%);
  border-radius: 8px;
}

.snapshot-health__lane:hover {
  border-color: rgb(56 189 248 / 42%);
  background: rgb(56 189 248 / 9%);
}

.snapshot-health__lane[data-priority='P0'] {
  border-color: rgb(255 107 134 / 32%);
  background: rgb(255 107 134 / 8%);
}

.snapshot-health__lane[data-priority='P1'] {
  border-color: rgb(251 191 36 / 28%);
  background: rgb(251 191 36 / 7%);
}

.snapshot-health__lane span {
  overflow: hidden;
  color: var(--qg-text-muted);
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.snapshot-health__lane strong {
  overflow: hidden;
  color: var(--qg-text);
  font-size: 12px;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.snapshot-health__lane small {
  display: -webkit-box;
  overflow: hidden;
  color: var(--qg-text-muted);
  font-size: 11px;
  line-height: 1.3;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.snapshot-health__lane-action {
  color: rgb(226 232 240 / 82%);
}

.snapshot-health__refresh {
  min-width: 64px;
  border: 1px solid rgb(148 163 184 / 26%);
  border-radius: 8px;
  padding: 8px 10px;
  color: var(--qg-text);
  background: rgb(255 255 255 / 6%);
}

.snapshot-health__refresh:disabled {
  cursor: wait;
  opacity: 0.64;
}

@media (width <= 960px) {
  .snapshot-health {
    grid-template-columns: minmax(0, 1fr);
  }

  .snapshot-health__lanes {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (width <= 360px) {
  .snapshot-health__lanes {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
