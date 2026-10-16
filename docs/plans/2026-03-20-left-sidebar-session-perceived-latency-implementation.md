# Left Sidebar Session Perceived Latency Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 让用户点击生成后，左栏几乎立刻出现一条“生成中”的会话占位，并在拿到真实会话编号后尽快替换成真实记录；同时把左栏冲刺刷新从 `1000ms` 调整为 `500ms`，缩短“左栏空白等待”的感受时间。

**Architecture:** 保持后端 `Session` 接口不变，把“临时会话”限制在左栏视图层，不污染全局会话数据。生成链路先按 `taskKey` 保存一份提交上下文：`folderId（目标文件夹）`、`title（占位标题）`、`toolType（工具类型）`、`submittedAtMs（提交时间）`，再统一向侧栏发送 `submitted / resolved / completed / failed / timeout` 跟踪提示，避免轮询阶段丢失上下文。`useWorkspaceSidebar` 只用这套提示维护左栏本地占位会话，并在服务端真实会话出现后自动去重和清理；临时会话在真实 `sessionId` 落表前必须完全不可交互。左栏冲刺刷新从 `1000ms` 改为 `500ms`，但本轮不改内容区异步任务状态轮询；内容区目前仍是 [useWorkspaceContentSections.ts](D:/OneDrive/4、董娣相关/绿洲慧写3.0/绿洲前端/src/modules/workspace/hooks/useWorkspaceContentSections.ts):158 的 `3000ms`。

**Tech Stack:** React 19, TypeScript, Zustand, Jest, Testing Library, Vite

---

## Scope Note

- 本计划默认“把 1 秒轮询改成 500 毫秒”指的是左栏冲刺刷新，即 [useWorkspaceSidebar.ts](D:/OneDrive/4、董娣相关/绿洲慧写3.0/绿洲前端/src/modules/workspace/hooks/useWorkspaceSidebar.ts):138 的 `SPRINT_REFRESH_INTERVAL_MS`。
- 本计划不包含把内容区异步任务状态轮询 `3000ms` 一并改短；如果后续要继续压缩真实出现时间，再单独评估 [useWorkspaceContentSections.ts](D:/OneDrive/4、董娣相关/绿洲慧写3.0/绿洲前端/src/modules/workspace/hooks/useWorkspaceContentSections.ts):158。

### Task 1: 抽出“临时会话”纯函数和生命周期契约

**Files:**

- Create: `src/modules/workspace/hooks/sidebar/optimistic-session.ts`
- Create: `src/modules/workspace/hooks/sidebar/optimistic-session.test.ts`

**Step 1: 先补失败测试**

在 `optimistic-session.test.ts` 中至少覆盖这些场景：

- `submitted` 提示会在目标文件夹插入一条顶部临时会话
- `resolved` 提示拿到真实 `sessionId` 后，会把临时会话和真实会话建立关联
- 合并服务端会话列表时，如果真实 `sessionId` 已出现，临时会话会被去重移除
- `failed` 提示会清掉对应临时会话
- 独立会话（`folderId=0`）和项目会话（`folderId>0`）都能正确落到各自列表

建议契约：

```ts
export type SessionTrackingPhase = 'submitted' | 'resolved' | 'completed' | 'failed' | 'timeout'

export interface SessionTrackingHint {
  taskKey: string
  folderId: number
  title: string
  toolType: string
  submittedAtMs: number
  phase: SessionTrackingPhase
  sessionId?: number
}
```

**Step 2: 运行测试确认当前失败**

Run: `npm test -- --runInBand src/modules/workspace/hooks/sidebar/optimistic-session.test.ts`

Expected: FAIL，因为文件和实现尚不存在。

**Step 3: 写最小实现**

在 `optimistic-session.ts` 中实现：

- 生成临时会话对象的工厂函数
- 根据 `taskKey` / `sessionId` 更新生命周期的 reducer
- 合并“本地临时会话 + 服务端真实会话”的纯函数
- 去重规则：优先保留真实会话；临时会话只用于左栏占位，不写回全局会话源数据

建议保持后端 `Session` 不改，只在本地对象上附加窄范围元信息，例如：

```ts
type OptimisticSession = Session & {
  __optimistic?: {
    taskKey: string
    phase: 'submitted' | 'resolved'
    submittedAtMs: number
    sessionId?: number
    interactionLocked: true
  }
}
```

