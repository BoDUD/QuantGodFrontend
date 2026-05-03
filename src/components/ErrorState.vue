<template>
  <div class="qg-state-card" role="alert">
    <strong>{{ title }}</strong>
    <p>{{ message }}</p>
  </div>
</template>

<script setup>
defineProps({
  title: { type: String, default: '读取失败' },
  message: { type: String, default: '请检查后端 /api/* 服务和本地网络。' },
});
</script>
