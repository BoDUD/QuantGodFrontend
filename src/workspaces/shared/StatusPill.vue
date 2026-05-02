<template>
  <span class="qg-status-pill" :class="`qg-status-pill--${normalizedStatus}`">
    <span class="qg-status-pill__dot" aria-hidden="true"></span>
    {{ labelText }}
  </span>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  status: { type: String, default: 'unknown' },
  label: { type: String, default: '' },
});

const normalizedStatus = computed(() => {
  const value = String(props.status || 'unknown').toLowerCase();
  if (['ok', 'healthy', 'active', 'online', 'available', 'pass', 'green'].includes(value)) return 'ok';
  if (['warn', 'warning', 'degraded', 'caution', 'pending', 'yellow'].includes(value)) return 'warn';
  if (['error', 'fail', 'failed', 'blocked', 'offline', 'critical', 'red'].includes(value)) return 'error';
  if (['locked', 'disabled', 'dry-run', 'dryrun', 'read-only', 'readonly'].includes(value)) return 'locked';
  return 'unknown';
});

const labelText = computed(() => props.label || props.status || 'unknown');
</script>
