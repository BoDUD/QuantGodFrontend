<template>
  <section class="kline-workspace">
    <header class="kline-workspace__header">
      <div class="kline-workspace__title">
        <p>MT5 只读专业图表</p>
        <h2>{{ symbol }} · {{ tf }}</h2>
        <span>专业 K 线、指标、交易点与模拟信号叠加，不向 MT5 写入任何状态。</span>
      </div>
      <div class="kline-workspace__status">
        <strong>{{ bars.length }}</strong>
        <span>根 K 线已加载</span>
      </div>
      <SignalOverlay v-model:trades="showTrades" v-model:shadow="showShadow" />
    </header>

    <div class="kline-workspace__terminal">
      <aside class="kline-workspace__rail" aria-label="图表工具">
        <button
          v-for="tool in drawingTools"
          :key="tool.key"
          type="button"
          :class="{ active: activeTool === tool.key }"
          :title="tool.title"
          @click="handleToolClick(tool)"
        >
          {{ tool.label }}
        </button>
      </aside>

      <div class="kline-workspace__chart-stack">
        <KlineToolbar
          v-model:symbol="symbol"
          v-model:tf="tf"
          v-model:bars="barsCount"
          v-model:indicators="indicators"
          :symbols="symbols"
          @refresh="loadChart"
        />

        <p v-if="error" class="kline-workspace__error">{{ error }}</p>
        <KlineChart
          :bars="bars"
          :indicators="indicators"
          :trades="visibleTrades"
          :shadow-signals="visibleShadowSignals"
          :active-tool="activeTool"
        />

        <footer class="kline-workspace__tape">
          <span>当前工具 {{ activeToolTitle }}</span>
          <span>最新 {{ latestTime }}</span>
          <span>O {{ formatPrice(latestBar?.open) }}</span>
          <span>H {{ formatPrice(latestBar?.high) }}</span>
          <span>L {{ formatPrice(latestBar?.low) }}</span>
          <span>C {{ formatPrice(latestBar?.close) }}</span>
          <span :class="changeClass">{{ latestChangeText }}</span>
        </footer>
      </div>

      <aside class="kline-workspace__inspector">
        <section>
          <p>行情摘要</p>
          <h3>{{ formatPrice(marketPrice) }}</h3>
          <dl>
            <div>
              <dt>{{ marketRangeLabel }}</dt>
              <dd>{{ marketRangeText }}</dd>
            </div>
            <div>
              <dt>{{ marketSecondaryLabel }}</dt>
              <dd>{{ marketSecondaryText }}</dd>
            </div>
            <div>
              <dt>数据新鲜度</dt>
              <dd>{{ marketFreshnessText }}</dd>
            </div>
          </dl>
          <small v-if="quoteWarning" class="kline-workspace__quote-warning">{{ quoteWarning }}</small>
        </section>

        <section>
          <p>叠加证据</p>
          <div class="kline-workspace__metric-row">
            <strong>{{ visibleTrades.length }}</strong>
            <span>交易点</span>
          </div>
          <div class="kline-workspace__metric-row">
            <strong>{{ visibleShadowSignals.length }}</strong>
            <span>模拟信号</span>
          </div>
          <div class="kline-workspace__chips">
            <span v-for="item in indicators" :key="item">{{ item }}</span>
          </div>
        </section>

        <section>
          <p>最近信号</p>
          <ol class="kline-workspace__events">
            <li v-for="item in recentEvents" :key="item.key">
              <strong>{{ item.label }}</strong>
              <span>{{ item.meta }}</span>
            </li>
            <li v-if="!recentEvents.length">
              <strong>暂无信号</strong>
              <span>等待只读证据</span>
            </li>
          </ol>
        </section>
      </aside>
    </div>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import {
  USDJPY_FOCUS_SYMBOL,
  getChartTrades,
  getKline,
  getQuote,
  getShadowSignals,
  getSymbolRegistry,
} from '../../../services/phase1Api';
import KlineChart from './KlineChart.vue';
import KlineToolbar from './KlineToolbar.vue';
import SignalOverlay from './SignalOverlay.vue';

