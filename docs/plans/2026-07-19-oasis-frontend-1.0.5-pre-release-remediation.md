# Oasis Frontend 1.0.5 Pre-release Remediation Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use `executing-plans`, `systematic-debugging`, `test-driven-development`, and `verification-before-completion` to implement this plan task-by-task.

**Goal:** 关闭 `reports/2026-07-19-oasis-frontend-1.0.5-pre-release-audit.md` 中的 9 项 P2、5 项 P3 和候选冻结门，使 1.0.5 具备可复现的本地待上线证据。

**Architecture:** 不重构应用架构，而是在现有 sidebar → session loader → chat/workflow surface 链路中建立单一恢复事务和可表达失败的回调契约；详情项目字段的“存在性 + 规范化值”是恢复事务的权威来源，明确无项目时不得回退旧列表 ID，项目对象只提供展示信息。在 `<640px` 对所有 chatMode/sidebar 组合建立完整的互斥表面归一化规则，并把聊天焦点目标放在非 lazy 的稳定容器上。发布侧以一份 canonical check list 统一两个 release 路径，用逐文件 SHA-256 manifest、安装前 registry/Node 硬门、单次生产构建和不可覆盖的 Playwright 证据根建立确定性门。

**Tech Stack:** React 18、TypeScript、Zustand、Jest 30、Testing Library、Playwright、Vite、Node.js 20.19.0、GitHub Actions。

---

## 0. 状态与约束

- 计划日期：2026-07-19。
- 比较基线：`481c9439078a046ee7a19647dd12214cb2c8da90`。
- 当前 HEAD：`1fb2f428a2889a51ea2e8c77c5f199d5f5255fab`。
- 当前分支：`codex/upload-performance-governance`。
- 当前已有且必须保留的工作区内容：
  - `docs/CHANGELOG.md`
  - `package.json`
  - `package-lock.json`
  - `public/help/release-notes.md`
- `src/constants/appMeta.test.ts`
- `reports/2026-07-19-oasis-frontend-1.0.5-pre-release-audit.md`
- `reports/2026-07-19-oasis-frontend-1.0.5-remediation-plan-review.md`
- 计划文件本身也是本轮新增证据，不得被后续执行覆盖。
- 本版已纳入 `reports/2026-07-19-oasis-frontend-1.0.5-remediation-plan-review.md` 的 2 个阻断项和 6 个重要缺口；该审查报告保持只读。
- 不新增依赖，不改变后端端点或请求/响应 Schema，不迁移 Router、状态库、构建工具或组件库。
- 保留现有授权、Sentry、遥测、分析、国际化、内容净化和下载调用合同。
- 1.0.5 尚未上线；本计划的本地/Mock/preview 证据不替代部署后的真实账户和真实后端证据。
- `质量打磨` 技能在当前环境不可用；执行时以项目 `frontend-agents-quality-standard.md`、WCAG 2.2 AA 和本计划验收门替代。
- 不自动提交、推送、部署或运行 `changelog:notify`。精确候选提交需在修复及验收完成后另行授权。

## 1. 目标用户、界面方向与验收合同

### 1.1 目标用户和用途

- 目标用户：在桌面或手机窄屏中读取历史聊天/工作流记录的现有绿洲慧写用户，包括键盘和辅助技术用户。
- 目的：用户选择一条历史记录后，只在详情完整恢复成功时切换当前记录，并在正确的聊天或工作流表面继续操作。
- 视觉方向：保留现有绿白设计、NavigationBar、LeftSidebar、ChatPanel 和工作区布局；不做视觉重设计。

### 1.2 行为合同

1. 详情请求失败、聊天模式被隐藏、恢复回调不可用或请求已过期时，不得提交 `selectedSessionId`、项目、目标表面或成功通知。
2. 详情是项目 ID、会话类型、聊天 conversation 和完整输出的权威来源；列表仅用于发起请求、加载占位和详情项目字段真正缺失（`undefined`）时的显式次级 ID。详情项目字段存在但规范化为 `null` 代表明确无项目，禁止回退列表。聊天恢复必须显式传递 `restoredProjectId`，hydrate 不得让项目对象 ID 覆盖它。
3. `<640px` 只允许一个主要表面可操作：
   - 侧栏：`showSidebar=true`、聊天关闭；
   - 工作流：侧栏关闭、聊天关闭；
   - 聊天：侧栏关闭、聊天 Full；
   - Quarter/On 仅保留在桌面；进入窄屏时，任意 sidebar=true 优先归一化为侧栏/Off，sidebar=false 下 Quarter/Full 归一化为聊天/Full，sidebar=false+Off 保持工作流/Off；窄屏不保留 Quarter、Full+sidebar 或没有激活选项的状态。
4. 紧凑视口成功选择记录后，焦点进入新表面的命名容器；聊天焦点目标必须位于非 lazy 的 `WorkspaceRightPanel` wrapper，失败时保留在原会话按钮。
5. 所有可获焦操作必须可见；两个 `complementary` landmark 必须具有唯一名称。
6. 当前 1.0.5 版本链一致且发布说明准确；两个 release 入口共用同一 canonical check list，发布门必须基于 Node 20、新鲜 `dist`、机器强制覆盖率和不可复用旧服务的 Playwright。
7. E2E 的预期 HTTP 失败必须按 method/path/status 和有限 console 规则逐项消费；任何未消费的 console、pageerror、requestfailed、未知 API 或失败响应都使测试失败。

### 1.3 性能和安全预算

- 不新增运行时依赖和第三方请求。
- 不增加初始 route chunk；只允许少量状态/测试代码增长。
- `build:size-check` 不得回退；继续关注约 596.60 KiB 的 diagram parser chunk。
- Mock、trace、截图和日志不得包含真实令牌、真实账户数据或支付信息。

## 2. 根因归并与方案选择

### 2.1 根因

| 根因 | 覆盖发现 | 说明 |
| --- | --- | --- |
| R1 会话恢复缺少原子事务 | P2-01、P2-06、P2-07 | 详情异常被吞，`void` 回调无法表达拒绝，旧列表项目对象可覆盖详情项目 ID，外层又二次提交项目 |
| R2 分类信息在 normalizer 层丢失 | P2-08 | 缺失顶层 `type` 时，conversation 已提取但 `toolType` 被固定为 workflow |
| R3 紧凑视口复用桌面多表面状态 | P2-02、P2-03 | 默认 Quarter、侧栏和工作流可同时存在，宽度修正只能生成 0px，不能决定表面所有权 |
| R4 焦点与 landmark 没有明确所有者 | P2-04、P2-05、P3-04 | 触发按钮卸载后无焦点转移；透明菜单仍在 Tab 顺序；两个 aside 无名称 |
| R5 发布门不验证真实候选来源 | P2-09、P3-01、P3-02、P3-03、P3-05、GATE-01 | CI 路径陈旧、release 门不完整、E2E 可复用 dev 服务、产物污染、锁文件来源混杂 |

