<template>
  <div class="app-shell">
    <aside class="app-shell__sidebar" aria-label="QuantGod workspace navigation">
      <div class="app-shell__brand">
        <span class="app-shell__eyebrow">QuantGod</span>
        <strong>Operator Workbench</strong>
        <small>local-first · API-only · read-only evidence</small>
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
          <code class="app-shell__workspace-url">{{ activeWorkspaceUrl }}</code>
          <button type="button" class="app-shell__secondary-button" @click="copyLink">
            {{ copyState }}
          </button>
        </div>
      </header>

      <component :is="activeComponent" />
    </main>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { WORKSPACE_GROUPS } from './navigation.js';
import { resolveWorkspaceComponent, workspaceMeta } from './workspaceRegistry.js';
import { useWorkspaceStore } from '../stores/workspaceStore.js';

const store = useWorkspaceStore();
const copyState = ref('复制链接');

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
    copyState.value = '复制链接';
  }, 1600);
}
</script>
