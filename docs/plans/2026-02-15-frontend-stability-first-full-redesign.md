# Frontend Stability-First Full Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在不推翻现有 React + TypeScript 架构的前提下，先完成全站稳定性底座，再完成关键业务效率改造，达成“稳定性优先”的全量前端升级。

**Architecture:** 采用“可靠性底座 -> 主链路状态机 -> 高效交互 -> 主题统一 -> 发布门禁”五层渐进式改造。所有高风险改动先以可测试纯函数落地，再接入 UI，避免一次性大改导致回归。每个任务都按 TDD 执行并独立提交，便于灰度与回滚。

**Tech Stack:** React 19, TypeScript, Zustand, Jest, React Testing Library, Tailwind CSS, `rg`, `git`

---

**Sub-skill discipline:** `@superpowers/test-driven-development`, `@superpowers/systematic-debugging`, `@superpowers/verification-before-completion`

### Task 1: 请求策略基元（超时/重试画像）落地

**Files:**

- Create: `src/api/core/request-policy.ts`
- Test: `src/api/core/request-policy.test.ts`
- Modify: `src/api/core/types.ts`
- Modify: `src/api/client.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, test } from '@jest/globals'
import { resolveRequestPolicy } from './request-policy'

describe('resolveRequestPolicy', () => {
  test('returns strict timeout policy for interactive profile', () => {
    const policy = resolveRequestPolicy({ profile: 'interactive' })
    expect(policy.timeoutMs).toBe(12000)
    expect(policy.retry?.retries).toBe(1)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx jest src/api/core/request-policy.test.ts --runInBand -v`  
Expected: FAIL with `Cannot find module './request-policy'`.

**Step 3: Write minimal implementation**

```ts
import type { RetryOptions } from './types'

export type RequestProfile = 'interactive' | 'background' | 'stream'
export interface RequestPolicy {
  timeoutMs: number
  retry?: RetryOptions
}

export function resolveRequestPolicy(params: { profile: RequestProfile }): RequestPolicy {
  if (params.profile === 'background') {
    return { timeoutMs: 30000, retry: { retries: 2, backoffMs: 600 } }
  }
  if (params.profile === 'stream') {
    return { timeoutMs: 45000, retry: { retries: 2, backoffMs: 300 } }
  }
  return { timeoutMs: 12000, retry: { retries: 1, backoffMs: 250 } }
}
```

**Step 4: Run test to verify it passes**

Run: `npx jest src/api/core/request-policy.test.ts --runInBand -v`  
Expected: PASS.

**Step 5: Commit**

```bash
git add src/api/core/request-policy.ts src/api/core/request-policy.test.ts src/api/core/types.ts src/api/client.ts
git commit -m "feat: add request policy profiles for stability baseline"
```

---

### Task 2: HTTP 请求可靠性接线（超时、中止、重试一致化）

**Files:**

- Test: `src/api/core/client-helpers.request.test.ts`
- Modify: `src/api/core/client-helpers.ts`
- Modify: `src/api/core/retry-policy.ts`
- Modify: `src/api/core/types.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, jest, test } from '@jest/globals'
import { performRequest } from './client-helpers'

describe('performRequest timeout behavior', () => {
  test('aborts request when timeout reached', async () => {
    const fetchMock = jest.fn(() => new Promise(() => {}))
    global.fetch = fetchMock as unknown as typeof fetch
    await expect(
      performRequest({
        baseURL: '/api',
        endpoint: '/slow',
        options: { method: 'GET', timeoutMs: 10 },
        clearToken: () => undefined,
        onUnauthorized: async () => undefined,
      }),
    ).rejects.toThrow(/timeout/i)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx jest src/api/core/client-helpers.request.test.ts --runInBand -v`  
Expected: FAIL with `timeoutMs does not exist in type ApiRequestOptions`.

**Step 3: Write minimal implementation**

```ts
const controller = new AbortController()
const timeout = setTimeout(() => controller.abort('REQUEST_TIMEOUT'), timeoutMs)
const response = await fetch(url, { ...fetchOptions, signal: controller.signal, headers })
clearTimeout(timeout)
```

并在 `ApiRequestOptions` 中新增：

```ts
timeoutMs?: number
requestProfile?: 'interactive' | 'background' | 'stream'
```

**Step 4: Run test to verify it passes**

Run: `npx jest src/api/core/client-helpers.request.test.ts --runInBand -v`  
Expected: PASS.

**Step 5: Commit**

```bash
git add src/api/core/client-helpers.request.test.ts src/api/core/client-helpers.ts src/api/core/retry-policy.ts src/api/core/types.ts
git commit -m "feat: unify request timeout abort and retry behavior"
```

---

### Task 3: 流式恢复能力（SSE 断连重试 + 最近有效状态保留）

**Files:**

