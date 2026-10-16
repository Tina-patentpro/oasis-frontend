# 绿洲慧写 3.0 前端全面审计报告（2026-07-01）

> 审计方式：superpower + 4 个只读 subagent 并行审计 + 主代理交叉复核。
> 审计边界：本地源码、配置、API 契约、既有 `dist` 构建产物；未做线上生产环境验证。
> 本次改动：仅新增本审计报告，未修改业务代码。

## task understanding（任务理解）

用户要求使用 superpower + subagent 对 `D:\OneDrive\4、董娣相关\3、绿洲慧写3.0\绿洲前端` 做全面审计。

本次覆盖 4 个维度：

1. 代码质量 / 架构 / API 契约（前后端接口约定）
2. 安全 / 依赖 / 凭证 / 隐私
3. 性能 / 构建产物 / 包体积
4. UI / 交互 / 无障碍 / 用户体验

风险等级沿用项目规则：

- `R1`：改动功能或用户直接行为风险
- `R2`：共享组件、共享 hook（复用逻辑）或安全复用风险
- `R3`：样式、布局、包体积或响应式风险
- `R4`：API、状态模型、契约一致性或治理风险

## assumptions（假设）

- 本报告是本地只读审计结论，不等同于线上生产环境结论。
- 旧审计报告只作为线索，所有关键旧结论均按当前仓库状态重新复核。
- 没有运行 `npm run build`，因为它会刷新 `dist` 产物；性能结论中的产物体积基于当前磁盘已有 `dist`。
- UI 结论主要来自源码静态审计，没有启动浏览器做真实读屏、键盘、窄屏点击验证。
- Web 界面规则已读取最新来源：`https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md`。

## files affected（影响文件）

新增报告：

- `D:\OneDrive\4、董娣相关\3、绿洲慧写3.0\绿洲前端\docs\audit\2026-07-01-comprehensive-audit-summary.md`

未修改业务代码。

## implementation summary（实现摘要）

### 基线状态

- 分支：`master`
- 最新提交：`b7eef45 chore(api): classify deferred contract endpoints`
- 开始审计时工作区状态：`git status --short --branch` 输出 `## master`
- 项目版本：`package.json` 为 `1.0.4`
- 技术栈：React 19、TypeScript、Vite、Zustand、Jest、Playwright、Tailwind、OpenAPI 契约文档

### 综合结论

项目工程质量整体较好，当前核心自动检查均通过：

- TypeScript 类型检查通过
- ESLint 通过
- 依赖使用检查通过
- 敏感信息扫描通过
- 生产依赖漏洞为 0
- API 契约验证通过
- API 漂移检查无阻断项
- 现有构建产物体积门禁通过
- 单元测试集合通过

旧审计中一批高优先级问题已经修复或降级：

- 通知轮询风暴：旧 P0 已不成立，当前仍有通知 Context（上下文共享对象）整体订阅的 R4 优化空间。
- ChatPanel 弱确认弹窗：已改用标准 `ConfirmDialog` + `AccessibleDialog`。
- QuickCreateProjectDialog 重复提交：已加 `isSubmitting`、`disabled`、`aria-busy`。
- RechargeDialog 配置失败静默：已显示错误与重试。
- generation 上传大小缺失：已加 10MB 限制。
- CSP（浏览器安全策略）里 `https:` 全通配：当前本地代码已改为白名单来源。
- 用户 `user` localStorage 中手机号/余额：已通过 `stripSensitiveFieldsForStorage` 基本修复。

但仍有需要关注的问题，按优先级汇总如下。

### R1：优先处理

#### R1-1 access token 仍持久化在 localStorage，且有效期 30 天

- 证据：
  - `D:\OneDrive\4、董娣相关\3、绿洲慧写3.0\绿洲前端\src\api\core\token-storage.ts:4`
  - `D:\OneDrive\4、董娣相关\3、绿洲慧写3.0\绿洲前端\src\api\core\token-storage.ts:96-102`
  - `D:\OneDrive\4、董娣相关\3、绿洲慧写3.0\绿洲前端\src\api\core\token-storage.ts:200-218`
