# 绿洲前端质量打磨 Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在不覆盖已有用户改动的前提下，把绿洲前端从“可运行”推进到“可交接、可验证、可维护、可继续上线”的状态。

**Architecture:** 采用低风险先行策略：先冻结基线和修正文档，再补健康度报告、测试保护和体验检查，最后在测试保护下逐步拆分大文件。所有行为变更必须先证明目标、范围和验证方式。

**Tech Stack:** React 19、TypeScript 5、Vite 7、Zustand 5、Tailwind CSS、Jest、React Testing Library、Playwright、OpenAPI/Spectral、Sentry/Web Vitals。

---

## 质量打磨状态卡

- 目标来源：用户同意“根据增强后的计划进行修复”。
- 目标对象：`D:\OneDrive\4、董娣相关\3、绿洲慧写3.0\绿洲前端`。
- 当前大阶段：小步实施。
- 当前小阶段：Phase 5 下载弹窗 UI QA 已完成；下一步进入本轮收尾验证与风险归纳。
- 已确认事实：
  - 当前分支：`codex/full-site-audit-fixes`。
  - 当前工作区已有大量未提交代码改动。
  - 2026-06-05 基线命令 `npm run type-check` 通过。
  - 2026-06-05 基线命令 `npm run lint` 通过。
  - 2026-06-05 分层测试命令 `npm run test:unit` 通过。
  - 2026-06-05 分层测试命令 `npm run test:integration` 通过。
  - 2026-06-05 Phase 4 后 CI 模式 Jest 命令 `npm run test:ci` 通过：193 个测试套件、1112 个测试。
  - 2026-06-05 安全扫描命令 `npm run security:scan` 通过。
  - 2026-06-05 API 契约命令 `npm run api:validate:ci` 通过。
  - 2026-06-05 脚本测试命令 `npm run scripts:test` 通过。
  - 2026-06-05 构建验证命令 `npm run build:verify` 通过。
  - 2026-06-05 端到端测试命令 `npm run test:e2e -- --project=chromium` 通过。
  - 2026-06-05 已把 `project.service.ts` 中的文件夹列表响应解析逻辑拆到 `project-service-normalizers.ts`。
  - 2026-06-05 已继续把项目 ID 解析、项目字段映射、项目排序时间等纯标准化逻辑拆到 `project-service-normalizers.ts`。
  - 2026-06-05 已把项目列表筛选、排序和创建后候选匹配逻辑拆到 `project-service-selectors.ts`。
  - 2026-06-05 已把生成链路“切换到下一个工作流”的纯决策逻辑拆到 `generation-navigation.ts`。
  - 2026-06-05 已把生成链路“生成请求字段整理、api_process 匹配、会话跟踪标题生成”的纯逻辑拆到 `generation-request.ts`。
  - 2026-06-05 已把生成链路“上传文件格式判断和不支持格式提示”的纯逻辑拆到 `generation-upload-validation.ts`。
  - 2026-06-05 已把生成链路“上传成功后的输入值写入策略”拆到 `upload-input-value.ts`。
  - 2026-06-05 新增并扩展 `project-service-normalizers.test.ts`，覆盖 14 个响应解析和字段标准化场景。
  - 2026-06-05 新增 `project-service-selectors.test.ts`，覆盖 9 个列表选择器场景。
  - 2026-06-05 新增 `generation-navigation.test.ts`，覆盖 6 个下一步工作流导航场景。
  - 2026-06-05 新增 `generation-request.test.ts`，覆盖 8 个生成请求字段整理场景。
  - 2026-06-05 新增 `generation-upload-validation.test.ts`，覆盖 6 个上传格式判断场景。
  - 2026-06-05 扩展 `upload-input-value.test.ts`，新增 3 个上传写入策略场景。
  - 2026-06-05 Phase 4 相关验证命令 `npm test -- src/api/services/project-service-normalizers.test.ts --runInBand` 通过。
  - 2026-06-05 Phase 4 相关验证命令 `npm test -- src/api/services/project-service-selectors.test.ts --runInBand` 通过。
  - 2026-06-05 Phase 4 相关验证命令 `npm test -- src/api/services/project.service.test.ts --runInBand` 通过。
  - 2026-06-05 Phase 4 相关验证命令 `npm test -- src/modules/workspace/hooks/content-sections/generation-actions.test.ts src/modules/workspace/hooks/content-sections/generation-actions.contract.test.ts src/modules/workspace/hooks/content-sections/generation-actions.session-restore.test.ts src/modules/workspace/hooks/content-sections/generation-navigation.test.ts --runInBand` 通过。
  - 2026-06-05 Phase 4 相关验证命令 `npm test -- src/modules/workspace/hooks/content-sections/generation-actions.test.ts src/modules/workspace/hooks/content-sections/generation-actions.contract.test.ts src/modules/workspace/hooks/content-sections/generation-actions.session-restore.test.ts src/modules/workspace/hooks/content-sections/generation-navigation.test.ts src/modules/workspace/hooks/content-sections/generation-request.test.ts --runInBand` 通过。
  - 2026-06-05 Phase 4 相关验证命令 `npm test -- src/modules/workspace/hooks/content-sections/generation-actions.test.ts src/modules/workspace/hooks/content-sections/generation-actions.contract.test.ts src/modules/workspace/hooks/content-sections/generation-actions.session-restore.test.ts src/modules/workspace/hooks/content-sections/generation-navigation.test.ts src/modules/workspace/hooks/content-sections/generation-request.test.ts src/modules/workspace/hooks/content-sections/generation-upload-validation.test.ts --runInBand` 通过。
  - 2026-06-05 Phase 4 相关验证命令 `npm test -- src/modules/workspace/hooks/content-sections/generation-actions.test.ts src/modules/workspace/hooks/content-sections/generation-actions.contract.test.ts src/modules/workspace/hooks/content-sections/generation-actions.session-restore.test.ts src/modules/workspace/hooks/content-sections/generation-navigation.test.ts src/modules/workspace/hooks/content-sections/generation-request.test.ts src/modules/workspace/hooks/content-sections/generation-upload-validation.test.ts src/modules/workspace/hooks/content-sections/upload-input-value.test.ts --runInBand` 通过。
  - 2026-06-05 Phase 4 后 `npm run type-check`、`npm run lint` 和 `git diff --check` 通过。
  - 2026-06-05 Phase 5 使用 Playwright 对 `/workspace` 首屏做本地浏览器检查：常规首屏、键盘焦点、慢接口和接口失败降级反馈均有截图证据。
  - 2026-06-07 Phase 5 使用 Playwright 对 `/workspace` 左侧栏项目与会话做本地浏览器检查：独立会话、项目会话、空项目、长标题截断和无横向溢出均有截图证据。
  - 2026-06-07 Phase 5 使用 Playwright 对 `/workspace` 中间输入区做本地浏览器检查：文本预览、空输入禁用、正常文件上传、超限文件可见错误提示和无横向溢出均有截图证据。
  - 2026-06-07 Phase 5 使用 Playwright 对 `/workspace` 中间输出区做本地浏览器检查：空状态、富文本 Markdown、表格、代码块、源码模式、图片预览、Mermaid 错误降级、生成失败状态和无横向溢出均有截图证据。
  - 2026-06-07 Phase 5 使用 Playwright 对 `/workspace` 右侧对话栏做本地浏览器检查：模式切换、发送中 loading/disabled、成功回复、超长消息、附件、键盘调整宽度、失败提示和无横向溢出均有截图证据。
  - 2026-06-07 新增 `FileUpload` 超限文件可见错误提示测试，`npm test -- src/components/ui/__tests__/FileUpload.test.ts --runInBand` 通过：1 个测试套件、20 个测试。
  - 2026-06-07 中间输出区相关验证命令 `npm test -- src/components/workspace/OutputSection.test.tsx --runInBand` 通过：1 个测试套件、8 个测试。
  - 2026-06-07 中间输入区修复后 `npm run type-check`、`npm run lint` 和本轮目标文件 `git diff --check` 通过。
  - 2026-06-07 右侧对话栏相关验证命令 `npm test -- src/components/ChatPanel.test.tsx src/components/chat/AttachmentBar.test.tsx src/components/chat/ChatConversationPane.test.tsx src/modules/workspace/components/WorkspaceRightPanel.test.tsx --runInBand` 通过：4 个测试套件、46 个测试。
  - 2026-06-07 右侧对话栏 QA 文档同步后 `npm run type-check`、`npm run lint` 和本轮文档 `git diff --check` 通过。
  - 2026-06-07 Phase 5 使用 Playwright 对 `/workspace` 设置面板做本地浏览器检查：内部栏目切换、保存成功、保存失败、删除确认保护、关闭焦点恢复、小屏布局和无横向溢出均有截图证据。
  - 2026-06-07 Phase 5 使用 Playwright 对 `/workspace` 下载弹窗做本地浏览器检查：默认全选、清空禁用、全选恢复、HTTP 500 错误提示、直链降级不带离工作区、小屏布局和无横向溢出均有截图证据。
  - 2026-06-07 设置面板相关验证命令 `npm test -- src/components/settings/common/SettingsSidebar.test.tsx src/components/SettingsPanel.test.tsx src/components/ui/feedback/AccessibleDialog.test.tsx src/components/workspace/NavigationBar.test.tsx --runInBand` 通过：4 个测试套件、14 个测试。
  - 2026-06-07 设置面板修复后 `npm run type-check`、`npm run lint` 和本轮目标文件 `git diff --check` 通过。