- Create: `src/api/core/stream-recovery.ts`
- Test: `src/api/core/stream-recovery.test.ts`
- Modify: `src/api/core/client-helpers.ts`
- Modify: `src/modules/workspace/hooks/content-sections/generation-actions.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, test } from '@jest/globals'
import { createStreamRecoveryState } from './stream-recovery'

describe('stream recovery', () => {
  test('keeps last valid payload when malformed chunk appears', () => {
    const state = createStreamRecoveryState()
    state.onMessage({ step: 1, text: 'ok' })
    state.onMalformedChunk('bad-json')
    expect(state.getLastValid()).toEqual({ step: 1, text: 'ok' })
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx jest src/api/core/stream-recovery.test.ts --runInBand -v`  
Expected: FAIL with `Cannot find module './stream-recovery'`.

**Step 3: Write minimal implementation**

```ts
export function createStreamRecoveryState<T = unknown>() {
  let lastValid: T | null = null
  return {
    onMessage(payload: T) {
      lastValid = payload
    },
    onMalformedChunk(_raw: string) {},
    getLastValid(): T | null {
      return lastValid
    },
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npx jest src/api/core/stream-recovery.test.ts --runInBand -v`  
Expected: PASS.

**Step 5: Commit**

```bash
git add src/api/core/stream-recovery.ts src/api/core/stream-recovery.test.ts src/api/core/client-helpers.ts src/modules/workspace/hooks/content-sections/generation-actions.ts
git commit -m "feat: add stream reconnection and last-valid-state recovery"
```

---

### Task 4: 错误恢复模型统一（可重试/可回退/需重登）

**Files:**

- Create: `src/modules/workspace/errors/recovery-model.ts`
- Test: `src/modules/workspace/errors/recovery-model.test.ts`
- Modify: `src/components/error-boundaries/AsyncBoundary.tsx`
- Modify: `src/components/error-boundaries/PageErrorBoundary.tsx`
- Modify: `src/utils/errorHandler.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, test } from '@jest/globals'
import { resolveRecoveryAction } from './recovery-model'

describe('resolveRecoveryAction', () => {
  test('maps 401 to relogin', () => {
    expect(resolveRecoveryAction({ statusCode: 401 })).toBe('relogin')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx jest src/modules/workspace/errors/recovery-model.test.ts --runInBand -v`  
Expected: FAIL with `Cannot find module './recovery-model'`.

**Step 3: Write minimal implementation**

```ts
export type RecoveryAction = 'retry' | 'rollback' | 'relogin' | 'contact_support'

export function resolveRecoveryAction(params: { statusCode?: number }): RecoveryAction {
  if (params.statusCode === 401 || params.statusCode === 403) return 'relogin'
  if (params.statusCode === 408 || params.statusCode === 429) return 'retry'
  if (params.statusCode && params.statusCode >= 500) return 'retry'
  return 'rollback'
}
```

**Step 4: Run test to verify it passes**

Run: `npx jest src/modules/workspace/errors/recovery-model.test.ts --runInBand -v`  
Expected: PASS.

**Step 5: Commit**

```bash
git add src/modules/workspace/errors/recovery-model.ts src/modules/workspace/errors/recovery-model.test.ts src/components/error-boundaries/AsyncBoundary.tsx src/components/error-boundaries/PageErrorBoundary.tsx src/utils/errorHandler.ts
git commit -m "feat: unify UI recovery actions for API and runtime errors"
```

---

### Task 5: 生成主链路状态机化（稳定态可视化）

**Files:**

- Create: `src/modules/workspace/hooks/content-sections/generation-state.ts`
- Test: `src/modules/workspace/hooks/content-sections/generation-state.test.ts`
- Modify: `src/modules/workspace/hooks/content-sections/generation-actions.ts`
- Modify: `src/modules/workspace/hooks/content-sections/workflow-steps.ts`
- Modify: `src/components/workspace/OutputSection.tsx`

**Step 1: Write the failing test**

```ts
import { describe, expect, test } from '@jest/globals'
import { reduceGenerationState } from './generation-state'

describe('generation state machine', () => {
  test('moves running -> failed on ERROR event', () => {
    const next = reduceGenerationState({ status: 'running' }, { type: 'ERROR' })
    expect(next.status).toBe('failed')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx jest src/modules/workspace/hooks/content-sections/generation-state.test.ts --runInBand -v`  
Expected: FAIL with `Cannot find module './generation-state'`.

**Step 3: Write minimal implementation**