**Step 4: 运行测试确认通过**

Run: `npm test -- --runInBand src/modules/workspace/hooks/sidebar/optimistic-session.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add src/modules/workspace/hooks/sidebar/optimistic-session.ts src/modules/workspace/hooks/sidebar/optimistic-session.test.ts
git commit -m "feat: add optimistic sidebar session helpers"
```

### Task 2: 从生成链路发出跟踪提示，并按 `taskKey` 保存提交上下文

**Files:**

- Modify: `src/modules/workspace/hooks/content-sections/generation-actions.ts`
- Modify: `src/modules/workspace/hooks/content-sections/generation-actions.test.ts`
- Modify: `src/modules/workspace/hooks/useWorkspaceContentSections.ts`
- Modify: `src/modules/workspace/hooks/useWorkspaceLayout.ts`
- Modify: `src/modules/workspace/hooks/sidebar/types.ts`
- Create: `src/modules/workspace/hooks/content-sections/session-tracking-context.ts`
- Create: `src/modules/workspace/hooks/content-sections/session-tracking-context.test.ts`
- Create: `src/hooks/useAsyncTaskPolling.test.ts`

**Step 1: 先补提交与同步完成测试**

在 `generation-actions.test.ts` 中增加一个异步工具场景：

- 提交成功后，马上断言 `onSessionTrackingHint` 被调用一次
- 断言参数包含：
  - `phase: 'submitted'`
  - `taskKey`
  - `folderId`
  - `title`
  - `toolType`
  - `submittedAtMs`

再补一个同步工具场景：

- 不出现中途 `session_id`
- 直接发出 `completed`
- 断言后续不会留下“临时会话 + 真实会话”双份记录的前置条件

**Step 2: 把“同一个 task 只发一次 resolved”抽成纯函数再测试**

新增 `session-tracking-context.test.ts`，覆盖：

- `submitted` 时会注册 `taskKey -> 提交上下文`
- 第一次出现 `session_id` 时，会基于已保存的上下文生成一条 `resolved` 提示
- 同一个 `taskKey + session_id` 重复出现时，不会重复发 `resolved`
- `completed / failed / timeout` 后，会清理该 `taskKey` 的上下文
- 任务切换后，新 `taskKey` 可以再次正常发自己的 `resolved`

建议契约：

```ts
export interface SessionTrackingContext {
  taskKey: string
  folderId: number
  title: string
  toolType: string
  submittedAtMs: number
}
```

**Step 3: 运行测试确认当前失败**

Run: `npm test -- --runInBand src/modules/workspace/hooks/content-sections/generation-actions.test.ts src/modules/workspace/hooks/content-sections/session-tracking-context.test.ts`

Expected: FAIL，因为当前回调是无参回调，且代码里还没有 `taskKey -> 提交上下文` 的保存层。

**Step 4: 再补轮询超时与 504 保持轮询测试**

新增 `useAsyncTaskPolling.test.ts`，至少覆盖：

- 轮询进入 `timeout` 时，`phase` 会进入 `timeout`
- `504 + keepPolling` 时，轮询不会进入终态失败
- 只有真正的 `failed` 或 `timeout`，才应该触发侧栏的终态回滚

**Step 5: 写最小实现**

按最小改动做六件事：

- 把 `onSessionCreated?: () => void | Promise<void>` 重命名并扩展成带 `SessionTrackingHint` 参数，例如 `onSessionTrackingHint?: (hint: SessionTrackingHint) => void | Promise<void>`
- 在 `generation-actions.ts` 的异步提交成功分支里，添加异步任务后立刻发 `submitted`
- 在 `useWorkspaceContentSections.ts` 里用 `ref` 保存 `taskKey -> 提交上下文`，不要依赖当前 UI 上的 `selectedProjectId`
- 在 `useWorkspaceContentSections.ts` 里监听当前 task 的 `pollingStatus.session_id`，通过 `session-tracking-context.ts` 生成“首次 resolved”
- 在同步完成、异步完成和终态错误分支里分别发 `completed / failed / timeout`
- 在 `useWorkspaceLayout.ts` 把原来单纯的 `sidebar.refreshSessions()` 改成转发到新的侧栏跟踪入口，例如 `sidebar.trackSessionHint(hint)`；同时把 [types.ts](D:/OneDrive/4、董娣相关/绿洲慧写3.0/绿洲前端/src/modules/workspace/hooks/sidebar/types.ts):38 的 `UseWorkspaceSidebarResult` 一并补上这个接口

