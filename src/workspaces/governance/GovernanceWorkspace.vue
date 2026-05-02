<template>
  <WorkspaceFrame
    eyebrow="Governance"
    title="Governance Advisor"
    description="治理、版本门禁与优化计划独立入口。这里只展示 evidence，不执行 promote/demote，也不改变实盘 preset。"
    :loading="loading"
    :error="error"
    @refresh="load"
  >
    <div class="qg-safety-banner qg-safety-banner--locked">
      <strong>治理安全边界：</strong>
      advisory-only / read-only evidence。Version Gate 必须人工授权，前端不能直接执行 promote、demote、preset mutation 或任何交易动作。
    </div>

    <MetricGrid :items="view.metrics" />
    <EndpointHealthGrid :items="view.endpoints" />

    <div class="qg-domain-grid qg-domain-grid--two">
      <section class="qg-panel">
        <header class="qg-panel__header">
          <div>
            <p class="qg-panel__eyebrow">Advisor</p>
            <h3>治理顾问摘要</h3>
          </div>
          <StatusPill :status="view.advisor.status" />
        </header>
        <KeyValueList :items="view.advisor.rows" />
        <ul v-if="view.advisor.reasonList.length" class="qg-reason-list">
          <li v-for="reason in view.advisor.reasonList" :key="reason">{{ reason }}</li>
        </ul>
      </section>

      <section class="qg-panel">
        <header class="qg-panel__header">
          <div>
            <p class="qg-panel__eyebrow">Safety Envelope</p>
            <h3>只读治理边界</h3>
          </div>
          <StatusPill status="locked" label="manual gate" />
        </header>
        <KeyValueList :items="view.safety" />
      </section>
    </div>

    <div class="qg-domain-grid qg-domain-grid--two">
      <section class="qg-panel">
        <header class="qg-panel__header">
          <div>
            <p class="qg-panel__eyebrow">Version Gate</p>
            <h3>升级门禁证据</h3>
          </div>
          <StatusPill :status="view.promotionGate.status" />
        </header>
        <KeyValueList :items="view.promotionGate.rows" />
        <ul v-if="view.promotionGate.reasonList.length" class="qg-reason-list">
          <li v-for="reason in view.promotionGate.reasonList" :key="reason">{{ reason }}</li>
        </ul>
      </section>

      <section class="qg-panel">
        <header class="qg-panel__header">
          <div>
            <p class="qg-panel__eyebrow">Optimizer V2</p>
            <h3>优化计划摘要</h3>
          </div>
          <StatusPill :status="view.optimizer.status" />
        </header>
        <KeyValueList :items="view.optimizer.rows" />
        <ul v-if="view.optimizer.reasonList.length" class="qg-reason-list">
          <li v-for="reason in view.optimizer.reasonList" :key="reason">{{ reason }}</li>
        </ul>
      </section>
    </div>

    <LedgerTable title="Version Registry" :rows="view.versionRows" :limit="20" />

    <details class="qg-raw-details">
      <summary>Raw governance evidence</summary>
      <div class="qg-domain-grid qg-domain-grid--two">
        <JsonPreview
          v-for="item in view.rawEvidence"
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
import { loadGovernanceWorkspace } from '../../services/domainApi.js';
import WorkspaceFrame from '../shared/WorkspaceFrame.vue';
import MetricGrid from '../shared/MetricGrid.vue';
import JsonPreview from '../shared/JsonPreview.vue';
import KeyValueList from '../shared/KeyValueList.vue';
import EndpointHealthGrid from '../shared/EndpointHealthGrid.vue';
import LedgerTable from '../shared/LedgerTable.vue';
import StatusPill from '../shared/StatusPill.vue';
import { buildGovernanceViewModel } from './governanceModel.js';

const loading = ref(false);
const error = ref('');
const state = reactive({
  advisor: null,
  versionRegistry: null,
  promotionGate: null,
  optimizerV2: null,
});

const view = computed(() => buildGovernanceViewModel(state));

async function load() {
  loading.value = true;
  error.value = '';
  try {
    Object.assign(state, await loadGovernanceWorkspace());
  } catch (exc) {
    error.value = exc?.message || 'Failed to load governance workspace';
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>
