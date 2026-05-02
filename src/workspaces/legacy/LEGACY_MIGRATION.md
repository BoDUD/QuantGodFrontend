# Legacy Workbench 迁移清单

`LegacyWorkbench.vue` 现在只作为完整回退入口保留，不再承载新功能。新增功能必须进入对应的 `src/workspaces/*` 业务域或 Phase 工作区。

## 已完成迁移

- Dashboard → `src/workspaces/dashboard/`
- MT5 Monitor → `src/workspaces/mt5/`
- Governance → `src/workspaces/governance/`
- ParamLab → `src/workspaces/paramlab/`
- Research / Shadow / Trades → `src/workspaces/research/`
- Polymarket → `src/workspaces/polymarket/`
- Phase 1 / Phase 2 / Phase 3 → `src/workspaces/phase1|phase2|phase3/`

## 禁止事项

- 不在 Legacy 中新增业务功能。
- 所有数据访问统一通过 `/api/*` 端点，不在 Legacy 中直接 `fetch()`。
- 不在 Legacy 中读取 `/QuantGod_*.json` 或 `/QuantGod_*.csv`。
- 不在 Legacy 中新增 order / close / cancel / fund transfer / preset mutation / route promotion 等执行入口。
- 不把 Legacy 重新设为默认入口。

## 安全边界

Legacy fallback 必须继续遵守：

```text
orderSendAllowed=false
closeAllowed=false
cancelAllowed=false
credentialStorageAllowed=false
livePresetMutationAllowed=false
canOverrideKillSwitch=false
```

## 删除顺序

1. 删除 Dashboard 重复块。
2. 删除 MT5 Monitor 重复块。
3. 删除 Governance 重复块。
4. 删除 ParamLab 重复块。
5. 删除 Research / Shadow / Trades 重复块。
6. 删除 Polymarket 重复块。
7. 确认所有独有功能已迁移后，再删除 `LegacyWorkbench.vue`。

## Legacy Slim

`LegacyWorkbench.vue` 已从完整旧单体页面缩为迁移入口。完整旧源码归档在：

```text
archive/legacy-workbench/LegacyWorkbenchFull.vue
```

后续维护规则：

1. 新功能必须进入 `src/workspaces/*`。
2. routed Legacy 只允许保留冻结提示、迁移清单和跳转入口。
3. 归档源码不能放在 `src/` 下，避免被 build 或 contract guard 扫描。
4. 禁止在 Legacy 中恢复直接文件读取、交易执行、资金操作、preset mutation 或治理授权入口。
