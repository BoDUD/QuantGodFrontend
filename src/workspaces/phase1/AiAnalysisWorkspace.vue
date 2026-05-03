<template>
  <section class="ai-workspace">
    <header class="ai-workspace__top">
      <div>
        <h2>AI 多角度中文分析</h2>
        <p>技术面与风险面并行读取证据，最后生成中文建议；DeepSeek flash 只做分析，不触发交易。</p>
      </div>
      <div class="ai-workspace__controls">
        <SymbolSelector v-model="symbol" :symbols="symbols" />
        <label>
          周期
          <input v-model="timeframesText" placeholder="M15,H1,H4,D1" />
        </label>
        <button :disabled="loading || !symbol" @click="runAnalysis">
          {{ loading ? '分析中…' : '开始分析' }}
        </button>
      </div>
    </header>

    <p v-if="error" class="ai-workspace__error">{{ error }}</p>

    <section class="ai-workspace__telegram">
      <div>
        <span class="ai-workspace__eyebrow">DeepSeek + Telegram 自动联动</span>
        <h3>一键读取证据、自动问模型、返回中文建议并推送频道</h3>
        <p>
          使用本机配置的 DeepSeek flash 和 Telegram push-only 通道；报告会写入本地
          runtime，边界保持只读，不会下单、平仓、撤单或修改实盘参数。
        </p>
      </div>
      <div class="ai-workspace__telegram-actions">
        <button :disabled="telegramLoading || !symbol" @click="runDeepSeekTelegramPush(true)">
          {{ telegramLoading ? '自动分析中…' : '自动分析并推送 Telegram' }}
        </button>
        <button
          class="ai-workspace__ghost-button"
          :disabled="telegramLoading || !symbol"
          @click="runDeepSeekTelegramPush(false)"
        >
          只分析不推送
        </button>
      </div>
      <p v-if="telegramError" class="ai-workspace__error">{{ telegramError }}</p>
      <div v-if="telegramReport" class="ai-workspace__telegram-result">
        <article v-for="item in telegramItems" :key="item.symbol" class="ai-workspace__telegram-card">
          <div>
            <strong>{{ item.symbol }}</strong>
            <span>{{ itemStatusText(item) }}</span>
          </div>
          <p>{{ itemSummaryText(item) }}</p>
          <dl>
            <div>
              <dt>DeepSeek</dt>
              <dd>{{ itemDeepSeekText(item) }}</dd>
            </div>
            <div>
              <dt>融合建议</dt>
              <dd>{{ itemFusionText(item) }}</dd>
            </div>
            <div>
              <dt>推送</dt>
              <dd>{{ itemDeliveryText(item) }}</dd>
            </div>
          </dl>
        </article>
      </div>
    </section>

    <div class="ai-workspace__grid">
      <div class="ai-workspace__agents">
        <AgentStatusCard
          title="技术分析"
          :report="report?.technical"
          :status="loading ? 'running' : 'idle'"
        />
        <AgentStatusCard title="风险分析" :report="report?.risk" :status="loading ? 'running' : 'idle'" />
        <AgentStatusCard title="综合判断" :report="report?.decision" :status="loading ? 'running' : 'idle'" />
      </div>
      <DecisionCard :decision="report?.decision || {}" />
    </div>

    <div class="ai-workspace__bottom">
      <ReasoningTabs :report="report" />
      <AnalysisHistory :items="history" @refresh="loadHistory" @select="loadHistoryItem" />
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import {
  getAiHistory,
  getAiHistoryItem,
  getAiLatest,
  getDeepSeekTelegramLatest,
  getSymbolRegistry,
  runDeepSeekTelegram,
  runAiAnalysis,
} from '../../services/phase1Api';
import AgentStatusCard from './AgentStatusCard.vue';
import AnalysisHistory from './AnalysisHistory.vue';
import DecisionCard from './DecisionCard.vue';
import ReasoningTabs from './ReasoningTabs.vue';
import SymbolSelector from './SymbolSelector.vue';

const symbols = ref([]);
const symbol = ref('EURUSDc');
const timeframesText = ref('M15,H1,H4,D1');
const loading = ref(false);
const error = ref('');
const report = ref(null);
const history = ref([]);
const telegramLoading = ref(false);
const telegramError = ref('');
const telegramReport = ref(null);

