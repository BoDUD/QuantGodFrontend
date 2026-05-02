# QuantGod Frontend Research Workspace Parity

本轮把 `research` 业务域从薄层 raw JSON / CSV 预览升级为结构化研究证据面板。

## 目标

- 保持 `src/App.vue` 轻量入口。
- 保留 `src/workspaces/legacy/LegacyWorkbench.vue` 作为完整回退。
- Research workspace 只通过 `src/services/domainApi.js` 调用 `/api/*`。
- 不直接读取 `/QuantGod_*.json` 或 `/QuantGod_*.csv`。
- 不新增下单、平仓、撤单、route promote/demote、live preset 写入、手动授权绕过入口。
- Research、Shadow、Trade Ledger、Strategy/Regime Evaluation 都只作为 evidence，不直接影响实盘执行。

## 新增文件

- `src/workspaces/research/researchModel.js`
- `scripts/frontend_research_workspace_guard.mjs`
- `tests/frontend_research_workspace_guard.test.mjs`

## 结构化区域

- Research metrics
- Endpoint health
- Safety envelope
- Research stats summary
- Shadow research summary
- Trade ledger summary
- Strategy / regime evaluation summary
- Shadow / trade / evaluation / manual alpha tables
- Raw research evidence fallback

## 安全边界

`researchModel.js` 固定包含这些安全默认值：

```js
researchOnly: true
shadowOnly: true
advisoryOnly: true
readOnlyDataPlane: true
orderSendAllowed: false
closeAllowed: false
cancelAllowed: false
credentialStorageAllowed: false
livePresetMutationAllowed: false
canOverrideKillSwitch: false
canMutateGovernanceDecision: false
canPromoteOrDemoteRoute: false
autoPromotionAllowed: false
manualExecutionRequired: true
```

Guard 会拒绝这些 execution affordance：

```text
OrderSend
placeOrder
sendOrder
submitOrder
closePosition
cancelOrder
mutatePreset
writeLivePreset
promoteRoute
demoteRoute
executePromotion
manualAuthorize
startLiveRun
runLiveTester
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
npm test
npm run build
node --check scripts/responsive_check.mjs
git diff --check
```