### 2.2 备选方案

1. **推荐：恢复事务 + 紧凑表面规则 + 发布门收紧。** 改动集中在现有边界，能一次关闭根因，测试可判定，不引入新架构。
2. **拒绝：逐项打补丁。** 例如仅在 0px 时加 `overflow:hidden`、只删除成功提示或只给菜单加 class；会继续保留错误选中状态和不可表达失败的回调。
3. **暂缓：重写统一 workspace 状态机。** 长期可能更整洁，但 1.0.5 待上线修复不应迁移整个导航/聊天/项目状态所有权，回归面过大。

## 3. 执行批次

执行顺序固定为：Task 1 冻结基线 → Task 2-5 功能 RED/GREEN → **Checkpoint A**（全部聚焦单测、type-check、lint 通过）→ Task 6 浏览器闭环 → **Checkpoint B**（P2 场景的生产预览 E2E 通过）→ Task 7-8 治理门 → Task 9 文档与最终候选门。Checkpoint B 前不得规范化 `package-lock.json`，避免在功能根因未关闭时扩大补丁噪声。

### Task 1：冻结基线并建立修复证据账本

**Files:**

- Create: `reports/2026-07-19-oasis-frontend-1.0.5-pre-release-remediation-ledger.md`
- Preserve: `reports/2026-07-19-oasis-frontend-1.0.5-pre-release-audit.md`

**Step 1: 记录执行前状态**

使用隔离 Node 20 目录置于 `PATH` 首位，然后记录：

```text
node -v
npm -v
git status --short --branch
git rev-parse HEAD
git diff --stat 481c943
git diff 481c943 | git patch-id --stable
```

预期：Node `v20.19.0`、npm `10.8.2`；工作区只包含第 0 节列出的既有内容和本计划。

**Step 2: 建立账本**

账本逐项记录发现编号、RED 命令/失败原因、GREEN 命令/退出码、浏览器证据、文件哈希和剩余风险。原审计报告只读。

**Step 3: 停止条件**

若出现未在第 0 节登记的新修改、暂存内容或候选基线变化，停止执行并重新审计差异；不得覆盖或还原未知用户变更。

### Task 2：把会话恢复改为可提交或可拒绝的事务

**Files:**

- Create: `src/modules/workspace/hooks/sidebar/session-click.transaction.test.ts`
- Modify: `src/modules/workspace/hooks/sidebar/session-surface.ts`
- Modify: `src/modules/workspace/hooks/sidebar/types.ts`
- Modify: `src/modules/workspace/hooks/sidebar/session-click.ts`
- Modify: `src/modules/workspace/hooks/sidebar/use-workspace-session-click-handler.ts`
- Modify: `src/modules/workspace/hooks/sidebar/use-workspace-session-click-handler.test.tsx`
- Modify: `src/modules/workspace/hooks/useWorkspaceChatPanel.ts`
- Modify: `src/modules/workspace/hooks/useWorkspaceChatPanel.test.tsx`
- Modify: `src/modules/workspace/hooks/useWorkspaceLayout.ts`
- Modify: `src/modules/workspace/hooks/useWorkspaceLayout.test.tsx`
- Modify: `src/modules/workspace/hooks/useWorkspaceSidebar.ts`
- Modify: `src/hooks/useChatManagement.ts`
- Modify: `src/hooks/useChatManagement.project.test.tsx`
- Modify: `src/hooks/chat-management/session-detail.ts`
- Modify: `src/types/api/folders-workflow.ts`
- Modify: `src/api/services/session-service-normalizers.ts`
- Modify: `src/api/services/session-service-normalizers.test.ts`

**Step 1: RED—真实详情失败**

新增测试令 `sessionService.getSession()` 拒绝，断言：

- 返回 `{ status: 'failed', sessionId, reason: 'detail-load' }`；
- 不调用聊天/工作流恢复副作用；
- 不发送“加载成功”；
- 外层不修改 selected/project/surface；
- pending 只由当前请求清理。

`SessionLoadResult.failed.reason` 使用以下封闭枚举，不允许执行者临时增加自由文本：

```ts
type SessionLoadFailureReason =
  | 'detail-load'
  | 'chat-mode-hidden'
  | 'chat-handler-unavailable'
  | 'restore-failed'
```

过期请求继续返回既有 `{ status: 'stale', sessionId }`，不伪装成 failed。

运行：

```text
npm test -- --runInBand src/modules/workspace/hooks/sidebar/session-click.transaction.test.ts
```

预期 RED：当前实现回退列表并返回 `loaded`。

**Step 2: RED—隐藏聊天模式可表达拒绝**

定义内部判定合同：

```ts
type ChatSessionRestoreResult =
  | { status: 'restored' }
  | { status: 'blocked'; reason: 'hidden-mode' | 'handler-unavailable' }
```

测试要求：

- `loadSessionFromSidebar()` 在模式隐藏时返回 `blocked/hidden-mode`，只显示一次启用模式提示，不 hydrate；上层映射为 `chat-mode-hidden`，不提交成功；
- 外层 callback 缺失，以及稳定 callback 存在但 `chatSessionSelectHandlerRef.current === null` 两种情况都确定返回/映射 `chat-handler-unavailable`；
- handler 抛错时 loader 捕获并映射 `restore-failed`，不得把异常对象写入日志；
- 上述每条都有独立 RED，不能只测试手工构造的下层 failed result。

**Step 3: RED—项目提交只有一个最终所有者**

覆盖以下情况：

- workflow 使用详情 `projectId` 提交，即使项目不在根项目 `projectList`；
- 列表 `projectId=7`、详情 `projectId=33` 且两个项目对象都存在时，chat payload 的 `restoredProjectId`、hydrate 后 workspace project 和当前聊天关联项目必须全部为 33；
- chat 由 `hydrateChatSessionFromDetail` 使用显式 `restoredProjectId` 同步 workspace project，项目对象只提供名称等展示字段；
- 外层不得在 chat 成功后再用根项目列表覆盖为 `null`；
- 详情缺失项目字段时才允许使用列表 `session.projectId` 作为次级 ID；该 ID 即使不在项目列表中也不得被清空；
- 列表 `projectId=7`、详情原始 `folder_id=0` 或 `null` 时，详情规范化结果必须为 `projectId=null`，最终 `restoredProjectId=null`，不得回退 7；
- 列表 `projectId=7`、详情原始对象没有自有 `folder_id` 字段时，详情 `projectId=undefined`，才允许最终回退 7；
- 无项目记录明确提交 `null`；陈旧请求不提交。

**Step 4: GREEN—最小实现**