注意：

- 继续保留现有 `session-generation-finished` 完成事件，作为兜底链路，不做破坏式删除
- 回调不要阻塞主流程，继续使用 `Promise.resolve(...).catch(...)` 的风格
- `failed` 提示只能来自两条链路：
  - 提交失败且 `submitErrorPolicy.markFailed === true`
  - 轮询终态进入 `failed` 或 `timeout`
- `504 + keepPolling` 不是 `failed`，这里不能删占位

**Step 6: 运行测试确认通过**

Run: `npm test -- --runInBand src/modules/workspace/hooks/content-sections/generation-actions.test.ts src/modules/workspace/hooks/content-sections/session-tracking-context.test.ts src/hooks/useAsyncTaskPolling.test.ts`

Expected: PASS

**Step 7: Commit**

```bash
git add src/modules/workspace/hooks/content-sections/generation-actions.ts src/modules/workspace/hooks/content-sections/generation-actions.test.ts src/modules/workspace/hooks/useWorkspaceContentSections.ts src/modules/workspace/hooks/useWorkspaceLayout.ts src/modules/workspace/hooks/sidebar/types.ts src/modules/workspace/hooks/content-sections/session-tracking-context.ts src/modules/workspace/hooks/content-sections/session-tracking-context.test.ts src/hooks/useAsyncTaskPolling.test.ts
git commit -m "feat: preserve task context for sidebar session tracking"
```

### Task 3: 把临时会话接进左栏，但只影响左栏视图，且保持严格不可交互

**Files:**

- Modify: `src/modules/workspace/hooks/useWorkspaceSidebar.ts`
- Modify: `src/components/workspace/left-sidebar/LeftSidebar.tsx`
- Modify: `src/components/workspace/left-sidebar/LeftSidebar.test.tsx`
- Create: `src/modules/workspace/hooks/sidebar/visible-session-list.ts`
- Create: `src/modules/workspace/hooks/sidebar/visible-session-list.test.ts`

**Step 1: 先补可见列表与过滤规则测试**

在 `visible-session-list.test.ts` 中补至少三个场景：

- `submitted` 占位会出现在正确的独立会话或项目会话分组
- 当前有 `searchTerm` 时，正在生成的占位会话仍然对用户可见，不会因为搜索条件被整个吞掉
- 目标项目的会话列表还没初始化加载时，占位也会落到正确项目分组，而不是丢失或错位

**Step 2: 再补左栏组件测试**

在 `LeftSidebar.test.tsx` 中补至少两个场景：

- 收到 `submitted` 提示后，左栏顶部立刻出现新会话，文案带“生成中”
- 当真实会话已经刷回列表后，左栏只保留真实会话，不出现重复两条

再补一个安全场景：

- 临时会话不应该出现重命名、导出、删除等菜单行为，避免用户点到无效操作
- 临时会话点击、回车、空格都不能触发 `onSessionClick`

**Step 3: 运行测试确认当前失败**

Run: `npm test -- --runInBand src/modules/workspace/hooks/sidebar/visible-session-list.test.ts src/components/workspace/left-sidebar/LeftSidebar.test.tsx`

Expected: FAIL，因为当前左栏只吃服务端会话数组，没有本地临时会话层。

**Step 4: 写最小实现**

在 `useWorkspaceSidebar.ts` 中：

- 增加本地 `optimisticSessionsByFolder` 状态，按 `folderId` 管理
- 暴露新的 `trackSessionHint(hint)` 方法
- `submitted` 时插入临时会话
- `resolved` 时给对应临时会话补上真实 `sessionId`
- `failed / timeout` 时清掉临时会话，或改成不会误导用户的终态占位，但两者必须二选一并在测试里写死
- 刷新完成后，如果服务端列表里已经出现同 `sessionId` 的真实记录，就移除本地临时会话

关键边界：