- 影响：如果未来出现 XSS（跨站脚本，恶意脚本在页面内执行），token 可被脚本读取，30 天有效期会放大风险。
- 建议：单独立项改为 HttpOnly Cookie（浏览器脚本不可读取的安全 Cookie），需要后端配合；短期至少缩短 TTL（有效期）并加强刷新策略。

#### R1-2 会话删除仍有过宽回退：失败后回退旧 GET 删除

- 证据：
  - `D:\OneDrive\4、董娣相关\3、绿洲慧写3.0\绿洲前端\src\api\services\session.service.ts:302-315`
- 影响：如果 `DELETE /projects/{id}` 返回 401、403、500 或超时，也可能回退旧 GET 删除路径，掩盖真实错误或重复触发删除。
- 建议：只对 404/405/未实现类错误回退；鉴权失败、服务器错误、超时应直接暴露给用户。

#### R1-3 快速创建项目失败时，弹窗可能关闭且输入丢失

- 证据：
  - `D:\OneDrive\4、董娣相关\3、绿洲慧写3.0\绿洲前端\src\components\QuickCreateProjectDialog.tsx:71-80`
  - `D:\OneDrive\4、董娣相关\3、绿洲慧写3.0\绿洲前端\src\modules\workspace\hooks\useWorkspaceLayout.ts:219-242`
- 影响：接口失败时用户可能只看到 toast（短提示），表单关闭后输入丢失，不方便原地重试。
- 建议：父层失败时把错误传回弹窗，让弹窗保留输入并显示 `submitError`。

#### R1-4 ProjectCard 整卡点击区域键盘不可达

- 证据：
  - `D:\OneDrive\4、董娣相关\3、绿洲慧写3.0\绿洲前端\src\components\workspace\left-sidebar\management\ProjectCard.tsx:167-170`
  - `D:\OneDrive\4、董娣相关\3、绿洲慧写3.0\绿洲前端\src\components\workspace\left-sidebar\management\ProjectCard.tsx:204-217`
- 影响：鼠标用户可点整卡，键盘用户只能进入内部按钮，体验不一致。
- 建议：去掉外层整卡点击，或补 `role="button"`、`tabIndex={0}`、Enter/Space 键触发。

### R2：近期处理

#### R2-1 上传大小与类型策略不统一，且聊天上传允许 SVG/HTML/XML

- 证据：
  - `D:\OneDrive\4、董娣相关\3、绿洲慧写3.0\绿洲前端\src\constants\chatUpload.ts:1-2`
  - `D:\OneDrive\4、董娣相关\3、绿洲慧写3.0\绿洲前端\src\components\chat\hooks\useChatFileUpload.ts:7-28`
  - `D:\OneDrive\4、董娣相关\3、绿洲慧写3.0\绿洲前端\src\modules\workspace\hooks\content-sections\generation-upload-validation.ts:38`
  - `D:\OneDrive\4、董娣相关\3、绿洲慧写3.0\绿洲前端\docs\api\SECURITY-POLICIES.md:99-110`
  - `D:\OneDrive\4、董娣相关\3、绿洲慧写3.0\绿洲前端\docs\api\files.yaml:104-106`
- 影响：当前存在 10MB、20MB、100MB 多套口径；如果后端或对象存储把 SVG/HTML/XML 按同源可执行方式返回，存在存储型 XSS 风险。
- 建议：统一上传大小和类型策略；服务端必须兜底；对 SVG/HTML/XML 下载响应设置安全响应头，避免浏览器直接执行。

#### R2-2 多处旧接口仍用 GET 执行状态变更

- 证据：
  - `D:\OneDrive\4、董娣相关\3、绿洲慧写3.0\绿洲前端\src\api\services\notification.service.ts:217-239`
  - `D:\OneDrive\4、董娣相关\3、绿洲慧写3.0\绿洲前端\src\api\services\history.service.ts:188`
  - `D:\OneDrive\4、董娣相关\3、绿洲慧写3.0\绿洲前端\src\api\services\history.service.ts:253`
  - `D:\OneDrive\4、董娣相关\3、绿洲慧写3.0\绿洲前端\src\api\services\history.service.ts:262`
  - `D:\OneDrive\4、董娣相关\3、绿洲慧写3.0\绿洲前端\src\api\services\project.service.ts:492-499`
