<template>
  <section class="qg-endpoint-grid" aria-label="数据来源状态">
    <article
      v-for="(item, index) in items"
      :key="item.endpoint || item.path || item.source || item.label || index"
      class="qg-endpoint-card"
    >
      <div>
        <strong>{{ item.label || item.name || '数据来源' }}</strong>
        <small>{{ item.description || item.detail || '本地只读数据源' }}</small>
      </div>
      <StatusPill :status="item.status" :label="displayStatus(item)" />
    </article>
  </section>
</template>

<script setup>
import StatusPill from './StatusPill.vue';
import { humanizeStatus } from '../../utils/displayText.js';

defineProps({
  items: { type: Array, default: () => [] },
});

function displayStatus(item) {
  return humanizeStatus(item?.statusLabel || item?.status, '未同步');
}
</script>