- 未确认信息：
  - 既有大量代码改动是否全部属于用户预期变更。
  - 端到端测试是否能在当前本地环境完整跑通。
- 本轮优先涉及文件：
  - `README.md`
  - `docs/ARCHITECTURE.md`
  - `docs/README.md`
  - `docs/reports/frontend-health-baseline.md`
  - `docs/reports/workspace-ui-manual-qa-checklist.md`
  - `docs/plans/2026-06-05-frontend-improvement-plan.md`
  - `src/api/services/project.service.ts`
  - `src/api/services/project-service-normalizers.ts`
  - `src/api/services/project-service-normalizers.test.ts`
  - `src/api/services/project-service-selectors.ts`
  - `src/api/services/project-service-selectors.test.ts`
  - `src/modules/workspace/hooks/content-sections/generation-actions.ts`
  - `src/modules/workspace/hooks/content-sections/generation-navigation.ts`
  - `src/modules/workspace/hooks/content-sections/generation-navigation.test.ts`
  - `src/modules/workspace/hooks/content-sections/generation-request.ts`
  - `src/modules/workspace/hooks/content-sections/generation-request.test.ts`
  - `src/modules/workspace/hooks/content-sections/generation-upload-validation.ts`
  - `src/modules/workspace/hooks/content-sections/generation-upload-validation.test.ts`
  - `src/modules/workspace/hooks/content-sections/upload-input-value.ts`
  - `src/modules/workspace/hooks/content-sections/upload-input-value.test.ts`
  - `src/components/ui/FileUpload.tsx`
  - `src/components/ui/file-upload/FileUploadMessages.tsx`
  - `src/components/ui/__tests__/FileUpload.test.ts`
  - `docs/reports/qa-evidence/workspace-first-screen-2026-06-05.png`
  - `docs/reports/qa-evidence/workspace-first-screen-loading-2026-06-05.png`
  - `docs/reports/qa-evidence/workspace-first-screen-api-failure-2026-06-05.png`
  - `docs/reports/qa-evidence/workspace-sidebar-history-2026-06-07.png`
  - `docs/reports/qa-evidence/workspace-sidebar-projects-2026-06-07.png`
  - `docs/reports/qa-evidence/workspace-sidebar-empty-project-2026-06-07.png`
  - `docs/reports/qa-evidence/workspace-input-text-preview-2026-06-07.png`
  - `docs/reports/qa-evidence/workspace-input-file-upload-2026-06-07.png`
  - `docs/reports/qa-evidence/workspace-input-invalid-upload-2026-06-07.png`
  - `docs/reports/qa-evidence/workspace-output-empty-2026-06-07.png`
  - `docs/reports/qa-evidence/workspace-output-rich-content-2026-06-07.png`
  - `docs/reports/qa-evidence/workspace-output-rich-content-lower-2026-06-07.png`
  - `docs/reports/qa-evidence/workspace-output-source-mode-2026-06-07.png`
  - `docs/reports/qa-evidence/workspace-output-image-preview-2026-06-07.png`
  - `docs/reports/qa-evidence/workspace-output-generation-failure-2026-06-07.png`
  - `docs/reports/qa-evidence/workspace-chat-modes-empty-2026-06-07.png`
  - `docs/reports/qa-evidence/workspace-chat-sending-2026-06-07.png`
  - `docs/reports/qa-evidence/workspace-chat-response-2026-06-07.png`
  - `docs/reports/qa-evidence/workspace-chat-attachment-2026-06-07.png`
  - `docs/reports/qa-evidence/workspace-chat-resized-2026-06-07.png`
  - `docs/reports/qa-evidence/workspace-chat-error-2026-06-07.png`
  - `docs/reports/qa-evidence/workspace-settings-sections-2026-06-07.png`
  - `docs/reports/qa-evidence/workspace-settings-profile-success-2026-06-07.png`
  - `docs/reports/qa-evidence/workspace-settings-profile-error-2026-06-07.png`
  - `docs/reports/qa-evidence/workspace-settings-delete-guard-2026-06-07.png`
  - `docs/reports/qa-evidence/workspace-settings-small-screen-2026-06-07.png`
