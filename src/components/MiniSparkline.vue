<template>
  <svg class="qg-mini-sparkline" viewBox="0 0 92 28" role="img" :aria-label="label">
    <polyline
      v-if="points"
      :points="points"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <line v-else x1="4" y1="14" x2="88" y2="14" stroke="currentColor" stroke-width="2" opacity="0.45" />
  </svg>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  values: { type: Array, default: () => [] },
  label: { type: String, default: 'mini sparkline' },
});

const points = computed(() => {
  const nums = props.values.map(Number).filter(Number.isFinite).slice(-18);
  if (nums.length < 2) return '';
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const span = max - min || 1;
  return nums
    .map((value, index) => {
      const x = 4 + (index / (nums.length - 1)) * 84;
      const y = 24 - ((value - min) / span) * 20;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
});
</script>
