<template>
  <section class="analysis-history">
    <header>
      <div>
        <h3>历史分析</h3>
        <small>{{ groupedItems.length }} 个分组 / 最近 {{ limitedItems.length }} 条</small>
      </div>
      <button type="button" @click="$emit('refresh')">刷新</button>
    </header>
    <div v-if="groupedItems.length" class="analysis-history__summary">
      <span v-for="group in groupedItems" :key="group.key">{{ group.symbol }} {{ actionText(group.action) }} × {{ group.count }}</span>
    </div>
    <div class="analysis-history__list">
      <button
        v-for="item in limitedItems"
        :key="item.id"
        type="button"
        class="analysis-history__item"
        @click="$emit('select', item.id)"
      >
        <span>{{ item.symbol || '未知品种' }} · {{ actionText(item.action) }}</span>
        <small>{{ timeText(item) }}</small>
      </button>
    </div>
    <p v-if="!items.length" class="analysis-history__empty">暂无历史记录</p>
  </section>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  items: { type: Array, default: () => [] },
});

defineEmits(['refresh', 'select']);

const limitedItems = computed(() => props.items.slice(0, 8));

const groupedItems = computed(() => {
  const groups = new Map();
  for (const item of props.items) {
    const symbol = item?.symbol || '未知品种';
    const action = item?.action || '-';
    const key = `${symbol}:${action}`;
    const existing = groups.get(key) || { key, symbol, action, count: 0 };
    existing.count += 1;
    groups.set(key, existing);
  }
  return [...groups.values()].slice(0, 5);
});

function actionText(action) {
  const text = String(action || '').toUpperCase();
  if (text === 'BUY') return '做多';
  if (text === 'SELL') return '做空';
  if (text === 'HOLD') return '观望';
  return text && text !== '-' ? text : '未定';
}

function timeText(item) {
  const raw = item?.generatedAtIso || item?.generatedAt || '';
  if (raw) {
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  }
  return item?.id || '无时间';
}
</script>

<style scoped>
.analysis-history {
  box-sizing: border-box;
  min-width: 0;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 16px;
  padding: 12px;
  background: rgba(15, 23, 42, 0.72);
}
.analysis-history header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}
.analysis-history header div {
  display: grid;
  gap: 3px;
  min-width: 0;
}
.analysis-history h3 {
  margin: 0;
  color: #e5eefc;
}
.analysis-history header small {
  color: #94a3b8;
  font-size: 12px;
}
.analysis-history button {
  cursor: pointer;
}
.analysis-history header button {
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 10px;
  padding: 6px 10px;
  background: rgba(15, 23, 42, 0.85);
  color: #cbd5e1;
}
.analysis-history__summary {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
}
.analysis-history__summary span {
  border: 1px solid rgba(56, 189, 248, 0.22);
  border-radius: 999px;
  padding: 4px 8px;
  background: rgba(14, 165, 233, 0.08);
  color: #bae6fd;
  font-size: 12px;
  font-weight: 800;
}
.analysis-history__list {
  display: grid;
  gap: 8px;
  max-height: 460px;
  margin-top: 10px;
  overflow: auto;
  padding-right: 2px;
}
.analysis-history__item {
  box-sizing: border-box;
  display: grid;
  width: 100%;
  gap: 4px;
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 12px;
  padding: 9px;
  background: rgba(30, 41, 59, 0.55);
  color: #e5eefc;
  text-align: left;
  overflow-wrap: anywhere;
}
.analysis-history__item small,
.analysis-history__empty {
  color: #94a3b8;
}
</style>
