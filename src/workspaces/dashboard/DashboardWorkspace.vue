<template>
  <WorkspaceFrame
    eyebrow="全局总览"
    title="今日运营总览"
    description="把 MT5、Polymarket、参数实验、每日复盘和今日待办合在一张中文运营看板里。"
    :loading="loading"
    :error="error"
    @refresh="load"
  >
    <MetricGrid :items="metrics" />
    <EndpointHealthGrid :items="endpointHealth" />

    <DashboardUpgradePanel :state="state" :snapshot="snapshot" :metrics="metrics" />

    <section class="qg-domain-panel qg-domain-panel--primary">
      <div class="qg-domain-panel__header">
        <div>
          <p class="qg-eyebrow">每日闭环</p>
          <h2>今日待办与每日复盘</h2>
        </div>
        <span class="qg-muted">MT5 + Polymarket + ParamLab 合并闭环</span>
      </div>
      <div class="qg-domain-grid qg-domain-grid--two">
        <LedgerTable title="今日待办" :rows="todoRows" :limit="10" />
        <LedgerTable title="每日复盘" :rows="reviewRows" :limit="10" />
      </div>
    </section>

    <div class="qg-dashboard-grid">
      <section class="qg-domain-panel qg-domain-panel--primary">
        <div class="qg-domain-panel__header">
          <div>
          <p class="qg-eyebrow">运行健康</p>
            <h2>本地运行健康</h2>
          </div>
          <StatusPill :status="snapshot.killSwitchStatus" :label="snapshot.killSwitchLabel" />
        </div>
        <KeyValueList :items="runtimeItems" />
      </section>

      <section class="qg-domain-panel">
        <div class="qg-domain-panel__header">
          <div>
            <p class="qg-eyebrow">每日闭环</p>
            <h2>日报、自动处理与回测摘要</h2>
          </div>
        </div>
        <KeyValueList :items="dailyItems" />
      </section>
    </div>

    <section class="qg-domain-panel">
      <div class="qg-domain-panel__header">
        <div>
          <p class="qg-eyebrow">策略观察</p>
          <h2>路线观察列表</h2>
        </div>
        <span class="qg-muted">最多显示 8 条；缺数据时可展开技术证据核对。</span>
      </div>
      <div v-if="routeRows.length" class="qg-route-table-wrap">
        <table class="qg-route-table">
          <thead>
            <tr>
              <th>路线</th>
              <th>状态</th>
              <th>评分</th>
              <th>备注</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in routeRows" :key="row.id">
              <td>{{ row.route }}</td>
              <td><StatusPill :status="row.status" :label="row.status" /></td>
              <td>{{ row.score }}</td>
              <td>{{ row.note || '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-else class="qg-empty-text">当前没有路线观察列表；需要时可展开下方技术证据查看原始数据。</p>
    </section>

    <details class="qg-domain-panel qg-domain-panel--details">
      <summary>技术证据</summary>
      <div class="qg-domain-grid qg-domain-grid--compact">
        <JsonPreview title="最新运行状态" source="/api/latest" :payload="state.latest" />
        <JsonPreview title="总览状态" source="/api/dashboard/state" :payload="state.state" />
        <JsonPreview title="回测摘要" source="/api/dashboard/backtest-summary" :payload="state.backtest" />
        <JsonPreview title="每日复盘" source="/api/daily-review" :payload="state.dailyReview" />
        <JsonPreview title="今日自动闭环" source="/api/daily-autopilot" :payload="state.dailyAutopilot" />
        <JsonPreview title="MT5 快照" source="/api/mt5-readonly/snapshot" :payload="state.mt5Snapshot" />
        <JsonPreview title="Polymarket 雷达" source="/api/polymarket/radar" :payload="state.polyRadar" />
      </div>
    </details>
  </WorkspaceFrame>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { loadDashboardWorkspace } from '../../services/domainApi.js';
import WorkspaceFrame from '../shared/WorkspaceFrame.vue';
import MetricGrid from '../shared/MetricGrid.vue';
import JsonPreview from '../shared/JsonPreview.vue';
import StatusPill from '../shared/StatusPill.vue';
import KeyValueList from '../shared/KeyValueList.vue';
import EndpointHealthGrid from '../shared/EndpointHealthGrid.vue';
import LedgerTable from '../shared/LedgerTable.vue';
import DashboardUpgradePanel from './DashboardUpgradePanel.vue';
import {
  normalizeDashboardSnapshot,
  buildDashboardMetrics,
  buildEndpointHealth,
  buildRuntimeItems,
  buildDailyItems,
  buildRouteRows,
  buildDailyTodoRows,
  buildDailyReviewRows,
} from './dashboardModel.js';

const loading = ref(false);
const error = ref('');
const state = reactive({
  latest: null,
  state: null,
  backtest: null,
  dailyReview: null,
  dailyAutopilot: null,
  mt5Snapshot: null,
  polyRadar: null,
  polyMarkets: null,
});

const snapshot = computed(() => normalizeDashboardSnapshot(state));
const metrics = computed(() => buildDashboardMetrics(snapshot.value));
const endpointHealth = computed(() => buildEndpointHealth(state));
const runtimeItems = computed(() => buildRuntimeItems(snapshot.value));
const dailyItems = computed(() => buildDailyItems(snapshot.value));
const routeRows = computed(() => buildRouteRows(snapshot.value));
const todoRows = computed(() => buildDailyTodoRows(state));
const reviewRows = computed(() => buildDailyReviewRows(state));

async function load() {
  loading.value = true;
  error.value = '';
  try {
    Object.assign(state, await loadDashboardWorkspace());
  } catch (exc) {
    error.value = exc?.message || '全局总览加载失败';
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>