- `return { sessions: sessionList, ... }` 这类给其他模块用的全局会话数据保持服务端原样，不把临时会话透出去
- 只有构造 `leftSidebarProps` 时，才把“服务端列表 + 临时会话”合并成左栏专用数据
- 合并和过滤顺序要通过 `visible-session-list.ts` 固定下来，避免搜索、页签和项目未初始化时行为漂移

在 `LeftSidebar.tsx` 中：

- 对临时会话显示一个轻量“生成中”状态
- 临时会话在真实 `sessionId` 落表前必须完全不可点击、不可键盘选中、不可打开菜单
- 不额外重设计视觉，只做最小白话提示，避免误导成“已完成”

**Step 5: 运行测试确认通过**

Run: `npm test -- --runInBand src/modules/workspace/hooks/sidebar/optimistic-session.test.ts src/modules/workspace/hooks/sidebar/visible-session-list.test.ts src/components/workspace/left-sidebar/LeftSidebar.test.tsx`

Expected: PASS

**Step 6: Commit**

```bash
git add src/modules/workspace/hooks/useWorkspaceSidebar.ts src/components/workspace/left-sidebar/LeftSidebar.tsx src/components/workspace/left-sidebar/LeftSidebar.test.tsx src/modules/workspace/hooks/sidebar/visible-session-list.ts src/modules/workspace/hooks/sidebar/visible-session-list.test.ts
git commit -m "feat: show non-interactive optimistic sessions in left sidebar"
```

### Task 4: 把左栏冲刺刷新从 1000 毫秒改成 500 毫秒，并提前启动

**Files:**

- Modify: `src/modules/workspace/hooks/useWorkspaceSidebar.ts`
- Create: `src/modules/workspace/hooks/useWorkspaceSidebar.sprint.test.ts`

**Step 1: 改刷新触发时机**

不要再只等“完成事件”后才进入冲刺刷新。改为：

- 收到 `submitted` 提示时，就对目标文件夹启动冲刺刷新
- 收到 `resolved` 提示时，如果还在等待真实会话落表，则继续或重启冲刺刷新
- 收到 `completed / failed / timeout` 提示时，尽快停止冲刺刷新
- 保留现有 `session-generation-finished` 和 `background-task-completed` 监听，作为兜底

这样做的原因是：临时会话虽然能立刻显示，但如果不提前启动冲刺刷新，真实会话替换时机还是会被拖后。

**Step 2: 先补定时器自动化测试**

新增 `useWorkspaceSidebar.sprint.test.ts`，使用 `fake timers（测试里模拟时间）` 验证：

- `submitted` 会立刻启动目标文件夹的冲刺刷新
- 间隔确实是 `500ms`
- `resolved` 会继续或重启该文件夹的冲刺刷新，而不是静默失效
- `completed / failed / timeout` 会停止冲刺刷新
- 停止后在 `1000ms` 内不会再残留新的 500 毫秒请求

**Step 3: 把间隔值改成 500 毫秒**

把 [useWorkspaceSidebar.ts](D:/OneDrive/4、董娣相关/绿洲慧写3.0/绿洲前端/src/modules/workspace/hooks/useWorkspaceSidebar.ts):138 的：

```ts
const SPRINT_REFRESH_INTERVAL_MS = 1000
```

改成：

```ts
const SPRINT_REFRESH_INTERVAL_MS = 500
```

其余先保持最小改动：

- `SPRINT_REFRESH_MAX_DURATION_MS = 30 * 1000`
- `SPRINT_WEAK_SIGNAL_HITS_TO_STOP = 2`

本轮先不联动调这些停止条件，先观察请求量和体感收益。

**Step 4: 跑定时器测试确认通过**

Run: `npm test -- --runInBand src/modules/workspace/hooks/useWorkspaceSidebar.sprint.test.ts`

Expected: PASS

**Step 5: 做一次开发期手工观察**

在本地 DevTools Network 中观察一次完整异步生成：

- 触发生成后，左栏是否立即出现临时会话
- `queryProcessStatus` 尚未完成前，左栏列表刷新节奏是否接近 `500ms`
- 真实会话出现后是否及时替换，且不会残留重复项
- `completed / failed / timeout` 后，`1000ms` 内不再残留 500 毫秒刷新

Expected: 左栏“空白等待”明显缩短；请求量会增大，但只在短时冲刺窗口内翻倍。

**Step 6: Commit**

