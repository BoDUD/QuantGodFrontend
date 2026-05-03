<template>
  <aside class="signal-overlay">
    <label><input v-model="innerTrades" type="checkbox" /> 交易点</label>
    <label><input v-model="innerShadow" type="checkbox" /> 模拟信号</label>
    <p>只读叠加</p>
  </aside>
</template>

<script setup>
import { ref, watch } from 'vue';

const props = defineProps({
  trades: { type: Boolean, default: true },
  shadow: { type: Boolean, default: true },
});
const emit = defineEmits(['update:trades', 'update:shadow']);

const innerTrades = ref(props.trades);
const innerShadow = ref(props.shadow);
watch(
  () => props.trades,
  (value) => {
    innerTrades.value = value;
  },
);
watch(
  () => props.shadow,
  (value) => {
    innerShadow.value = value;
  },
);
watch(innerTrades, (value) => emit('update:trades', value));
watch(innerShadow, (value) => emit('update:shadow', value));
</script>

<style scoped>
.signal-overlay {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  min-width: 0;
  border: 1px solid rgb(148, 163, 184, 0.18);
  border-radius: var(--qg-radius-md);
  padding: 10px;
  background: rgb(15, 23, 42, 0.52);
  color: #cbd5e1;
  font-size: 13px;
}

.signal-overlay label {
  display: inline-flex;
  gap: 6px;
  align-items: center;
}

.signal-overlay p {
  flex-basis: 100%;
  margin: 0;
  color: #94a3b8;
  text-align: right;
}
</style>
