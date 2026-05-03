<template>
  <section class="qg-legacy-slim">
    <LegacyDeprecationBanner />

    <div class="legacy-slim-hero panel-card">
      <p class="eyebrow">归档入口</p>
      <h1>旧完整工作台已归档</h1>
      <p class="muted">
        MT5、Polymarket、每日复盘、通知和 AI 工具已经迁移到独立运营页面。
        这里仅保留跳转和回退说明，不再承载新功能。
      </p>
      <div class="legacy-slim-counts">
        <span>{{ counts.migrated ?? counts.complete ?? 9 }} 个页面已迁移</span>
        <span>{{ counts.total ?? 9 }} 个模块已跟踪</span>
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
        <li>当前归档入口只作为迁移说明和跳转入口。</li>
        <li>后续修改必须落到对应业务页面，不能写回旧单体页面。</li>
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
const archiveLabel = '旧源码已归档';

const migratedWorkspaces = [
  {
    key: 'dashboard',
    group: '核心运营',
    title: '全局总览',
    description: '账户、待办、复盘、风险和跨市场状态。',
  },
  {
    key: 'mt5',
    group: '核心运营',
    title: 'MT5 实盘监控',
    description: '账户、持仓、订单、品种状态和只读安全边界。',
  },
  {
    key: 'governance',
    group: '核心运营',
    title: '策略治理',
    description: '升降级建议、版本闸门、优化器和治理证据。',
  },
  {
    key: 'paramlab',
    group: '核心运营',
    title: 'ParamLab',
    description: '参数实验、排队调度、失败恢复和报告回灌。',
  },
  {
    key: 'research',
    group: '研究分析',
    title: '模拟研究',
    description: '模拟信号、交易历史、策略评估和行情环境评估。',
  },
  {
    key: 'polymarket',
    group: '研究分析',
    title: 'Polymarket',
    description: '公开市场雷达、AI 评分、亏损隔离和跨市场联动。',
  },
  {
    key: 'phase1',
    group: '分析工具',
    title: 'AI 分析与K线',
    description: 'AI 分析、专业 K 线、交易点和模拟信号叠加。',
  },
  {
    key: 'phase2',
    group: '分析工具',
    title: '运维通知中心',
    description: '本地运行证据、Telegram 推送和运维记录。',
  },
  {
    key: 'phase3',
    group: '分析工具',
    title: '策略创作与AI辩论',
    description: '策略草稿、AI 多观点辩论和图表增强。',
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