- 影响：Bearer token（登录凭证）降低传统 CSRF（跨站请求伪造）风险，但 GET 写操作仍可能被预取、缓存、误触发。
- 建议：逐步迁移到 POST/DELETE/PATCH；保留 legacy（旧兼容）接口时，在契约和代码里明确迁移状态。

#### R2-3 Sentry 脱敏仍有 tags/contexts/request.body 盲区

- 证据：
  - `D:\OneDrive\4、董娣相关\3、绿洲慧写3.0\绿洲前端\src\monitoring\sentry-scrubbing.ts:50-80`
  - `D:\OneDrive\4、董娣相关\3、绿洲慧写3.0\绿洲前端\src\monitoring\index.ts:81-88`
  - `D:\OneDrive\4、董娣相关\3、绿洲慧写3.0\绿洲前端\src\monitoring\index.ts:125-135`
- 当前已修复：Replay（录屏/回放）隐私配置已到位。
- 建议：把 `tags`、`contexts`、`request.body` 也纳入同一套脱敏逻辑。

#### R2-4 API 漂移检查仍有扫描盲区

- 证据：
  - `D:\OneDrive\4、董娣相关\3、绿洲慧写3.0\绿洲前端\scripts\api\check-endpoint-drift.mjs:13-19`
  - `D:\OneDrive\4、董娣相关\3、绿洲慧写3.0\绿洲前端\src\api\services\project-service-requests.ts:5-8`
  - `D:\OneDrive\4、董娣相关\3、绿洲慧写3.0\绿洲前端\src\api\services\project-service-requests.ts:51-85`
- 影响：`api:drift` 当前通过，但脚本排除 `*-requests.ts`，而这类文件中仍有真实 `apiClient` 调用。
- 建议：不要无条件排除含真实 API 调用的 helper 文件；为常量拼接端点补静态识别或明确白名单。

#### R2-5 `ApiDetail` 仍包含 `api_key` / `credentials` 类型字段

- 证据：
  - `D:\OneDrive\4、董娣相关\3、绿洲慧写3.0\绿洲前端\src\types\api\ai-categories.ts:56-63`
  - `D:\OneDrive\4、董娣相关\3、绿洲慧写3.0\绿洲前端\API接口文档-用户端.md:103-110`
  - `D:\OneDrive\4、董娣相关\3、绿洲慧写3.0\绿洲前端\API接口文档-用户端.md:124-127`
- 影响：与“前端不接收、不透传第三方密钥”的业务约束冲突。
- 建议：从前端类型移除，或改成明确禁止字段；如后端仍返回，应后端修正。

#### R2-6 CSP 响应头落地未被本地证明

- 证据：
  - `D:\OneDrive\4、董娣相关\3、绿洲慧写3.0\绿洲前端\src\config\security.ts:67-83`
  - `D:\OneDrive\4、董娣相关\3、绿洲慧写3.0\绿洲前端\src\config\security.ts:90-99`
  - `D:\OneDrive\4、董娣相关\3、绿洲慧写3.0\绿洲前端\vite.config.ts:49-58`
- 当前修复：本地代码已不再使用 `https:` 全通配。
- 剩余风险：构建主要注入 meta CSP（页面里的安全策略标签），meta 中 `frame-ancestors` 不生效；生产是否有完整 HTTP 响应头需要 live 检查。
- 建议：用生产响应头作为最终安全边界，单独做 `curl.exe -I -L https://oasisintwrite.com/` 线上检查。

### R3：排期优化

#### R3-1 Mermaid parser chunk 仍擦边

- 当前结果：`diagram-parser-vendor-xNeKdyA8.js 596.60 KiB`
- 阈值：`600 KiB`
- 证据：
  - `D:\OneDrive\4、董娣相关\3、绿洲慧写3.0\绿洲前端\scripts\build\check-bundle-size.mjs:7-12`
  - `D:\OneDrive\4、董娣相关\3、绿洲慧写3.0\绿洲前端\scripts\build\check-bundle-size.mjs:137-145`
  - `D:\OneDrive\4、董娣相关\3、绿洲慧写3.0\绿洲前端\vite.config.ts:120-199`
