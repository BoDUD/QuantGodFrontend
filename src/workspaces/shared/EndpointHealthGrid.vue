<template>
  <section class="qg-endpoint-grid" aria-label="API endpoint health">
    <article v-for="item in items" :key="item.endpoint" class="qg-endpoint-card">
      <div>
        <strong>{{ item.label }}</strong>
        <small>{{ item.endpoint }}</small>
      </div>
      <StatusPill :status="item.status" :label="item.statusLabel || item.status" />
    </article>
  </section>
</template>

<script setup>
import StatusPill from './StatusPill.vue';

defineProps({
  items: { type: Array, default: () => [] },
});
</script>