- 删除 `getSession()` 内层 catch/list fallback；让异常进入统一失败分支。
- 将 `Session.projectId` 扩展为 `projectId?: number | null`。normalizer 使用 `Object.prototype.hasOwnProperty.call(raw, 'folder_id')` 区分字段缺失：缺失返回 `undefined`；字段存在且为正数返回该 ID；存在但为 `null`、空串、0、负数或非有限值返回 `null`。这是前端规范化语义，不改变后端 Schema，并兼容当前 ES2020 lib。
- 详情返回后一次性计算 `restoredProjectId = fullSession.projectId === undefined ? (session.projectId ?? null) : fullSession.projectId`；随后才用该 ID 查找 `relatedProject`，禁止复用请求前按列表 ID 计算的对象。
- `SessionLoadResult.loaded` 携带 `restoredProjectId`；failed 携带上面的有限枚举 reason，不包含响应、详情、令牌或订单数据。
- 在内部 `ChatSessionSelectPayload`/ref 链显式传递 `restoredProjectId`；`hydrateChatSessionFromDetail` 以该值更新 workspace project。`createChatSessionFromDetail` 同样显式接收该 ID，并用它设置 `associatedProjectId`；匹配的 `project` 对象只提供名称，不得参与 ID 优先级选择。该内部类型变化不改变组件公开 Props 或后端 Schema。
- 将 `onChatSessionSelect` 和 ref 链从 `void` 改为 `ChatSessionRestoreResult`，从 `useWorkspaceChatPanel` 原样传回 `useWorkspaceLayout` 和 session loader。
- hidden-mode 返回 blocked 并映射为 `chat-mode-hidden`；缺少 callback 或内部 ref 时返回 `blocked/handler-unavailable` 并映射为 `chat-handler-unavailable`；恢复抛错映射为 `restore-failed`。每种失败只产生一次用户可理解提示，不发送成功提示。
- `useWorkspaceSessionClickHandler` 只在 `loaded` 且当前请求时提交 session/surface。
- workflow 使用 loaded `restoredProjectId` 更新 workspace；chat 不执行外层二次项目选择，由 hydrate 的同一权威 ID 保持唯一事实来源。
- 详情失败的应用日志固定为单参数 `console.warn('[workspace] 会话详情加载失败')`，不得把 error/response/detail/token 作为 console 参数；用户提示保持现有可理解语义。
- 删除 `handleWorkspaceSessionClick` 中未使用的 `handleProjectSelection` 参数，避免合同误导。

**Step 5: 聚焦 GREEN**

```text
npm test -- --runInBand src/modules/workspace/hooks/sidebar/session-click.transaction.test.ts src/modules/workspace/hooks/sidebar/use-workspace-session-click-handler.test.tsx src/modules/workspace/hooks/useWorkspaceChatPanel.test.tsx src/modules/workspace/hooks/useWorkspaceLayout.test.tsx src/hooks/useChatManagement.project.test.tsx src/api/services/session-service-normalizers.test.ts
```

预期：全部通过；详情失败用例用 spy 精确断言一次固定 warning，其余用例无未消费 console warning/error。

### Task 3：修复旧聊天分类的来源信息丢失

**Files:**

- Modify: `src/api/services/session-service-normalizers.ts`
- Modify: `src/api/services/session-service-normalizers.test.ts`
- Modify: `src/types/api/folders-workflow.ts`
- Modify: `src/modules/workspace/hooks/sidebar/session-surface.ts`
- Modify: `src/modules/workspace/hooks/sidebar/session-surface.test.ts`

**Step 1: RED—使用 normalizer 的真实输出测试**

构造列表和详情均缺失顶层 `type`，但 inputs/response 含 `conversation_id` 的原始数据。断言 normalizer 输出：

- 保留 `type: undefined`；
- 保留 `conversationId`；
- `toolType` 为对应 `chat.*`；
- `resolveSessionSurface(normalizedList, normalizedDetail)` 为 `chat`。

预期 RED：当前输出 `toolType: workflow`。

**Step 2: GREEN—统一可达分类规则**

- 显式数字 `type` 仍为最高优先级：2 为 chat，其他明确数字为 workflow。
- 仅当顶层 `type` 缺失且存在非空 `conversationId` 时，使用 chatflow inputs.type 推导 `chat.focus` / `chat.image` / `chat.general`。
- 普通 workflow inputs 中单独出现 `type` 不作为聊天证据，避免误判。
- 将 `conversationId?: string | null` 从仅有 `SessionDetail` 提升为基础 `Session` 的可选规范化字段，`SessionDetail` 继承该字段；这是前端添加的可选字段，不改变后端 Schema。
- 列表 normalizer 从 parsed inputs/response 同样提取 `conversationId` 并写入 `Session`；详情沿用同一语义。类型文件和 normalizer 测试同步修改。
- `resolveSessionSurface` 增加 conversationId 的防御性 fallback；未知数据仍默认 workflow。

**Step 3: GREEN**

```text
npm test -- --runInBand src/api/services/session-service-normalizers.test.ts src/modules/workspace/hooks/sidebar/session-surface.test.ts
```

### Task 4：建立 `<640px` 互斥表面规则并消除 0px 控件

**Files:**

- Modify: `src/modules/workspace/stores/useWorkspaceUIStore.ts`
- Modify: `src/modules/workspace/stores/useWorkspaceUIStore.test.ts`
- Modify: `src/modules/workspace/hooks/useWorkspaceNavigation.ts`
- Create: `src/modules/workspace/hooks/useWorkspaceNavigation.test.tsx`
- Modify: `src/modules/workspace/components/WorkspaceRightPanel.tsx`
- Modify: `src/modules/workspace/components/WorkspaceRightPanel.test.tsx`
- Modify: `src/components/workspace/navigation/ChatModeSwitch.tsx`
- Create: `src/components/workspace/navigation/ChatModeSwitch.test.tsx`
- Modify: `src/components/workspace/navigation/styles.ts`

**Step 1: RED—状态转换**

新增测试：

- compact + Quarter → workflow：必须变成 sidebar false、chat off；
- compact + Quarter/Off → chat：必须变成 sidebar false、chat full；
- compact 打开 sidebar：必须关闭 chat；
- compact 初始化、hydrate 或 resize 使用完整真值表，并在一次 store 提交中同时规范 `showSidebar/chatMode/chatOpen`：
  - 任意 `showSidebar=true`（Off/Quarter/Full）→ sidebar：`true/off/false`；
  - `showSidebar=false + Quarter/Full` → chat：`false/full/true`；
  - `showSidebar=false + Off` → workflow：`false/off/false`；
  - 输入中的 stale `chatOpen` 不作为表面权威值，始终由归一化后的 chatMode 重算。
