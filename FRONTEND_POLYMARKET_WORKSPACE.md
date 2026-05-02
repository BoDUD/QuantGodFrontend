# QuantGod Frontend Polymarket Workspace Parity

本轮把 `polymarket` 业务域从 raw JSON 预览升级为结构化研究面板。目标是让 Radar、AI Score、Canary、Cross Linkage、History、Markets 与 Asset Opportunities 在 Vue 工作台中成为可读证据，而不是一组散装 JSON 卡片。

## 目标

- 保持 `src/App.vue` 轻量入口。
- 保留 `src/workspaces/legacy/LegacyWorkbench.vue` 作为完整回退。
- Polymarket workspace 只通过 `src/services/domainApi.js` 调用 `/api/*`。
- 不直接读取 `/QuantGod_*.json` 或 `/QuantGod_*.csv`。
- 不新增下单、资金划转、提现、自动执行、route promote/demote、live preset 写入、手动授权绕过入口。
- Polymarket、Canary、AI Score 与 Cross Linkage 都只作为 research/advisory evidence。

## 新增文件

- `src/workspaces/polymarket/polymarketModel.js`
- `scripts/frontend_polymarket_workspace_guard.mjs`
- `tests/frontend_polymarket_workspace_guard.test.mjs`

## 结构化区域

- Polymarket metrics
- Endpoint health
- Safety envelope
- Radar summary
- AI Score / Auto Governance summary
- Canary contract / run summary
- Cross Linkage / Single Market Analysis summary
- Search / Radar / Markets / Asset / History / Real Trade Evidence / Cross Linkage tables
- Raw Polymarket evidence fallback

## 安全边界

`polymarketModel.js` 固定包含这些安全默认值：

```js
researchOnly: true
advisoryOnly: true
readOnlyDataPlane: true
polymarketTradingAllowed: false
canaryExecutionAllowed: false
realTradeExecutionAllowed: false
orderSendAllowed: false
closeAllowed: false
cancelAllowed: false
credentialStorageAllowed: false
fundTransferAllowed: false
withdrawalAllowed: false
livePresetMutationAllowed: false
canOverrideKillSwitch: false
canMutateGovernanceDecision: false
canPromoteOrDemoteRoute: false
autoExecutionAllowed: false
requiresManualAuthorization: true
```

Guard 会拒绝这些 execution / mutation affordance：

```text
submitOrder
sendOrder
placeOrder
executeTrade
executeOrder
closePosition
cancelOrder
transferFunds
withdrawFunds
depositFunds
mutatePreset
writeLivePreset
promoteRoute
demoteRoute
executePromotion
manualAuthorize
autoExecute
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
npm run research-workspace
npm run polymarket-workspace
npm test
npm run build
node --check scripts/responsive_check.mjs
git diff --check
```
