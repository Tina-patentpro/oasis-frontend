# 绿洲前端 1.0.7 审计修复实施计划

> **执行要求：** 按 `systematic-debugging` → `test-driven-development` → `executing-plans` → `verification-before-completion` 顺序实施；每项必须先取得 RED，再做最小 GREEN。

## 1. 目标与基线

- 关闭 `reports/2026-09-01-oasis-frontend-1.0.7-full-audit.md` 中的 1 项 P2 与 3 项 P3：
  - `F-P2-001`：320px 下全局 Toast 遮挡底部操作区。
  - `F-P3-001`：危险或不支持的直接下载地址被拦截后仍可能显示成功。
  - `F-P3-002`：开发模式可能把原始会话输入或上传响应写入控制台。
  - `F-P3-003`：设置页 E2E 的剪贴板权限硬编码 4173 origin。
- 当前版本保持 `1.0.7`，不升到新版本号。
- 当前基线：`master`，HEAD `39dc1b2b8a538dff15f5275b079adf6bbbcecc5b`，Node.js `20.19.0`。
- 当前受保护工作区内容：未跟踪的 `reports/2026-09-01-oasis-frontend-1.0.7-full-audit.md`。原审计报告保持不变，不纳入修复编辑。
- 仓库未提供 OpenSpec，本轮不引入新治理框架。

## 2. 目标合同与边界

### 2.1 行为合同

1. `<640px` 时，两套 Workspace Toast 使用安全区感知的顶部位置，顶部偏移固定为 `11rem + env(safe-area-inset-top)`；桌面端继续保持右下角 `1rem`。320/375 实测表明底部 6rem 会遮挡“清空对话”，7rem 又会遮挡“导出对话”，底部操作区不存在足够的垂直空档，因此移动端改到导航和搜索入口下方的内容区。
2. Toast 不接收指针事件；在 320×800 与 375×812 下不得和“导出对话”“清空对话”“打开指令库”等底部可操作控件发生几何相交，焦点与点击保持可用。
3. 下载只允许现有协议集合 `http:`、`https:`、`data:`、`blob:`、`ftp:`；相对地址仍按现有规则解析。
4. 危险、畸形或不支持的下载地址必须在 fetch 或直接链接派发前失败关闭，抛出固定且不包含 URL 的受控错误；不得创建/点击 `<a>`、不得递增完成数、不得报告 `success`。
5. 有效 HTTP(S) 地址的网络/CORS 失败仍允许现有直接链接降级；HTTP 4xx/5xx 仍保持失败，不走成功降级。
6. 会话输入 JSON 解析失败与上传响应缺少文件路径时，控制台只记录固定、无业务数据的文本，不输出原始输入或响应对象。
7. 设置页剪贴板权限 origin 必须由 Playwright `baseURL` 解析；缺少 `baseURL` 时测试明确失败，不回退到固定端口。

### 2.2 接口与迁移约束

- 不改变后端端点、请求/响应 Schema、组件公开 Props、业务数据类型或下载函数公开签名。
- `resolveDownloadUrl`、`downloadFromUrl`、`triggerDownload` 的公开签名保持不变。
- 不新增依赖，不升级现有依赖，不改 Router、状态库、构建工具或设计系统。
- 保留授权、Sentry、遥测、分析、国际化、内容净化、CSP 和现有正常下载行为。
- 不提交、不推送、不部署、不修改远端，不运行 `changelog:notify`。
- 真实账户、真实后端、费用操作和生产验证不属于本轮确定性修复门。

## 3. 文件清单

### 修改

- `src/components/ui/GlobalToast.tsx`
- `src/components/ui/GlobalToast.test.tsx`
- `src/modules/workspace/WorkspaceApp.tsx`
- `tests/e2e/workspace-session-display.spec.ts`
- `src/utils/download.ts`
- `src/utils/download.test.ts`
- `src/components/__tests__/DownloadFilesDialog.test.tsx`
- `src/api/services/session-service-normalizers.ts`
- `src/api/services/session-service-normalizers.test.ts`
- `src/api/services/ai.service.ts`
- `src/api/services/ai.service.uploadFile.test.ts`
- `tests/e2e/settings-quality.spec.ts`
- `docs/CHANGELOG.md`
- `public/help/release-notes.md`（仅由 `changelog:sync` 生成）

