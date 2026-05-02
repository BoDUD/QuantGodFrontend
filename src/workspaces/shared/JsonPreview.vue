<template>
  <section class="qg-json-preview">
    <header>
      <h3>{{ title }}</h3>
      <span v-if="source" class="qg-json-preview__source">{{ source }}</span>
    </header>
    <pre>{{ formatted }}</pre>
  </section>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  title: { type: String, required: true },
  payload: { type: [Object, Array, String, Number, Boolean], default: null },
  source: { type: String, default: '' },
});

const formatted = computed(() => {
  if (props.payload === null || props.payload === undefined) return 'No data';
  if (typeof props.payload === 'string') return props.payload;
  return JSON.stringify(props.payload, null, 2);
});
</script>
