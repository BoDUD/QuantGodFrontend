# 前端响应式加固

P3-13 让量化运营台在 320 / 360 / 390 / 612 / 900 / 1280 / 1512 等常见宽度下都能正常阅读和操作。

## 调整范围

- 新增 `src/styles/responsive-hardening.css`，集中处理窄屏和小窗口布局压力。
- 在 `src/main.js` 中把响应式样式放在主题样式之后加载，保证兜底规则生效。
- 新增响应式守护脚本和 Node 测试，防止后续改动又把横向溢出、文字裁剪、表格不可滚动带回来。
- 保持前端只通过 `/api/*` 取数，不直接读取本地 `QuantGod_*.json` 或 CSV。

## 修复重点

- 手机宽度下页面不再整体横向溢出。
- 侧边栏在窄屏下自动换行，不遮挡主内容。
- 卡片标题、指标值、长原因文本可以换行，不再挤出容器。
- 表格和大面板保留内置滚动条，重要内容不会被裁掉。
- 自动化链路、MT5、Research、ParamLab 等工作区在小窗口下保持可读。

## 不包含的内容

- 不新增快捷交易或下单按钮。
- 不修改 MT5 实盘 preset。
- 不接收 Telegram 交易命令。
- 不新增 webhook 执行入口。
- 不改变任何真实交易状态。

## 验证命令

先启动最新前端预览：

```powershell
npm run preview
```

再执行：

```powershell
npm run responsive-hardening
npm run test:responsive-hardening
npm test
npm run build
npm run responsive:check
```

`responsive:check` 默认检查 `http://127.0.0.1:4173/vue/`。如果要检查其他地址，可以设置 `QUANTGOD_RESPONSIVE_URL`。
