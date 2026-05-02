# Frontend API Client Hardening

本补丁把 `src/services/domainApi.js` 里的本地 fetch helper 提升为统一的 `src/services/apiClient.js`。

## 目标

- 所有运营域 loader 继续只访问 `/api/*`。
- 阻止前端重新读取 `/QuantGod_*.json` 或 `/QuantGod_*.csv`。
- 统一 GET / POST JSON 请求、timeout、fallback、rows 解析和 query string 构造。
- 保持现有 workspace UI 行为不变。
- 不改 backend、不改 MT5 preset、不改交易逻辑。

## 新增命令

```bash
npm run api-client
```

该命令检查：

- `apiClient.js` 是否导出统一 API helper。
- `domainApi.js` 是否从 `apiClient.js` 引入 helper。
- `domainApi.js` 是否不再直接 `fetch()`。
- CI 是否包含 API client guard。

## 安全边界

本补丁只改前端 service 层。所有请求仍必须是 `/api/*`，且不能出现任何交易执行、资金划转、preset mutation 或 raw runtime file 读取能力。
