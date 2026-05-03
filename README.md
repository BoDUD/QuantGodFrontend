# QuantGodFrontend

QuantGod 的 Vue 3 operator workbench。这个仓库只负责前端源码和前端构建，不拥有 MT5、Python tools、Cloudflare 部署脚本或完整文档。

## 仓库职责

- Vue 3 app shell 和所有工作台页面。
- Ant Design Vue 组件层与深色 QuantGod 视觉风格。
- KlineCharts 图表工作区。
- Monaco Editor 策略工坊界面。
- 调用后端 `/api/*` 的 service modules。

相关仓库：

- Backend：<https://github.com/Boowenn/QuantGodBackend>
- Infra：<https://github.com/Boowenn/QuantGodInfra>
- Docs：<https://github.com/Boowenn/QuantGodDocs>

## 本地开发

先启动后端：

```powershell
cd ..\QuantGodBackend
Dashboard\start_dashboard.bat
```

再启动前端：

```powershell
cd ..\QuantGodFrontend
npm install
npm run dev
```

浏览器入口：

```text
http://127.0.0.1:5173/vue/
```

Vite 会把 `/api/*` 和 `/QuantGod_*` 请求代理到 `QG_BACKEND_URL`，默认是 `http://127.0.0.1:8080`。

## 构建与同步

```powershell
npm run build
cd ..\QuantGodInfra
python scripts\qg-workspace.py --workspace workspace\quantgod.workspace.json sync-frontend-dist
```

同步后，后端仓库会通过 `Dashboard/vue-dist` 提供 `/vue/` 页面。

## 前端约束

前端不能直接读取本地 JSON/CSV 文件，也不能保存凭据。所有数据必须通过后端 `/api/*` facade 获取。除非后端暴露了明确受保护的操作 API，否则前端只做只读展示、研究分析和人工复核入口。

## 样式要求

QuantGod 工作台以深色、高密度、可扫描为主。新页面必须适配 Mac、桌面、平板和窄屏，不允许文字溢出、卡片嵌套卡片、白底默认组件或无意义大空白。

响应式巡检脚本属于前端仓库：

```powershell
npm run responsive:check
```

默认会检查 `http://127.0.0.1:8080/vue/`，也可以用 `QUANTGOD_RESPONSIVE_URL` 指向 Vite dev server。

## UX foundation upgrade

The first frontend design-book upgrade layer lives in `FRONTEND_UX_FOUNDATION.md`. It adds design tokens, theme switching, a lightweight zh-CN/en-US command surface, tabular number utilities, shared state components, and a Dashboard operator scan panel while preserving `/api/*`-only data access.

Verification:

```powershell
npm run ux-foundation
npm test
npm run build
```