```bash
git add src/modules/workspace/hooks/useWorkspaceSidebar.ts src/modules/workspace/hooks/useWorkspaceSidebar.sprint.test.ts
git commit -m "perf: start sidebar sprint refresh earlier at 500ms"
```

### Task 5: 跑必需验证并做人工回归

**Files:**

- Modify: none

**Step 1: 跑定向测试**

Run: `npm test -- --runInBand src/modules/workspace/hooks/sidebar/optimistic-session.test.ts src/modules/workspace/hooks/sidebar/visible-session-list.test.ts src/modules/workspace/hooks/content-sections/generation-actions.test.ts src/modules/workspace/hooks/content-sections/session-tracking-context.test.ts src/hooks/useAsyncTaskPolling.test.ts src/modules/workspace/hooks/useWorkspaceSidebar.sprint.test.ts src/components/workspace/left-sidebar/LeftSidebar.test.tsx`

Expected: PASS

**Step 2: 跑类型检查**

Run: `npm run type-check`

Expected: PASS

**Step 3: 跑 lint**

Run: `npm run lint`

Expected: PASS

**Step 4: 做人工回归**

检查清单：

- 独立会话生成：点击生成后，左栏立刻出现“生成中”占位
- 项目会话生成：占位会落到正确项目下，而不是跑到独立会话区
- 同一任务在拿到真实 `sessionId` 后，不会出现一条临时、一条真实的重复记录
- 明确失败或超时时，占位会被移除或转成不会误导用户的终态提示，不会一直挂在左栏
- 生成完成后，左栏菜单操作只对真实会话开放，不会对临时占位开放
- 当前有 `searchTerm` 时，占位仍然能被用户看到，不会因为过滤直接消失
- `history / project` 页签来回切换时，占位不会跑错分组，也不会丢失
- 目标项目节点原本没展开时，占位不会错位到别的项目下
- `504` 后继续轮询的任务不会被当成失败提前删掉占位
- 观察一次完整任务的网络请求：单个目标文件夹在完整 30 秒冲刺窗口内，请求上限不应超过 `61` 次（首个立即刷新 + 每 `500ms` 一次）；任务一旦终态完成，`1000ms` 内不应再残留新的冲刺刷新请求

---

## Phase Order

1. 先做 Task 1，先把纯函数和去重规则钉死，避免后面把复杂度塞进 hook
2. 再做 Task 2，把生命周期提示从生成链路打通到布局层
3. 然后做 Task 3，把临时会话只接到左栏视图，不污染全局数据
4. 最后做 Task 4，把左栏冲刺刷新提速到 `500ms` 并提前启动
5. 全部完成后做 Task 5 的验证和人工回归

## Acceptance Criteria

- 用户点击生成后，左栏在同一交互周期内就能看到一条“生成中”会话
- 真实 `sessionId` 一旦出现在轮询状态里，左栏会尽快把临时项替换成真实会话
- 左栏不会出现“临时会话 + 真实会话”双份重复
- 临时会话在真实 `sessionId` 落表前完全不可交互
- 明确失败或超时时，左栏不会残留误导性的“生成中”占位
- 左栏冲刺刷新间隔从 `1000ms` 变为 `500ms`
- `submitted / resolved / completed / failed / timeout` 这 5 类提示都有测试覆盖
- `npm test` 定向用例、`npm run type-check`、`npm run lint` 全部通过

## Risks To Watch

- `R1` 请求量风险：`500ms` 冲刺刷新会让短时间请求数翻倍，需要用 Network 面板确认是否可接受
- `R2` 去重风险：如果真实会话未及时带回 `sessionId`，占位和真实会话可能短时并存，需要用 Task 1 的纯函数规则收紧
- `R3` 交互风险：临时会话如果暴露了删除/重命名/导出，会制造错误预期
- `R4` 状态污染风险：临时会话只能留在左栏视图层，不能透传到历史读取、会话点击和其他共享逻辑
- `R5` 上下文漂移风险：如果 `taskKey -> 提交上下文` 保存不全，用户切项目或切工具后，`resolved` 可能回填到错误分组

## Out Of Scope

- 不改内容区异步任务状态轮询 `3000ms`
- 不改后端接口返回结构
- 不重做左栏视觉系统，只增加最小必要提示