- 结论：体积门禁通过，但余量约 3.40 KiB，Mermaid 相关依赖升级容易触发失败。

#### R3-2 framer-motion 仍进入首屏 `ui-vendor`

- 证据：
  - `D:\OneDrive\4、董娣相关\3、绿洲慧写3.0\绿洲前端\src\app\providers\NotificationProvider.tsx:1`
  - `D:\OneDrive\4、董娣相关\3、绿洲慧写3.0\绿洲前端\src\components\NotificationCenter.tsx:1`
  - `D:\OneDrive\4、董娣相关\3、绿洲慧写3.0\绿洲前端\src\components\ui\feedback\AccessibleDialog.tsx:1`
  - `D:\OneDrive\4、董娣相关\3、绿洲慧写3.0\绿洲前端\src\components\workspace\navigation\AsyncTaskMenu.tsx:12`
- 当前 `ui-vendor`：约 115.25 KiB raw。
- 建议：单独评估 `LazyMotion`（按需动画加载）迁移。

#### R3-3 工作区仍偏桌面，小屏体验未完整闭环

- 证据：
  - `D:\OneDrive\4、董娣相关\3、绿洲慧写3.0\绿洲前端\src\modules\workspace\components\WorkspaceMainLayout.tsx:82-91`
  - `D:\OneDrive\4、董娣相关\3、绿洲慧写3.0\绿洲前端\src\components\workspace\left-sidebar\LeftSidebar.tsx:444`
  - `D:\OneDrive\4、董娣相关\3、绿洲慧写3.0\绿洲前端\src\config\chatPanelWidth.ts:3-4`
- 现状：已有部分自适应逻辑，但没有真正移动端抽屉、底部导航或完整小屏路径。
- 建议：如果产品需要移动端，单独立项；如果 PC-only，可保留为低优先级。

#### R3-4 懒加载弹窗与右侧聊天面板 fallback 为空

- 证据：
  - `D:\OneDrive\4、董娣相关\3、绿洲慧写3.0\绿洲前端\src\modules\workspace\WorkspaceApp.tsx:160`
  - `D:\OneDrive\4、董娣相关\3、绿洲慧写3.0\绿洲前端\src\modules\workspace\components\WorkspaceRightPanel.tsx:102-103`
- 影响：慢网下用户可能感觉“点了没反应”。
- 建议：增加轻量 loading 文案或 spinner（加载指示）。

### R4：治理和低优先级改进

- 左侧项目 / 会话列表仍未虚拟化：
  - `D:\OneDrive\4、董娣相关\3、绿洲慧写3.0\绿洲前端\src\components\workspace\left-sidebar\management\tabs.tsx:57`
  - `D:\OneDrive\4、董娣相关\3、绿洲慧写3.0\绿洲前端\src\components\workspace\left-sidebar\management\ProjectCard.tsx:385`
- `jszip` 仍静态 import：
  - `D:\OneDrive\4、董娣相关\3、绿洲慧写3.0\绿洲前端\src\utils\user-data-export.ts:1`
  - `D:\OneDrive\4、董娣相关\3、绿洲慧写3.0\绿洲前端\src\utils\export-utils\executor.ts:1`
- 支付弹窗仍有未托管 `setTimeout` 小隐患：
  - `D:\OneDrive\4、董娣相关\3、绿洲慧写3.0\绿洲前端\src\components\settings\WeChatPayDialog.tsx:50-63`
  - `D:\OneDrive\4、董娣相关\3、绿洲慧写3.0\绿洲前端\src\components\settings\WeChatPayDialog.tsx:110-116`
- Mermaid SVG 安全当前防线较完整，但仍可长期改白名单策略：
  - `D:\OneDrive\4、董娣相关\3、绿洲慧写3.0\绿洲前端\src\components\ContentRenderer\MermaidChart.tsx:24-37`
  - `D:\OneDrive\4、董娣相关\3、绿洲慧写3.0\绿洲前端\src\components\ContentRenderer\MermaidChart.tsx:143-148`