- 每种归一化后 `ChatModeSwitch` 必须恰有一个 active 选项，不得保留 compact Quarter；特别覆盖当前桌面可达并可持久化的 `Full + sidebar=true`。
- compact 用户动作固定为：聊天 switch 选 Full → chat；选 Off → workflow；侧栏按钮打开 → sidebar，关闭 → workflow；每个动作均一次原子提交。desktop 动作保持现状。
- desktop Quarter/Full/Off 行为保持现状，preferredChatWidth 不被覆盖。

**Step 2: RED—不可见内容不得挂载**

320/375 下即使输入 stale 的 `chatOpen=true + quarter + sidebar`，`WorkspaceRightPanel` 也不得渲染 ChatPanel、separator 或任何焦点控件。

**Step 3: GREEN—最小状态机**

- `activateSessionSurface()` 的 compact 分支直接返回 workflow/chat 两种互斥状态，不再依赖进入前 chatMode；新增一个 store 内部 action 负责 sidebar/workflow/chat 三个 compact surface 的原子提交和上述 normalize 真值表，避免组件连续调用多个 setter。
- `useWorkspaceNavigation` 使用 `matchMedia('(max-width: 639px)')` 作为与 CSS `sm` 一致的唯一 JS breakpoint；进入 compact、media change 和 hydration 完成时调用同一 normalize action，NavigationBar 的 sidebar/chat callbacks 在 compact 下调用同一 surface action，desktop 才调用现有 setter。
- compact 打开 chat 使用 Full；打开 sidebar 或选择 workflow/Off 时在同一状态提交中关闭 chat。不得先产生 Quarter、Full+sidebar、0px panel 或没有 active switch 的中间可观察状态。
- `ChatModeSwitch` 在 `<640px` 只展示 Off 和 Full 两个真实可用选项；桌面继续显示 Off/On/Full，Props 不变。
- compact indicator 使用两段布局：宽度 50%，Off/Full 的 translate 分别为 0%/100%；desktop 保持三段宽度与位置。组件测试断言按钮数、active state 和 indicator style，禁止仅隐藏 On 而保留三段高亮。
- `WorkspaceRightPanel` 对 compact Quarter stale 状态执行 defense-in-depth 不渲染，防止 hydration/resize 的瞬时 0px 控件进入无障碍树。
- 不改动用户的 `preferredChatWidth`；回到桌面后宽度仍按现有同步逻辑恢复。

**Step 4: GREEN**

```text
npm test -- --runInBand src/modules/workspace/stores/useWorkspaceUIStore.test.ts src/modules/workspace/hooks/useWorkspaceNavigation.test.tsx src/modules/workspace/components/WorkspaceRightPanel.test.tsx src/components/workspace/navigation/ChatModeSwitch.test.tsx src/modules/workspace/hooks/useWorkspaceChatWidthSync.test.tsx src/utils/chatPanelWidth.test.ts
```

### Task 5：修复焦点、透明菜单和 landmark 名称

**Files:**

- Modify: `src/components/workspace/left-sidebar/LeftSidebar.tsx`
- Modify: `src/components/workspace/left-sidebar/LeftSidebar.test.tsx`
- Modify: `src/components/ChatPanel.tsx`
- Modify: `src/components/ChatPanel.test.tsx`
- Modify: `src/modules/workspace/components/WorkspaceRightPanel.tsx`
- Modify: `src/modules/workspace/components/WorkspaceRightPanel.test.tsx`
- Modify: `src/modules/workspace/components/WorkspaceMainLayout.tsx`
- Modify: `src/modules/workspace/hooks/useWorkspaceLayout.ts`
- Modify: `src/modules/workspace/hooks/useWorkspaceLayout.test.tsx`

**Step 1: RED—语义和焦点目标**

- LeftSidebar aside 的 accessible name 必须为“工具与历史记录侧栏”。
- ChatPanel aside 的 accessible name 必须为“对话面板”，但不承担首次加载焦点目标。
- 非 lazy 的 `WorkspaceRightPanel` 内容 wrapper 必须在 `Suspense` 外具有 `role="region"`、`aria-label="对话工作区"`、`id="workspace-chat-surface"`、`tabIndex={-1}`；fallback 和真实 ChatPanel 共用该稳定容器。
- 工作流内容 section 具有 `id="workspace-workflow-surface"`、`tabIndex={-1}` 和明确名称。
- compact 首次加载 lazy chunk 和已缓存 chunk 两种情况下，键盘选择 chat 后都在下一帧聚焦非 lazy wrapper；workflow 聚焦对应 section；desktop 不强制抢走侧栏按钮焦点。

**Step 2: RED—菜单可见焦点**

非当前会话菜单 class 必须同时包含 hover、`group-focus-within` 和 `focus-visible` 可见规则；E2E 中实际 focus 后 opacity 必须为 1。

**Step 3: GREEN—最小实现**

- 为两个 aside 增加唯一 `aria-label`。
- 在 `WorkspaceRightPanel` 的非 lazy wrapper 和 workflow section 上增加稳定内部 ID、程序化焦点能力和 `focus-visible` ring；不增加公开业务 Props。
- `handleSessionActivated` 仅在 compact 且成功提交后使用一次 `requestAnimationFrame` 聚焦稳定 wrapper/section，并使用 `preventScroll: true`。聊天目标不依赖 `LazyChatPanel` mount；禁止固定 sleep、轮询或无限重试。
- 菜单增加 `group-focus-within:opacity-100 focus-visible:opacity-100`，保留现有 hover 行为。

**Step 4: GREEN**

```text
npm test -- --runInBand src/components/workspace/left-sidebar/LeftSidebar.test.tsx src/components/ChatPanel.test.tsx src/modules/workspace/components/WorkspaceRightPanel.test.tsx src/modules/workspace/hooks/useWorkspaceLayout.test.tsx
```

**Checkpoint A：** 上述 Task 2-5 聚焦测试全部退出 0 后，再运行 `npm run type-check` 和 `npm run lint`。任一失败先归因并修复功能批次，不进入浏览器或治理批次。

### Task 6：补齐生产预览 E2E 和浏览器问题收集器

**Files:**

- Modify: `tests/e2e/helpers/workspace-api-mock.ts`
- Create: `tests/e2e/fixtures/diagnostic-test.ts`
- Modify: `tests/e2e/profile-reward-quality.spec.ts`
- Modify: `tests/e2e/project-management-history.spec.ts`
- Modify: `tests/e2e/semantic-history-image.spec.ts`
- Modify: `tests/e2e/settings-quality.spec.ts`
- Modify: `tests/e2e/workspace-auth.spec.ts`
- Modify: `tests/e2e/workspace-session-display.spec.ts`
- Modify: `playwright.config.ts`
- Create: `scripts/e2e/prepare-evidence-root.mjs`
- Create: `scripts/e2e/prepare-evidence-root.test.mjs`
- Create: `scripts/e2e/create-artifact-manifest.mjs`
- Create: `scripts/e2e/create-artifact-manifest.test.mjs`
- Create: `scripts/e2e/run-e2e.mjs`
- Create: `scripts/e2e/run-e2e.test.mjs`
- Modify: `package.json`
- Modify: `.gitignore`
- Delete: `test-results/.last-run.json`

