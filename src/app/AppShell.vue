<template>
  <div class="app-shell">
    <aside class="app-shell__sidebar" aria-label="QuantGod workspace navigation">
      <div class="app-shell__brand">
        <span class="app-shell__eyebrow">QuantGod</span>
        <strong>量化运营台</strong>
        <small>本地优先 · 只读证据 · 中文运营视图</small>
      </div>

      <nav class="app-shell__nav">
        <section v-for="group in workspaceGroups" :key="group.key" class="app-shell__nav-group">
          <h2>{{ group.label }}</h2>
          <button
            v-for="item in group.items"
            :key="item.key"
            type="button"
            class="app-shell__nav-item"
            :class="{ 'app-shell__nav-item--active': item.key === activeWorkspace }"
            :aria-current="item.key === activeWorkspace ? 'page' : undefined"
            @click="selectWorkspace(item.key)"
          >
            <span>{{ item.label }}</span>
            <small>{{ item.description }}</small>
          </button>
        </section>
      </nav>
    </aside>

    <main class="app-shell__main">
      <header class="app-shell__topbar">
        <div>
          <p class="app-shell__eyebrow">{{ activeMeta.groupLabel }}</p>
          <h1>{{ activeMeta.label }}</h1>
          <p>{{ activeMeta.description }}</p>
        </div>
        <div class="app-shell__actions">
          <span
            class="app-shell__workspace-url app-shell__workspace-url--internal"
            :data-url="activeWorkspaceUrl"
            aria-hidden="true"
          />
          <button type="button" class="app-shell__secondary-button" @click="copyLink">
            {{ copyState }}
          </button>
        </div>
      </header>

      <section :key="activeWorkspace" class="app-shell__content-frame">
        <Suspense>
          <component :is="activeComponent" />
          <template #fallback>
            <LoadingState
              title="正在加载工作区"
              :description="`正在打开${activeMeta.label}，大型图表和策略工具会按需载入。`"
            />
          </template>
        </Suspense>
      </section>
    </main>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import LoadingState from '../components/LoadingState.vue';
import { WORKSPACE_GROUPS } from './navigation.js';
import { resolveWorkspaceComponent, workspaceMeta } from './workspaceRegistry.js';
import { useWorkspaceStore } from '../stores/workspaceStore.js';

const store = useWorkspaceStore();
const copyState = ref('复制当前页');

const workspaceGroups = WORKSPACE_GROUPS;
const activeWorkspace = computed(() => store.activeWorkspace.value);
const activeMeta = computed(() => workspaceMeta(activeWorkspace.value));
const activeComponent = computed(() => resolveWorkspaceComponent(activeWorkspace.value));
const activeWorkspaceUrl = computed(() => store.workspaceUrl(activeWorkspace.value));

onMounted(() => {
  store.initializeWorkspaceUrlSync();
});

function selectWorkspace(key) {
  store.setActiveWorkspace(key);
}

async function copyLink() {
  const copied = await store.copyWorkspaceLink(activeWorkspace.value);
  copyState.value = copied ? '已复制' : '复制失败';
  window.setTimeout(() => {
    copyState.value = '复制当前页';
  }, 1600);
}
</script>

<style scoped>
.app-shell {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  width: 100%;
  min-width: 0;
  min-height: 100vh;
  background: linear-gradient(180deg, rgb(56, 189, 248, 0.05), transparent 220px), var(--qg-bg);
}

.app-shell__sidebar {
  position: sticky;
  top: 0;
  z-index: 2;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 18px;
  height: 100vh;
  min-width: 0;
  padding: 18px 14px;
  overflow: hidden;
  background: rgb(5, 12, 24, 0.94);
  border-right: 1px solid var(--qg-border);
  box-shadow: 18px 0 44px rgb(0, 0, 0, 0.22);
}

.app-shell__brand {
  display: grid;
  gap: 6px;
  min-width: 0;
  padding: 14px;
  border: 1px solid var(--qg-border);
  border-radius: var(--qg-radius-lg);
  background: linear-gradient(180deg, rgb(56, 189, 248, 0.11), rgb(255, 255, 255, 0.035));
}

