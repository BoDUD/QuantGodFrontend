<template>
  <div class="qg-state-card" role="status">
    <strong>{{ title }}</strong>
    <p>{{ description }}</p>
  </div>
</template>

<script setup>
defineProps({
  title: { type: String, default: '暂无数据' },
  description: { type: String, default: '等待后端 /api/* facade 返回只读数据。' },
});
</script>