const symbols = ref([]);
const symbol = ref(USDJPY_FOCUS_SYMBOL);
const tf = ref('H1');
const barsCount = ref(240);
const indicators = ref(['EMA', 'RSI', 'MACD', 'BOLL', 'VOL']);
const showTrades = ref(true);
const showShadow = ref(true);
const bars = ref([]);
const trades = ref([]);
const shadowSignals = ref([]);
const quotePayload = ref(null);
const quoteWarning = ref('');
const error = ref('');
const activeTool = ref('cursor');
let quoteRefreshTimer = null;
let chartRefreshTimer = null;

const drawingTools = [
  { key: 'cursor', label: '↖', title: '选择' },
  { key: 'line', label: '／', title: '趋势线' },
  { key: 'horizontal', label: '一', title: '水平线' },
  { key: 'range', label: '▥', title: '区间标记' },
  { key: 'clear', label: '×', title: '清除临时工具' },
];

const latestBar = computed(() => bars.value.at(-1) || null);
const previousBar = computed(() => bars.value.at(-2) || null);
const latestQuote = computed(() => quotePayload.value?.quote || null);
const visibleTrades = computed(() => (showTrades.value ? trades.value : []));
const visibleShadowSignals = computed(() => (showShadow.value ? shadowSignals.value : []));
const latestTime = computed(() =>
  formatTime(latestBar.value?.timeIso || latestBar.value?.time || latestBar.value?.timestamp),
);
const quoteTime = computed(() =>
  formatTime(
    latestQuote.value?.timeIso ||
      latestQuote.value?.time ||
      quotePayload.value?.source?.mtimeIso ||
      quotePayload.value?.generatedAtIso,
  ),
);
const highInView = computed(() => maxBy(bars.value, 'high'));
const lowInView = computed(() => minBy(bars.value, 'low'));
const rangeText = computed(() => `${formatPrice(lowInView.value)} / ${formatPrice(highInView.value)}`);
const bidAskText = computed(() => {
  const bid = Number(latestQuote.value?.bid);
  const ask = Number(latestQuote.value?.ask);
  if (!Number.isFinite(bid) || !Number.isFinite(ask) || bid <= 0 || ask <= 0) return '';
  return `${formatPrice(bid)} / ${formatPrice(ask)}`;
});
const marketPrice = computed(() => {
  const bid = Number(latestQuote.value?.bid);
  const ask = Number(latestQuote.value?.ask);
  const last = Number(latestQuote.value?.last);
  if (Number.isFinite(bid) && Number.isFinite(ask) && bid > 0 && ask > 0) return (bid + ask) / 2;
  if (Number.isFinite(last) && last > 0) return last;
  return Number(latestBar.value?.close);
});
const marketRangeLabel = computed(() => (bidAskText.value ? '买价 / 卖价' : '区间高低'));
const marketRangeText = computed(() => bidAskText.value || rangeText.value);
const marketSecondaryLabel = computed(() => (bidAskText.value ? '点差' : '波动状态'));
const marketSecondaryText = computed(() => {
  if (!bidAskText.value) return volatilityLabel.value;
  const spread = Number(latestQuote.value?.spreadPoints);
  return Number.isFinite(spread) ? `${spread.toFixed(1)} 点` : '--';
});
const marketFreshnessText = computed(() => (quoteTime.value !== '--' ? quoteTime.value : latestTime.value));
const latestChange = computed(() => {
  const close = Number(marketPrice.value);
  const previous = Number(previousBar.value?.close);
  if (!Number.isFinite(close) || !Number.isFinite(previous) || previous === 0) return 0;
  return ((close - previous) / previous) * 100;
});
const latestChangeText = computed(
  () => `${latestChange.value >= 0 ? '+' : ''}${latestChange.value.toFixed(2)}%`,
);
const changeClass = computed(() =>
  latestChange.value >= 0 ? 'kline-workspace__positive' : 'kline-workspace__negative',
);
const volatilityLabel = computed(() => {
  const high = Number(highInView.value);
  const low = Number(lowInView.value);
  const close = Number(latestBar.value?.close);
  if (!Number.isFinite(high) || !Number.isFinite(low) || !Number.isFinite(close) || close === 0) return '--';
  const rangePct = ((high - low) / close) * 100;
  if (rangePct >= 4) return '高波动';
  if (rangePct >= 1.6) return '中波动';
  return '低波动';
});
const activeToolTitle = computed(
  () => drawingTools.find((tool) => tool.key === activeTool.value)?.title || '选择',
);
const recentEvents = computed(() => {
  const tradeEvents = visibleTrades.value.slice(-3).map((item, index) => ({
    key: `trade-${index}-${item.ticket || item.timeIso || item.time || index}`,
    label: `${item.side || item.event || '交易'} ${item.route || ''}`.trim(),
    meta: formatTime(item.timeIso || item.time || item.timestamp),
  }));
  const shadowEvents = visibleShadowSignals.value.slice(-3).map((item, index) => ({
    key: `shadow-${index}-${item.id || item.timeIso || item.time || index}`,
    label: `${item.side || item.signal || '模拟'} ${item.route || ''}`.trim(),
    meta: formatTime(item.timeIso || item.time || item.timestamp),
  }));
  return [...tradeEvents, ...shadowEvents].slice(-5).reverse();
});

