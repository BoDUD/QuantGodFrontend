<template>
  <main class="phase1-workspace">
    <header class="phase1-workspace__header">
      <div>
        <p>AI / K线工作区</p>
        <h2>分析证据与专业图表</h2>
      </div>
      <nav class="phase1-workspace__tabs" aria-label="AI 图表模块切换">
        <button type="button" :class="{ active: tab === 'kline' }" @click="tab = 'kline'">专业 K 线</button>
        <button type="button" :class="{ active: tab === 'ai' }" @click="tab = 'ai'">AI 分析</button>
      </nav>
    </header>

    <Suspense>
      <KlineWorkspace v-if="tab === 'kline'" />
      <AiAnalysisWorkspace v-else />
      <template #fallback>
        <LoadingState title="正在加载分析模块" description="专业图表和 AI 分析会按需加载。" />
      </template>
    </Suspense>
  </main>
</template>

<script setup>
import { defineAsyncComponent, ref } from 'vue';
import LoadingState from '../../components/LoadingState.vue';

const AiAnalysisWorkspace = defineAsyncComponent(() => import('./AiAnalysisWorkspace.vue'));
const KlineWorkspace = defineAsyncComponent(() => import('./kline/KlineWorkspace.vue'));

const tab = ref('kline');
</script>

<style scoped>
.phase1-workspace {
  box-sizing: border-box;
  display: grid;
  gap: 16px;
  width: 100%;
  min-width: 0;
  padding: 0;
}

.phase1-workspace > * {
  min-width: 0;
}

.phase1-workspace__header {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 16px;
  min-width: 0;
  border: 1px solid var(--qg-border);
  border-radius: var(--qg-radius-lg);
  padding: 16px;
  background: linear-gradient(180deg, var(--qg-bg-panel), rgb(10, 20, 36, 0.82));
}

.phase1-workspace__header p,
.phase1-workspace__header h2 {
  margin: 0;
}

.phase1-workspace__header p {
  color: var(--qg-accent);
  font-size: 12px;
  font-weight: 900;
}

.phase1-workspace__header h2 {
  margin-top: 6px;
  color: var(--qg-text);
  font-size: 26px;
  line-height: 1.16;
}

.phase1-workspace__tabs {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
  min-width: 0;
}

.phase1-workspace__tabs button {
  border: 1px solid var(--qg-border);
  border-radius: 999px;
  padding: 9px 13px;
  background: var(--qg-surface-soft);
  color: var(--qg-text-soft);
  font-weight: 800;
}

.phase1-workspace__tabs button.active {
  border-color: rgb(56, 189, 248, 0.55);
  background: var(--qg-accent-soft);
  color: var(--qg-text);
}

@media (width <= 720px) {
  .phase1-workspace__header {
    display: grid;
  }

  .phase1-workspace__tabs {
    justify-content: flex-start;
  }
}
</style>
