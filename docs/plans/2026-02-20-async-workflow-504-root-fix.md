# Async Workflow 504 Root Fix Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 彻底消除“前端超时失败但后台已完成”问题，避免重复提交，并在任务完成后自动回填结果到当前工作区。

**Architecture:** 将 `create` 视为“提交任务”而不是“等待完整结果”，前端只提交一次并以 `taskKey` 驱动轮询；轮询完成后通过确定性映射拿到会话结果并回填。同步补齐接口契约（`taskKey -> sessionId`）与幂等规则，保证 504 场景不会重复执行。

**Tech Stack:** React + TypeScript + Zustand + Jest + Playwright + API gateway(Nginx) + Dify workflow backend

---

### Task 1: 锁定 504 重试回归测试（先让测试失败）

**Files:**

- Create: `src/api/services/ai.service.createWithApi.test.ts`
- Modify: `src/api/services/ai.service.ts`
- Test: `src/api/services/ai.service.createWithApi.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, test, jest } from '@jest/globals'
import { aiService } from './ai.service'
import { apiClient } from '../client'

describe('createWithApi retry policy', () => {
  test('must NOT retry 504 for async workflow submit', async () => {
    const spy = jest.spyOn(apiClient, 'post').mockResolvedValue('ok' as never)
    await aiService.createWithApi(1, { a: 'b' }, 0, [], 's1,s2', 'task_x')
    const options = spy.mock.calls[0]?.[3]
    expect(options?.retry?.retries ?? 0).toBe(0)
    expect(options?.retry?.retryOn ?? []).not.toContain(504)
    spy.mockRestore()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx jest src/api/services/ai.service.createWithApi.test.ts -i`
Expected: FAIL，当前实现包含 `retries: 2` 且 `retryOn` 含 `504`。

**Step 3: Write minimal implementation**

```ts
// ai.service.ts (createWithApi)
const response = await apiClient.post('/apicategories/create', payload, undefined, {
  retry: { retries: 0, retryOn: ['network'] },
})
```

**Step 4: Run test to verify it passes**

Run: `npx jest src/api/services/ai.service.createWithApi.test.ts -i`
Expected: PASS

**Step 5: Commit**

```bash
git add src/api/services/ai.service.ts src/api/services/ai.service.createWithApi.test.ts
git commit -m "fix: remove 504 retry for async workflow submission"
```

### Task 2: 定义异步 504 前端状态机（不再标记失败）

**Files:**

- Create: `src/modules/workspace/hooks/content-sections/async-submit-policy.ts`
- Create: `src/modules/workspace/hooks/content-sections/async-submit-policy.test.ts`
- Modify: `src/modules/workspace/hooks/content-sections/generation-actions.ts`
- Test: `src/modules/workspace/hooks/content-sections/async-submit-policy.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, test } from '@jest/globals'
import { resolveSubmitErrorPolicy } from './async-submit-policy'

describe('resolveSubmitErrorPolicy', () => {
  test('async + 504 should continue polling instead of failed state', () => {
    const p = resolveSubmitErrorPolicy({ isAsync: true, statusCode: 504 })
    expect(p.keepPolling).toBe(true)
    expect(p.markFailed).toBe(false)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx jest src/modules/workspace/hooks/content-sections/async-submit-policy.test.ts -i`
Expected: FAIL（文件/实现尚不存在）。

**Step 3: Write minimal implementation**

```ts
export function resolveSubmitErrorPolicy(params: { isAsync: boolean; statusCode?: number }) {
  if (params.isAsync && params.statusCode === 504) {
    return { keepPolling: true, markFailed: false, userMessage: '任务已提交，继续查询进度。' }
  }
  return { keepPolling: false, markFailed: true, userMessage: '生成失败，请重试。' }
}
```

同时在 `generation-actions.ts` 使用该策略：异步 504 不触发 `ERROR` 状态，不覆盖为失败文案，只展示“继续查询中”引导。

**Step 4: Run test to verify it passes**

Run: `npx jest src/modules/workspace/hooks/content-sections/async-submit-policy.test.ts -i`
Expected: PASS

**Step 5: Commit**