**Step 1: RED—新增用户可见场景**

在严格 Mock 下新增或改写：

1. 320×800、375×812 默认状态无 0px/越界 chat 控件，只有当前主表面可操作；完整 compact 真值表覆盖 sidebar=true 下 Off/Quarter/Full，以及 sidebar=false 下 Off/Quarter/Full（含 stale chatOpen），分别落到 sidebar、workflow、chat 三种规范状态，switch 恰有一个 active 选项且两段 indicator 对齐。
2. compact chat 成功后 sidebar 卸载，非 lazy 的“对话工作区”在视口内且获得焦点；分别覆盖首次加载 lazy chunk 和已缓存 chunk。
3. compact Quarter 初始态选择 workflow 后 chat 完全关闭，工作流获得焦点。
4. 详情 500 后原会话选择保持，不显示列表摘要冒充详情，不显示成功提示。
5. 目标 chat mode 隐藏时不提交、不显示旧聊天冒充新聊天。
6. 缺失 type 但有 conversation 的旧记录进入 chat。
7. 非当前菜单键盘聚焦后 opacity 为 1。
8. 1280×720 保留桌面 Quarter、separator 键盘 resize 和 520px 偏好恢复。
9. 列表项目 7、详情项目 33 且两者都存在时，最终 workspace/chat 项目 ID 为 33；快速双击只允许最新详情提交。

**Step 2: 统一运行时观测**

建立自动启用的公共 Playwright fixture `tests/e2e/fixtures/diagnostic-test.ts`，六个 spec 全部改从该 fixture 导入 `test/expect`，删除各 spec 重复且不完整的本地 console/page/request 数组。fixture 对每个用例统一收集：

- `console.error` / `console.warn` 的 type、message、location URL；
- `pageerror` 的 name/message；
- `requestfailed` 的 method/URL/failure text；
- 未识别 `/api/` 的 method/path；
- 非 2xx 响应的 method/path/status；
- 每个用例显式声明的 `ExpectedDiagnostic`，使用以下封闭判别联合，不接受任意字符串白名单：

```ts
type OccurrenceBounds = { minOccurrences: number; maxOccurrences: number }
type ExpectedDiagnostic =
  | ({ kind: 'http'; method: string; pathname: RegExp; status: number } & OccurrenceBounds)
  | ({
      kind: 'console'
      level: 'error' | 'warning'
      sourcePathname?: RegExp
      message: RegExp
      argumentCount?: number
    } & OccurrenceBounds)
  | ({ kind: 'pageerror'; name?: RegExp; message: RegExp } & OccurrenceBounds)
  | ({
      kind: 'requestfailed'
      method: string
      pathname: RegExp
      failureText?: RegExp
    } & OccurrenceBounds)
```

未知 API 没有 expected 类型，任何未知 `/api/` 始终失败。所有自定义 API route 的未知分支必须 `fallback()` 到公共严格 fallback 或返回可识别的 501；`project-management-history` 当前通用 200 fallback 必须删除。公共 fixture 在未知 `/api/` 最终返回 501 并记录 method/path，禁止访问真实后端。

fixture 暴露 `diagnostics.expect(...)` 供用例在触发请求前登记精确合同；`workspace-auth` 的失效令牌用例登记一次用户详情 401，并仅允许 source path 精确命中的 0..1 条浏览器资源 console；`workspace-session-display` 登记一次详情 500 及下述固定 warning。其他用例默认 expected 为空。`semantic-history-image`、`project-management-history` 的旧观测断言迁移到同一 controller，不保留第二套判定规则。

fixture teardown 使用 `try/finally`：先在 full-evidence 模式通过 `testInfo.outputPath('final.png')` 为每个用例保存最终页面截图，再执行诊断消费断言；即使用例主体失败也尽量保留截图，且不得覆盖主体异常。普通模式沿用现有显式截图，避免无条件扩大 CI artifact。

详情 500 用例必须精确声明并消费 `GET + 会话详情 path + 500`；浏览器生成的资源 console 只允许 source URL 命中该 path 且 message 命中受限的 500 regex，应用日志必须恰好一次匹配单参数 `console.warn('[workspace] 会话详情加载失败')`。HTTP 诊断必须恰好出现一次；浏览器资源 console 因 Chromium 版本差异允许 0..1 次。不得全局忽略 `Failed to load resource` 或全部 4xx/5xx。

测试结束时逐项核对：所有要求出现的 expected diagnostic 已消费、没有超过 max、所有实际诊断均被某个精确合同消费；任一未消费项或未满足项都失败。正常场景的 expected 列表为空，因此 console/pageerror/requestfailed/未知 API/失败响应必须全空。

**Step 3: 生产产物来源**