- `response-parser` 自动拆 `data` 后，部分 service 返回类型仍保留包裹体兼容：
  - `D:\OneDrive\4、董娣相关\3、绿洲慧写3.0\绿洲前端\src\api\core\response-parser.ts:67-88`
  - `D:\OneDrive\4、董娣相关\3、绿洲慧写3.0\绿洲前端\src\api\services\notification.service.ts:217-239`
  - `D:\OneDrive\4、董娣相关\3、绿洲慧写3.0\绿洲前端\src\components\settings\WeChatPayDialog.tsx:36-38`

## validation run（验证执行）

主线程已运行：

| 命令                                      | 结果                                                                            |
| ----------------------------------------- | ------------------------------------------------------------------------------- |
| `cmd /c git status --short --branch`      | `## master`                                                                     |
| `cmd /c git log -1 --oneline`             | `b7eef45 chore(api): classify deferred contract endpoints`                      |
| `cmd /c npm run type-check`               | 通过，`tsc --noEmit` exit 0                                                     |
| `cmd /c npm run lint`                     | 通过，ESLint exit 0                                                             |
| `cmd /c npm run deps:check`               | 通过，knip exit 0                                                               |
| `cmd /c npm run security:scan`            | 通过，扫描 1387 文件，no leaks found                                            |
| `cmd /c npm run audit:prod`               | 通过，found 0 vulnerabilities                                                   |
| `cmd /c npm run api:drift`                | 通过，无阻断性端点漂移，仅 deferred/legacy 报告项                               |
| `cmd /c npm run api:validate:ci`          | 通过，Spectral / metadata / unused / API tests 全通过，6 个 API tests 通过      |
| `cmd /c npm run build:size-check`         | 通过，37 个 diagram chunks，最大 `diagram-parser-vendor-xNeKdyA8.js 596.60 KiB` |
| `cmd /c npm run test:unit -- --runInBand` | 通过，1 个测试套件、6 个测试通过                                                |

子代理补充验证：

- 安全子代理：`node scripts\security\scan-secrets.mjs --all`、生产/全量 `npm audit`、相关 Jest 测试、`api:drift` 均通过。
- API 子代理：`api:drift`、`api:drift:strict`、`api:validate:ci`、`scripts:test`、`type-check`、`lint`、相关 Jest 测试均通过。
- 性能子代理：`build:size-check` 通过；未运行 build 和 analyze。
- UI 子代理：已读取最新 Web Interface Guidelines，并做只读源码审计。

未验证风险：

- 未运行 `npm run build`，因为会刷新 `dist`。
- 未运行 `npm run analyze`，因为会生成分析文件。
- 未做浏览器真实交互测试。
- 未做线上生产环境响应头与真实后端返回验证。

## risk list（风险列表）

| 优先级 | 风险                                             | 建议处理                                   |
| ------ | ------------------------------------------------ | ------------------------------------------ |
| R1     | token 仍在 localStorage 30 天                    | 后端配合迁移 HttpOnly Cookie；短期缩短 TTL |
| R1     | 会话删除失败后回退旧 GET 删除过宽                | 限定仅 404/405/未实现才回退                |
| R1     | 创建项目失败可能关闭弹窗并丢输入                 | 保留弹窗和输入，显示原地错误               |
| R1/R2  | ProjectCard 整卡点击键盘不可达                   | 补键盘语义或取消整卡点击                   |
| R2     | 上传大小/类型策略不统一，SVG/HTML/XML 有潜在风险 | 统一前后端策略，服务端兜底                 |
| R2     | GET 写操作仍存在                                 | 逐步迁移到 POST/DELETE/PATCH               |
| R2     | Sentry 脱敏盲区                                  | 补 tags/contexts/request.body              |
| R2     | API 漂移扫描盲区                                 | 纳入 `*-requests.ts` 等真实调用文件        |
| R2     | `ApiDetail` 仍含密钥字段                         | 前端类型移除或标记禁止                     |
| R3     | Mermaid parser chunk 只剩约 3.4 KiB 余量         | 拆包或明确阈值策略                         |
| R3     | framer-motion 仍在首屏 vendor                    | 评估 LazyMotion                            |
| R3     | 小屏工作区仍偏桌面                               | 确认移动端目标后单独立项                   |
| R4     | 左侧列表未虚拟化                                 | 大数据量时加阈值虚拟化                     |
| R4     | `jszip` 静态 import                              | 导出时动态加载                             |
| R4     | 支付弹窗未托管 setTimeout                        | 统一 ref 清理                              |