```bash
git add src/modules/workspace/hooks/content-sections/async-submit-policy.ts src/modules/workspace/hooks/content-sections/async-submit-policy.test.ts src/modules/workspace/hooks/content-sections/generation-actions.ts
git commit -m "fix: treat async 504 as pending submission and keep polling"
```

### Task 3: 扩展进度响应模型，支持结果回填元数据

**Files:**

- Modify: `src/types/api/ai-execution.ts`
- Modify: `src/api/services/ai.service.ts`
- Create: `src/api/services/ai.service.process-status.test.ts`
- Test: `src/api/services/ai.service.process-status.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, test } from '@jest/globals'
import { __test__coerceProcessStatusResponse } from './ai.service'

describe('coerceProcessStatusResponse', () => {
  test('preserves session_id + answer_text + file_url when provided', () => {
    const x = __test__coerceProcessStatusResponse(
      { key: 'k1', is_completed: true, session_id: 123, answer_text: 'done', file_url: 'u' },
      'k1',
    )
    expect(x.session_id).toBe(123)
    expect(x.answer_text).toBe('done')
    expect(x.file_url).toBe('u')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx jest src/api/services/ai.service.process-status.test.ts -i`
Expected: FAIL（当前类型/解析不保留这些字段）。

**Step 3: Write minimal implementation**

```ts
export interface ProcessStatusResponse {
  // existing...
  session_id?: number
  answer_text?: string
  file_url?: string
  error_message?: string
}
```

在 `coerceProcessStatusResponse` 中解析并保留这些可选字段。

**Step 4: Run test to verify it passes**

Run: `npx jest src/api/services/ai.service.process-status.test.ts -i`
Expected: PASS

**Step 5: Commit**

```bash
git add src/types/api/ai-execution.ts src/api/services/ai.service.ts src/api/services/ai.service.process-status.test.ts
git commit -m "feat: parse optional session metadata from async process status"
```

### Task 4: 完成态自动回填结果到当前输出区

**Files:**

- Create: `src/modules/workspace/hooks/content-sections/async-result-hydrator.ts`
- Create: `src/modules/workspace/hooks/content-sections/async-result-hydrator.test.ts`
- Modify: `src/hooks/useAsyncTaskPolling.ts`
- Modify: `src/modules/workspace/hooks/useWorkspaceContentSections.ts`
- Modify: `src/modules/workspace/hooks/content-sections/generation-actions.ts`
- Test: `src/modules/workspace/hooks/content-sections/async-result-hydrator.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, test } from '@jest/globals'
import { resolveFinalResult } from './async-result-hydrator'

describe('resolveFinalResult', () => {
  test('returns final content when process completed with session_id', async () => {
    const out = await resolveFinalResult({
      process: { key: 'k1', is_completed: true, session_id: 123 } as any,
      getSessionById: async () => ({ answer_text: 'final', file_url: 'f' }) as any,
    })
    expect(out.text).toContain('final')
    expect(out.files.length).toBe(1)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx jest src/modules/workspace/hooks/content-sections/async-result-hydrator.test.ts -i`
Expected: FAIL

**Step 3: Write minimal implementation**

```ts
export async function resolveFinalResult(params: {
  process: ProcessStatusResponse
  getSessionById: (id: number) => Promise<{ answer_text?: string; file_url?: string }>
}) {
  if (!params.process.is_completed || !params.process.session_id) return null
  const detail = await params.getSessionById(params.process.session_id)
  return {
    text: detail.answer_text ?? '',
    files: detail.file_url
      ? [{ url: detail.file_url, fileName: '生成文件.docx', fileId: 'x' }]
      : [],
  }
}
```

并将 `useAsyncTaskPolling.onComplete` 签名扩展为 `onComplete?: (status: ProcessStatusResponse) => void`，在 `useWorkspaceContentSections` 完成回调中执行结果回填，替换中栏“超时提示”文本。

**Step 4: Run test to verify it passes**

Run: `npx jest src/modules/workspace/hooks/content-sections/async-result-hydrator.test.ts -i`
Expected: PASS

**Step 5: Commit**