const telegramItems = computed(() => {
  const items = telegramReport.value?.items;
  return Array.isArray(items) ? items : [];
});

async function bootstrap() {
  symbols.value = await getSymbolRegistry();
  if (!symbols.value.find((item) => item.symbol === symbol.value) && symbols.value[0]) {
    symbol.value = symbols.value[0].symbol;
  }
  try {
    const latest = await getAiLatest();
    if (latest && latest.mode) report.value = latest;
  } catch (_latestError) {
    // No latest report yet is normal on a fresh runtime.
  }
  try {
    const latestTelegram = await getDeepSeekTelegramLatest();
    if (latestTelegram?.ok) telegramReport.value = latestTelegram;
  } catch (_latestTelegramError) {
    // No DeepSeek Telegram report yet is normal before first push.
  }
  await loadHistory();
}

async function runAnalysis() {
  loading.value = true;
  error.value = '';
  try {
    const timeframes = timeframesText.value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    report.value = await runAiAnalysis({ symbol: symbol.value, timeframes });
    await loadHistory();
  } catch (runError) {
    error.value = runError.message || String(runError);
  } finally {
    loading.value = false;
  }
}

async function runDeepSeekTelegramPush(send) {
  telegramLoading.value = true;
  telegramError.value = '';
  try {
    const timeframes = timeframesText.value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    telegramReport.value = await runDeepSeekTelegram({
      symbols: [symbol.value],
      timeframes,
      send,
      force: true,
      noDeepseek: false,
    });
  } catch (runError) {
    telegramError.value = runError.message || String(runError);
  } finally {
    telegramLoading.value = false;
  }
}

async function loadHistory() {
  try {
    const payload = await getAiHistory({ symbol: symbol.value, limit: 20 });
    history.value = payload.items || [];
  } catch (_historyError) {
    history.value = [];
  }
}

async function loadHistoryItem(id) {
  if (!id) return;
  try {
    report.value = await getAiHistoryItem(id);
  } catch (historyItemError) {
    error.value = historyItemError.message || String(historyItemError);
  }
}

function itemStatusText(item) {
  if (item?.delivery?.status === 'sent') return `已推送 #${item.delivery.telegramMessageId || '--'}`;
  if (item?.delivery?.status === 'dry_run') return '已分析，未推送';
  if (item?.delivery?.status === 'skipped') return `跳过：${item.delivery.reason || item.reason || '--'}`;
  return item?.delivery?.error || item?.delivery?.status || '待确认';
}

function itemSummaryText(item) {
  return (
    item?.deepseek?.advice?.headline ||
    item?.deepseek?.advice?.verdict ||
    item?.decision?.reasoning ||
    '已完成只读证据分析，等待查看详细报告。'
  );
}

function itemDeepSeekText(item) {
  const deepseek = item?.deepseek || {};
  if (deepseek.ok) return `${deepseek.model || 'deepseek'} · 已参与`;
  return deepseek.status ? `${deepseek.status}` : '未返回';
}

function itemFusionText(item) {
  const fusion = item?.fusion || {};
  return fusion.finalAction || item?.decision?.action || 'HOLD';
}

function itemDeliveryText(item) {
  const delivery = item?.delivery || {};
  if (delivery.telegramMessageId) return `频道消息 #${delivery.telegramMessageId}`;
  if (delivery.error) return delivery.error;
  return delivery.status || '未推送';
}

onMounted(bootstrap);
</script>

<style scoped>
.ai-workspace {
  box-sizing: border-box;
  display: grid;
  gap: 16px;
  width: 100%;
  min-width: 0;
  border: 1px solid rgb(148, 163, 184, 0.16);
  border-radius: 22px;
  padding: 18px;
  background: rgb(2, 6, 23, 0.72);
}

.ai-workspace__top,
.ai-workspace__controls,
.ai-workspace__grid,
.ai-workspace__bottom {
  display: grid;
  gap: 14px;
  min-width: 0;
}

.ai-workspace__top {
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: end;
}

.ai-workspace h2 {
  margin: 0 0 6px;
  color: #f8fafc;
}

.ai-workspace p {
  margin: 0;
  color: #94a3b8;
}

.ai-workspace__controls {
  grid-template-columns: auto auto auto;
  align-items: end;
}

.ai-workspace__controls label {
  display: grid;
  gap: 6px;
  min-width: 0;
  color: #94a3b8;
  font-size: 13px;
}

