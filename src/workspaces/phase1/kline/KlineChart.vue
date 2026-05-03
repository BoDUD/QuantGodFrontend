<template>
  <div class="kline-chart" :class="{ 'kline-chart--ready': chartReady }">
    <div ref="chartEl" class="kline-chart__canvas" />
    <div class="kline-chart__watermark">
      <strong>QuantGod</strong>
      <span>MT5 只读 K 线</span>
    </div>
    <p v-if="!bars.length" class="kline-chart__empty">暂无 K 线数据</p>
    <p v-else-if="!chartReady" class="kline-chart__empty">正在加载图表引擎</p>
  </div>
</template>

<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';

const props = defineProps({
  bars: { type: Array, default: () => [] },
  indicators: { type: Array, default: () => ['EMA', 'RSI', 'MACD', 'BOLL', 'VOL'] },
  trades: { type: Array, default: () => [] },
  shadowSignals: { type: Array, default: () => [] },
});

const chartEl = ref(null);
const chartReady = ref(false);
let chart = null;
let klineApi = null;
let resizeObserver = null;
let resizeFrame = 0;

onMounted(async () => {
  await nextTick();
  await createChart();
  renderAll();
});

onBeforeUnmount(() => {
  if (resizeFrame) window.cancelAnimationFrame(resizeFrame);
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
  if (chart) {
    try {
      klineApi?.dispose(chart);
    } catch (_error) {
      /* noop */
    }
    chart = null;
  }
});

watch(() => [props.bars, props.indicators, props.trades, props.shadowSignals], renderAll, { deep: true });

async function createChart() {
  if (chart || !chartEl.value) return;
  klineApi = await import('klinecharts');
  chart = klineApi.init(chartEl.value);
  applyChartStyle();
  observeSize();
  chartReady.value = true;
}

function renderAll() {
  if (!chart) return;
  const data = props.bars.map(normalizeBar).filter((bar) => bar.timestamp && Number.isFinite(bar.close));
  chart.applyNewData(data);
  applyIndicators();
  applySignalOverlays();
}

function applyChartStyle() {
  if (!chart || typeof chart.setStyles !== 'function') return;
  try {
    chart.setStyles({
      grid: {
        horizontal: { color: 'rgba(148, 163, 184, 0.10)' },
        vertical: { color: 'rgba(148, 163, 184, 0.08)' },
      },
      candle: {
        bar: {
          upColor: '#22c55e',
          downColor: '#ef4444',
          noChangeColor: '#94a3b8',
          upBorderColor: '#22c55e',
          downBorderColor: '#ef4444',
          upWickColor: '#22c55e',
          downWickColor: '#ef4444',
        },
        priceMark: {
          high: { color: '#94a3b8' },
          low: { color: '#94a3b8' },
          last: {
            upColor: '#22c55e',
            downColor: '#ef4444',
            noChangeColor: '#94a3b8',
          },
        },
      },
      xAxis: {
        axisLine: { color: 'rgba(148, 163, 184, 0.18)' },
        tickText: { color: '#94a3b8' },
      },
      yAxis: {
        axisLine: { color: 'rgba(148, 163, 184, 0.18)' },
        tickText: { color: '#94a3b8' },
      },
    });
  } catch (error) {
    console.warn('[QuantGod Phase1] chart style skipped:', error);
  }
}

function observeSize() {
  if (!chartEl.value || typeof ResizeObserver === 'undefined') return;
  resizeObserver = new ResizeObserver(() => {
    if (resizeFrame) window.cancelAnimationFrame(resizeFrame);
    resizeFrame = window.requestAnimationFrame(() => {
      resizeFrame = 0;
      try {
        chart?.resize?.();
      } catch (error) {
        console.warn('[QuantGod Phase1] chart resize skipped:', error);
      }
    });
  });
  resizeObserver.observe(chartEl.value);
}

function normalizeBar(row) {
  return {
    timestamp: Number(row.timestamp || Date.parse(row.timeIso || row.time || 0)),
    open: Number(row.open),
    high: Number(row.high),
    low: Number(row.low),
    close: Number(row.close),
    volume: Number(row.volume || row.tick_volume || 0),
  };
}

