# brace-expansion 开发工具链公告上下文例外

> 状态更新（2026-08-29）：此例外已关闭。`1.0.7` 已将开发工具链中的 `brace-expansion` 1.x/2.x 分别更新到 `1.1.18`/`2.1.4`，当前 npm 完整依赖审计不再返回相关公告。以下内容仅保留为 `1.0.6` 的历史决策记录；审计脚本中的守卫不再被当前依赖树触发。

## 结论

完整依赖门仅对 `GHSA-mh99-v99m-4gvg` 保留一项短期、开发工具链专用的上下文例外。项目中的 `brace-expansion` 只由 ESLint、Jest、TypeScript ESLint 及其文件匹配工具间接使用；它不属于生产依赖，也不被 `src` 或 Vite 运行时代码导入。

上游公告目前只在 ESM 版本 `brace-expansion@5.0.8` 修复。现有 Jest 30、ESLint 9 和相关插件仍通过 CommonJS 依赖链要求 1.x 或 2.x；强制把这些传递依赖覆盖到 5.x 会破坏工具加载，不是安全的补丁修复。

## 已完成处理

- 将 1.x、2.x 依赖线分别提升到 `1.1.16`、`2.1.2`，关闭同包此前已提供回补版本的公告。
- 将 `js-yaml` 覆盖提升到 `4.3.0`。
- 将直接开发依赖 `postcss` 提升到 `8.5.23`。
- 新增 `npm run audit:full:ci`：它仍读取 npm 官方完整审计，只允许本公告和 React Router 已记录的 RSC 公告。

## 自动阻断条件

`scripts/security/audit-production.mjs` 在以下任一情况出现时使完整依赖门失败：

- 出现任何其他 High 或 Critical 公告；
- 任一 `brace-expansion` 锁文件项不再标记为开发依赖；
- 版本超出已复查的 `1.1.16`、`2.1.2`；
- 运行时依赖或源码导入 `brace-expansion`、`glob` 或 `minimatch`；
- 超过 2026-08-31 的复查截止日；
- npm 审计源异常或结果无法解析。

## 后续动作

在 2026-08-31 前复查 Jest、ESLint、TypeScript ESLint、glob 与 minimatch 的上游发布；待它们原生采用 `brace-expansion@5.0.8` 或提供兼容回补后，升级工具链并删除本例外。不得使用跨主版本强制 override 代替上游兼容升级。