## manual QA checklist（人工检查清单）

### 1. 登录页 `/auth`

- setup or prerequisite：准备错误手机号、错误验证码或模拟登录失败。
- steps：
  1. 只用键盘填写登录表单。
  2. 提交错误信息。
  3. 用 Tab 检查焦点移动。
- expected result：字段错误清楚显示，按钮提交中禁用，错误可被读屏提示。
- edge case to verify：外层登录失败提示是否有 `role="alert"` 或等效读屏提示。

### 2. 工作区 `/workspace` 创建项目

- setup or prerequisite：模拟慢网或接口失败。
- steps：
  1. 打开快速创建项目弹窗。
  2. 连续点击“创建项目”。
  3. 再模拟接口失败。
- expected result：只提交一次；失败后弹窗不应丢输入，应允许原地重试。
- edge case to verify：失败后是否只出现短 toast 但弹窗关闭。

### 3. 工作区左侧项目卡片

- setup or prerequisite：准备多个项目。
- steps：
  1. 只用 Tab、Enter、Space 操作项目卡片。
  2. 尝试打开项目、展开项目、打开项目菜单。
- expected result：不依赖鼠标点击空白卡片也能完成主流程。
- edge case to verify：焦点是否可见，整卡点击行为是否与键盘行为一致。

### 4. 异步任务中心

- setup or prerequisite：准备完成态、失败态、运行态任务。
- steps：
  1. 点击“清除已完成”。
  2. 点击单条“删除记录”。
- expected result：批量清除有确认；单条删除是否接受“立即删除”需产品确认。
- edge case to verify：误删后是否有撤销或二段确认。

### 5. 充值弹窗

- setup or prerequisite：模拟充值配置接口失败。
- steps：
  1. 打开充值弹窗。
  2. 让配置接口失败。
  3. 点击重试。
- expected result：显示错误、可重试、确认充值按钮禁用。
- edge case to verify：配置加载中是否有明显提示。

### 6. 小屏工作区

- setup or prerequisite：浏览器宽度分别设为 1440、1024、768、390。
- steps：
  1. 切换左侧栏。
  2. 切换右侧聊天面板 quarter/full/off。
  3. 打开设置、历史、任务中心等弹窗。
- expected result：主要功能不被挤没，不出现严重横向滚动。
- edge case to verify：390px 宽度下聊天和左侧栏是否仍可操作。

### 7. Mermaid / Markdown 内容

- setup or prerequisite：准备含 Mermaid、代码块、外链、图片的输出内容。
- steps：
  1. 打开历史对话。
  2. 展开含 Mermaid 的内容。
  3. 检查加载失败 fallback。
- expected result：Mermaid 加载慢或失败时显示源码或清楚提示；外链有安全属性。
- edge case to verify：恶意 SVG/HTML 不应被执行。

## out-of-scope follow-up improvements（范围外后续建议）

1. **安全专项**：token 从 localStorage 迁移到 HttpOnly Cookie，需要后端配合。
2. **上传治理专项**：统一 10MB/20MB/100MB 口径，并明确 SVG/HTML/XML 的服务端响应头策略。
3. **API 契约治理专项**：补齐 `api:drift` 扫描范围，收敛 current/legacy 并存状态。
4. **UI 无障碍专项**：ProjectCard、登录外层错误、装饰 SVG、弹窗 fallback 做一轮小修。
5. **性能专项**：Mermaid parser chunk 擦边、framer-motion 首屏、左侧列表虚拟化。
6. **线上验证专项**：用 `curl.exe -I -L --max-time 20 https://oasisintwrite.com/` 检查真实响应头，分清本地配置和生产状态。
