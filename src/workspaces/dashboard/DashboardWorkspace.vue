<template>
  <WorkspaceFrame
    title="Dashboard Overview"
    description="从 legacy workbench 拆出的结构化总览入口；仅通过 /api/* 读取本地运行状态，不直接读取 QuantGod JSON/CSV。"
    :loading="loading"
    :error="error"
    @refresh="load"
  >
    <MetricGrid :items="metrics" />
    <EndpointHealthGrid :items="endpointHealth" />

    <div class="qg-dashboard-grid">
      <section class="qg-domain-panel qg-domain-panel--primary">
        <div class="qg-domain-panel__header">
          <div>
            <p class="qg-eyebrow">Runtime Health</p>
            <h2>本地运行健康</h2>
          </div>
          <StatusPill :status="snapshot.killSwitchStatus" :label="snapshot.killSwitchLabel" />
        </div>
        <KeyValueList :items="runtimeItems" />
      </section>

      <section class="qg-domain-panel">
        <div class="qg-domain-panel__header">
          <div>
            <p class="qg-eyebrow">Daily Loop</p>
            <h2>日报 / 自动驾驶 / Backtest</h2>
          </div>
        </div>
        <KeyValueList :items="dailyItems" />
      </section>
    </div>

    <section class="qg-domain-panel">
      <div class="qg-domain-panel__header">
        <div>
          <p class="qg-eyebrow">Route Watchlist</p>
          <h2>路线观察列表</h2>
        </div>
        <span class="qg-muted">最多显示 8 条，缺数据时保留 raw evidence。</span>
      </div>
      <div v-if="routeRows.length" class="qg-route-table-wrap">
        <table class="qg-route-table">
          <thead>
            <tr>
              <th>Route</th>
              <th>Status</th>
              <th>Score</th>
              <th>Note</th>
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
      <p v-else class="qg-empty-text">当前 dashboard payload 中没有 route watchlist；请查看下方 raw evidence。</p>
    </section>

    <details class="qg-domain-panel qg-domain-panel--details">
      <summary>Raw evidence</summary>
      <div class="qg-domain-grid qg-domain-grid--compact">
        <JsonPreview title="Latest Runtime" source="/api/latest" :payload="state.latest" />
        <JsonPreview title="Dashboard State" source="/api/dashboard/state" :payload="state.state" />
        <JsonPreview title="Backtest Summary" source="/api/dashboard/backtest-summary" :payload="state.backtest" />
        <JsonPreview title="Daily Review" source="/api/daily-review" :payload="state.dailyReview" />
        <JsonPreview title="Daily Autopilot" source="/api/daily-autopilot" :payload="state.dailyAutopilot" />
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
import {
  normalizeDashboardSnapshot,
  buildDashboardMetrics,
  buildEndpointHealth,
  buildRuntimeItems,
  buildDailyItems,
  buildRouteRows,
} from './dashboardModel.js';

const loading = ref(false);
const error = ref('');
const state = reactive({ latest: null, state: null, backtest: null, dailyReview: null, dailyAutopilot: null });

const snapshot = computed(() => normalizeDashboardSnapshot(state));
const metrics = computed(() => buildDashboardMetrics(snapshot.value));
const endpointHealth = computed(() => buildEndpointHealth(state));
const runtimeItems = computed(() => buildRuntimeItems(snapshot.value));
const dailyItems = computed(() => buildDailyItems(snapshot.value));
const routeRows = computed(() => buildRouteRows(snapshot.value));

async function load() {
  loading.value = true;
  error.value = '';
  try {
    Object.assign(state, await loadDashboardWorkspace());
  } catch (exc) {
    error.value = exc?.message || 'Failed to load dashboard workspace';
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>
