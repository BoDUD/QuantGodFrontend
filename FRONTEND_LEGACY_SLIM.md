# Frontend Legacy Slim

本轮把 routed `LegacyWorkbench.vue` 从 4686 行旧单体页面缩成迁移说明和 workspace 跳转入口。
完整旧源码不会丢失，会归档到：

```text
archive/legacy-workbench/LegacyWorkbenchFull.vue
```

## 原则

- `src/workspaces/legacy/LegacyWorkbench.vue` 只保留迁移说明、冻结提示和跳转卡片。
- 新功能必须进入 `src/workspaces/*`。
- 归档源码放在 `archive/`，不放在 `src/`，避免被 build、contract 或 workspace guard 扫描。
- 不改变 backend、MT5 preset、交易逻辑或 API contract。

## 验证

```bash
npm run legacy-slim
npm run legacy-deprecation
npm test
npm run build
```
