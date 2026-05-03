<template>
  <span class="qg-status-pill" :class="`qg-status-pill--${normalizedStatus}`">
    <span class="qg-status-pill__dot" aria-hidden="true"></span>
    {{ labelText }}
  </span>
</template>

<script setup>
import { computed } from 'vue';
import { humanizeStatus, statusTone } from '../../utils/displayText.js';

const props = defineProps({
  status: { type: String, default: 'unknown' },
  label: { type: String, default: '' },
});

const normalizedStatus = computed(() => {
  return statusTone(props.status);
});

const labelText = computed(() => humanizeStatus(props.label || props.status, '未同步'));
</script>