- `playwright.config.ts` 的 `webServer.command` 只启动 `vite preview --host 127.0.0.1 --port 4173 --strictPort`，不再嵌套 build。
- 新增单一 Node 编排器 `scripts/e2e/run-e2e.mjs`：默认依次运行 `changelog:check → build:verify → prepare evidence root → Playwright → artifact manifest`；传入内部 `--prebuilt` 时跳过前两项，只消费调用者刚生成的 `dist`。package scripts 分别为 `test:e2e = node scripts/e2e/run-e2e.mjs`、`test:e2e:prebuilt = node scripts/e2e/run-e2e.mjs --prebuilt`。Task 7 的 release canonical 调用 prebuilt 入口，因此一次候选门只构建一次。
- 编排器移除内部 `--prebuilt` 后，把其余 `process.argv` 原样传给本地 Playwright CLI；通过 `playwright/package.json` 的 `bin.playwright` 解析 CLI，不调用可能下载包的 npx。Playwright 非 0 时保留 child status、停止且不生成成功 manifest；只有成功后才调用 manifest。单测注入 spawn/prepare/manifest，断言 `--project/--grep` 精确转发、默认/预构建顺序、失败短路和退出码。
- 默认模式调用 npm 子命令时优先使用 `process.env.npm_execpath`，直接 node 调用时回退到 `process.execPath` 相邻的 `node_modules/npm/bin/npm-cli.js`；均通过当前 `process.execPath` 启动，保证 Node/npm 与 runtime hard gate 同源。
- `baseURL` 改为 4173；`reuseExistingServer` 固定 false。
- `playwright.config.ts` 从 `node:path` 导入 `resolve`，使用 `resolve(process.env.OASIS_E2E_OUTPUT_DIR ?? 'output/playwright')` 计算唯一 evidence root；`outputDir` 写入其 `test-results/`，HTML reporter 写入其 `html-report/`，截图、trace 和失败附件不得写到其他默认目录。
- reporter 在本地和 CI 都固定为 HTML + list，不因 `CI` 缺失而丢失 HTML。`OASIS_E2E_FULL_EVIDENCE=1` 时 `trace: 'on'`，其他运行保持 `retain-on-failure`；最终候选门必须设置该变量以保留成功 trace。
- `scripts/e2e/prepare-evidence-root.mjs` 只使用 Node 内置模块：解析 evidence root；当 `OASIS_E2E_REQUIRE_FRESH_ROOT=1` 时以非 recursive `mkdir` 原子创建，目录已存在即退出非 0，禁止 Playwright 清理/覆盖旧证据；普通开发运行可创建缺失目录并复用默认临时 root。脚本测试覆盖不存在、已存在拒绝、相对/绝对路径解析。
- `create-artifact-manifest.mjs` 在 Playwright 成功后递归列出 evidence root 内除 manifest 自身外的文件，按 POSIX 相对路径排序，写入包含 size 和 SHA-256 的 `artifact-manifest.json`；`--check` 模式只读复算并要求逐项一致。空目录、缺少 HTML report/test-results、manifest 自身被纳入哈希或 check 漂移都必须失败。测试使用临时目录验证排序、hash、自排除和只读 check。
- CI 的 E2E step 显式设置 `OASIS_E2E_OUTPUT_DIR=output/playwright`，Task 7 的 artifact upload 使用同一 `output/playwright/` 路径。
- 最终本地候选门显式设置 `OASIS_E2E_OUTPUT_DIR=output/browser-evidence/2026-07-19-1.0.5-pre-release-remediation`、`OASIS_E2E_REQUIRE_FRESH_ROOT=1`、`OASIS_E2E_FULL_EVIDENCE=1`；不再执行事后复制。evidence root 内由机器生成 artifact 清单和 SHA-256。
- `.gitignore` 增加 `/test-results/`、`/playwright-report/` 兼容旧工具；删除已跟踪的生成状态 `test-results/.last-run.json`。

**Step 4: 聚焦 GREEN**

```text
npm run test:e2e -- --project=chromium --grep "会话|320px|旧式|详情失败"
```

预期：`test:e2e` 恰好执行一次 changelog check、一次 build verify 和一次 prebuilt Playwright；未知 API 为空、非预期 console/page/request/HTTP 列表为空；截图和失败 trace 写入当前 evidence root。最终 full-evidence 模式另外保留成功 trace。

**Checkpoint B：** 聚焦 Chromium E2E 在 320、375、1280 三档退出 0，详情 500 的 expected diagnostics 精确消费，正常用例诊断为空。达到此门后才允许执行 Task 7-8；否则保留 evidence root 并回到对应功能任务。

### Task 7：修正 CI 路径和完整、非误导的发布门

**Files:**

- Modify: `.github/workflows/ci.yml`
- Modify: `jest.config.mjs`
- Create: `scripts/ci/ci-contract.test.mjs`
- Create: `scripts/runtime/assert-node-version.mjs`
- Create: `scripts/runtime/assert-node-version.test.mjs`
- Create: `scripts/release/candidate-manifest.mjs`
- Create: `scripts/release/candidate-manifest.test.mjs`
- Modify: `scripts/changelog/sync-release-notes.mjs`
- Modify: `scripts/changelog/sync-release-notes.test.mjs`
- Modify: `scripts/release/prepare-release.mjs`
- Modify: `scripts/release/prepare-release.test.mjs`
- Modify: `package.json`

**Step 1: RED—CI 配置路径**

新增 `scripts/ci/ci-contract.test.mjs`，读取 workflow 文本并断言：

- push 和 pull_request 的 paths 都包含 `jest.config.mjs`、`.nvmrc`、`docs/CHANGELOG.md`，且不再依赖已删除的 `jest.config.ts`；
- API job 存在独立 `npm run api:drift:strict` step，不能用 validate/docs 隐式替代；
- 两个 CI job 都在各自 `npm ci` 之前依次运行零依赖 `node scripts/runtime/assert-node-version.mjs` 和 `node scripts/dependencies/check-lockfile-registry.mjs`；contract test 比较 step 索引，不能只断言字符串存在；
- E2E step 设置 `OASIS_E2E_OUTPUT_DIR: output/playwright`，通过独立入口 `npm run test:e2e` 产生新鲜 dist，artifact upload path 精确为 `output/playwright/`，与 Playwright 默认 evidence root 一致。

先运行 `node --test scripts/ci/ci-contract.test.mjs`，预期 RED；最小修改 `.github/workflows/ci.yml` 后再次运行并转 GREEN。

**Step 2: RED/GREEN—把本次覆盖率基线变成机器门**

- 在 `jest.config.mjs` 把 global coverage thresholds 设置为 branches 62、functions 69、lines 74、statements 73；这是对审计实测 62.48/69.75/74.03/73.37 的保守整数下取整，不把偶然小数波动锁死。
- `scripts/ci/ci-contract.test.mjs` 同时断言这四个值，防止配置被静默降低。
- 先临时断言目标值观察 RED，再修改 config；运行 `npm run test:ci` 必须由 Jest 自身执行 coverage 门，新分支仍需直接测试。

**Step 3: RED—发布说明只读检查**

为 changelog script 新增 `--check` 测试：

- source 与 release-notes 一致时退出 0 且不写文件；
- 不一致时退出非 0，并显示固定、不泄露内容的错误；
- `--check` 不创建缺失目录或文件。

新增 `changelog:check` package script。

**Step 4: RED—版本链、canonical checks 和子进程退出码**

为 `prepare-release` 新增纯函数测试：

- package、package-lock 顶层、`packages[""]`、CHANGELOG 首节和 release-notes 首节必须同版；
- `prepare-release` 在读取/写入版本文件和运行任何子检查前调用可测试的 runtime contract，Node 不是 20.19.0 或相邻官方 npm 不是 10.8.2 时立即非 0；直接 CLI `node scripts/runtime/assert-node-version.mjs` 使用同一逻辑，测试错误 Node/npm 和成功组合；
- 普通版本准备和 `--check-current` 都从同一个 `CANONICAL_RELEASE_CHECKS` 生成，顺序固定为 `scripts:test`、`test:ci`、`type-check`、`lint`、`api:validate:ci`、`api:drift:strict`、`api:docs:check`、`security:scan`、`deps:check`、`audit:prod:ci`、`changelog:check`、`build:verify`、`test:e2e:prebuilt`；
- 普通版本准备只比 `--check-current` 多版本写入、CHANGELOG 更新和 release-notes sync；检查集合与顺序不得分叉，不再保留独立、可漂移的 `RELEASE_CHECKS`/`CURRENT_VERSION_CHECKS`；
- 不再使用 `npx vite build`；
- `runCheck()` 在子进程 `status=7` 时抛出携带 `exitCode=7` 的 `ReleaseCheckError`，main 将 `process.exitCode` 设为 7，且后续检查不执行；status 为 null/信号中止或非整数时统一回退 1；
- 调用者设置的 `OASIS_E2E_OUTPUT_DIR` 必须原样传入 `test:e2e` 子进程。