```bash
git add src/hooks/useAsyncTaskPolling.ts src/modules/workspace/hooks/useWorkspaceContentSections.ts src/modules/workspace/hooks/content-sections/generation-actions.ts src/modules/workspace/hooks/content-sections/async-result-hydrator.ts src/modules/workspace/hooks/content-sections/async-result-hydrator.test.ts
git commit -m "feat: hydrate async final result into output section on poll completion"
```

### Task 5: 后端契约与幂等要求落地（彻底修复的关键）

**Files:**

- Modify: `API接口文档-用户端.md`
- Create: `docs/plans/appendix-async-contract-checklist.md`
- Test: `run/repro_tech_disclosure_timeout.mjs`

**Step 1: Write the failing contract checklist**

```md
- POST /apicategories/create 必须在 3s 内返回 202/200 接受态（不阻塞到工作流完成）
- 相同 user + key 重复提交必须幂等（返回同一个 session_id，不重复执行）
- GET /apicategories/queryprocess/{key} 完成态必须返回 session_id
```

**Step 2: Run contract validation simulation**

Run: `node run/repro_tech_disclosure_timeout.mjs`
Expected: 当前 FAIL（仍出现 3 次 504 + 重复提交）。

**Step 3: Write minimal documentation implementation**

在 `API接口文档-用户端.md` 的 8.5 / 8.7 增加明确字段与幂等语义：

```json
// create accepted response
{ "code": 202, "data": { "key": "task_key", "session_id": 123, "accepted": true } }
```

```json
// queryprocess completed response
{ "key": "task_key", "is_completed": true, "session_id": 123 }
```

**Step 4: Re-run validation after backend deploy**

Run: `node run/repro_tech_disclosure_timeout.mjs`
Expected: 仅 1 次 `create` 请求；无 504 失败文案；完成后中栏自动回填结果。

**Step 5: Commit**

```bash
git add API接口文档-用户端.md docs/plans/appendix-async-contract-checklist.md
git commit -m "docs: define async create idempotency and completion contract"
```

### Task 6: 端到端回归防线（防止问题回归）

**Files:**

- Modify: `run/repro_tech_disclosure_timeout.mjs`
- Create: `src/modules/workspace/hooks/content-sections/async-504-regression.test.ts`
- Test: `run/repro_tech_disclosure_timeout.mjs`

**Step 1: Write the failing regression assertions**

```ts
expect(summary.createStatusCodes.filter((x) => x === 504).length).toBe(0)
expect(summary.createRequestCount).toBe(1)
expect(markers.outcome).toBe('completed_notice')
```

**Step 2: Run regression to verify current failure**

Run: `node run/repro_tech_disclosure_timeout.mjs`
Expected: FAIL（当前是 `timeout_notice`）。

**Step 3: Write minimal implementation**

在脚本里输出并断言：

- `createRequestCount`
- `queryCompletedSeen`
- `finalOutputContainsTimeoutNotice`

并在 CI 增加夜间回归入口。

**Step 4: Run regression to verify pass**

Run: `node run/repro_tech_disclosure_timeout.mjs`
Expected: PASS

**Step 5: Commit**

```bash
git add run/repro_tech_disclosure_timeout.mjs src/modules/workspace/hooks/content-sections/async-504-regression.test.ts
git commit -m "test: add e2e regression guard for async 504 duplicate-submit issue"
```

---

## Risk Notes

- 仅前端改动（去重试 + 改文案）可立即止血，但不能保证“完成后自动回填结果”。
- 真正彻底修复依赖后端提供稳定的 `taskKey -> session_id` 映射与幂等处理。
- 在后端契约生效前，前端可保留兜底策略（按时间窗口 + folder_id 识别最新会话），但应标记为“best effort”。

## Acceptance Criteria

- 同一 `taskKey` 生命周期内，`/apicategories/create` 前端只发送 1 次。
- 即使出现网关超时，用户最终看到的是“处理中/已完成”，而不是永久失败。
- 轮询完成后，中栏自动展示最终文本与文件，不要求用户手动去历史记录读取。
- Playwright 回归脚本连续 5 次执行无“timeout_notice”误报。