- 当前阻断点：无；但后续继续拆分前必须重新确认目标文件未被已有用户改动占用。
- 是否已能判断远程测试建议：否。本轮是本地文档和质量基线修复，不涉及远程运行。

## 目标契约

- 目标来源：用户当前指令。
- 目标对象：绿洲前端项目质量修复。
- 成功标准：
  1. 文档中的技术栈、目录和验证命令与当前项目一致。
  2. 质量基线报告能说明当前状态、主要风险和后续改进标准。
  3. 后续每个阶段都有“做什么、为什么做、完成标准、验证标准”。
  4. 不覆盖、不回滚、不混淆当前已有代码改动。
  5. 至少完成一次本机验证并如实记录结果。
- 不修改范围：
  - 不改业务逻辑行为；仅允许在测试保护下做小步结构拆分。
  - 不改 API 契约。
  - 不改依赖版本。
  - 不处理远程环境。
- 关键质量约束：
  - 证据优先，不凭印象判断。
  - 小步修复，不做大范围重构。
  - 未验证不得声称完成。
  - 用户界面相关改动后续必须补人工 QA 清单。
- 验证要求：
  - 文档结构自检。
  - `npm run type-check`。
  - `npm run lint`。
  - 后续代码阶段按影响范围增加测试命令。
- 审计要求：
  - 每个阶段结束前检查目标是否漂移。
  - 每个修复必须说明剩余风险。
  - 测试结果只能支持其实际覆盖范围。
