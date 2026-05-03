<template>
  <div class="qg-state-card" role="status" aria-live="polite">
    <strong>{{ title }}</strong>
    <p>{{ description }}</p>
  </div>
</template>

<script setup>
defineProps({
  title: { type: String, default: '正在加载' },
  description: { type: String, default: '正在从后端 /api/* facade 读取最新状态。' },
});
</script>