function isUsdJpySymbol(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .startsWith('USDJPY');
}

function normalizeUsdJpySymbols(items) {
  const scoped = (Array.isArray(items) ? items : []).filter((item) => isUsdJpySymbol(item?.symbol));
  return scoped.length
    ? scoped
    : [{ symbol: USDJPY_FOCUS_SYMBOL, label: USDJPY_FOCUS_SYMBOL, assetClass: 'Forex' }];
}

async function bootstrap() {
  symbols.value = normalizeUsdJpySymbols(await getSymbolRegistry());
  symbol.value = symbols.value[0]?.symbol || USDJPY_FOCUS_SYMBOL;
  await loadChart();
  startRealtimeRefresh();
}

async function loadChart() {
  error.value = '';
  quotePayload.value = null;
  if (!isUsdJpySymbol(symbol.value)) {
    symbol.value = symbols.value[0]?.symbol || USDJPY_FOCUS_SYMBOL;
    return;
  }
  try {
    const [klinePayload, tradesPayload, shadowPayload] = await Promise.all([
      getKline({ symbol: symbol.value, tf: tf.value, bars: barsCount.value }),
      getChartTrades({ symbol: symbol.value, days: 30 }),
      getShadowSignals({ symbol: symbol.value, days: 7 }),
    ]);
    bars.value = klinePayload.bars || [];
    trades.value = tradesPayload.items || [];
    shadowSignals.value = shadowPayload.items || [];
    await loadQuote();
  } catch (loadError) {
    error.value = loadError.message || String(loadError);
  }
}

async function loadQuote() {
  quoteWarning.value = '';
  try {
    const payload = await getQuote({ symbol: symbol.value });
    const quote = payload?.quote;
    if (quote?.symbol && String(quote.symbol).toLowerCase() !== String(symbol.value).toLowerCase()) {
      quoteWarning.value = '实时报价品种与当前图表不一致，已暂时隐藏报价。';
      return;
    }
    quotePayload.value = payload;
    if (!quote?.ok)
      quoteWarning.value = payload?.error || quote?.error || '实时报价暂不可用，已回退到 K 线收盘价。';
  } catch (loadError) {
    quoteWarning.value = loadError.message || String(loadError);
  }
}

function startRealtimeRefresh() {
  stopRealtimeRefresh();
  quoteRefreshTimer = window.setInterval(loadQuote, 5000);
  chartRefreshTimer = window.setInterval(loadChart, 60000);
}

function stopRealtimeRefresh() {
  if (quoteRefreshTimer) window.clearInterval(quoteRefreshTimer);
  if (chartRefreshTimer) window.clearInterval(chartRefreshTimer);
  quoteRefreshTimer = null;
  chartRefreshTimer = null;
}

function handleToolClick(tool) {
  activeTool.value = tool.key === 'clear' ? 'cursor' : tool.key;
}

function formatPrice(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '--';
  return number.toLocaleString('en-US', { maximumFractionDigits: number >= 100 ? 3 : 5 });
}

