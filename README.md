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

默认会检查 `http://127.0.0.1:4173/vue/`，请先运行 `npm run preview`；也可以用 `QUANTGOD_RESPONSIVE_URL` 指向其他已启动的前端地址。

## UX Foundation

第一层前端设计书升级记录在 `FRONTEND_UX_FOUNDATION.md`。它新增 design tokens、暗色/亮色/高对比主题、轻量中文/英文命令面板、金融数字格式化、共享状态组件和 Dashboard 运营扫描面板，同时继续保持所有运行数据只走后端 `/api/*`。

## P0 工具链

`FRONTEND_P0_TOOLCHAIN.md` 记录当前增量工具链边界。仓库已经接入 ESLint、Prettier、Stylelint、Vitest 和 Vue Test Utils；为了避免一次性格式化历史大文件，CI 先强制检查 UX Foundation、新增共享组件和关键 guard，后续再逐步扩大覆盖面。

验证：

```powershell
npm run ux-foundation
npm run p0-toolchain
npm test
npm run build
```

## 响应式加固

- P3-13 前端响应式加固：见 `FRONTEND_RESPONSIVE_HARDENING.md`。
