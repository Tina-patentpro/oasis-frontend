# React Router RSC 公告上下文例外

> 状态更新（2026-08-29）：此例外已关闭。`1.0.7` 已将 `react-router` 与 `react-router-dom` 升级到 `7.18.3`，当前 npm 生产依赖审计不再返回该公告。以下内容仅保留为 `1.0.6` 的历史决策记录；审计脚本中的守卫不再被当前依赖树触发。

## 结论

生产依赖门仅对 `GHSA-qwww-vcr4-c8h2` 保留一项临时、可执行校验的上下文例外。该公告影响 React Router 的不稳定 React Server Components（RSC）能力；绿洲前端当前只使用 `BrowserRouter`、`Routes`、`Route` 等声明式浏览器路由能力，不使用 RSC、服务端路由或 Framework Mode。

这不是通用忽略规则。`npm run audit:prod:ci` 仍从 npm 官方注册表读取完整生产审计结果，并在以下任一情况出现时失败：

- 出现任何其他 High 或 Critical 公告；
- `react-router` 或 `react-router-dom` 不是已复查的 `7.18.1`；
- 源码或依赖出现 RSC、服务端路由或 `@react-router/*` 框架入口；
- npm 审计返回格式异常、注册表错误或非预期退出码；
- 超过 2026-10-31 的复查截止日。

## 处理依据

- `react-router-dom` 与其传递依赖 `react-router` 已从 `7.16.0` 升级到 `7.18.1`，用于关闭适用于当前声明式前端的已修复公告。
- 上游对 `GHSA-qwww-vcr4-c8h2` 的修复位于 React Router 8.3.0；升级到该主版本同时要求 Node.js 22.22 及路由导入迁移，超出本批次官方 Node.js 20.19.0 运行时与“不得迁移框架”的边界。
- 例外的真实适用性由 `scripts/security/audit-production.mjs` 校验，并由 `scripts/security/audit-production.test.mjs` 覆盖允许、附加公告、模式漂移、版本漂移、过期和注册表错误等路径。

## 后续动作

在 2026-10-31 前单独规划 Node.js 22、React 与 React Router 8 的兼容迁移；迁移完成或上游为 7.x 提供修复后，删除本例外及其专用守卫。