.ai-workspace__controls input {
  box-sizing: border-box;
  width: min(140px, 100%);
  min-width: 0;
  border: 1px solid rgb(148, 163, 184, 0.28);
  border-radius: 10px;
  padding: 9px 10px;
  background: rgb(15, 23, 42, 0.9);
  color: #e5eefc;
}

.ai-workspace__controls button {
  min-width: 0;
  border: 0;
  border-radius: 12px;
  padding: 11px 16px;
  background: #2563eb;
  color: white;
  cursor: pointer;
  font-weight: 700;
}

.ai-workspace__controls button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.ai-workspace__telegram {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 14px;
  min-width: 0;
  border: 1px solid rgb(56, 189, 248, 0.24);
  border-radius: 18px;
  padding: 16px;
  background: linear-gradient(135deg, rgb(14, 165, 233, 0.12), rgb(15, 23, 42, 0.78)), rgb(15, 23, 42, 0.78);
}

.ai-workspace__telegram h3 {
  margin: 4px 0 8px;
  color: #f8fafc;
  font-size: 20px;
  line-height: 1.22;
}

.ai-workspace__telegram-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  place-content: start flex-end;
  min-width: 0;
}

.ai-workspace__telegram-actions button {
  border: 1px solid rgb(56, 189, 248, 0.36);
  border-radius: 12px;
  padding: 11px 14px;
  background: #0ea5e9;
  color: #03131f;
  cursor: pointer;
  font-weight: 800;
}

.ai-workspace__telegram-actions button:disabled {
  cursor: not-allowed;
  opacity: 0.62;
}

.ai-workspace__ghost-button {
  background: rgb(15, 23, 42, 0.72) !important;
  color: #bae6fd !important;
}

.ai-workspace__eyebrow {
  color: #38bdf8;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.ai-workspace__telegram-result {
  display: grid;
  grid-column: 1 / -1;
  gap: 10px;
  min-width: 0;
}

.ai-workspace__telegram-card {
  display: grid;
  gap: 10px;
  min-width: 0;
  border: 1px solid rgb(148, 163, 184, 0.18);
  border-radius: 14px;
  padding: 12px;
  background: rgb(2, 6, 23, 0.46);
}

.ai-workspace__telegram-card > div {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: baseline;
  min-width: 0;
}

.ai-workspace__telegram-card strong {
  color: #f8fafc;
}

.ai-workspace__telegram-card span,
.ai-workspace__telegram-card dd {
  color: #bae6fd;
}

.ai-workspace__telegram-card dl {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin: 0;
}

.ai-workspace__telegram-card dl div {
  min-width: 0;
  border-radius: 12px;
  padding: 9px;
  background: rgb(15, 23, 42, 0.72);
}

.ai-workspace__telegram-card dt {
  color: #94a3b8;
  font-size: 12px;
  font-weight: 800;
}

.ai-workspace__telegram-card dd {
  margin: 3px 0 0;
  overflow-wrap: anywhere;
  font-weight: 800;
}

.ai-workspace__grid {
  grid-template-columns: minmax(280px, 1fr) minmax(300px, 0.9fr);
}

.ai-workspace__agents {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  min-width: 0;
}

.ai-workspace__bottom {
  grid-template-columns: minmax(0, 1fr) 320px;
}

.ai-workspace__error {
  border: 1px solid rgb(239, 68, 68, 0.28);
  border-radius: 12px;
  padding: 10px 12px;
  color: #fecaca !important;
  background: rgb(127, 29, 29, 0.22);
}

@media (width <= 1100px) {
  .ai-workspace__top,
  .ai-workspace__telegram,
  .ai-workspace__grid,
  .ai-workspace__bottom,
  .ai-workspace__agents,
  .ai-workspace__controls {
    grid-template-columns: 1fr;
  }

  .ai-workspace__telegram-actions {
    justify-content: stretch;
  }

  .ai-workspace__telegram-actions button,
  .ai-workspace__telegram-card dl {
    width: 100%;
  }

  .ai-workspace__telegram-card dl {
    grid-template-columns: 1fr;
  }
}

@media (width <= 640px) {
  .ai-workspace {
    padding: 12px;
    border-radius: 16px;
  }

  .ai-workspace h2 {
    font-size: 20px;
    line-height: 1.2;
  }
}
</style>
