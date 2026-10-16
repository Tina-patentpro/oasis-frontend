# 2026-07-11 本开发版真实账号深度测试报告

## 1. 范围与证明边界

- 测试对象：当前分支 `codex/upload-performance-governance` 的本地开发源码。
- 浏览器入口：`http://127.0.0.1:5173`；真实 API 由本地同源 `/api` 代理连接 `https://lzhxpy.oasisintwrite.com`。
- 账号模式：真实短信登录。手机号、验证码、Token、账号详情和余额绝对值均未写入仓库、报告或公开截图。
- 本报告证明的是“本地当前代码 + 真实后端账号”的浏览器与运行时结果，不代表生产前端部署状态，也不构成线上 p75 性能结论。
- 未执行：付款充值、反馈提交、个人资料保存、设置保存、真实通知标记/删除、账号注销、后端修改、移动端测试、部署与推送。

证据目录：`D:\OneDrive\4、董娣相关\3、绿洲慧写3.0\绿洲前端\output\browser-evidence\2026-07-11-real-account-deep-test`

## 2. 认证、基线与真实副作用

- 短信发送请求第一次收到 `429`，随后一次请求成功；真实登录请求返回 `200`，成功进入 `/workspace`。
- 刷新、同源新标签页及开发服务器重启后，登录态均可恢复；Token 未出现在 URL。
- 测试前基线：项目 5 个、未关联会话 150 个、流水 222 条；余额仅以脱敏方式保存。
- 测试统一前缀：`QA-20260711-140141`。
- 创建并重命名真实项目 ID `270`，创建真实生成会话 ID `3846`；测试结束后均按精确 ID 删除并验证不可再读取。
- 清理后：项目 5 个、未关联会话 150 个；流水变为 223 条，余额变化 `-3.00`。流水与余额扣减是经授权的一次真实生成所产生，无法回滚。
- 本次生成产生的真实通知按范围约束保持未读，未修改或删除。

清理证据：`cleanup-session.json`、`cleanup-project.json`、`cleanup-baseline-comparison.json`。

## 3. 核心业务链路

### 3.1 项目、会话与生成

- 新建、重命名、选择并关联测试项目均成功。
- 使用纯测试内容提交一次真实生成；提交后按钮锁定，避免重复请求。
- 生成约 141 秒后由会话列表兜底确认保存成功，历史详情可重新打开，原输入与 8,195 字符真实生成正文均恢复。
- 生成过程中刷新页面和重新连接后，任务最终仍保存成功。
- 后端任务状态接口 `/api/apicategories/queryprocess/task_*` 在轮询期间多次返回 `404`；前端通过已存在的历史列表兜底完成恢复。该项记录为后端契约/状态端点关注项，本轮未修改后端。

### 3.2 会话导出与附件下载

- 修复前：会话 ZIP 本体有效，但附件从真实 `/uploads` 地址直接跨域读取失败；失败报告显示发现 1 个附件、加入 0 个、失败 1 个。
- 修复后：本地开发与生产预览均通过同源 `/uploads` 代理读取已配置后端的生成文件。
- 修复后会话 ZIP：7 个条目、1 个真实 DOCX 附件、附件 24,390 字节、提示词 80 字符、正文 8,195 字符，无附件失败报告、无占位或模拟内容。
- ZIP SHA-256：`f387bf4b118d8f7d4234a1dea036d3665925b3ce86ca1da18914b919f4f6d066`。
- 通过界面单独下载的 DOCX：24,390 字节、17 个 ZIP 条目，包含 `[Content_Types].xml` 与 `word/document.xml`，SHA-256 为 `3938e84ec3faf9fa01da2f23f8fd1be7a9d91c82f91e4ad741e404638c1a3896`。
- 历史会话重新打开后，“下载文件”按钮保持可用并显示 1 个生成文件。

证据：`real-session-export-fixed.zip`、`real-session-export-fixed-inspection.json`、`generated-file-download-fixed.docx`、`generated-file-download-fixed-inspection.json`、`history-download-button-fixed.json`。

### 3.3 推荐码、设置与通知

