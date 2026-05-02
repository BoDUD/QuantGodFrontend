<template>
  <section class="qg-legacy-slim">
    <LegacyDeprecationBanner />

    <div class="legacy-slim-hero panel-card">
      <p class="eyebrow">Legacy fallback archived</p>
      <h1>Legacy Workbench 已退役为归档入口</h1>
      <p class="muted">
        6 个运营业务域和 Phase 1/2/3 工作区已经迁移到独立 workspace。
        旧单体页面不再承载新功能，也不再作为默认入口。
      </p>
      <div class="legacy-slim-counts">
        <span>{{ counts.migrated ?? counts.complete ?? 9 }} migrated</span>
        <span>{{ counts.total ?? 9 }} tracked</span>
        <span>{{ archiveLabel }}</span>
      </div>
    </div>

    <div class="legacy-slim-grid">
      <article v-for="workspace in migratedWorkspaces" :key="workspace.key" class="legacy-slim-card panel-card">
        <div>
          <p class="eyebrow">{{ workspace.group }}</p>
          <h2>{{ workspace.title }}</h2>
          <p class="muted">{{ workspace.description }}</p>
        </div>
        <button class="btn-primary" type="button" @click="openWorkspace(workspace.key)">
          打开 {{ workspace.title }}
        </button>
      </article>
    </div>

    <details class="legacy-slim-details panel-card">
      <summary>归档说明</summary>
      <ul>
        <li>完整旧单体源码已移至 <code>archive/legacy-workbench/LegacyWorkbenchFull.vue</code>。</li>
        <li>当前 routed Legacy workspace 只作为迁移说明和跳转入口。</li>
        <li>后续修改必须落到对应 <code>src/workspaces/*</code>，不能写回 Legacy。</li>
      </ul>
    </details>
  </section>
</template>

<script setup>
import LegacyDeprecationBanner from './LegacyDeprecationBanner.vue';
import { legacyMigrationCounts } from './legacyMigrationManifest.js';
import { useWorkspaceStore } from '../../stores/workspaceStore.js';

const { setActiveWorkspace } = useWorkspaceStore();
const counts = legacyMigrationCounts();
const archiveLabel = 'full source archived';

const migratedWorkspaces = [
  {
    key: 'dashboard',
    group: 'Operations',
    title: 'Dashboard',
    description: '运行状态、Endpoint health、Daily loop 和 Route Watchlist。',
  },
  {
    key: 'mt5',
    group: 'Operations',
    title: 'MT5 Monitor',
    description: '账户、持仓、订单、Symbol Registry 和只读安全 envelope。',
  },
  {
    key: 'governance',
    group: 'Operations',
    title: 'Governance',
    description: 'Advisor、Version Gate、Optimizer V2 和治理证据。',
  },
  {
    key: 'paramlab',
    group: 'Operations',
    title: 'ParamLab',
    description: '参数实验、Scheduler、Recovery 和 tester-only evidence。',
  },
  {
    key: 'research',
    group: 'Research',
    title: 'Research',
    description: 'Shadow、交易历史、Strategy / Regime evaluation。',
  },
  {
    key: 'polymarket',
    group: 'Research',
    title: 'Polymarket',
    description: 'Radar、AI score、Canary evidence 和 cross-linkage。',
  },
  {
    key: 'phase1',
    group: 'Phase',
    title: 'Phase 1 · AI/K线',
    description: 'AI Analysis V1 和 Kline workspace。',
  },
  {
    key: 'phase2',
    group: 'Phase',
    title: 'Phase 2 · Ops',
    description: '统一 API、通知和操作状态面板。',
  },
  {
    key: 'phase3',
    group: 'Phase',
    title: 'Phase 3 · Vibe/AI V2',
    description: 'Vibe Coding、AI V2 debate 和 Kline 增强。',
  },
];

function openWorkspace(key) {
  setActiveWorkspace(key);
}
</script>

<style scoped>
.qg-legacy-slim {
  display: grid;
  gap: 18px;
}

.legacy-slim-hero {
  display: grid;
  gap: 12px;
}

.legacy-slim-hero h1,
.legacy-slim-card h2 {
  margin: 0;
}

.legacy-slim-counts {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.legacy-slim-counts span {
  border: 1px solid var(--border-color, rgba(148, 163, 184, 0.28));
  border-radius: 999px;
  padding: 6px 10px;
  color: var(--text-muted, #94a3b8);
}

.legacy-slim-grid {
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
}

.legacy-slim-card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 190px;
  gap: 18px;
}

.legacy-slim-details ul {
  margin: 12px 0 0;
}
</style>
