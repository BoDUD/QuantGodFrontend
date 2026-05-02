# QuantGod Frontend ParamLab Workspace Parity

本轮把 `paramlab` 业务域从 raw JSON 预览升级为结构化 ParamLab 实验监控面板。

## 目标

- 保持 `src/App.vue` 轻量入口。
- 保留 `src/workspaces/legacy/LegacyWorkbench.vue` 作为完整回退。
- ParamLab workspace 只通过 `src/services/domainApi.js` 调 `/api/*`。
- 不直接读取 `/QuantGod_*.json` 或 `/QuantGod_*.csv`。
- 不新增 live preset 写入、route promote/demote、OrderSend、close、cancel 能力。
- ParamLab 只显示 tester/research evidence，任何进入实盘的路径仍必须经过 ParamLab → Governance → Version Gate → 手动授权。

## 新增文件

- `src/workspaces/paramlab/paramlabModel.js`
- `scripts/frontend_paramlab_workspace_guard.mjs`
- `tests/frontend_paramlab_workspace_guard.test.mjs`

## 结构化区域

- ParamLab metrics
- Endpoint health
- Safety envelope
- Batch status
- Scheduler summary
- Recovery / Report Watcher / Tester Window summary
- Top result ledger
- Scheduler ledger
- Raw ParamLab evidence fallback

## 安全边界

`paramlabModel.js` 固定包含这些安全默认值：

```js
orderSendAllowed: false
closeAllowed: false
cancelAllowed: false
credentialStorageAllowed: false
livePresetMutationAllowed: false
canOverrideKillSwitch: false
canMutateGovernanceDecision: false
canPromoteOrDemoteRoute: false
autoPromotionAllowed: false
requiresManualAuthorization: true
```

Guard 会拒绝这些 execution affordance：

```text
OrderSend
placeOrder
sendOrder
closePosition
cancelOrder
mutatePreset
writeLivePreset
promoteRoute
demoteRoute
executePromotion
manualAuthorize
runLiveTester
startLiveRun
```

## 验证命令

```bash
npm run contract
npm run structure
npm run workspace-boundary
npm run domain-workspace
npm run dashboard-workspace
npm run mt5-workspace
npm run governance-workspace
npm run paramlab-workspace
npm test
npm run build
node --check scripts/responsive_check.mjs
git diff --check
```