function formatTime(value) {
  if (value === undefined || value === null || value === '') return '--';
  const timestamp = Number(value);
  let date;
  if (Number.isFinite(timestamp)) {
    if (timestamp <= 0) return '--';
    date = new Date(timestamp > 1_000_000_000_000 ? timestamp : timestamp * 1000);
  } else {
    date = new Date(value);
  }
  if (Number.isNaN(date.getTime())) return '--';
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function maxBy(rows, key) {
  const values = rows.map((row) => Number(row[key])).filter(Number.isFinite);
  return values.length ? Math.max(...values) : null;
}

function minBy(rows, key) {
  const values = rows.map((row) => Number(row[key])).filter(Number.isFinite);
  return values.length ? Math.min(...values) : null;
}

watch([symbol, tf], () => {
  if (!isUsdJpySymbol(symbol.value)) {
    symbol.value = symbols.value[0]?.symbol || USDJPY_FOCUS_SYMBOL;
    return;
  }
  quotePayload.value = null;
  loadChart();
});
onMounted(bootstrap);
onBeforeUnmount(stopRealtimeRefresh);
</script>

<style scoped>
.kline-workspace {
  box-sizing: border-box;
  display: grid;
  gap: 14px;
  width: 100%;
  min-width: 0;
  border: 1px solid var(--qg-border);
  border-radius: var(--qg-radius-lg);
  padding: 14px;
  background: linear-gradient(180deg, rgb(8, 17, 31, 0.96), rgb(2, 6, 23, 0.92));
}

.kline-workspace__header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(120px, max-content) minmax(220px, max-content);
  gap: 14px;
  align-items: stretch;
  min-width: 0;
}

.kline-workspace__title {
  min-width: 0;
}

.kline-workspace__title p,
.kline-workspace__title h2,
.kline-workspace__title span {
  margin: 0;
}

.kline-workspace__title p {
  color: var(--qg-accent);
  font-size: 12px;
  font-weight: 900;
}

.kline-workspace__title h2 {
  margin-top: 4px;
  color: var(--qg-text);
  font-size: 28px;
  line-height: 1.1;
}

.kline-workspace__title span {
  display: block;
  margin-top: 6px;
  color: var(--qg-text-muted);
}

.kline-workspace__status {
  display: grid;
  align-content: center;
  min-width: 110px;
  border: 1px solid rgb(56, 189, 248, 0.28);
  border-radius: var(--qg-radius-md);
  padding: 10px 12px;
  text-align: right;
  background: rgb(56, 189, 248, 0.08);
}

.kline-workspace__status strong {
  color: var(--qg-text);
  font-size: 24px;
  line-height: 1;
}

.kline-workspace__status span {
  color: var(--qg-text-muted);
  font-size: 12px;
}

.kline-workspace__terminal {
  display: grid;
  grid-template-columns: 52px minmax(0, 1fr) minmax(260px, 320px);
  min-width: 0;
  overflow: hidden;
  border: 1px solid rgb(148, 163, 184, 0.18);
  border-radius: var(--qg-radius-lg);
  background: rgb(2, 6, 23, 0.72);
}

.kline-workspace__rail {
  display: grid;
  align-content: start;
  gap: 8px;
  padding: 10px 7px;
  border-right: 1px solid rgb(148, 163, 184, 0.15);
  background: rgb(15, 23, 42, 0.6);
}

.kline-workspace__rail button {
  display: grid;
  width: 38px;
  height: 38px;
  place-items: center;
  border: 1px solid rgb(148, 163, 184, 0.22);
  border-radius: 10px;
  background: rgb(15, 23, 42, 0.82);
  color: var(--qg-text-soft);
  font-weight: 900;
  cursor: pointer;
}

.kline-workspace__rail button.active {
  border-color: rgb(56, 189, 248, 0.52);
  background: var(--qg-accent-soft);
  color: var(--qg-text);
}

.kline-workspace__chart-stack {
  display: grid;
  align-content: start;
  min-width: 0;
}

.kline-workspace__inspector {
  display: grid;
  align-content: start;
  gap: 12px;
  min-width: 0;
  padding: 12px;
  border-left: 1px solid rgb(148, 163, 184, 0.15);
  background: rgb(15, 23, 42, 0.48);
}

