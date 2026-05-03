<template>
  <WorkspaceFrame
    eyebrow="ParamLab"
    title="参数实验与报告回灌"
    description="查看批处理、实验结果、调度、失败恢复和测试器窗口证据；全部只读，不写入实盘配置。"
    :loading="loading"
    :error="error"
    @refresh="load"
  >
    <section class="qg-readonly-banner" aria-label="ParamLab 安全边界">
      <StatusPill status="locked" label="仅测试器证据" />
      <span>
        ParamLab 工作区仅展示实验、调度和恢复证据；不会写 live preset，也不会触发实盘交易或治理升级。
      </span>
    </section>

    <MetricGrid :items="viewModel.metrics" />
    <EndpointHealthGrid :items="viewModel.endpoints" />

    <div class="qg-domain-grid qg-domain-grid--balanced">
      <section class="qg-domain-card">
        <header class="qg-domain-card__header">
          <h2>安全边界</h2>
          <StatusPill status="locked" label="需要人工闸门" />
        </header>
        <KeyValueList :items="viewModel.safety" />
      </section>

      <section class="qg-domain-card">
        <header class="qg-domain-card__header">
          <h2>批次状态</h2>
          <StatusPill :status="viewModel.batch.status" :label="viewModel.batch.statusLabel" />
        </header>
        <KeyValueList :items="viewModel.batch.rows" />
      </section>

      <section class="qg-domain-card">
        <header class="qg-domain-card__header">
          <h2>排队调度</h2>
          <StatusPill :status="viewModel.scheduler.status" :label="viewModel.scheduler.statusLabel" />
        </header>
        <KeyValueList :items="viewModel.scheduler.rows" />
      </section>

      <section class="qg-domain-card">
        <header class="qg-domain-card__header">
          <h2>失败恢复与测试窗口</h2>
          <StatusPill :status="viewModel.recovery.status" :label="viewModel.recovery.statusLabel" />
        </header>
        <KeyValueList :items="viewModel.recovery.rows" />
      </section>
    </div>

    <LedgerTable title="实验结果排行" :rows="viewModel.resultRows" :limit="20" />
    <LedgerTable title="调度流水" :rows="viewModel.schedulerRows" :limit="20" />

    <details class="qg-raw-evidence">
      <summary>技术证据</summary>
      <div class="qg-domain-grid">
        <JsonPreview
          v-for="item in viewModel.rawEvidence"
          :key="item.source"
          :title="item.title"
          :source="item.source"
          :payload="item.payload"
        />
      </div>
    </details>
  </WorkspaceFrame>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';

import { loadParamLabWorkspace } from '../../services/domainApi.js';
import WorkspaceFrame from '../shared/WorkspaceFrame.vue';
import MetricGrid from '../shared/MetricGrid.vue';
import EndpointHealthGrid from '../shared/EndpointHealthGrid.vue';
import StatusPill from '../shared/StatusPill.vue';
import KeyValueList from '../shared/KeyValueList.vue';
import LedgerTable from '../shared/LedgerTable.vue';
import JsonPreview from '../shared/JsonPreview.vue';
import { buildParamLabViewModel } from './paramlabModel.js';

const loading = ref(false);
const error = ref('');
const state = reactive({
  status: null,
  results: null,
  scheduler: null,
  recovery: null,
  reportWatcher: null,
  testerWindow: null,
  resultRows: [],
  schedulerRows: [],
});

const viewModel = computed(() => buildParamLabViewModel(state));

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const nextState = await loadParamLabWorkspace({ limit: 250 });
    Object.assign(state, nextState || {});
  } catch (exc) {
    error.value = exc?.message || '参数实验加载失败';
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>
