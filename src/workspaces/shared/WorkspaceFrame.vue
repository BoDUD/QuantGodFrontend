<template>
  <section class="qg-domain-workspace">
    <header class="qg-domain-workspace__header">
      <div>
        <p class="qg-eyebrow">{{ eyebrow }}</p>
        <h1>{{ title }}</h1>
        <p>{{ description }}</p>
      </div>
      <button type="button" class="qg-button" :disabled="loading" @click="$emit('refresh')">
        {{ loading ? 'Loading…' : 'Refresh' }}
      </button>
    </header>
    <div v-if="error" class="qg-alert">{{ error }}</div>
    <slot />
  </section>
</template>

<script setup>
defineProps({
  eyebrow: { type: String, default: 'QuantGod Workspace' },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  loading: { type: Boolean, default: false },
  error: { type: String, default: '' },
});

defineEmits(['refresh']);
</script>