.kline-workspace__inspector section {
  min-width: 0;
  border: 1px solid rgb(148, 163, 184, 0.14);
  border-radius: var(--qg-radius-md);
  padding: 12px;
  background: rgb(2, 6, 23, 0.36);
}

.kline-workspace__inspector p,
.kline-workspace__inspector h3,
.kline-workspace__inspector dl {
  margin: 0;
}

.kline-workspace__inspector p {
  color: var(--qg-text-muted);
  font-size: 12px;
  font-weight: 900;
}

.kline-workspace__inspector h3 {
  margin-top: 8px;
  color: var(--qg-text);
  font-size: 30px;
  line-height: 1;
}

.kline-workspace__quote-warning {
  display: block;
  margin-top: 10px;
  color: var(--qg-warning);
  font-size: 11px;
  font-weight: 800;
}

.kline-workspace__inspector dl {
  display: grid;
  gap: 8px;
  margin-top: 14px;
}

.kline-workspace__inspector dl div,
.kline-workspace__metric-row,
.kline-workspace__events li {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  min-width: 0;
}

.kline-workspace__inspector dt,
.kline-workspace__metric-row span,
.kline-workspace__events span {
  color: var(--qg-text-muted);
}

.kline-workspace__inspector dd,
.kline-workspace__metric-row strong,
.kline-workspace__events strong {
  margin: 0;
  overflow-wrap: anywhere;
  color: var(--qg-text);
  font-weight: 850;
}

.kline-workspace__metric-row {
  margin-top: 10px;
}

.kline-workspace__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 12px;
}

.kline-workspace__chips span {
  border: 1px solid rgb(56, 189, 248, 0.24);
  border-radius: 999px;
  padding: 4px 8px;
  color: #bae6fd;
  background: rgb(14, 165, 233, 0.12);
  font-size: 12px;
  font-weight: 800;
}

.kline-workspace__events {
  display: grid;
  gap: 8px;
  margin: 12px 0 0;
  padding: 0;
  list-style: none;
}

.kline-workspace__events li {
  border-top: 1px solid rgb(148, 163, 184, 0.1);
  padding-top: 8px;
}

.kline-workspace__tape {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 16px;
  min-width: 0;
  border-top: 1px solid rgb(148, 163, 184, 0.14);
  padding: 10px 12px;
  color: var(--qg-text-muted);
  font-size: 12px;
  font-weight: 800;
  background: rgb(2, 6, 23, 0.52);
}

.kline-workspace__positive {
  color: var(--qg-positive);
}

.kline-workspace__negative {
  color: var(--qg-negative);
}

.kline-workspace__error {
  margin: 10px;
  border: 1px solid rgb(239, 68, 68, 0.28);
  border-radius: 12px;
  padding: 10px 12px;
  color: #fecaca;
  background: rgb(127, 29, 29, 0.22);
}

@media (width <= 1600px) {
  .kline-workspace__terminal {
    grid-template-columns: 52px minmax(0, 1fr);
  }

  .kline-workspace__inspector {
    grid-column: 1 / -1;
    grid-template-columns: repeat(3, minmax(220px, 1fr));
    border-top: 1px solid rgb(148, 163, 184, 0.15);
    border-left: 0;
  }
}

@media (width <= 1180px) {
  .kline-workspace__terminal {
    grid-template-columns: 1fr;
  }

  .kline-workspace__header {
    grid-template-columns: minmax(0, 1fr);
  }

  .kline-workspace__rail {
    grid-auto-flow: column;
    grid-auto-columns: 34px;
    overflow-x: auto;
    border-right: 0;
    border-bottom: 1px solid rgb(148, 163, 184, 0.15);
  }

  .kline-workspace__inspector {
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    border-left: 0;
    border-top: 1px solid rgb(148, 163, 184, 0.15);
  }

  .kline-workspace__status {
    justify-self: start;
    text-align: left;
  }
}

@media (width <= 640px) {
  .kline-workspace {
    padding: 10px;
    border-radius: var(--qg-radius-md);
  }

  .kline-workspace__title h2 {
    font-size: 22px;
  }

  .kline-workspace__inspector {
    grid-template-columns: 1fr;
  }
}
</style>
