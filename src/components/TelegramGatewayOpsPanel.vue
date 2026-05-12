<template>
  <section class="qg-usdjpy-evolution__list qg-usdjpy-evolution__list--telegram-gateway">
    <div class="qg-usdjpy-evolution__section-head">
      <div>
        <h3>Telegram Gateway 运维观测</h3>
        <p>队列、去重、限频、投递 ledger 和 topic 状态的 push-only 运维视图。</p>
      </div>
      <button type="button" :disabled="loading" @click="$emit('collect')">收集 Gateway 报告</button>
    </div>

    <div class="qg-usdjpy-evolution__scenario-grid">
      <article>
        <span>Gateway 状态</span>
        <strong>{{ statusText }}</strong>
        <p>{{ state.reasonZh || '等待 Telegram Gateway 运维状态。' }}</p>
      </article>
      <article>
        <span>队列数量</span>
        <strong>{{ state.queuedCount || 0 }}</strong>
        <p>待投递 {{ state.pendingCount || 0 }}；ledger {{ state.ledgerCount || 0 }}。</p>
      </article>
      <article>
        <span>真实发送</span>
        <strong>{{ state.actualSentCount || 0 }}</strong>
        <p>最近 topic：{{ state.lastTopic || '无' }}</p>
      </article>
      <article>
        <span>去重 / 限频</span>
        <strong>{{ state.suppressedCount || 0 }}</strong>
        <p>{{ delivery.stateZh || '等待新报告' }}</p>
      </article>
      <article>
        <span>失败数量</span>
        <strong>{{ state.failedCount || 0 }}</strong>
        <p>{{ delivery.lastFailureReason || '暂无失败记录' }}</p>
      </article>
      <article>
        <span>安全边界</span>
        <strong>{{ state.commandsAllowed ? '命令需关闭' : 'push-only' }}</strong>
        <p>不接收 Telegram 命令，不改交易状态。</p>
      </article>
    </div>

    <div v-if="latestRows.length" class="qg-usdjpy-evolution__table-wrap">
      <table class="qg-usdjpy-evolution__table qg-usdjpy-evolution__table--compact">
        <thead>
          <tr>
            <th>topic</th>
            <th>结果</th>
            <th>原因</th>
            <th>时间</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in latestRows" :key="row.topic">
            <td>{{ row.topic }}</td>
            <td>{{ row.deliveryOk ? '已发送' : row.skipped ? '已抑制' : '待复核' }}</td>
            <td>{{ row.reason || '—' }}</td>
            <td>{{ shortTime(row.processedAtIso) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="pendingRows.length" class="qg-usdjpy-evolution__mini-list">
      <article v-for="row in pendingRows.slice(0, 4)" :key="row.topic">
        <span>pending topic</span>
        <strong>{{ row.topic }}</strong>
        <p>{{ row.textPreview || row.eventId || '等待统一投递。' }}</p>
      </article>
    </div>

    <p class="qg-usdjpy-evolution__note">
      安全边界：Gateway Ops 只观测和收集中文 push-only 报告；不下单、不平仓、不撤单、不修改 MT5
      live preset、不接收 Telegram 交易命令。
    </p>
  </section>
</template>

<script setup>
import { computed } from 'vue';

defineEmits(['collect']);

const props = defineProps({
  payload: {
    type: Object,
    default: null,
  },
  fallback: {
    type: Object,
    default: null,
  },
  loading: {
    type: Boolean,
    default: false,
  },
});

const state = computed(() => props.payload?.status || props.payload || props.fallback || {});
const delivery = computed(() => state.value?.deliveryObservability || {});
const statusText = computed(() => state.value?.statusZh || state.value?.status || '等待 Gateway 状态');
const latestRows = computed(() => {
  const rows = state.value?.latestTopicRows || [];
  return Array.isArray(rows) ? rows : [];
});
const pendingRows = computed(() => {
  const rows = state.value?.pendingTopicRows || [];
  return Array.isArray(rows) ? rows : [];
});

function shortTime(value) {
  if (!value) return '—';
  return String(value).replace('T', ' ').replace('Z', '').slice(0, 16);
}
</script>