**Step 5: GREEN—统一门和非变异 build verify**

- 将 `build:verify` 调整为直接 Vite build，显式执行 `strip-katex-fonts.mjs` 和 bundle size check，不再内嵌 `changelog:check`；canonical 在它前面只执行一次 changelog check。
- 普通 `npm run build` 仍保留现有 prebuild sync/postbuild 行为；`build:verify` 不通过 changelog sync 静默改写候选。
- `test:e2e:prebuilt` 只 preview 刚才的 dist，不再 build；`release --check-current` 先验证 runtime/版本链，再只执行一次 canonical gate。静态测试断言 canonical 中 `changelog:check`、`build:verify`、`test:e2e:prebuilt` 各一次且不存在嵌套入口 `test:e2e`。

**Step 6: GREEN—强候选 manifest**

- `candidate-manifest.mjs --baseline <commit> --output <path>` 使用 `git diff --name-status -z <baseline>` 获取 tracked/renamed/deleted 候选，再合并 `git ls-files --others --exclude-standard -z` 的 untracked 候选；忽略 `.gitignore` 已排除的 evidence root。输出使用 exclusive create，已存在文件即失败，避免覆盖旧冻结证据。
- 对排序后的每个候选记录 status、POSIX 相对路径、字节数和原始文件 SHA-256；deleted 记录固定 marker。不得使用 patch-id、不得规范化换行/空白、不得遗漏未跟踪计划/报告。
- `candidate-manifest.mjs --compare before.json after.json` 要求逐项完全相同；可选 `--allow-change <exact-path>` 只允许该精确文件变化，其他新增/删除/hash 变化均非 0。测试覆盖 tracked、untracked、deleted、空白差异、允许单一 ledger 和额外变化拒绝。

**Step 7: GREEN**

```text
npm run scripts:test
npm run changelog:check
```

### Task 8：统一 package-lock 下载来源并增加回归门

**Files:**

- Create: `scripts/dependencies/check-lockfile-registry.mjs`
- Create: `scripts/dependencies/check-lockfile-registry.test.mjs`
- Modify: `package-lock.json`
- Modify: `package.json`

**Step 1: RED—来源策略**

测试脚本读取 lockfile：仅对可由 `new URL()` 解析且 protocol 为 `http:`/`https:` 的 npm tarball `resolved` 执行 host allowlist；允许缺失 resolved、`file:`、git、本地/workspace 等非 HTTP(S) 条目。拒绝非 `https://registry.npmjs.org/` 的 HTTP(S) npm tarball，错误只报告 lockfile package path 和 host，不输出完整 URL、凭据或环境。

**Step 2: GREEN—规范化**

- 仅将 82 个 `registry.npmmirror.com` resolved host 改为 `registry.npmjs.org`；不改变包版本、依赖图和 integrity。
- 增加 `deps:registry:check`，并串入现有 `deps:check`。

**Step 3: 安装与审计验证**

```text
node scripts/runtime/assert-node-version.mjs
node scripts/dependencies/check-lockfile-registry.mjs
npm ci --ignore-scripts --registry=https://registry.npmjs.org
npm run scripts:test
npm run deps:registry:check
npm run deps:check
npm run audit:prod:ci
```

预期：runtime 和 registry 两个零依赖硬门先通过，随后才允许任何下载；lockfile 不再发生额外变化，镜像 URL 数为 0，生产依赖漏洞为 0。`deps:check` 中再次调用 registry checker 是候选完整性复核，允许与安装前安全门重复一次，但 build/changelog/E2E 等重门不得重复。`npm ci --ignore-scripts` 仅证明 lockfile 可安全解析安装；真实生命周期由 GitHub Actions 两个 job 在同样前置硬门后的普通 `npm ci` 单独证明，账本不得混写两层证据。

### Task 9：更新 1.0.5 文档与修复证据

**Files:**

- Modify: `docs/CHANGELOG.md`
- Modify: `public/help/release-notes.md`（仅由 sync 生成）
- Update: `reports/2026-07-19-oasis-frontend-1.0.5-pre-release-remediation-ledger.md`
- Preserve: `reports/2026-07-19-oasis-frontend-1.0.5-pre-release-audit.md`
- Preserve: `reports/2026-07-19-oasis-frontend-1.0.5-remediation-plan-review.md`

**Step 1: 更新当前 1.0.5，不创建新版本**

发布说明准确描述：

- 详情失败不再误报成功；
- 旧聊天、隐藏模式和项目关联恢复；
- 窄屏互斥表面、焦点和菜单可见性；
- 不声称后端 Cookie/CSRF 或生产真实账户已闭环。

**Step 2: 同步与只读复核**

```text
npm run changelog:sync
npm run changelog:check
```

两条命令退出 0；不运行 `changelog:notify`。

**Step 3: 账本闭环**

最终候选门前，账本先逐项映射 P2/P3 → 代码 → RED → GREEN，并把浏览器证据/最终命令标为 pending，不提前写完成。Section 4 完成后，只允许再修改该账本：写入最终退出码、artifact-manifest 路径/hash、浏览器结果和剩余生产门；随后生成 final candidate manifest。若任一 P2 未关闭，状态不得写成完成。

## 4. 全量验证顺序

Task 2-8 的 RED/GREEN 命令已经在各 checkpoint 执行；最终候选门不得再逐项重复 canonical checks。Task 9 完成 changelog sync 和 pending 账本后，在同一个 Windows `cmd` 会话中依次运行（release evidence 与 browser evidence 路径必须预先确认不存在）：