function applyIndicators() {
  if (!chart) return;
  try {
    if (typeof chart.removeIndicator === 'function') {
      ['EMA_FAST', 'EMA_SLOW', 'RSI_PANE', 'MACD_PANE', 'BOLL_MAIN', 'VOL_PANE'].forEach((id) => {
        try {
          chart.removeIndicator(id);
        } catch (_error) {
          /* noop */
        }
      });
    }
    const selected = new Set(props.indicators || []);
    if (selected.has('EMA')) {
      chart.createIndicator({ name: 'EMA', id: 'EMA_FAST', calcParams: [9] }, false, { id: 'candle_pane' });
      chart.createIndicator({ name: 'EMA', id: 'EMA_SLOW', calcParams: [21] }, false, { id: 'candle_pane' });
    }
    if (selected.has('BOLL'))
      chart.createIndicator({ name: 'BOLL', id: 'BOLL_MAIN', calcParams: [20, 2] }, false, {
        id: 'candle_pane',
      });
    if (selected.has('VOL'))
      chart.createIndicator({ name: 'VOL', id: 'VOL_PANE' }, false, { id: 'vol_pane', height: 80 });
    if (selected.has('RSI'))
      chart.createIndicator({ name: 'RSI', id: 'RSI_PANE', calcParams: [14] }, false, {
        id: 'rsi_pane',
        height: 90,
      });
    if (selected.has('MACD'))
      chart.createIndicator({ name: 'MACD', id: 'MACD_PANE', calcParams: [12, 26, 9] }, false, {
        id: 'macd_pane',
        height: 90,
      });
  } catch (error) {
    console.warn('[QuantGod Phase1] indicator render skipped:', error);
  }
}

function applySignalOverlays() {
  if (!chart || typeof chart.createOverlay !== 'function') return;
  try {
    if (typeof chart.removeOverlay === 'function') {
      chart.removeOverlay({ groupId: 'qg_phase1_signals' });
    }
    const overlays = [];
    props.trades.forEach((item, index) => {
      const point = overlayPoint(item);
      if (!point) return;
      overlays.push({
        name: 'simpleAnnotation',
        id: `qg_trade_${index}`,
        groupId: 'qg_phase1_signals',
        lock: true,
        points: [point],
        extendData: { text: `${item.side || item.event || 'TRADE'} ${item.route || ''}`.trim() },
      });
    });
    props.shadowSignals.forEach((item, index) => {
      const point = overlayPoint(item);
      if (!point) return;
      overlays.push({
        name: 'simpleTag',
        id: `qg_shadow_${index}`,
        groupId: 'qg_phase1_signals',
        lock: true,
        points: [point],
        extendData: { text: `${item.side || item.signal || 'SHADOW'} ${item.route || ''}`.trim() },
      });
    });
    if (overlays.length) chart.createOverlay(overlays);
  } catch (error) {
    console.warn('[QuantGod Phase1] overlay render skipped:', error);
  }
}

function overlayPoint(item) {
  const timestamp = Number(item.timestamp || Date.parse(item.timeIso || item.time || 0));
  const value = Number(item.price || item.close || item.entry_price);
  if (!timestamp || !Number.isFinite(value)) return null;
  return { timestamp, value };
}
</script>

<style scoped>
.kline-chart {
  position: relative;
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  min-height: 560px;
  border: 1px solid rgb(148, 163, 184, 0.18);
  border-radius: 0;
  overflow: hidden;
  background: linear-gradient(180deg, rgb(8, 15, 28, 0.78), rgb(2, 6, 23, 0.96)), #07111f;
}

.kline-chart__canvas {
  width: 100%;
  height: min(68vh, 720px);
  min-height: 540px;
}

.kline-chart__watermark {
  position: absolute;
  right: 24px;
  bottom: 20px;
  display: grid;
  gap: 2px;
  color: rgb(148, 163, 184, 0.18);
  text-align: right;
  pointer-events: none;
}

.kline-chart__watermark strong {
  font-size: 32px;
  line-height: 1;
}

.kline-chart__watermark span {
  font-size: 12px;
  font-weight: 800;
}

.kline-chart__empty {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  margin: 0;
  color: #94a3b8;
  pointer-events: none;
}

@media (width <= 640px) {
  .kline-chart {
    min-height: 380px;
  }

  .kline-chart__canvas {
    height: 420px;
  }

  .kline-chart__watermark {
    display: none;
  }
}
</style>
