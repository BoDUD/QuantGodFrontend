# QuantGod Frontend Dashboard Workspace Parity

本轮把 `dashboard` 业务域从简单 raw JSON 预览升级为结构化运行总览。

## 目标

- 保持 `src/App.vue` 轻量入口。
- 保留 `src/workspaces/legacy/LegacyWorkbench.vue` 作为完整回退。
- Dashboard workspace 只通过 `src/services/domainApi.js` 调 `/api/*`。
- 不直接读取 `/QuantGod_*.json` 或 `/QuantGod_*.csv`。
- 不新增任何交易执行、close、cancel、preset mutation 能力。

## 新增文件

- `src/workspaces/dashboard/dashboardModel.js`
- `src/workspaces/shared/StatusPill.vue`
- `src/workspaces/shared/KeyValueList.vue`
- `src/workspaces/shared/EndpointHealthGrid.vue`
- `scripts/frontend_dashboard_workspace_guard.mjs`
- `tests/frontend_dashboard_workspace_guard.test.mjs`

## 验证命令

```bash
npm run contract
npm run structure
npm run workspace-boundary
npm run domain-workspace
npm run dashboard-workspace
npm test
npm run build
node --check scripts/responsive_check.mjs
git diff --check
```
