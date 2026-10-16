# Async Workflow State Consistency Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 修复异步工作流“已有结果却仍显示失败”的状态错位问题，覆盖 R1-R4，并让页面输出区、异步任务中心、通知同步使用一致的终态判定口径。

**Architecture:** 采用“先止血、再收敛”的两阶段方案。第一阶段只修用户最容易看到的错位：会话恢复时同步页面状态、轮询完成优先于失败残留。第二阶段把终态判断抽成共享判定器，并收紧通知文本解析，减少多条链路各自判定导致的互相打架。由于 `useBackgroundTaskStore.addTask` 当前没有注册入口，这一套全局后台轮询链路不作为主修复阻塞项，只做对齐或清理。

**Tech Stack:** React 19、TypeScript、Zustand、Jest、Testing Library、自定义浏览器事件

---

### Task 1: 修复 R1，消除“恢复会话后沿用旧失败标签”

**Files:**

- Create: `src/modules/workspace/events/session-output-restored-event.ts`
- Modify: `src/modules/workspace/hooks/sidebar/session-click.ts`
- Modify: `src/modules/workspace/hooks/content-sections/generation-actions.ts`
- Modify: `src/modules/workspace/hooks/content-sections/generation-actions.test.ts`

**Step 1: 先补失败测试**

在 `generation-actions.test.ts` 中增加一个场景：

- 先把 hook 状态推进到 `failed`
- 模拟触发“会话内容已恢复”事件
- 断言 `generationStatus` 不再保留 `failed`
- 断言有正文或文件时，状态应切到 `success`；没有正文也没有文件时，状态回到 `idle`

**Step 2: 运行测试确认当前失败**

Run: `npm test -- --runInBand src/modules/workspace/hooks/content-sections/generation-actions.test.ts`

Expected: 新增断言失败，说明当前代码不会在恢复会话时清理旧失败状态。

**Step 3: 加最小实现**

实现一个新的事件文件，建议导出：

```ts
export const SESSION_OUTPUT_RESTORED_EVENT = 'workspace-session-output-restored'

export interface SessionOutputRestoredDetail {
  sessionId: number
  hasText: boolean
  hasFiles: boolean
  source: 'session-click' | 'history-load'
}
```

然后：

- 在 `session-click.ts` 成功 `setGenerated(...)`、`loadSessionFiles(...)` 之后派发事件
- 在 `generation-actions.ts` 中监听该事件
- 监听后按规则同步状态：
  - `hasText || hasFiles` -> `SUCCESS`
  - 否则 -> `RESET`

**Step 4: 再跑测试确认通过**

Run: `npm test -- --runInBand src/modules/workspace/hooks/content-sections/generation-actions.test.ts`

Expected: PASS，恢复会话后主输出区不再残留红色“失败”标签。

**Step 5: Commit**

```bash
git add src/modules/workspace/events/session-output-restored-event.ts src/modules/workspace/hooks/sidebar/session-click.ts src/modules/workspace/hooks/content-sections/generation-actions.ts src/modules/workspace/hooks/content-sections/generation-actions.test.ts
git commit -m "fix: sync output status when session content is restored"
```

### Task 2: 修复 R2，统一“结果存在”与“失败信号存在”并存时的优先级

**Files:**

- Create: `src/modules/workspace/hooks/content-sections/async-terminal-decision.ts`
- Create: `src/modules/workspace/hooks/content-sections/async-terminal-decision.test.ts`
- Modify: `src/hooks/useAsyncTaskPolling.ts`
- Modify: `src/components/workspace/AsyncTaskDaemon.tsx`
- Modify: `src/modules/workspace/hooks/content-sections/generation-actions.ts`

**Step 1: 先补共享判定器测试**

在 `async-terminal-decision.test.ts` 中至少覆盖这些输入：

- `is_completed=true + answer_text 有值 + error_message 有值` -> 应判 `completed`
- `progress_percent=100 + file_url 有值 + status=failed` -> 应判 `completed`
- `status=failed + 无文本 + 无文件 + error_message 有值` -> 应判 `failed`
- `status=running + 无结果 + 无错误` -> 应判 `running`

**Step 2: 运行测试确认当前失败**

Run: `npm test -- --runInBand src/modules/workspace/hooks/content-sections/async-terminal-decision.test.ts`

Expected: FAIL，因为文件和实现尚不存在。

**Step 3: 写最小共享判定器**

建议输出结构：

