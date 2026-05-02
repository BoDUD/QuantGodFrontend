# Frontend Workflow LF Strict Fix

这轮修复针对远端 GitHub Actions 未继续触发、raw 视图仍可能显示单行的问题。

## 做什么

- 用标准 LF 重写 `.github/workflows/ci.yml`。
- 强制 `package.json` pretty-print。
- 强制 `scripts/*.mjs` 与 `tests/*.mjs` 使用 LF，不允许 CR 字节。
- 替换 `frontend_git_blob_integrity_guard.mjs`，让它同时检查 working tree 和 `git show HEAD:<path>` 的 Git blob。
- Git blob 检查不再把 `\r` 当成合法换行；只允许 LF。

## 验证

提交前运行：

```bash
npm run git-blob-integrity
npm test
npm run build
```

提交后运行：

```bash
QG_CHECK_GIT_BLOB=1 npm run git-blob-integrity
```

推送后确认 GitHub Actions 出现新的 run。