- 是否涉及远程运行：否。
- 停止条件：
  - 文档与报告阶段完成并通过本机验证。
  - 或发现必须由用户确认的已有代码改动归属。

## Phase 0：冻结基线，避免误伤已有改动

**做什么**

确认当前分支、当前工作区改动和基础验证命令。

**为什么做**

当前分支已有大量未提交代码改动，直接修复业务代码会有覆盖用户改动的风险。

**完成标准**

- 记录当前分支。
- 记录当前工作区存在大量未提交改动。
- 跑通 `npm run type-check` 和 `npm run lint`。
- 明确第一轮只改文档和报告。

**验证标准**

```bash
git status --short
git branch --show-current
npm run type-check
npm run lint
```

## Phase 1：文档与真实项目对齐

**做什么**

修复 README、架构文档和文档索引中与当前项目不一致的信息。

**为什么做**

文档是交接入口。旧版文档仍有过期技术栈、旧目录名和“规划中”的描述，会误导后续开发、测试和后端联调。

**完成标准**

- 技术栈与 `package.json` 一致。
- 目录结构与 `src/` 真实目录一致。
- 常用命令与 `package.json` 中脚本一致。
- 文档索引能指向健康度基线和本计划。
- 修复明显失效或过期的核心链接。

**验证标准**