### 新建

- `reports/2026-09-01-oasis-frontend-1.0.7-audit-remediation-ledger.md`
- `output/browser-evidence/2026-09-01-1.0.7-audit-remediation-run01/`（仅运行时新建；若已存在，使用首个未占用的 `run02` 等后缀，禁止覆盖）

### 保持不变

- `reports/2026-09-01-oasis-frontend-1.0.7-full-audit.md`
- `package.json`、`package-lock.json`
- `playwright.config.ts`

## 4. 执行任务

### Task 1：冻结基线并建立修复账本

1. 使用 Windows `cmd` 记录：

   ```text
   git status --short --branch
   git rev-parse HEAD
   git diff --stat
   output\runtime\node-v20.19.0\run-node20.cmd --version
   ```

2. 预期：HEAD 与第 1 节一致；除原审计报告和本计划外没有未知变更；Node 输出 `v20.19.0`。
3. 新建修复账本，按发现编号记录 RED、GREEN、最终门、浏览器证据、退出码和剩余风险；不得改写原审计报告。
4. 如发现未知暂存/修改、版本变化或 Node 20 门失败，停止执行并重新确认基线。

### Task 2：修复窄屏 Toast 遮挡（F-P2-001）

**RED：**

1. 在 `tests/e2e/workspace-session-display.spec.ts` 使用既有登录态与 API mock 新增题为 `320px/375px Workspace Toast 不遮挡对话底部操作` 的聚焦用例；分别以 320×800、375×812 打开工作区、恢复已有聊天并等待成功 Toast。
2. 用 bounding box 断言 Toast 在视口内，且与“导出对话”“清空对话”“打开指令库”三个可见控件均不相交；聚焦“打开指令库”后断言焦点可见，按钮仍可点击。
3. 当前实现必须因 Toast 与“打开指令库”相交而 RED；把失败截图和 trace 写入新的证据目录。

**GREEN：**

运行时追踪确认审计截图中的会话提示由 `WorkspaceApp.tsx` 的局部 `role=alert` 渲染，而不是 `GlobalToast.tsx` 的 `role=status`；两者使用相同的右下角固定定位。为关闭截图根因并避免全局提示复现同类遮挡，对两个 Toast 使用同一响应式定位：

- 移动端：`inset-x-4`，`top-[calc(env(safe-area-inset-top)+11rem)] bottom-auto`，位于导航和搜索入口下方并在视口宽度内自适应。
- 桌面端显式恢复：`sm:top-auto sm:bottom-4 sm:right-4`。
- `sm` 及以上：恢复 `inset-x-auto bottom-4 right-4`，保持现有桌面视觉。
- 全尺寸增加 `pointer-events-none`；保留 `role=status`、`aria-live=polite`、`aria-atomic=true`、层级和现有配色。

**聚焦回归：**

```text
output\runtime\node-v20.19.0\run-node20.cmd test -- --runInBand src/components/ui/GlobalToast.test.tsx
output\runtime\node-v20.19.0\run-node20.cmd run test:e2e -- tests/e2e/workspace-session-display.spec.ts --grep "Workspace Toast"
```

要求两条退出码均为 0；两档窄屏无横向滚动、无几何相交，桌面 Toast 仍在右下角。

### Task 3：让下载失败闭环（F-P3-001）

**RED：** 在 `src/utils/download.test.ts` 增加：

1. `triggerDownload('javascript:...')` 必须拒绝固定错误，fetch 和 anchor click 均为 0。
2. `downloadFromUrl` 收到不支持协议时必须拒绝，最后一次进度为 `error`，不得出现 `success`，不得点击 anchor。
3. 保留并复跑有效 HTTPS 网络失败后直接链接降级、HTTP 404 不降级的既有用例。
4. 在 `DownloadFilesDialog.test.tsx` 模拟 `triggerDownload` 拒绝受控错误，断言对话框保留错误/重试状态，`onDownload` 与 `onClose` 不调用，不显示成功进度。
5. 让有效 HTTPS 地址包含唯一签名参数标记并触发网络降级，断言直接链接仍执行，但 `console.error/warn` 调用中不包含 URL 或签名标记。

