# QuantGod Frontend MT5 Workspace Parity

本轮把 `mt5` 业务域从 raw JSON 预览升级为结构化只读监控工作区。

## 目标

- 保持 `src/App.vue` 轻量入口。
- 保留 `src/workspaces/legacy/LegacyWorkbench.vue` 作为完整回退。
- MT5 workspace 只通过 `src/services/domainApi.js` 调 `/api/*`。
- 不直接读取 `/QuantGod_*.json` 或 `/QuantGod_*.csv`。
- 不新增任何 `OrderSend`、close、cancel、credential storage 或 live preset mutation 能力。

## 新增文件

- `src/workspaces/mt5/mt5Model.js`
- `scripts/frontend_mt5_workspace_guard.mjs`
- `tests/frontend_mt5_workspace_guard.test.mjs`

## 结构化区域

- Bridge metrics
- Endpoint health
- Safety envelope
- Account snapshot
- Open positions table
- Pending orders table
- Symbol registry table
- Raw MT5 evidence fallback

## 验证命令

```bash
npm run contract
npm run structure
npm run workspace-boundary
npm run domain-workspace
npm run dashboard-workspace
npm run mt5-workspace
npm test
npm run build
node --check scripts/responsive_check.mjs
git diff --check
```
