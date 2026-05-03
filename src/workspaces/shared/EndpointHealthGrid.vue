<template>
  <section class="qg-endpoint-grid" aria-label="数据来源状态">
    <article v-for="(item, index) in items" :key="item.endpoint || item.path || item.source || item.label || index" class="qg-endpoint-card">
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

defineProps({
  items: { type: Array, default: () => [] },
});

function displayStatus(item) {
  const value = String(item?.statusLabel || item?.status || '').toLowerCase();
  if (['ok', 'available', 'ready', 'connected', 'healthy'].includes(value)) return '正常';
  if (['warn', 'warning', 'pending', 'degraded'].includes(value)) return '待确认';
  if (['error', 'failed', 'fail', 'offline', 'missing'].includes(value)) return '异常';
  if (['locked', 'disabled'].includes(value)) return '已锁定';
  return item?.statusLabel || item?.status || '未知';
}
</script>
