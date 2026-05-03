<template>
  <section class="qg-ux-dashboard" aria-label="QuantGod dashboard UX upgrade panel">
    <div class="qg-ux-dashboard__header">
      <div>
        <p class="qg-eyebrow">UX Foundation</p>
        <h2>{{ labels.upgradeTitle }}</h2>
        <p>{{ labels.upgradeHint }}</p>
      </div>
      <span class="qg-ux-pill">API-only · read-only</span>
    </div>

    <div class="qg-kpi-row">
      <KpiCard
        :title="labels.kpiPositions"
        :value="kpis.positions"
        :detail="kpis.positionDetail"
        badge="MT5"
      />
      <KpiCard
        :title="labels.kpiPnl"
        :value="kpis.dailyPnl"
        :pnl="true"
        :currency="true"
        :detail="kpis.pnlDetail"
      />
      <KpiCard
        :title="labels.kpiSignals"
        :value="kpis.signals24h"
        :detail="kpis.signalDetail"
        badge="AI"
      />
      <KpiCard
        :title="labels.kpiAlerts"
        :value="kpis.alerts"
        :tone="kpis.alerts > 0 ? 'warning' : 'neutral'"
        :detail="kpis.alertDetail"
      />
    </div>

    <div class="qg-ux-grid">
      <article class="qg-ux-widget qg-ux-widget--span-6">
        <div class="qg-ux-widget__header">
          <div>
            <h3>{{ labels.aiSummary }}</h3>
            <p>DeepSeek / AI Analysis / Journal 摘要占位，后端未返回时显示本地复核提醒。</p>
          </div>
          <span class="qg-ux-pill">advisory-only</span>
        </div>
        <ul class="qg-ux-list">
          <li v-for="item in summaryItems" :key="item.key">
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
          </li>
        </ul>
      </article>

      <article class="qg-ux-widget qg-ux-widget--span-6">
        <div class="qg-ux-widget__header">
          <div>
            <h3>{{ labels.alertTimeline }}</h3>
            <p>把治理、MT5 runtime、AI journal 的异常做成可扫描时间线。</p>
          </div>
          <span class="qg-ux-pill">{{ alertRows.length }} rows</span>
        </div>
        <ul v-if="alertRows.length" class="qg-ux-list">
          <li v-for="row in alertRows" :key="row.id">
            <span>{{ row.label }}</span>
            <strong :class="row.toneClass">{{ row.status }}</strong>
          </li>
        </ul>
        <EmptyState v-else title="暂无告警" description="没有从 dashboard payload 中发现异常项。" />
      </article>

      <article class="qg-ux-widget qg-ux-widget--span-8">
        <div class="qg-ux-widget__header">
          <div>
            <h3>{{ labels.positionSnapshot }}</h3>
            <p>持仓快照先用 inline sparkline 占位，后续可替换为 KLineCharts mini mode。</p>
          </div>
          <span class="qg-ux-pill">mini K</span>
        </div>
        <ul v-if="positionRows.length" class="qg-ux-list">
          <li v-for="row in positionRows" :key="row.id">
            <span>{{ row.symbol }} · {{ row.side }} · {{ row.volume }}</span>
            <MiniSparkline :values="row.spark" :label="`${row.symbol} mini sparkline`" :class="row.toneClass" />
            <strong :class="row.toneClass">{{ row.pnl }}</strong>
          </li>
        </ul>
        <EmptyState v-else title="暂无持仓快照" description="等待 /api/mt5-readonly 或 dashboard payload 返回 positions。" />
      </article>

      <article class="qg-ux-widget qg-ux-widget--span-4">
        <div class="qg-ux-widget__header">
          <div>
            <h3>{{ labels.systemHealth }}</h3>
            <p>只读运行健康聚合。</p>
          </div>
        </div>
        <ul class="qg-ux-list">
          <li v-for="item in healthRows" :key="item.key">
            <span>{{ item.label }}</span>
            <strong :class="item.toneClass">{{ item.value }}</strong>
          </li>
        </ul>
      </article>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue';
import KpiCard from '../../components/KpiCard.vue';
import EmptyState from '../../components/EmptyState.vue';
import MiniSparkline from '../../components/MiniSparkline.vue';
import { formatCurrency, formatNumber, formatPnl, numberToneClass } from '../../composables/useNumberFormat.js';
import { t } from '../../i18n/index.js';

const props = defineProps({
  state: { type: Object, required: true },
  snapshot: { type: Object, required: true },
  metrics: { type: Array, default: () => [] },
});

const locale = computed(() => (typeof document !== 'undefined' ? document.documentElement?.dataset?.locale || 'zh-CN' : 'zh-CN'));
const labels = computed(() => ({
  upgradeTitle: t('dashboard.upgradeTitle', locale.value),
  upgradeHint: t('dashboard.upgradeHint', locale.value),
  kpiPositions: t('dashboard.kpiPositions', locale.value),
  kpiPnl: t('dashboard.kpiPnl', locale.value),
  kpiSignals: t('dashboard.kpiSignals', locale.value),
  kpiAlerts: t('dashboard.kpiAlerts', locale.value),
  aiSummary: t('dashboard.aiSummary', locale.value),
  alertTimeline: t('dashboard.alertTimeline', locale.value),
  positionSnapshot: t('dashboard.positionSnapshot', locale.value),
  systemHealth: t('dashboard.systemHealth', locale.value),
  reviewQueue: t('dashboard.reviewQueue', locale.value),
}));