```text
set "NODE20_HOME=%CD%\output\runtime\node-v20.19.0\node-v20.19.0-win-x64"
set "PATH=%NODE20_HOME%;%PATH%"
node -v
npm -v
node scripts/runtime/assert-node-version.mjs
node scripts/dependencies/check-lockfile-registry.mjs
node scripts/release/candidate-manifest.mjs --baseline 481c943 --output output\release-evidence\2026-07-19-1.0.5-pre-release-remediation\candidate-before.json
npm ci --ignore-scripts --registry=https://registry.npmjs.org
set "OASIS_E2E_OUTPUT_DIR=output\browser-evidence\2026-07-19-1.0.5-pre-release-remediation"
set "OASIS_E2E_REQUIRE_FRESH_ROOT=1"
set "OASIS_E2E_FULL_EVIDENCE=1"
npm run release -- --check-current
node scripts/e2e/create-artifact-manifest.mjs --check
node scripts/release/candidate-manifest.mjs --baseline 481c943 --output output\release-evidence\2026-07-19-1.0.5-pre-release-remediation\candidate-after-gate.json
node scripts/release/candidate-manifest.mjs --compare output\release-evidence\2026-07-19-1.0.5-pre-release-remediation\candidate-before.json output\release-evidence\2026-07-19-1.0.5-pre-release-remediation\candidate-after-gate.json
REM 此处仅更新 reports\2026-07-19-oasis-frontend-1.0.5-pre-release-remediation-ledger.md，写入上述最终结果和 artifact-manifest hash
node scripts/release/candidate-manifest.mjs --baseline 481c943 --output output\release-evidence\2026-07-19-1.0.5-pre-release-remediation\candidate-final.json
node scripts/release/candidate-manifest.mjs --compare output\release-evidence\2026-07-19-1.0.5-pre-release-remediation\candidate-before.json output\release-evidence\2026-07-19-1.0.5-pre-release-remediation\candidate-final.json --allow-change reports/2026-07-19-oasis-frontend-1.0.5-pre-release-remediation-ledger.md
git diff --check 481c943
git status --short --branch
```

要求：

- 每条退出码 0。
- runtime hard gate 必须机器确认 Node 20.19.0/npm 10.8.2；仅打印版本不算通过。registry checker 必须在 `npm ci` 前退出 0；`--registry` 参数不能替代该门。
- `candidate-before.json` 与 `candidate-after-gate.json` 逐文件完全一致，证明 install/release/E2E 没有改写 tracked、deleted 或 untracked 候选。最终账本更新后，before 与 final 只允许该精确 ledger path 变化；不得再用 patch-id 作为完整候选证明。
- `release --check-current` 输出 canonical 13 项各一次，其中 `changelog:check → build:verify → test:e2e:prebuilt` 各一次且后两者不再嵌套前项；不得在该命令前后再次手工运行同一整套门。registry 的安装前检查与 `deps:check` 内候选复核是唯一允许的轻量重复。任一子命令失败时最终退出码等于该子命令 status（无法取得 status 时为 1），且后续门没有执行。
- Jest 无新增 warning/error；lint 不得增加 warning。Jest 配置机器强制 statements 73%、branches 62%、functions 69%、lines 74%；审计实测小数基线仍记入账本供人工对比，新分支具备直接测试。
- API strict drift 无阻断；生产依赖漏洞为 0；lockfile 非官方 registry URL 为 0。
- build size 不回退；diagram parser chunk 若增长需解释。
- E2E 必须明确显示新鲜 4173 preview、`reuseExistingServer=false`；正常用例未知 API/console/pageerror/requestfailed/失败响应均为空，详情 500 仅保留已逐项消费的结构化 expected diagnostics。
- `output/browser-evidence/2026-07-19-1.0.5-pre-release-remediation/` 必须由 fresh-root 脚本原子新建；已存在就停止，不能让 Playwright 清理旧目录。目录包含 `test-results/`、`html-report/`、成功/失败 trace 和机器生成的 `artifact-manifest.json`；`--check` 复算一致后，账本只记录 manifest 路径/hash，无需人工复制文件清单。
- `npm ci --ignore-scripts` 不替代 CI 普通 `npm ci` 的生命周期证据；最终结论分别记录本地 lock 安装门和 CI 安装门。

## 5. 浏览器验收矩阵

证据目录：

`D:\OneDrive\4、董娣相关\3、绿洲慧写3.0\绿洲前端\output\browser-evidence\2026-07-19-1.0.5-pre-release-remediation\`

该目录必须在最终运行前不存在；若已经存在，不删除、不覆盖，改用第一个未占用的 `...-run02`、`...-run03` 后缀，并把同一绝对路径设置到 `OASIS_E2E_OUTPUT_DIR` 和账本。不得把旧 artifact 复制成新证据。

| 视口 | 场景 | 必须验证 |
| --- | --- | --- |
| 320×800 | 默认进入、sidebar、chat、workflow | 无 0px/横向滚动；只一个主表面；关键控件在视口内 |
| 375×812 | 同上 | reflow、顶栏、输入区、菜单和 focus ring 可见 |
| 1280×720 | Off/On/Full、separator | desktop Quarter 保留；键盘 resize；520px 偏好恢复 |
| 1280×720 | 详情 500、隐藏模式 | 原选择保留；无成功提示；旧内容不冒充新内容 |
| 320/375 | 键盘选择 chat/workflow | 焦点进入命名表面；显示侧栏后有可预测返回路径 |
| desktop | 非当前会话菜单 | Tab 聚焦后 opacity 1；Escape/菜单焦点返回正确 |
| all | legacy type、child project、快速双击 | 分类正确；列表项目 7/详情项目 33 最终为 33；最新请求提交正确 |
| all | 运行时诊断 | 正常场景诊断为空；详情 500 只消费精确 method/path/status、0..1 条浏览器资源错误和 1 条固定应用 warning |

每个场景记录 URL、构建 hash、Chromium 版本、viewport、数据模式、截图、trace、console、pageerror、failed request 和未知 API。

## 6. 停止与回滚条件

立即停止完成声明并保留证据，如果出现：

1. Node 子进程不是 20.19.0；
2. 任一 P2 RED 测试不能稳定复现，说明根因假设需重审；
3. 同一根因连续 3 次最小修复仍失败，必须暂停并重新讨论架构，不叠加第 4 个补丁；
4. 320/375 仍存在视口外可聚焦控件、BODY 焦点、错误 selected/project/surface 或误报成功；
5. 未解释 API、console error/warn、pageerror、requestfailed；
6. `npm ci`、build、release check 或 E2E 修改未声明的 tracked 文件；
7. 工作区出现未知修改或用户既有内容被覆盖；
8. coverage、bundle、API、安全或依赖门回退。

回滚按任务批次进行，只撤销本任务新增行；不得 checkout/reset/clean 用户已有工作区。若修复尚未部署，回滚只发生在本地候选；部署/远程回滚不属于本计划。

## 7. 证据状态与交付边界

- 实施前：`PLAN_ONLY`。
- 全量本地门和生产预览完成后：可声明本地待上线候选已验证，但仍不得冒充生产真实账户证据。
- 提交、推送和部署：需要独立明确授权。
- 部署后必须使用真实账户只读复验旧聊天、子项目、隐藏模式、窄屏和 4xx/5xx；在此之前生产层仍未关闭。

**当前状态：STATIC_ONLY**