**GREEN：**

1. 在 `download.ts` 内建立唯一的允许协议常量与私有校验函数；校验失败统一抛出 `下载地址不受支持，请检查后重试`，错误中不得拼接 URL、文件名或响应数据。
2. `triggerDownload` 在 fetch 前校验；`downloadFile` 在 fetch 前校验并通过 `onProgress` 报告 `error`；直接链接辅助函数在创建 anchor 前再次校验。
3. 删除直接链接辅助函数的“告警后静默 return”语义；私有函数失败时抛出受控错误。成功时仍返回 `void`，公开调用签名不变。
4. `triggerDownload` 的 fetch 失败与直接链接降级日志改为固定、无 URL、无错误对象的文本；不把签名参数写入开发控制台。
5. 不修改 `DownloadFilesDialog.export-actions.ts` 的完成计数流程：让拒绝自然中断循环，现有外层 catch 负责错误状态，从而只在真正派发成功后递增。

**聚焦回归：**

```text
output\runtime\node-v20.19.0\run-node20.cmd test -- --runInBand src/utils/download.test.ts src/components/__tests__/DownloadFilesDialog.test.tsx
```

要求退出码 0；危险地址不 fetch、不 click、不 success；有效地址既有行为不变。

### Task 4：清理原始业务日志（F-P3-002）

**RED：**

1. 在 `session-service-normalizers.test.ts` 传入包含唯一敏感标记的畸形 JSON，spy `console.error`，断言只收到固定单参数文本，全部调用序列不包含该标记或原字符串。
2. 在 `ai.service.uploadFile.test.ts` 返回缺少 `saved_path/url` 且包含唯一敏感标记的对象，断言上传仍拒绝现有用户错误，同时控制台调用不包含响应对象或标记；再让上传客户端拒绝包含另一敏感标记的错误，断言错误继续原样向上抛出，但控制台不记录错误对象或标记。

**GREEN：**

- `parseInputs` 解析失败仅调用 `console.error(errorPrefix)`，不再传 `rawInputs`。
- 上传响应缺少路径时仅调用固定文本 `console.error('[AIService] 响应中没有 url 或 saved_path 字段')`，不再传 `response`。
- 上传 catch 仅调用固定文本 `console.error('[AIService] 文件上传失败')`，不再传错误对象；随后仍抛出原错误，保持调用方行为。
- 保留现有抛错文案、API 行为和生产构建删除 console 的补偿控制。

**聚焦回归：**

```text
output\runtime\node-v20.19.0\run-node20.cmd test -- --runInBand src/api/services/session-service-normalizers.test.ts src/api/services/ai.service.uploadFile.test.ts
```

### Task 5：解除剪贴板权限与端口耦合（F-P3-003）

**RED：**

1. 在新证据目录创建仅用于执行的 Playwright sidecar 配置，把 `baseURL` 与 preview 端口设为 4174；不修改仓库 `playwright.config.ts`。
2. 用当前代码运行设置页首个用例，必须复现复制失败或断言失败，证明 4173 硬编码仍存在。

**GREEN：**

- 将测试 fixture 扩展为 `{ context, page, baseURL }`。
- `baseURL` 缺失时抛出明确测试配置错误；存在时使用 `new URL(baseURL).origin` 传给 `context.grantPermissions`。
- 禁止 `page.url()`、4173 常量或静默 fallback。

**聚焦回归：**

```text
output\runtime\node-v20.19.0\run-node20.cmd run build:verify
output\runtime\node-v20.19.0\run-node20.cmd exec -- playwright test tests/e2e/settings-quality.spec.ts --config=<新证据目录中的4174-sidecar配置> --grep "设置页只展示后端推荐数据"
```

要求 4174 用例 1/1、退出码 0；随后默认 4173 配置的同一用例也必须通过。

### Task 6：更新 1.0.7 发布说明

