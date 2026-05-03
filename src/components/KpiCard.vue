<template>
  <article class="qg-kpi-card" :data-tone="tone">
    <div class="qg-kpi-card__header">
      <span>{{ title }}</span>
      <span v-if="badge" class="qg-ux-pill">{{ badge }}</span>
    </div>
    <div class="qg-kpi-card__value qg-number" :class="valueClass">{{ displayValue }}</div>
    <div v-if="unit" class="qg-kpi-card__unit">{{ unit }}</div>
    <div v-if="trend || detail" class="qg-kpi-card__trend" :class="trendClass">
      <span v-if="trend">{{ trend }}</span>
      <span v-if="detail" class="qg-kpi-card__detail">{{ detail }}</span>
    </div>
  </article>
</template>

<script setup>
import { computed } from 'vue';
import { formatNumber, formatPnl, numberToneClass } from '../composables/useNumberFormat.js';

const props = defineProps({
  title: { type: String, required: true },
  value: { type: [String, Number], default: '—' },
  unit: { type: String, default: '' },
  badge: { type: String, default: '' },
  detail: { type: String, default: '' },
  trend: { type: String, default: '' },
  tone: { type: String, default: 'neutral' },
  currency: { type: Boolean, default: false },
  pnl: { type: Boolean, default: false },
});

const displayValue = computed(() => {
  if (props.pnl) return formatPnl(props.value, { currency: props.currency });
  if (props.currency) return formatPnl(props.value, { currency: true });
  return typeof props.value === 'number' ? formatNumber(props.value) : props.value;
});

const valueClass = computed(() => {
  if (props.tone === 'positive') return 'qg-text-positive';
  if (props.tone === 'negative') return 'qg-text-negative';
  if (props.pnl || props.currency) return numberToneClass(props.value);
  return '';
});

const trendClass = computed(() => (props.tone === 'warning' ? 'qg-text-warning' : valueClass.value));
</script>