.app-shell__brand strong {
  color: var(--qg-text);
  font-size: 22px;
  line-height: 1.15;
}

.app-shell__brand small,
.app-shell__eyebrow {
  color: var(--qg-text-muted);
}

.app-shell__eyebrow {
  margin: 0;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0;
  text-transform: uppercase;
}

.app-shell__nav {
  display: grid;
  gap: 14px;
  min-height: 0;
  overflow-y: auto;
  padding-right: 2px;
  scrollbar-width: thin;
  scrollbar-color: rgb(148, 163, 184, 0.36) transparent;
}

.app-shell__nav-group {
  display: grid;
  gap: 8px;
  min-width: 0;
}

.app-shell__nav-group h2 {
  margin: 0 8px 2px;
  color: var(--qg-text-muted);
  font-size: 12px;
  font-weight: 900;
}

.app-shell__nav-item {
  display: grid;
  gap: 4px;
  width: 100%;
  min-width: 0;
  border: 1px solid transparent;
  border-radius: var(--qg-radius-md);
  padding: 11px 12px;
  text-align: left;
  background: transparent;
  color: var(--qg-text-soft);
}

.app-shell__nav-item:hover,
.app-shell__nav-item--active {
  border-color: rgb(56, 189, 248, 0.34);
  background: rgb(56, 189, 248, 0.11);
}

.app-shell__nav-item--active {
  color: var(--qg-text);
  box-shadow: inset 3px 0 0 var(--qg-accent);
}

.app-shell__nav-item span {
  overflow: hidden;
  font-size: 15px;
  font-weight: 850;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.app-shell__nav-item small {
  display: -webkit-box;
  overflow: hidden;
  color: var(--qg-text-muted);
  font-size: 12px;
  line-height: 1.35;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.app-shell__main {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  min-width: 0;
  min-height: 100vh;
  overflow: visible;
}

.app-shell__topbar {
  position: sticky;
  top: 0;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  min-width: 0;
  padding: 18px clamp(16px, 2vw, 28px);
  background: rgb(7, 17, 31, 0.86);
  border-bottom: 1px solid var(--qg-border);
  backdrop-filter: blur(14px);
}

.app-shell__topbar h1 {
  margin: 3px 0 4px;
  color: var(--qg-text);
  font-size: 24px;
  line-height: 1.15;
}

.app-shell__topbar p:last-child {
  max-width: 760px;
  margin: 0;
  color: var(--qg-text-muted);
  line-height: 1.45;
}

.app-shell__content-frame {
  min-width: 0;
  min-height: 0;
  overflow: visible;
  padding: clamp(12px, 1.8vw, 24px);
}

.app-shell__workspace-url--internal {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}

@media (width <= 1040px) {
  .app-shell {
    grid-template-columns: minmax(0, 1fr);
  }

  .app-shell__sidebar {
    position: relative;
    top: 0;
    z-index: 3;
    height: auto;
    min-width: 0;
    padding: 12px;
    overflow: visible;
  }

  .app-shell__brand {
    padding: 10px 12px;
  }

  .app-shell__brand small {
    display: none;
  }

  .app-shell__nav {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 8px;
    overflow: visible;
    padding-right: 0;
    padding-bottom: 0;
  }

  .app-shell__nav-group {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    min-width: 0;
    max-width: 100%;
  }

  .app-shell__nav-group h2 {
    display: none;
  }

  .app-shell__nav-item {
    flex: 1 1 min(132px, 100%);
    width: auto;
    min-width: 0;
    max-width: 100%;
    padding: 9px 10px;
  }

  .app-shell__nav-item span {
    text-overflow: clip;
    white-space: normal;
  }

  .app-shell__nav-item small {
    display: none;
  }
}

@media (width <= 720px) {
  .app-shell__topbar {
    align-items: flex-start;
    display: grid;
  }

  .app-shell__actions {
    align-items: flex-start;
    min-width: 0;
    width: 100%;
  }
}
</style>