1. 只更新 `docs/CHANGELOG.md` 当前 `[1.0.7]` 章节，不创建新版本：
   - 手机窄屏提示不再遮挡底部对话操作。
   - 不支持的下载地址不再误报成功，并保留可重试错误提示。
   - 开发联调不再记录原始会话输入和缺字段上传响应。
2. 运行：

   ```text
   output\runtime\node-v20.19.0\run-node20.cmd run changelog:sync
   output\runtime\node-v20.19.0\run-node20.cmd run changelog:check
   ```

3. `public/help/release-notes.md` 只能由同步脚本生成；不得运行 `changelog:notify`。

### Task 7：全量候选验证与账本闭环

1. 先确认 4173、4174 没有未知监听进程；如端口被占用，不结束未知进程，改用新的证据 sidecar 完成聚焦测试，并将默认门阻塞如实记录。
2. 最终证据根必须是尚不存在的新目录；设置：

   ```text
   set "OASIS_E2E_OUTPUT_DIR=output\browser-evidence\2026-09-01-1.0.7-audit-remediation-run01"
   set "OASIS_E2E_REQUIRE_FRESH_ROOT=1"
   set "OASIS_E2E_FULL_EVIDENCE=1"
   ```

3. 在同一 Node 20 `cmd` 环境运行当前仓库正式门：

   ```text
   output\runtime\node-v20.19.0\run-node20.cmd run release -- --check-current
   ```

   该门必须依次通过：`scripts:test`、`test:ci`、`type-check`、`lint`、三项 API 检查、`security:scan`、`deps:check`、生产与完整依赖审计、`changelog:check`、`build:verify`、`test:e2e:prebuilt`。

4. 复核 artifact manifest、`git diff --check`、版本链和最终 `git status --short`；账本写入实际命令、退出码、Jest/E2E 数量、构建体积、截图/trace 路径及 SHA-256 清单。
5. 全量门通过后只允许更新修复账本的最终结果；不得顺手修改源文件、依赖或原审计报告。

## 5. 浏览器验收矩阵

| 视口 | 数据模式 | 必须验证 |
| --- | --- | --- |
| 320×800 | 确定性 mock 聊天会话 | Toast 与导出、清空、指令库不相交；无横向滚动；焦点环完整；指令库可点击 |
| 375×812 | 确定性 mock 聊天会话 | 同上；Toast 完全位于视口内，安全区不截断 |
| 1280×720 | 确定性 mock 聊天会话/设置 | Toast 保持右下角；工作区布局和设置复制流程不回退 |
| 4174 sidecar | 确定性 mock 设置页 | 剪贴板权限按实际 origin 授予，复制成功，Escape 与焦点返回正常 |

每次浏览器运行记录 URL、preview 端口、Chromium 版本、viewport、截图、trace、console、pageerror、requestfailed、HTTP 失败和未知 API。所有 API 均使用现有严格 mock，不访问真实后端。

## 6. 停止条件

以下任一发生即停止完成声明并保留证据：

1. Node 20.19.0、类型、lint、单测、API、安全、依赖、构建或完整 E2E 任一失败。
2. RED 不能稳定复现对应审计发现，说明根因或测试设计需重审。
3. Toast 在 320/375 下仍与任一指定底部操作相交、创建横向滚动或遮挡焦点。
4. 危险下载地址仍触发 fetch/anchor、出现 success，或有效 HTTPS 降级被破坏。
5. 控制台证据仍含敏感标记、原始 inputs、上传响应对象或完整下载 URL。
6. 4174 用例仍依赖 4173，或完整 E2E 出现未解释 console/page/request/API 诊断。
7. 工作区出现未登记修改、依赖文件变化、原审计报告变化或旧证据被覆盖。

## 7. 交付边界

- 实施完成且全量门通过后，可声明“1.0.7 本地生产构建与确定性 Chromium 候选已验证”。
- 该结论不等同于真实账户、真实后端、生产环境、WebKit/Firefox 或真实手机通过。
- 提交、推送、部署和生产只读验证均需后续独立授权。

**计划执行状态：已完成；最终验收状态见修复证据账本（PASS_WITH_CONCERNS）。**