```ts
export interface AsyncTerminalDecision {
  kind: 'completed' | 'failed' | 'running'
  hasText: boolean
  hasFiles: boolean
  warningMessage?: string
}
```

判定顺序必须固定为：

1. 先识别是否有结果：`answer_text/output/file_url/file_output`
2. 再识别是否完成：`is_completed/status/progress_percent/current_step`
3. 只要“已完成”且“已有结果”同时成立，就优先返回 `completed`
4. 只有“无结果”且后端明确失败时，才返回 `failed`
5. 其余都保持 `running`

**Step 4: 接入三条主链路**

- `useAsyncTaskPolling.ts` 改为先用共享判定器，再决定 `onComplete/onError`
- `AsyncTaskDaemon.tsx` 改为先用共享判定器，再更新 `useAsyncTaskStore`
- `generation-actions.ts` 在处理 `createWithApi` 的即时响应时，也走同一判定器，避免“首包已有结果却还被引导成失败/运行中”

**Step 5: 运行验证**

Run: `npm test -- --runInBand src/modules/workspace/hooks/content-sections/async-terminal-decision.test.ts src/modules/workspace/hooks/content-sections/generation-actions.test.ts`

Expected: PASS，并且“有结果+失败残留”不再误判成失败。

**Step 6: Commit**

```bash
git add src/modules/workspace/hooks/content-sections/async-terminal-decision.ts src/modules/workspace/hooks/content-sections/async-terminal-decision.test.ts src/hooks/useAsyncTaskPolling.ts src/components/workspace/AsyncTaskDaemon.tsx src/modules/workspace/hooks/content-sections/generation-actions.ts src/modules/workspace/hooks/content-sections/generation-actions.test.ts
git commit -m "fix: prioritize completed results over stale async failure markers"
```

### Task 3: 修复 R3，让异步任务中心只在“明确失败”时才进入失败态

**Files:**

- Modify: `src/components/workspace/AsyncTaskDaemon.tsx`
- Modify: `src/modules/workspace/stores/async-task.store.ts`
- Modify: `src/components/workspace/navigation/AsyncTaskMenu.tsx`
- Create: `src/components/workspace/navigation/AsyncTaskMenu.status.test.tsx`

**Step 1: 补任务中心状态测试**

新增测试至少覆盖：

- 查询接口返回“结果已存在 + error_message 有值”时，任务中心应显示完成，不显示失败
- 查询接口返回“无结果 + 未明确失败 + 临时错误”时，任务中心保持进行中，步骤文案显示“等待确认”
- 只有“无结果 + 明确失败”时，任务中心才显示失败

**Step 2: 运行测试确认当前失败**

Run: `npm test -- --runInBand src/components/workspace/navigation/AsyncTaskMenu.status.test.tsx`

Expected: FAIL，当前守护进程会优先按失败处理。

**Step 3: 写最小实现**

- `AsyncTaskDaemon.tsx` 用 Task 2 的共享判定器
- 对“未明确完成也未明确失败”的情况，不再写入 `failed`
- `currentStepName` 改成更白话的中性状态，例如 `等待状态确认`
- `error_message` 只在明确失败时保留

`async-task.store.ts` 不引入新的终态枚举，先保持最小改动；如果要显示“等待确认”，直接用现有 `running` + `currentStepName` 即可。

**Step 4: 运行验证**

Run: `npm test -- --runInBand src/components/workspace/navigation/AsyncTaskMenu.status.test.tsx`

Expected: PASS，任务中心不再把“不确定”误写成“失败”。

**Step 5: Commit**

```bash
git add src/components/workspace/AsyncTaskDaemon.tsx src/modules/workspace/stores/async-task.store.ts src/components/workspace/navigation/AsyncTaskMenu.tsx src/components/workspace/navigation/AsyncTaskMenu.status.test.tsx
git commit -m "fix: avoid premature async task failure in task center"
```

### Task 4: 修复 R4，收紧通知失败判定并处理“成功/失败词并存”场景

**Files:**

- Modify: `src/hooks/notification-task-sync.ts`
- Modify: `src/hooks/notification-task-sync.test.ts`
- Modify: `src/hooks/useNotifications.ts`

**Step 1: 先补通知反例测试**

在 `notification-task-sync.test.ts` 中增加这些样例：

- `任务已完成，未发现异常，task_key: ...` -> 应判 `completed`
- `任务完成，请查看 error log 附件，task_key: ...` -> 不应直接判 `failed`
- `任务失败，task_key: ...` -> 仍应判 `failed`
- 同一通知同时出现明确完成词和明确失败词 -> 返回 `null`，交由后续通知或轮询结果决定