```ts
export type GenerationStatus =
  | 'idle'
  | 'queued'
  | 'running'
  | 'partial_success'
  | 'failed'
  | 'success'

export function reduceGenerationState(
  state: { status: GenerationStatus },
  event: { type: 'START' | 'PARTIAL' | 'SUCCESS' | 'ERROR' | 'RESET' },
) {
  if (event.type === 'START') return { status: 'running' as const }
  if (event.type === 'PARTIAL') return { status: 'partial_success' as const }
  if (event.type === 'SUCCESS') return { status: 'success' as const }
  if (event.type === 'ERROR') return { status: 'failed' as const }
  return { status: 'idle' as const }
}
```

**Step 4: Run test to verify it passes**

Run: `npx jest src/modules/workspace/hooks/content-sections/generation-state.test.ts --runInBand -v`  
Expected: PASS.

**Step 5: Commit**

```bash
git add src/modules/workspace/hooks/content-sections/generation-state.ts src/modules/workspace/hooks/content-sections/generation-state.test.ts src/modules/workspace/hooks/content-sections/generation-actions.ts src/modules/workspace/hooks/content-sections/workflow-steps.ts src/components/workspace/OutputSection.tsx
git commit -m "feat: add generation state machine and stable output states"
```

---

### Task 6: 输入区效率改造（必填优先 + 高级项折叠）

**Files:**

- Create: `src/components/workspace/input-section/priority.ts`
- Test: `src/components/workspace/input-section/priority.test.ts`
- Modify: `src/components/workspace/InputSection.tsx`
- Modify: `src/components/workspace/input-section/types.ts`
- Modify: `src/components/workspace/input-section/InputSectionHeader.tsx`

**Step 1: Write the failing test**

```ts
import { describe, expect, test } from '@jest/globals'
import { rankSections } from './priority'

describe('rankSections', () => {
  test('puts required fields before optional fields', () => {
    const fields = [
      { key: 'b', required: false },
      { key: 'a', required: true },
    ]
    expect(rankSections(fields).map((f) => f.key)).toEqual(['a', 'b'])
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx jest src/components/workspace/input-section/priority.test.ts --runInBand -v`  
Expected: FAIL with `Cannot find module './priority'`.

**Step 3: Write minimal implementation**

```ts
export interface RankedField {
  key: string
  required: boolean
}

export function rankSections(fields: RankedField[]): RankedField[] {
  return [...fields].sort((a, b) => Number(b.required) - Number(a.required))
}
```

**Step 4: Run test to verify it passes**

Run: `npx jest src/components/workspace/input-section/priority.test.ts --runInBand -v`  
Expected: PASS.

**Step 5: Commit**

```bash
git add src/components/workspace/input-section/priority.ts src/components/workspace/input-section/priority.test.ts src/components/workspace/InputSection.tsx src/components/workspace/input-section/types.ts src/components/workspace/input-section/InputSectionHeader.tsx
git commit -m "feat: improve input efficiency with required-first ordering"
```

---

### Task 7: 项目/会话批量操作恢复队列

**Files:**

- Create: `src/modules/workspace/hooks/sidebar/recovery-queue.ts`
- Test: `src/modules/workspace/hooks/sidebar/recovery-queue.test.ts`
- Modify: `src/components/workspace/left-sidebar/management/useProjectManagementState.ts`
- Modify: `src/components/workspace/left-sidebar/ManagementSection.tsx`
- Modify: `src/components/workspace/left-sidebar/LeftSidebar.tsx`

**Step 1: Write the failing test**

```ts
import { describe, expect, test } from '@jest/globals'
import { createRecoveryQueue } from './recovery-queue'

describe('recovery queue', () => {
  test('retries failed operation in FIFO order', async () => {
    const queue = createRecoveryQueue()
    queue.enqueue({ id: 'op-1', run: async () => true })
    const result = await queue.retryNext()
    expect(result?.id).toBe('op-1')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx jest src/modules/workspace/hooks/sidebar/recovery-queue.test.ts --runInBand -v`  
Expected: FAIL with `Cannot find module './recovery-queue'`.

**Step 3: Write minimal implementation**

```ts
export interface RecoveryOp {
  id: string
  run: () => Promise<boolean>
}

export function createRecoveryQueue() {
  const items: RecoveryOp[] = []
  return {
    enqueue(op: RecoveryOp) {
      items.push(op)
    },
    async retryNext() {
      const next = items.shift()
      if (!next) return null
      await next.run()
      return next
    },
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npx jest src/modules/workspace/hooks/sidebar/recovery-queue.test.ts --runInBand -v`  
Expected: PASS.

**Step 5: Commit**

```bash
git add src/modules/workspace/hooks/sidebar/recovery-queue.ts src/modules/workspace/hooks/sidebar/recovery-queue.test.ts src/components/workspace/left-sidebar/management/useProjectManagementState.ts src/components/workspace/left-sidebar/ManagementSection.tsx src/components/workspace/left-sidebar/LeftSidebar.tsx
git commit -m "feat: add recoverable queue for batch sidebar operations"
```

