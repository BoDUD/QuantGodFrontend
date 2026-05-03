<template>
  <header class="kline-toolbar">
    <div class="kline-toolbar__market">
      <SymbolSelector v-model="innerSymbol" :symbols="symbols" label="品种" />
      <label>
        周期
        <select v-model="innerTf">
          <option v-for="timeframe in timeframes" :key="timeframe" :value="timeframe">{{ timeframe }}</option>
        </select>
      </label>
      <label>
        数量
        <input v-model.number="innerBars" type="number" min="50" max="2000" />
      </label>
    </div>
    <div class="kline-toolbar__indicators" aria-label="指标开关">
      <span>指标叠加</span>
      <div>
        <button
          v-for="item in indicatorOptions"
          :key="item.key"
          type="button"
          :class="{ active: innerIndicators.includes(item.key) }"
          @click="toggleIndicator(item.key)"
        >
          {{ item.label }}
        </button>
      </div>
    </div>
    <div class="kline-toolbar__actions">
      <button class="kline-toolbar__refresh" type="button" @click="$emit('refresh')">刷新图表</button>
    </div>
  </header>
</template>

<script setup>
import { watch, ref } from 'vue';
import SymbolSelector from '../SymbolSelector.vue';

const props = defineProps({
  symbol: { type: String, required: true },
  tf: { type: String, default: 'H1' },
  bars: { type: Number, default: 200 },
  indicators: { type: Array, default: () => ['EMA', 'RSI', 'MACD', 'BOLL', 'VOL'] },
  symbols: { type: Array, default: () => [] },
});

const emit = defineEmits(['update:symbol', 'update:tf', 'update:bars', 'update:indicators', 'refresh']);

const timeframes = ['M15', 'H1', 'H4', 'D1'];
const indicatorOptions = [
  { key: 'EMA', label: 'EMA 9/21' },
  { key: 'RSI', label: 'RSI' },
  { key: 'MACD', label: 'MACD' },
  { key: 'BOLL', label: '布林带' },
  { key: 'VOL', label: '成交量' },
];

const innerSymbol = ref(props.symbol);
const innerTf = ref(props.tf);
const innerBars = ref(props.bars);
const innerIndicators = ref([...props.indicators]);

watch(
  () => props.symbol,
  (value) => {
    innerSymbol.value = value;
  },
);
watch(
  () => props.tf,
  (value) => {
    innerTf.value = value;
  },
);
watch(
  () => props.bars,
  (value) => {
    innerBars.value = value;
  },
);
watch(
  () => props.indicators,
  (value) => {
    innerIndicators.value = [...value];
  },
);
watch(innerSymbol, (value) => emit('update:symbol', value));
watch(innerTf, (value) => emit('update:tf', value));
watch(innerBars, (value) => emit('update:bars', Number(value) || 200));
watch(innerIndicators, (value) => emit('update:indicators', value));

function toggleIndicator(key) {
  const next = new Set(innerIndicators.value);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  innerIndicators.value = [...next];
}
</script>

<style scoped>
.kline-toolbar {
  display: grid;
  grid-template-columns: minmax(360px, 1fr) minmax(260px, 0.9fr) auto;
  align-items: stretch;
  gap: 12px;
  min-width: 0;
  padding: 12px;
  border-bottom: 1px solid rgb(148, 163, 184, 0.16);
  background: rgb(2, 6, 23, 0.42);
}

.kline-toolbar__market {
  display: grid;
  grid-template-columns: minmax(180px, 1fr) minmax(92px, 0.34fr) minmax(104px, 0.38fr);
  gap: 10px;
  min-width: 0;
}

.kline-toolbar label {
  display: grid;
  gap: 6px;
  min-width: 0;
  color: #94a3b8;
  font-size: 13px;
}

.kline-toolbar select,
.kline-toolbar input {
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  border: 1px solid rgb(148, 163, 184, 0.28);
  border-radius: 10px;
  padding: 9px 10px;
  background: rgb(15, 23, 42, 0.9);
  color: #e5eefc;
}

.kline-toolbar__indicators {
  display: grid;
  align-content: end;
  gap: 7px;
  min-width: 0;
}

.kline-toolbar__indicators > span {
  color: #94a3b8;
  font-size: 13px;
  font-weight: 800;
}

.kline-toolbar__indicators > div {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  min-width: 0;
}

.kline-toolbar__indicators button,
.kline-toolbar__refresh {
  min-width: 0;
  border: 1px solid rgb(148, 163, 184, 0.24);
  border-radius: 999px;
  padding: 9px 13px;
  background: rgb(15, 23, 42, 0.84);
  color: #cbd5e1;
  cursor: pointer;
  font-weight: 700;
}

.kline-toolbar__indicators button.active {
  border-color: rgb(56, 189, 248, 0.46);
  background: rgb(14, 165, 233, 0.18);
  color: #e0f2fe;
}

.kline-toolbar__refresh {
  min-width: 96px;
  background: rgb(37, 99, 235, 0.22);
  color: #bfdbfe;
  white-space: nowrap;
}

.kline-toolbar__actions {
  display: grid;
  align-content: end;
  justify-items: end;
}

@media (width <= 1100px) {
  .kline-toolbar {
    grid-template-columns: 1fr;
  }

  .kline-toolbar__actions {
    justify-items: start;
  }

  .kline-toolbar__refresh {
    justify-self: start;
  }
}

@media (width <= 640px) {
  .kline-toolbar__market {
    grid-template-columns: 1fr;
  }
}
</style>