- 检查文档中不再出现旧版技术栈架构描述。
- 检查新增链接对应文件存在。
- 后续运行 `npm run type-check` 和 `npm run lint` 确认文档变更未影响代码检查。

## Phase 2：建立项目健康度基线

**做什么**

新增 `docs/reports/frontend-health-baseline.md`，记录当前项目状态、验证结果、风险和后续行动标准。

**为什么做**

没有基线就无法判断后续质量改进是否真实有效。

**完成标准**

- 报告包含技术栈、源码数量、测试数量、大文件清单。
- 报告包含当前验证结果。
- 报告明确短期、中期、长期改进方向。
- 报告说明当前已有大量未提交代码改动，避免误把它们算作本轮修改。

**验证标准**

- 文档能让新开发者在 10 分钟内理解当前项目健康状态。
- 报告中的数字来自当前仓库扫描结果。

## Phase 3：测试体系分层补强

**做什么**

优先补核心链路测试，而不是盲目提高总覆盖率数字。

**为什么做**

工作区核心链路复杂，生成、会话恢复、下载、充值、设置和右侧对话栏都需要稳定回归保护。

**完成标准**

- 每条核心链路至少有一个可重复运行的测试。
- 新测试先证明它能抓住目标行为，再进入实现或重构。
- 不写只覆盖组件存在但不能证明行为的测试。

**当前证据（2026-06-05）**

- `npm run test:unit`：1 个测试套件通过，5 个测试通过。
- `npm run test:integration`：1 个测试套件通过，4 个测试通过。
- `npm run test:ci`：188 个测试套件通过，1066 个测试通过。
- `npm run test:ci` 覆盖率基线：
  - Statements：58.89%
  - Branches：52.33%
  - Functions：53.31%
  - Lines：59.56%

**后续补强标准**

- 不建议先盲目提高全局覆盖率门槛。
- 下一步应围绕核心链路补行为测试：
  1. 工作区会话恢复。
  2. 生成流程失败和恢复。
  3. 下载弹窗批量选择、错误和空状态。
  4. 设置页保存成功、失败和禁用状态。
  5. 右侧对话栏长内容、附件和历史恢复。

**验证标准**

```bash
npm run test:unit
npm run test:integration
npm run test:ci
npm run type-check
npm run lint
```

## Phase 4：大文件拆分规划和小步实施

**做什么**

在测试保护下拆分大文件。

**为什么做**

当前多个核心文件超过 700 行，长期会提高维护成本和回归风险。

**优先对象**

- `src/components/ChatPanel.tsx`
- `src/modules/workspace/hooks/useWorkspaceContentSections.ts`
- `src/modules/workspace/hooks/content-sections/generation-actions.ts`
- `src/api/services/project.service.ts`
- `src/components/DownloadFilesDialog.tsx`

**完成标准**

- 每次只拆一个职责。
- 拆分前有对应测试。
- 拆分后用户行为不变。
- 不顺手重构无关代码。

**当前已完成小步**

