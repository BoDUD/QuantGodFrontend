<template>
  <dl class="qg-key-value-list">
    <div v-for="item in normalizedItems" :key="item.key || item.label" class="qg-key-value-list__row">
      <dt>{{ item.label }}</dt>
      <dd>
        <StatusPill
          v-if="item.status"
          :status="item.status"
          :label="formatDisplayValue(item.value ?? item.status)"
        />
        <span v-else>{{ formatDisplayValue(item.value) }}</span>
        <small v-if="item.hint">{{ item.hint }}</small>
      </dd>
    </div>
  </dl>
</template>

<script setup>
import { computed } from 'vue';
import StatusPill from './StatusPill.vue';
import { formatDisplayValue } from '../../utils/displayText.js';

const props = defineProps({
  items: { type: Array, default: () => [] },
});

const normalizedItems = computed(() => props.items.filter((item) => item && item.label));
</script>