function readPath(source, path) {
  return String(path)
    .split('.')
    .reduce((cursor, part) => (cursor == null ? undefined : cursor[part]), source);
}

function first(paths, fallback = null) {
  for (const path of paths) {
    const value = readPath(props.state, path) ?? readPath(props.snapshot, path);
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return fallback;
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.rows)) return value.rows;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.data?.rows)) return value.data.rows;
  return [];
}

function countRows(paths) {
  for (const path of paths) {
    const rows = asArray(readPath(props.state, path) ?? readPath(props.snapshot, path));
    if (rows.length) return rows.length;
  }
  return 0;
}

const kpis = computed(() => {
  const positions = countRows(['latest.positions', 'state.positions', 'latest.data.positions', 'state.data.positions']);
  const signals = countRows(['dailyReview.signals', 'dailyReview.data.signals', 'latest.signals', 'latest.signal_rows']) || Number(first(['dailyReview.signals_24h', 'dailyReview.signal_count_24h'], 0));
  const alerts = alertRows.value.length;
  const pnl = Number(first(['dailyPnl', 'latest.daily_pnl', 'latest.pnl.daily', 'state.daily_pnl', 'state.pnl.daily'], 0));
  return {
    positions,
    dailyPnl: pnl,
    signals24h: Number.isFinite(signals) ? signals : 0,
    alerts,
    positionDetail: positions ? '来自只读 runtime evidence' : '等待 MT5 runtime',
    pnlDetail: 'shadow / journal 评分前不视为实盘结论',
    signalDetail: 'AI fusion + journal 只做建议',
    alertDetail: alerts ? '需要人工复核' : '当前无未读异常',
  };
});

const summaryItems = computed(() => [
  { key: 'snapshot', label: '快照来源', value: first(['source', 'snapshotSource', 'latest.source'], 'runtime evidence') },
  { key: 'fresh', label: '运行快照新鲜', value: String(first(['runtimeFresh', 'latest.runtimeFresh'], 'unknown')) },
  { key: 'pnl', label: '今日 PnL', value: formatPnl(kpis.value.dailyPnl, { currency: true }) },
  { key: 'metrics', label: '现有指标卡片', value: formatNumber(props.metrics?.length || 0) },
]);

const alertRows = computed(() => {
  const rows = [];
  const killSwitch = first(['killSwitchStatus', 'kill_switch_status', 'latest.kill_switch', 'state.kill_switch'], 'unknown');
  const dryRun = first(['dryRunStatus', 'dry_run_status', 'latest.dry_run', 'state.dry_run'], 'unknown');
  if (String(killSwitch).toLowerCase().includes('active') || String(killSwitch).toLowerCase() === 'true') {
    rows.push({ id: 'kill-switch', label: '熔断状态', status: String(killSwitch), toneClass: 'qg-text-warning' });
  }
  if (String(dryRun).toLowerCase() === 'false') {
    rows.push({ id: 'dry-run', label: 'Dry-run 关闭', status: '需要复核', toneClass: 'qg-text-warning' });
  }
  const rawAlerts = asArray(first(['latest.alerts', 'state.alerts', 'dailyReview.alerts', 'dailyAutopilot.alerts'], []));
  rawAlerts.slice(0, 5).forEach((row, index) => {
    rows.push({
      id: `raw-${index}`,
      label: row?.message || row?.label || row?.name || `告警 ${index + 1}`,
      status: row?.status || row?.severity || 'active',
      toneClass: 'qg-text-warning',
    });
  });
  return rows.slice(0, 6);
});

const positionRows = computed(() => {
  const rows = asArray(first(['latest.positions', 'state.positions', 'latest.data.positions', 'state.data.positions'], []));
  return rows.slice(0, 6).map((row, index) => {
    const pnl = Number(row?.pnl ?? row?.profit ?? row?.floating_pnl ?? 0);
    const seed = Number.isFinite(pnl) ? pnl : index;
    const spark = [0, 0.15, -0.05, 0.22, 0.08, 0.3, 0.18, seed / 100].map((v) => v + index * 0.02);
    return {
      id: row?.ticket || row?.id || `${row?.symbol || 'symbol'}-${index}`,
      symbol: row?.symbol || row?.Symbol || 'UNKNOWN',
      side: row?.type || row?.side || row?.direction || '—',
      volume: row?.volume || row?.lots || row?.lot || '—',
      pnl: formatCurrency(pnl),
      toneClass: numberToneClass(pnl),
      spark,
    };
  });
});

const healthRows = computed(() => [
  { key: 'api', label: '/api facade', value: 'OK', toneClass: 'qg-text-positive' },
  { key: 'runtime', label: 'Runtime', value: first(['runtimeState', 'status', 'latest.status'], 'unknown'), toneClass: 'qg-text-muted' },
  { key: 'kill', label: 'Kill Switch', value: first(['killSwitchLabel', 'killSwitchStatus'], 'unknown'), toneClass: 'qg-text-warning' },
  { key: 'review', label: labels.value.reviewQueue, value: `${alertRows.value.length} 条`, toneClass: alertRows.value.length ? 'qg-text-warning' : 'qg-text-positive' },
]);
</script>