**Step 2: 运行测试确认当前失败**

Run: `npm test -- --runInBand src/hooks/notification-task-sync.test.ts`

Expected: FAIL，当前 `/异常/` `/error/` 等宽泛匹配会误伤。

**Step 3: 写最小实现**

建议做三件事：

- 删除或收紧宽泛失败词：尤其是 `/异常/` 和裸 `/error/`
- 当同一条通知同时命中完成与失败时，返回 `null`，不改任务状态
- `useNotifications.ts` 对 `null` 或歧义状态保持忽略，不做降级改写

**Step 4: 运行验证**

Run: `npm test -- --runInBand src/hooks/notification-task-sync.test.ts`

Expected: PASS，“完成+异常描述”不再被误判成失败。

**Step 5: Commit**

```bash
git add src/hooks/notification-task-sync.ts src/hooks/notification-task-sync.test.ts src/hooks/useNotifications.ts
git commit -m "fix: tighten notification task status parsing"
```

### Task 5: 对齐现有的全局后台轮询遗留链路，不让它成为下一轮误报源

**Files:**

- Modify: `src/stores/useBackgroundTaskStore.ts`
- Modify: `src/app/providers/BackgroundTaskPoller.tsx`
- Modify: `src/app/providers/AppProviders.tsx`

**Step 1: 先确认这条链路的去留**

当前 `useBackgroundTaskStore.addTask` 没有调用点。实现前先决定二选一：

- 要么把它正式接上主链路；
- 要么明确标记为停用，避免之后又被部分接回。

本次推荐：先不接主链路，只把误导性的失败 toast 与无效轮询清掉。

**Step 2: 最小改动方案**

- `BackgroundTaskPoller.tsx` 增加“无任务直接静默”的保护
- 任何“非明确失败”的错误都不弹失败 toast
- 在代码注释里明确它当前不是主状态来源

**Step 3: 运行基础验证**

Run: `npm run type-check`

Expected: PASS

Run: `npm run lint`

Expected: PASS

**Step 4: Commit**

```bash
git add src/stores/useBackgroundTaskStore.ts src/app/providers/BackgroundTaskPoller.tsx src/app/providers/AppProviders.tsx
git commit -m "chore: align dormant background task poller with async status strategy"
```

### Task 6: 补完整回归验证，覆盖 R1-R4 主场景

**Files:**

- Modify: `src/modules/workspace/hooks/content-sections/generation-actions.test.ts`
- Modify: `src/hooks/notification-task-sync.test.ts`
- Create: `src/modules/workspace/hooks/content-sections/async-terminal-decision.test.ts`
- Create: `src/components/workspace/navigation/AsyncTaskMenu.status.test.tsx`

**Step 1: 跑定向单测**

Run: `npm test -- --runInBand src/modules/workspace/hooks/content-sections/generation-actions.test.ts src/modules/workspace/hooks/content-sections/async-terminal-decision.test.ts src/components/workspace/navigation/AsyncTaskMenu.status.test.tsx src/hooks/notification-task-sync.test.ts`

Expected: PASS

**Step 2: 跑类型检查**

Run: `npm run type-check`

Expected: PASS

**Step 3: 跑 lint**

Run: `npm run lint`

Expected: PASS

**Step 4: 做一次人工回归**

检查清单：

- 同工具下先制造一次失败，再点左侧已有结果会话，右侧不再显示红色“失败”
- 异步轮询返回 `answer_text + error_message` 时，主输出区和任务中心都优先展示结果
- 通知文案包含“完成”与“异常描述”时，不应把任务中心打成失败
- 真正失败的任务仍能看到明确失败提示

---

## Phase Order

1. 先做 Task 1，直接止住截图里的主症状
2. 再做 Task 2，统一终态判定，避免 R2 继续反复出现
3. 然后做 Task 3 和 Task 4，把任务中心和通知链路与页面判定对齐
4. 最后做 Task 5，只做对齐或降噪，不让遗留链路继续制造误报

## Acceptance Criteria

- 用户点击已有结果会话时，主输出区状态不会保留上一次失败标签
- 任何“已完成且已有结果”的异步响应，都不会再被前端优先判成失败
- 异步任务中心只在“无结果且明确失败”时显示失败
- 通知文本中出现“完成”和“异常描述”并存时，不会再误刷失败
- `npm run type-check`、`npm run lint`、R1-R4 相关单测全部通过
