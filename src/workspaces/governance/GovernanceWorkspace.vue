<template>
  <WorkspaceFrame
    eyebrow="Governance"
    title="Governance Advisor"
    description="治理、版本门禁与优化计划独立入口。这里仍然只展示 evidence，不执行 promote/demote 或交易动作。"
    :loading="loading"
    :error="error"
    @refresh="load"
  >
    <MetricGrid :items="metrics" />
    <div class="qg-domain-grid">
      <JsonPreview title="Advisor" source="/api/governance/advisor" :payload="state.advisor" />
      <JsonPreview title="Version Registry" source="/api/governance/version-registry" :payload="state.versionRegistry" />
      <JsonPreview title="Promotion Gate" source="/api/governance/promotion-gate" :payload="state.promotionGate" />
      <JsonPreview title="Optimizer V2" source="/api/governance/optimizer-v2" :payload="state.optimizerV2" />
    </div>
  </WorkspaceFrame>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { loadGovernanceWorkspace } from '../../services/domainApi.js';
import WorkspaceFrame from '../shared/WorkspaceFrame.vue';
import MetricGrid from '../shared/MetricGrid.vue';
import JsonPreview from '../shared/JsonPreview.vue';

const loading = ref(false);
const error = ref('');
const state = reactive({ advisor: null, versionRegistry: null, promotionGate: null, optimizerV2: null });

const metrics = computed(() => [
  { label: 'Advisor', value: state.advisor ? 'available' : 'missing', hint: 'evidence only' },
  { label: 'Version Gate', value: state.promotionGate ? 'available' : 'missing', hint: 'manual gate' },
  { label: 'Safety', value: 'read-only', hint: 'no mutation' },
]);

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
