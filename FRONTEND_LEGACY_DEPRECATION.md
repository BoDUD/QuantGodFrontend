# QuantGod Frontend Legacy Deprecation Guard

本轮不是删除 LegacyWorkbench，而是把它正式降级为 fallback-only 入口。

## 背景

当前 frontend 已经完成：

- AppShell 模块化入口。
- Phase 1 / 2 / 3 workspace 迁移。
- 6 个业务域 workspace 第一层 parity。
- 业务域 guard 矩阵。

此时 `src/workspaces/legacy/LegacyWorkbench.vue` 仍然保留完整旧工作台。它的价值是回退和对照，不应该继续承载新功能。

## 本轮新增

- `src/workspaces/legacy/LEGACY_MIGRATION.md`
- `src/workspaces/legacy/legacyMigrationManifest.js`
- `src/workspaces/legacy/LegacyDeprecationBanner.vue`
- `scripts/frontend_legacy_deprecation_guard.mjs`
- `tests/frontend_legacy_deprecation_guard.test.mjs`
- `npm run legacy-deprecation`
- CI 中新增 Legacy deprecation guard

## Guard 检查内容

- LegacyWorkbench 只能由 `src/app/workspaceRegistry.js` 注册。
- 其他 workspace 不允许 import 或引用 LegacyWorkbench。
- Legacy 不能成为默认 workspace。
- LegacyWorkbench 行数不能继续膨胀，默认上限 5200 行。
- 6 个业务域 workspace 必须存在。
- `LEGACY_MIGRATION.md` 必须记录迁移状态和安全边界。
- CI 必须运行 `npm run legacy-deprecation`。
- 业务域 workspace 不能直接 `fetch()` 或读取 `/QuantGod_*.json/csv`。

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
npm run legacy-deprecation
npm test
npm run build
node --check scripts/responsive_check.mjs
git diff --check
```

## 下一步

Legacy guard 合并后，再开始逐域删除 LegacyWorkbench 中已经被新 workspace 覆盖的重复 UI。建议顺序：

1. Dashboard 重复 UI
2. MT5 重复 UI
3. Governance 重复 UI
4. ParamLab 重复 UI
5. Research 重复 UI
6. Polymarket 重复 UI

每一步都保留可回滚提交，不跨域混改。
