# QuantGod Frontend Governance Workspace Parity

本轮把 `governance` 业务域从 raw JSON 预览升级为结构化治理 evidence 面板。

## 目标

- 保持 `src/App.vue` 轻量入口。
- 保留 `src/workspaces/legacy/LegacyWorkbench.vue` 作为完整回退。
- Governance workspace 只通过 `src/services/domainApi.js` 调 `/api/*`。
- 不直接读取 `/QuantGod_*.json` 或 `/QuantGod_*.csv`。
- 不新增 promote / demote / preset mutation / OrderSend / close / cancel 能力。
- Version Gate 仍然只显示 evidence，任何实盘变更都必须走 ParamLab → Governance → Version Gate → 手动授权。

## 新增文件

- `src/workspaces/governance/governanceModel.js`
- `scripts/frontend_governance_workspace_guard.mjs`
- `tests/frontend_governance_workspace_guard.test.mjs`

## 结构化区域

- Governance metrics
- Endpoint health
- Safety envelope
- Advisor summary
- Promotion Gate summary
- Optimizer V2 summary
- Version Registry table
- Raw governance evidence fallback

## 验证命令

```bash
npm run contract
npm run structure
npm run workspace-boundary
npm run domain-workspace
npm run dashboard-workspace
npm run mt5-workspace
npm run governance-workspace
npm test
npm run build
node --check scripts/responsive_check.mjs
git diff --check
```