- 已确认 `src/components/ChatPanel.tsx` 和 `src/components/DownloadFilesDialog.tsx` 当前已有未提交改动，本轮不触碰。
- 已选择当时未显示为已改动的 `src/api/services/project.service.ts` 作为安全切入点。
- 已把文件夹列表响应解析逻辑拆到 `src/api/services/project-service-normalizers.ts`。
- 已继续把项目 ID 解析、会话数量解析、项目字段映射和项目排序时间拆到 `src/api/services/project-service-normalizers.ts`。
- 已新增并扩展 `src/api/services/project-service-normalizers.test.ts`，覆盖数组响应、直接 `items`、空 `items`、嵌套 `data.items`、嵌套数组、异常响应、创建响应 ID、项目字段映射、兜底 ID、无效记录和排序时间等 14 个场景。
- 已把项目列表筛选、排序和创建后候选匹配逻辑拆到 `src/api/services/project-service-selectors.ts`。
- 已新增 `src/api/services/project-service-selectors.test.ts`，覆盖显式 ID 优先、精确匹配、名称匹配、无匹配、状态筛选、父级筛选、搜索、字符串排序和数字排序等 9 个场景。
- 拆分后 `src/api/services/project.service.ts` 从 1043 行降至 681 行。
- 已确认 `src/modules/workspace/hooks/content-sections/generation-actions.ts` 当前未显示为已有改动，本轮作为新的安全切入点。
- 已把“切换到下一个工作流”的纯决策逻辑拆到 `src/modules/workspace/hooks/content-sections/generation-navigation.ts`。
- 已新增 `src/modules/workspace/hooks/content-sections/generation-navigation.test.ts`，覆盖无生成内容、同 tab 下一个工具、跨 tab 第一个工具、最后一个工作流、下个 tab 无工具、当前工具缺失兜底等 6 个场景。
- 已把生成请求字段整理、`api_process` 匹配、会话跟踪标题生成拆到 `src/modules/workspace/hooks/content-sections/generation-request.ts`。
- 已新增 `src/modules/workspace/hooks/content-sections/generation-request.test.ts`，覆盖后端输入构建、缺失输入兜底、空 schema、版本名/版本 ID 匹配、元数据缺失、会话标题截断和空标题兜底等 8 个场景。
- 已把上传文件格式判断和不支持格式提示拆到 `src/modules/workspace/hooks/content-sections/generation-upload-validation.ts`。
- 已新增 `src/modules/workspace/hooks/content-sections/generation-upload-validation.test.ts`，覆盖文档扩展名、文档 MIME、拒绝不支持文档、图片 MIME、过滤顺序和错误提示文案等 6 个场景。
- 已把上传成功后的输入值写入策略拆到 `src/modules/workspace/hooks/content-sections/upload-input-value.ts`。
- 已扩展 `src/modules/workspace/hooks/content-sections/upload-input-value.test.ts`，新增单文件取首个上传结果、多文件替换、多文件追加并按上限截断等 3 个场景。
- 拆分后 `src/modules/workspace/hooks/content-sections/generation-actions.ts` 从 990 行降至 911 行。

**验证标准**

```bash
npm run type-check
npm run lint
npm test -- <相关测试文件或测试名>
```

## Phase 5：工作区用户体验专项检查

**做什么**

围绕 `/workspace` 做人工 QA 和必要的自动化测试补强。

**为什么做**

类型检查和 lint 看不到 loading、empty、error、disabled、窄屏、焦点和长内容问题。

**完成标准**

- 检查左侧栏、中间输入输出区、右侧对话栏、设置弹窗、下载弹窗、帮助弹窗、版本更新弹窗。
- 每个问题记录页面、步骤、预期、实际、风险等级。
- 高风险问题进入修复清单。

**当前证据（2026-06-05）**

- 已新增 `docs/reports/workspace-ui-manual-qa-checklist.md`。
- 已把 `/workspace` 首屏、左侧栏、中间输入区、中间输出区、右侧对话栏、设置面板和下载弹窗拆成可执行检查项。
- `/workspace` 首屏已通过本地 Playwright 浏览器检查，覆盖常规首屏、键盘焦点、慢接口和接口失败降级反馈，并已保存截图证据。
- 左侧栏项目与会话已通过本地 Playwright 浏览器检查，覆盖独立会话、项目会话、空项目、长标题截断和无横向溢出，并已保存截图证据。
- 中间输入区已通过本地 Playwright 浏览器检查，覆盖文本预览、空输入禁用、正常文件上传、超限文件可见错误提示和无横向溢出，并已保存截图证据。
- 中间输出区已通过本地 Playwright 浏览器检查，覆盖空状态、富文本 Markdown、表格、代码块、源码模式、图片预览、Mermaid 错误降级、生成失败状态和无横向溢出，并已保存截图证据。
- 右侧对话栏已通过本地 Playwright 浏览器检查，覆盖模式切换、发送中 loading/disabled、成功回复、超长消息、附件、键盘调整宽度、失败提示和无横向溢出，并已保存截图证据。
- 设置面板已通过本地 Playwright 浏览器检查，覆盖内部栏目切换、保存成功、保存失败、删除确认保护、关闭焦点恢复、小屏布局和无横向溢出，并已保存截图证据。
- 下载弹窗已通过本地模拟数据 QA；完整 UI 体验仍需在真实下载服务器、真实保存路径、更多批量文件和真实用户数据下继续观察。

