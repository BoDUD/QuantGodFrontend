# Frontend Git Blob Integrity Fix

这轮修复专门处理 GitHub raw / Git blob 中关键文件被压成单行的问题。

## 目标

- `.github/workflows/ci.yml` 必须是真实多行 YAML。
- `package.json` 必须 pretty-print。
- `scripts/*.mjs` 和 `tests/*.mjs` 必须是真实多行 LF 文件。
- CI 中必须检查 Git blob 形态，而不只是本地 working tree。

## 新增命令

```bash
npm run git-blob-integrity
```

在本地运行时，它检查 working tree。GitHub Actions 设置 `CI=true` 后，它还会用 `git show HEAD:<path>` 检查提交后的 Git blob，防止“本地通过但远端 raw 单行”的情况再次出现。

## 安全边界

本修复只动 Frontend 的 CI / guard / formatting，不改 Backend API、MT5 preset、交易逻辑、Vibe Coding、AI 分析或 Governance 流程。
