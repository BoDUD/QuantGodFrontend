# QuantGodFrontend 模块化第一阶段

本补丁把 `src/App.vue` 从大型业务文件降为轻量入口，并把原完整工作台移动到：

```text
src/workspaces/legacy/LegacyWorkbench.vue
```

新增的 shell 文件：

```text
src/app/AppShell.vue
src/app/navigation.js
src/app/workspaceRegistry.js
src/stores/workspaceStore.js
```

新增的 CI 护栏：

```text
scripts/frontend_structure_guard.mjs
tests/frontend_structure_guard.test.mjs
npm run structure
```

## 为什么这样拆

这不是一次性重写业务逻辑，而是安全拆分的第一步：

1. 原工作台完整保留为 Legacy Workspace，避免破坏已验收功能。
2. `App.vue` 变成纯入口，后续小模块不再继续往一个 200KB 文件里堆。
3. Phase 1/2/3 已有组件可以从 shell 直接进入。
4. 后续再逐步把 Legacy 里的面板迁移到 `src/workspaces/*`。

## 安全边界

本补丁只改前端结构，不改 backend API，不改 MT5 preset，不改交易逻辑。

前端仍然只能通过 `/api/*` 获取运行时数据，不能读取 `QuantGod_*.json/csv` 本地路径。