**验证标准**

- 能在浏览器中复现并记录关键路径。
- 涉及界面的修复必须补 manual QA checklist。

## Phase 6：性能专项，先测量再优化

**做什么**

用真实场景观察性能，而不是只靠静态猜测。

**为什么做**

项目已有分包、包体积门禁和监控基础。下一步应找到真实慢点。

**完成标准**

- 检查首屏进入 `/workspace`。
- 检查长会话滚动。
- 检查大段 Markdown / Mermaid 渲染。
- 检查文件很多时的下载弹窗。
- 输出性能观察结果和可行动建议。

**当前证据（2026-06-05）**

- `npm run build:verify`：生产构建通过，包体积检查通过。
- 包体积检查结果：37 个 diagram chunks；最大 Mermaid 相关分包为 `diagram-parser-vendor-DRTB4kEY.js`，596.33 KiB。
- 本轮尚未做浏览器运行时性能观察，所以不能声称真实页面性能已完全达标。

**验证标准**

```bash
npm run build:verify
```

## Phase 7：安全与接口契约复核

**做什么**

复核 CSP、token 存储、文件 URL、Markdown 净化、API 错误提示和契约验证。

**为什么做**

AI 写作和文件处理产品必须把内容注入、凭证泄露、错误恢复和接口漂移作为底线风险。

**完成标准**

- `security:scan` 通过。
- API 契约 CI 校验通过。
- 明确哪些风险由前端兜底，哪些必须后端配合。

**当前证据（2026-06-05）**

- `npm run security:scan`：扫描 1183 个文件，未发现泄露。
- `npm run api:validate:ci`：
  - Spectral strict lint：无 warn 及以上问题。
  - API metadata：通过。
  - unused component check：通过。
  - API contract tests：6 个测试通过。

**验证标准**

```bash
npm run security:scan
npm run api:validate:ci
```

## Phase 8：CI 自动检查流程确认

**做什么**

确认 CI 中的命令在本地有对应脚本，并能按预期运行。

**为什么做**

本地通过不等于合并通过，CI 是合并保护线。

**完成标准**

- CI 中 npm 命令均存在。
- E2E 命令指定项目名。
- 能区分代码失败、环境失败和测试数据失败。

**当前证据（2026-06-05）**

- `npm run scripts:test`：38 个脚本测试通过。
- `npm run test:ci`：193 个 Jest 测试套件通过，1112 个测试通过。
- `npm run build:verify`：生产构建和包体积检查通过。
- `npm run test:e2e -- --project=chromium`：3 个端到端测试通过，覆盖未登录跳转、已有登录态进入工作区、语义生图历史详情图片恢复。

**验证标准**

```bash
npm run scripts:test
npm run build:verify
npm run test:e2e -- --project=chromium
```

## 执行顺序

1. Phase 0：冻结基线。
2. Phase 1：文档同步。
3. Phase 2：健康度基线。
4. Phase 3：测试体系分层补强。
5. Phase 4：大文件小步拆分。
6. Phase 5：工作区用户体验检查。
7. Phase 6：性能测量。
8. Phase 7：安全与接口复核。
9. Phase 8：CI 确认。

## 总验收标准

每一次改进都必须能回答：

1. 改了什么。
2. 为什么改。
3. 如何证明没破坏原有功能。
4. 还有什么风险没有覆盖。
