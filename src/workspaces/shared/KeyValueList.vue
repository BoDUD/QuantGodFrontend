<template>
  <dl class="qg-key-value-list">
    <div v-for="item in normalizedItems" :key="item.key || item.label" class="qg-key-value-list__row">
      <dt>{{ item.label }}</dt>
      <dd>
        <StatusPill v-if="item.status" :status="item.status" :label="String(item.value ?? item.status)" />
        <span v-else>{{ item.value ?? '—' }}</span>
        <small v-if="item.hint">{{ item.hint }}</small>
      </dd>
    </div>
  </dl>
</template>

<script setup>
import { computed } from 'vue';
import StatusPill from './StatusPill.vue';

const props = defineProps({
  items: { type: Array, default: () => [] },
});

const normalizedItems = computed(() => props.items.filter((item) => item && item.label));
</script>
