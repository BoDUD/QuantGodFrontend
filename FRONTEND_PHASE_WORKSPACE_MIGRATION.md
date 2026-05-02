# Frontend Phase Workspace Migration

本次迁移把 Phase 1/2/3 的 feature workspace 从 `src/components/phase*` 移到 `src/workspaces/phase*`。

## 为什么这样做

- `src/components/` 只保留可复用 UI 组件。
- `src/workspaces/` 承载完整功能域入口。
- `src/workspaces/legacy/LegacyWorkbench.vue` 仍然保留完整旧工作台，作为迁移期间的安全回退。

## 不改变的边界

- 不改 backend API。
- 不改 MT5 preset。
- 不改交易逻辑。
- 前端仍然只能通过 `/api/*` 获取运行时数据，不能直接读取 `/QuantGod_*.json` 或 `/QuantGod_*.csv`。

## 新增 CI 护栏

```text
npm run workspace-boundary
```

该检查会阻止 Phase workspace 代码回流到 `src/components/phase*`。
