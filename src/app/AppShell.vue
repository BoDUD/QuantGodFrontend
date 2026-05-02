<template>
  <a-layout class="qg-app-shell">
    <a-layout-sider
      v-model:collapsed="collapsed"
      class="qg-app-shell__sider"
      collapsible
      breakpoint="lg"
      :width="260"
    >
      <div class="qg-app-shell__brand">
        <div class="qg-app-shell__brand-title">QuantGod</div>
        <div v-if="!collapsed" class="qg-app-shell__brand-subtitle">Split Workspace</div>
      </div>

      <a-menu
        class="qg-app-shell__menu"
        mode="inline"
        theme="dark"
        :selected-keys="[activeWorkspace]"
        @click="handleMenuClick"
      >
        <a-menu-item v-for="workspace in workspaces" :key="workspace.key">
          <span>{{ workspace.label }}</span>
        </a-menu-item>
      </a-menu>
    </a-layout-sider>

    <a-layout>
      <a-layout-header class="qg-app-shell__header">
        <div>
          <div class="qg-app-shell__title">{{ currentWorkspace.label }}</div>
          <div class="qg-app-shell__description">{{ currentWorkspace.description }}</div>
        </div>
        <a-tag color="blue">/api/* only</a-tag>
      </a-layout-header>

      <a-layout-content class="qg-app-shell__content">
        <a-alert
          v-if="activeWorkspace === 'legacy'"
          class="qg-app-shell__notice"
          type="info"
          show-icon
          message="完整工作台已移入 LegacyWorkbench"
          description="这是前端模块化第一阶段：先把大型 App.vue 降为轻量 shell，同时保留原工作台作为安全回退。后续再逐个把 legacy 面板迁入 workspaces/*。"
        />
        <component :is="activeComponent" />
      </a-layout-content>
    </a-layout>
  </a-layout>
</template>

<script setup>
import { computed, ref } from 'vue';

import { resolveWorkspaceComponent, workspaceMeta } from './workspaceRegistry.js';
import { useWorkspaceStore } from '../stores/workspaceStore.js';

const collapsed = ref(false);
const workspaceStore = useWorkspaceStore();

const activeWorkspace = computed(() => workspaceStore.activeWorkspace.value);
const workspaces = workspaceStore.workspaces;
const currentWorkspace = computed(() => workspaceMeta(activeWorkspace.value));
const activeComponent = computed(() => resolveWorkspaceComponent(activeWorkspace.value));

function handleMenuClick(event) {
  workspaceStore.setActiveWorkspace(event.key);
}
</script>