---

### Task 8: 主题 Token 统一与硬编码颜色防回退

**Files:**

- Create: `scripts/validate-theme-tokens.ts`
- Modify: `src/index.css`
- Modify: `src/components/workspace/InputSection.tsx`
- Modify: `src/components/workspace/OutputSection.tsx`
- Modify: `src/components/workspace/left-sidebar/LeftSidebar.tsx`
- Modify: `src/components/error-boundaries/AsyncBoundary.tsx`
- Modify: `docs/technical/THEME-SYSTEM.md`

**Step 1: Write the failing check**

Run: `rg -n "emerald-|#059669|#10b981" src/components/workspace src/components/error-boundaries src/index.css`  
Expected: 命中硬编码颜色（FAIL 基线）。

**Step 2: Add validation test script**

```ts
import { readFileSync } from 'node:fs'

const content = readFileSync('src/components/workspace/OutputSection.tsx', 'utf8')
if (/emerald-|#059669|#10b981/.test(content)) {
  throw new Error('hard-coded theme color found')
}
```

**Step 3: Replace with token-based styles**

```tsx
className = 'focus:ring-2 focus:ring-[var(--theme-primary)]'
```

并在 `src/index.css` 统一 `--theme-*` 使用来源与默认值。

**Step 4: Run check to verify it passes**

Run: `node scripts/validate-theme-tokens.ts`  
Expected: PASS (no thrown error).

**Step 5: Commit**

```bash
git add scripts/validate-theme-tokens.ts src/index.css src/components/workspace/InputSection.tsx src/components/workspace/OutputSection.tsx src/components/workspace/left-sidebar/LeftSidebar.tsx src/components/error-boundaries/AsyncBoundary.tsx docs/technical/THEME-SYSTEM.md
git commit -m "refactor: enforce theme tokens and remove hard-coded core colors"
```

---

### Task 9: 观测与发布门禁（上线前稳定性证明）

**Files:**

- Create: `src/monitoring/business-metrics.ts`
- Test: `src/monitoring/business-metrics.test.ts`
- Modify: `src/monitoring/index.ts`
- Modify: `src/main.tsx`
- Create: `docs/technical/FRONTEND-STABILITY-RUNBOOK.md`
- Create: `docs/reports/FRONTEND-STABILITY-GATES-2026-02.md`

**Step 1: Write the failing test**

```ts
import { describe, expect, test } from '@jest/globals'
import { createBusinessMetricCollector } from './business-metrics'

describe('business metrics collector', () => {
  test('records workflow completion latency', () => {
    const collector = createBusinessMetricCollector()
    collector.track('workflow_complete', { latencyMs: 1800 })
    expect(collector.snapshot().workflow_complete.count).toBe(1)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx jest src/monitoring/business-metrics.test.ts --runInBand -v`  
Expected: FAIL with `Cannot find module './business-metrics'`.

**Step 3: Write minimal implementation**

```ts
type MetricBucket = { count: number }
type MetricName = 'workflow_complete' | 'api_retry_success' | 'ui_recovery_success'

export function createBusinessMetricCollector() {
  const data: Record<MetricName, MetricBucket> = {
    workflow_complete: { count: 0 },
    api_retry_success: { count: 0 },
    ui_recovery_success: { count: 0 },
  }
  return {
    track(name: MetricName, _payload: Record<string, unknown>) {
      data[name].count += 1
    },
    snapshot() {
      return data
    },
  }
}
```

**Step 4: Run full verification gate**

Run: `npx jest src/monitoring/business-metrics.test.ts --runInBand -v && npm run test -- --runInBand && npm run type-check && npm run lint && npm run build`  
Expected: PASS with zero test failures, zero TS errors, successful build.

**Step 5: Commit**

```bash
git add src/monitoring/business-metrics.ts src/monitoring/business-metrics.test.ts src/monitoring/index.ts src/main.tsx docs/technical/FRONTEND-STABILITY-RUNBOOK.md docs/reports/FRONTEND-STABILITY-GATES-2026-02.md
git commit -m "docs: add stability runbook and release gates with business metrics"
```

---

## Final Acceptance Checklist

1. `crash-free session` 指标接入并可查询。
2. 请求超时/重试/中止行为在单测可证明。
3. SSE 断连后 UI 保持“最近有效状态”。
4. 生成链路支持 `running/partial_success/failed/success` 稳定态显示。
5. 输入区“必填优先”与高级项折叠可用。
6. 批量操作失败可进入恢复队列并手动重试。
7. 核心页面无硬编码主题主色。
8. 发布门禁文档和回滚手册已更新。

## Out of Scope

1. 后端接口协议新增字段定义（仅按现有接口进行前端稳定化）。
2. 全量视觉品牌重塑（本计划聚焦稳定性与效率）。