- 当前真实账号已有推荐码；设置页与 `/user/profile-reward` 读取结果一致，因此未调用不可清理的生成写入。
- 后端生成推荐码接口文档已确认位于 `docs/api/referrals.yaml`，接口为 `POST /api/referral/generate`；功能文档 `docs/features/REFERRAL-CODE-FEATURE.md` 给出相同响应契约。
- 发现全局 Toast 状态没有渲染器，导致复制成功/失败等操作无可见反馈；修复后设置页和独立推荐页均显示 `role=status`、`aria-live=polite` 的提示。
- 发现开发环境 StrictMode effect 重放后挂载标记保持为 `false`，空推荐码账户即使收到后端结果也不会更新；已修复并增加 StrictMode 单元与浏览器回归。
- 通知面板仅打开查看，未标记或删除；Escape 关闭后焦点返回触发按钮。

### 3.4 错误恢复

- 对邀请记录只读请求注入一次中断：页面显示错误态；解除拦截后点击“重试”恢复成功。
- 未在真实生成写入过程中注入故障，避免产生孤儿数据。

## 4. 可访问性、桌面布局与性能

- 1440×900 与 1280×720 下无文档级水平溢出。
- 200% 页面缩放下主导航仍可见，无文档级水平溢出。
- 键盘首个焦点为跳转链接，Enter 后焦点到达 `#main-content`。
- 设置、帮助、通知等覆盖层支持 Escape，焦点返回触发按钮；减少动画媒体查询生效。
- 开发服务器真实账号实验室数据：DOMContentLoaded 约 632.5 ms、load 约 635.6 ms、LCP 1,676 ms、CLS 0.0652、最大事件时长 40 ms；2 个长任务，最长 136 ms。
- 上述数据仅为本机开发模式实验室证据，不代表生产环境或真实用户 p75。

证据：`desktop-layout-a11y.json`、`dev-authenticated-performance.json`、`profile-read-failure-retry.json`。

## 5. 修复项与回归覆盖

1. 新增全局 Toast 渲染器，补充可访问性播报与确定性测试。
2. 仅在 loopback 本地页面且 URL 属于已配置后端时，将绝对 `/uploads` 文件地址改写为同源路径；第三方来源保持不变。
3. 在 Vite 开发与预览服务器增加 `/uploads` 代理。
4. 防止历史恢复结束的状态切换清空已恢复生成附件。
5. 修复推荐码状态 Hook 在开发 StrictMode effect 重放后的挂载标记。
6. 收紧设置 E2E 的 API 拦截范围，避免误拦截 Vite 的 `/src/api/**` 模块请求；补充复制提示、生成推荐码与历史附件可下载回归。
7. 统一工作区入口标题。

## 6. 剩余风险与关注项

- 后端异步任务状态端点在真实生成期间返回 `404`；虽然前端列表兜底成功，但会产生可观察的失败请求，应由后端确认任务 ID 与状态端点契约。
- 短信发送首次 `429` 表明真实环境存在限流或短时重复请求，本轮未继续施压测试。
- 本轮未验证已部署的生产前端、支付、移动端、后端实现及生产监控数据。
- 真实账号原有数据未被编辑；生成通知保持未读，流水与余额扣减不可回滚。

## 7. 结论

真实短信登录、一次真实生成、保存、重开、ZIP 导出、生成附件下载、错误恢复和测试数据清理均已完成。前端发现的问题已通过最小修复、单元测试、确定性 Playwright 与真实账号路径回归闭环；仍保留后端任务状态 `404` 与生产部署未验证两项边界关注。

## 8. 最终验证记录

- `npm run type-check`：通过。
- `npm run lint`：通过。
- `npm test -- --runInBand`：275 个测试套件、1,461 个测试全部通过。
- `npm run build:verify`：通过；构建 5,907 个模块，体积门禁通过，最大图表分块 596.60 KiB。
- `npm run api:validate:ci`、`npm run api:drift:strict`、`npm run api:docs:check`：全部通过，无阻断性契约漂移。
- `npm run security:scan`：扫描 1,417 个文件，无凭据泄漏。
- `npm run deps:check`：通过。
- `npm run audit:prod:ci`：生产依赖 0 个漏洞。
- `npm run test:e2e -- --project=chromium --workers=1`：Chromium 7/7 通过。
- 生产构建预览真实账号复核：登录态保持、页面标题正确、复制邀请码显示可访问提示；同源 `/uploads` 请求返回 `200`、24,390 字节，控制台 0 个错误/警告。
- 预览证据：`preview-profile-toast-result.json`、`preview-uploads-proxy-result.json`、`final-preview-workspace.png`、`final-preview-profile-toast.png`。
- 为避免真实 Token 与账号详情进入日志，原始浏览器网络 trace 在复核后未保留；仅保留脱敏 JSON、检查结果、导出物和本地截图。
- 最终确认 5173、5180 端口均无监听。
