# Oasis Actions Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 Chatflow 能通过 `oasis-actions` 代码块动态输出动作按钮，前端安全解析并渲染为可点击按钮，点击后将标准指令填入聊天输入框。

**Architecture:** Chatflow 不直接输出可执行 HTML，而是输出 fenced code block（代码围栏）` ```oasis-actions ... ``` `，前端在 Markdown 渲染层识别该语言块并渲染为 React 按钮。第一版只支持 `fill` 和 `confirm_fill`，即填入输入框，不自动发送，降低误触发和永久记忆误写风险。

**Tech Stack:** React 19、TypeScript、Vite、react-markdown、Jest、Testing Library、Tailwind CSS。

---

## Scope

### In scope

- 在消息渲染中识别 `oasis-actions` 代码块。
- 安全解析 JSON，不执行 HTML、不执行 JavaScript。
- 渲染动作卡片标题、说明和按钮。
- 点击 `fill` 按钮后，把 `query` 填入聊天输入框。
- 点击 `confirm_fill` 按钮后，先 `window.confirm(confirmText)`，确认后再填入输入框。
- JSON 错误、字段不合法或 action 为空时，退回显示普通代码块，不让页面崩溃。
- 添加单元测试和组件测试。

### Out of scope

- 不改后端接口。
- 不新增 `intent_meta`。
- 不支持自动发送 `send` / `confirm_send`。
- 不允许模型输出真实 HTML 按钮。
- 不直接修改 `D:\OneDrive\4、董娣相关\绿洲慧写3.0\绿洲前端\dist`。
- 不修改 Chatflow YAML。本计划只覆盖前端，工作流输出格式由另一个计划处理。

---

## Files

### Create

- `D:\OneDrive\4、董娣相关\绿洲慧写3.0\绿洲前端\src\components\ContentRenderer\oasis-actions.ts`
  - 负责类型定义、JSON 解析、字段白名单校验、按钮数量限制、query 长度限制。
- `D:\OneDrive\4、董娣相关\绿洲慧写3.0\绿洲前端\src\components\ContentRenderer\OasisActionsBlock.tsx`
  - 负责把合法动作卡片渲染为 React UI。
- `D:\OneDrive\4、董娣相关\绿洲慧写3.0\绿洲前端\src\components\ContentRenderer\oasis-actions.test.ts`
  - 测试解析与校验。
- `D:\OneDrive\4、董娣相关\绿洲慧写3.0\绿洲前端\src\components\ContentRenderer\OasisActionsBlock.test.tsx`
  - 测试按钮渲染、填入、确认。

### Modify

- `D:\OneDrive\4、董娣相关\绿洲慧写3.0\绿洲前端\src\components\ContentRenderer\index.tsx`
  - 增加 `onOasisActionFill?: (query: string) => void` 属性。
  - 代码块语言为 `oasis-actions` 时渲染 `OasisActionsBlock`。
- `D:\OneDrive\4、董娣相关\绿洲慧写3.0\绿洲前端\src\components\ChatPanel.tsx`
  - 将 `onOasisActionFill` 从消息渲染传到 `ContentRenderer`。
  - 实现按钮填入输入框后的通知与滚动/聚焦。
- 视实际测试失败情况，可能需要小幅更新：
  - `D:\OneDrive\4、董娣相关\绿洲慧写3.0\绿洲前端\src\components\ChatPanel.test.tsx`

---

## Action Protocol v1

Chatflow 输出格式：

````markdown
```oasis-actions
{
  "version": "1.0",
  "title": "下一步可以选择：",
  "description": "点击后会先填入输入框，你可以检查后再发送。",
  "layout": "grid",
  "actions": [
    {
      "id": "generate_claims",
      "label": "生成权利要求书",
      "type": "fill",
      "query": "请根据技术交底书生成权利要求书。"
    },
    {
      "id": "save_attachment_as_disclosure",
      "label": "保存附件为技术交底书最终版",
      "type": "confirm_fill",
      "query": "请将本轮附件保存为技术交底书最终版。",
      "confirmText": "这会把附件保存为技术交底书最终版，是否继续？"
    }
  ]
}
```
````

Allowed fields:

```ts
export type OasisActionType = 'fill' | 'confirm_fill'

export interface OasisActionItem {
  id: string
  label: string
  type: OasisActionType
  query: string
  confirmText?: string
  description?: string
  disabledReason?: string
  requires?: Array<'attachment' | 'input' | 'final_disclosure' | 'final_claims' | 'final_embodiment' | 'final_figure_desc'>
}

export interface OasisActionsPayload {
  version?: '1.0'
  title?: string
  description?: string
  layout?: 'row' | 'grid'
  actions: OasisActionItem[]
}
```

Security limits:

- Max actions: 6.
- Max label length: 32.
- Max title length: 60.
- Max description length: 120.
- Max query length: 800.
- Max confirmText length: 120.
- Unknown fields ignored.
- Unknown action type rejected.
- Empty `query` rejected.
- Invalid JSON returns `null` and falls back to normal code rendering.

---

## Task 1: Add safe parser

**Files:**

- Create: `D:\OneDrive\4、董娣相关\绿洲慧写3.0\绿洲前端\src\components\ContentRenderer\oasis-actions.ts`
- Test: `D:\OneDrive\4、董娣相关\绿洲慧写3.0\绿洲前端\src\components\ContentRenderer\oasis-actions.test.ts`

- [ ] **Step 1: Write parser tests first**

Create `D:\OneDrive\4、董娣相关\绿洲慧写3.0\绿洲前端\src\components\ContentRenderer\oasis-actions.test.ts`:

```ts
import { parseOasisActionsPayload } from './oasis-actions'

describe('parseOasisActionsPayload', () => {
  test('parses valid fill and confirm_fill actions', () => {
    const payload = parseOasisActionsPayload(
      JSON.stringify({
        version: '1.0',
        title: '下一步可以选择：',
        description: '点击后会填入输入框。',
        layout: 'grid',
        actions: [
          {
            id: 'generate_claims',
            label: '生成权利要求书',
            type: 'fill',
            query: '请根据技术交底书生成权利要求书。',
          },
          {
            id: 'save_attachment',
            label: '保存附件',
            type: 'confirm_fill',
            query: '请将本轮附件保存为技术交底书最终版。',
            confirmText: '确认保存？',
          },
        ],
      }),
    )

    expect(payload).not.toBeNull()
    expect(payload?.title).toBe('下一步可以选择：')
    expect(payload?.layout).toBe('grid')
    expect(payload?.actions).toHaveLength(2)
    expect(payload?.actions[0]).toEqual({
      id: 'generate_claims',
      label: '生成权利要求书',
      type: 'fill',
      query: '请根据技术交底书生成权利要求书。',
    })
  })

  test('returns null for invalid JSON', () => {
    expect(parseOasisActionsPayload('{bad json')).toBeNull()
  })

  test('returns null when actions is missing', () => {
    expect(parseOasisActionsPayload(JSON.stringify({ title: '无按钮' }))).toBeNull()
  })

  test('drops invalid actions and keeps valid actions', () => {
    const payload = parseOasisActionsPayload(
      JSON.stringify({
        actions: [
          { id: 'ok', label: '可用', type: 'fill', query: '请生成权利要求书。' },
          { id: 'bad_type', label: '坏类型', type: 'send', query: '不支持自动发送。' },
          { id: 'bad_query', label: '空指令', type: 'fill', query: '' },
        ],
      }),
    )

    expect(payload).not.toBeNull()
    expect(payload?.actions).toHaveLength(1)
    expect(payload?.actions[0].id).toBe('ok')
  })

  test('limits actions to six', () => {
    const payload = parseOasisActionsPayload(
      JSON.stringify({
        actions: Array.from({ length: 8 }, (_, index) => ({
          id: `a${index}`,
          label: `按钮${index}`,
          type: 'fill',
          query: `指令${index}`,
        })),
      }),
    )

    expect(payload?.actions).toHaveLength(6)
  })

  test('trims long text fields', () => {
    const payload = parseOasisActionsPayload(
      JSON.stringify({
        title: '标'.repeat(80),
        description: '说'.repeat(160),
        actions: [
          {
            id: 'long',
            label: '按'.repeat(80),
            type: 'fill',
            query: '查'.repeat(1000),
            confirmText: '确'.repeat(200),
          },
        ],
      }),
    )

    expect(payload?.title.length).toBeLessThanOrEqual(60)
    expect(payload?.description?.length).toBeLessThanOrEqual(120)
    expect(payload?.actions[0].label.length).toBeLessThanOrEqual(32)
    expect(payload?.actions[0].query.length).toBeLessThanOrEqual(800)
    expect(payload?.actions[0].confirmText?.length).toBeLessThanOrEqual(120)
  })

  test('ignores unknown fields and dangerous-looking values are treated as plain text', () => {
    const payload = parseOasisActionsPayload(
      JSON.stringify({
        html: '<script>alert(1)</script>',
        actions: [
          {
            id: 'xss',
            label: '<img src=x onerror=alert(1)>',
            type: 'fill',
            query: '<script>alert(1)</script>',
            onclick: 'alert(1)',
          },
        ],
      }),
    )

    expect(payload).not.toBeNull()
    expect(payload?.actions[0]).toEqual({
      id: 'xss',
      label: '<img src=x onerror=alert(1)>',
      type: 'fill',
      query: '<script>alert(1)</script>',
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```cmd
npm test -- oasis-actions.test.ts
```

Expected:

```text
FAIL ... Cannot find module './oasis-actions'
```

- [ ] **Step 3: Implement parser**

Create `D:\OneDrive\4、董娣相关\绿洲慧写3.0\绿洲前端\src\components\ContentRenderer\oasis-actions.ts`:

```ts
export type OasisActionType = 'fill' | 'confirm_fill'

export type OasisActionRequirement =
  | 'attachment'
  | 'input'
  | 'final_disclosure'
  | 'final_claims'
  | 'final_embodiment'
  | 'final_figure_desc'

export interface OasisActionItem {
  id: string
  label: string
  type: OasisActionType
  query: string
  confirmText?: string
  description?: string
  disabledReason?: string
  requires?: OasisActionRequirement[]
}

export interface OasisActionsPayload {
  version?: '1.0'
  title?: string
  description?: string
  layout?: 'row' | 'grid'
  actions: OasisActionItem[]
}

const MAX_ACTIONS = 6
const MAX_TITLE_LENGTH = 60
const MAX_DESCRIPTION_LENGTH = 120
const MAX_LABEL_LENGTH = 32
const MAX_QUERY_LENGTH = 800
const MAX_CONFIRM_TEXT_LENGTH = 120
const ALLOWED_TYPES = new Set<OasisActionType>(['fill', 'confirm_fill'])
const ALLOWED_REQUIRES = new Set<OasisActionRequirement>([
  'attachment',
  'input',
  'final_disclosure',
  'final_claims',
  'final_embodiment',
  'final_figure_desc',
])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function pickText(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== 'string') return undefined
  const text = value.trim()
  if (!text) return undefined
  return text.slice(0, maxLength)
}

function pickRequires(value: unknown): OasisActionRequirement[] | undefined {
  if (!Array.isArray(value)) return undefined
  const requires = value.filter((item): item is OasisActionRequirement => {
    return typeof item === 'string' && ALLOWED_REQUIRES.has(item as OasisActionRequirement)
  })
  return requires.length > 0 ? Array.from(new Set(requires)) : undefined
}

function parseAction(value: unknown): OasisActionItem | null {
  if (!isRecord(value)) return null

  const id = pickText(value.id, 64)
  const label = pickText(value.label, MAX_LABEL_LENGTH)
  const query = pickText(value.query, MAX_QUERY_LENGTH)
  const type = typeof value.type === 'string' ? value.type : ''

  if (!id || !label || !query || !ALLOWED_TYPES.has(type as OasisActionType)) {
    return null
  }

  const action: OasisActionItem = {
    id,
    label,
    type: type as OasisActionType,
    query,
  }

  const confirmText = pickText(value.confirmText, MAX_CONFIRM_TEXT_LENGTH)
  if (confirmText) action.confirmText = confirmText

  const description = pickText(value.description, MAX_DESCRIPTION_LENGTH)
  if (description) action.description = description

  const disabledReason = pickText(value.disabledReason, MAX_DESCRIPTION_LENGTH)
  if (disabledReason) action.disabledReason = disabledReason

  const requires = pickRequires(value.requires)
  if (requires) action.requires = requires

  return action
}

export function parseOasisActionsPayload(raw: string): OasisActionsPayload | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }

  if (!isRecord(parsed) || !Array.isArray(parsed.actions)) {
    return null
  }

  const actions = parsed.actions
    .map(parseAction)
    .filter((item): item is OasisActionItem => item !== null)
    .slice(0, MAX_ACTIONS)

  if (actions.length === 0) {
    return null
  }

  const payload: OasisActionsPayload = { actions }

  if (parsed.version === '1.0') {
    payload.version = '1.0'
  }

  const title = pickText(parsed.title, MAX_TITLE_LENGTH)
  if (title) payload.title = title

  const description = pickText(parsed.description, MAX_DESCRIPTION_LENGTH)
  if (description) payload.description = description

  if (parsed.layout === 'row' || parsed.layout === 'grid') {
    payload.layout = parsed.layout
  }

  return payload
}
```

- [ ] **Step 4: Run parser test**

Run:

```cmd
npm test -- oasis-actions.test.ts
```

Expected:

```text
PASS src/components/ContentRenderer/oasis-actions.test.ts
```

---

## Task 2: Add OasisActionsBlock UI

**Files:**

- Create: `D:\OneDrive\4、董娣相关\绿洲慧写3.0\绿洲前端\src\components\ContentRenderer\OasisActionsBlock.tsx`
- Test: `D:\OneDrive\4、董娣相关\绿洲慧写3.0\绿洲前端\src\components\ContentRenderer\OasisActionsBlock.test.tsx`

- [ ] **Step 1: Write component tests first**

Create `D:\OneDrive\4、董娣相关\绿洲慧写3.0\绿洲前端\src\components\ContentRenderer\OasisActionsBlock.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { OasisActionsBlock } from './OasisActionsBlock'
import type { OasisActionsPayload } from './oasis-actions'

const payload: OasisActionsPayload = {
  title: '下一步可以选择：',
  description: '点击后会填入输入框。',
  layout: 'grid',
  actions: [
    {
      id: 'generate_claims',
      label: '生成权利要求书',
      type: 'fill',
      query: '请根据技术交底书生成权利要求书。',
    },
    {
      id: 'save_attachment',
      label: '保存附件',
      type: 'confirm_fill',
      query: '请将本轮附件保存为技术交底书最终版。',
      confirmText: '确认保存？',
    },
  ],
}

describe('OasisActionsBlock', () => {
  test('renders title, description and action buttons', () => {
    render(<OasisActionsBlock payload={payload} onFill={jest.fn()} />)

    expect(screen.getByText('下一步可以选择：')).toBeInTheDocument()
    expect(screen.getByText('点击后会填入输入框。')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '生成权利要求书' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '保存附件' })).toBeInTheDocument()
  })

  test('fill action calls onFill with query', async () => {
    const user = userEvent.setup()
    const onFill = jest.fn()
    render(<OasisActionsBlock payload={payload} onFill={onFill} />)

    await user.click(screen.getByRole('button', { name: '生成权利要求书' }))

    expect(onFill).toHaveBeenCalledWith('请根据技术交底书生成权利要求书。')
  })

  test('confirm_fill asks for confirmation before filling', async () => {
    const user = userEvent.setup()
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true)
    const onFill = jest.fn()
    render(<OasisActionsBlock payload={payload} onFill={onFill} />)

    await user.click(screen.getByRole('button', { name: '保存附件' }))

    expect(confirmSpy).toHaveBeenCalledWith('确认保存？')
    expect(onFill).toHaveBeenCalledWith('请将本轮附件保存为技术交底书最终版。')

    confirmSpy.mockRestore()
  })

  test('confirm_fill does not fill when cancelled', async () => {
    const user = userEvent.setup()
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false)
    const onFill = jest.fn()
    render(<OasisActionsBlock payload={payload} onFill={onFill} />)

    await user.click(screen.getByRole('button', { name: '保存附件' }))

    expect(onFill).not.toHaveBeenCalled()
    confirmSpy.mockRestore()
  })

  test('disabled action shows disabledReason and cannot be clicked', async () => {
    const user = userEvent.setup()
    const onFill = jest.fn()
    render(
      <OasisActionsBlock
        payload={{
          actions: [
            {
              id: 'needs_attachment',
              label: '基于附件生成',
              type: 'fill',
              query: '请基于附件生成权利要求书。',
              disabledReason: '请先上传附件',
            },
          ],
        }}
        onFill={onFill}
      />,
    )

    const button = screen.getByRole('button', { name: '基于附件生成' })
    expect(button).toBeDisabled()
    expect(screen.getByText('请先上传附件')).toBeInTheDocument()

    await user.click(button)
    expect(onFill).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```cmd
npm test -- OasisActionsBlock.test.tsx
```

Expected:

```text
FAIL ... Cannot find module './OasisActionsBlock'
```

- [ ] **Step 3: Implement UI component**

Create `D:\OneDrive\4、董娣相关\绿洲慧写3.0\绿洲前端\src\components\ContentRenderer\OasisActionsBlock.tsx`:

```tsx
import type { FC } from 'react'

import type { OasisActionsPayload, OasisActionItem } from './oasis-actions'

interface OasisActionsBlockProps {
  payload: OasisActionsPayload
  onFill?: (query: string) => void
}

function handleActionClick(action: OasisActionItem, onFill?: (query: string) => void): void {
  if (!onFill || action.disabledReason) return

  if (action.type === 'confirm_fill') {
    const confirmed = window.confirm(action.confirmText || '确认执行该操作？')
    if (!confirmed) return
  }

  onFill(action.query)
}

export const OasisActionsBlock: FC<OasisActionsBlockProps> = ({ payload, onFill }) => {
  const isGrid = payload.layout !== 'row'

  return (
    <div className="my-3 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-3 text-sm shadow-sm">
      {payload.title ? (
        <div className="mb-1 font-semibold text-emerald-900">{payload.title}</div>
      ) : null}
      {payload.description ? (
        <div className="mb-3 text-xs leading-relaxed text-emerald-800/80">{payload.description}</div>
      ) : null}
      <div className={isGrid ? 'grid gap-2 sm:grid-cols-2' : 'flex flex-wrap gap-2'}>
        {payload.actions.map((action) => {
          const disabled = Boolean(action.disabledReason) || !onFill
          return (
            <div key={action.id} className="min-w-0">
              <button
                type="button"
                disabled={disabled}
                className="w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-left text-xs font-medium leading-relaxed text-emerald-950 transition hover:-translate-y-px hover:border-emerald-400 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:border-emerald-200 disabled:hover:shadow-none"
                onClick={() => handleActionClick(action, onFill)}
              >
                {action.label}
              </button>
              {action.description ? (
                <div className="mt-1 px-1 text-[11px] leading-relaxed text-emerald-800/70">
                  {action.description}
                </div>
              ) : null}
              {action.disabledReason ? (
                <div className="mt-1 px-1 text-[11px] leading-relaxed text-amber-700">
                  {action.disabledReason}
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}

OasisActionsBlock.displayName = 'OasisActionsBlock'
```

- [ ] **Step 4: Run component test**

Run:

```cmd
npm test -- OasisActionsBlock.test.tsx
```

Expected:

```text
PASS src/components/ContentRenderer/OasisActionsBlock.test.tsx
```

---

## Task 3: Integrate oasis-actions in ContentRenderer

**Files:**

- Modify: `D:\OneDrive\4、董娣相关\绿洲慧写3.0\绿洲前端\src\components\ContentRenderer\index.tsx`
- Test: create or update `D:\OneDrive\4、董娣相关\绿洲慧写3.0\绿洲前端\src\components\ContentRenderer\index.test.tsx`

- [ ] **Step 1: Write integration test**

If `index.test.tsx` does not exist, create it:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { ContentRenderer } from './index'

describe('ContentRenderer oasis-actions integration', () => {
  test('renders oasis-actions code block as action buttons', async () => {
    const user = userEvent.setup()
    const onFill = jest.fn()

    render(
      <ContentRenderer
        content={
          '请选择：\n\n```oasis-actions\n' +
          JSON.stringify({
            title: '下一步',
            actions: [
              {
                id: 'generate_claims',
                label: '生成权利要求书',
                type: 'fill',
                query: '请生成权利要求书。',
              },
            ],
          }) +
          '\n```'
        }
        onOasisActionFill={onFill}
      />,
    )

    await user.click(screen.getByRole('button', { name: '生成权利要求书' }))

    expect(onFill).toHaveBeenCalledWith('请生成权利要求书。')
  })

  test('falls back to code block for invalid oasis-actions JSON', () => {
    render(<ContentRenderer content={'```oasis-actions\n{bad json\n```'} />)

    expect(screen.getByText('{bad json')).toBeInTheDocument()
  })

  test('normal code blocks still render as code', () => {
    render(<ContentRenderer content={'```json\n{\"hello\":\"world\"}\n```'} />)

    expect(screen.getByText('{"hello":"world"}')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```cmd
npm test -- ContentRenderer
```

Expected:

```text
FAIL ... onOasisActionFill does not exist or button is not rendered
```

- [ ] **Step 3: Modify ContentRenderer props**

In `D:\OneDrive\4、董娣相关\绿洲慧写3.0\绿洲前端\src\components\ContentRenderer\index.tsx`, change:

```ts
interface ContentRendererProps {
  content: string
  className?: string
  renderMode?: 'rich' | 'source'
}
```

to:

```ts
interface ContentRendererProps {
  content: string
  className?: string
  renderMode?: 'rich' | 'source'
  onOasisActionFill?: (query: string) => void
}
```

And component signature:

```ts
export const ContentRenderer: FC<ContentRendererProps> = ({
  content,
  className = '',
  renderMode = 'rich',
  onOasisActionFill,
}) => {
```

- [ ] **Step 4: Import parser and block**

Add imports near existing local imports:

```ts
import { OasisActionsBlock } from './OasisActionsBlock'
import { parseOasisActionsPayload } from './oasis-actions'
```

- [ ] **Step 5: Render oasis-actions in code block handler**

Inside `renderCode`, before Mermaid handling:

```tsx
      if (!inline && language === 'oasis-actions') {
        const payload = parseOasisActionsPayload(codeContent)
        if (payload) {
          return <OasisActionsBlock payload={payload} onFill={onOasisActionFill} />
        }
      }
```

Make sure `components` memo dependency includes `onOasisActionFill`:

```ts
  }, [syntaxTheme, onOasisActionFill])
```

- [ ] **Step 6: Run ContentRenderer tests**

Run:

```cmd
npm test -- ContentRenderer
```

Expected:

```text
PASS
```

---

## Task 4: Wire action fill into ChatPanel

**Files:**

- Modify: `D:\OneDrive\4、董娣相关\绿洲慧写3.0\绿洲前端\src\components\ChatPanel.tsx`
- Test: update `D:\OneDrive\4、董娣相关\绿洲慧写3.0\绿洲前端\src\components\ChatPanel.test.tsx`

- [ ] **Step 1: Write ChatPanel behavior test**

Add a test to `ChatPanel.test.tsx`. Use the existing render helper in that file. The test should:

1. Render a focus-mode session with an assistant message containing an `oasis-actions` block.
2. Click the rendered action button.
3. Assert the textarea contains the action query.

Concrete test body to adapt to the existing helper:

```tsx
test('fills chat input when clicking oasis action button in assistant message', async () => {
  const user = userEvent.setup()
  const props = createDefaultChatPanelProps({
    chatTab: 'focus',
    session: {
      ...createDefaultChatSession('focus'),
      messages: [
        { id: 'welcome', role: 'assistant', content: '欢迎' },
        {
          id: 'assistant-actions',
          role: 'assistant',
          content:
            '下一步：\n\n```oasis-actions\n' +
            JSON.stringify({
              actions: [
                {
                  id: 'generate_claims',
                  label: '生成权利要求书',
                  type: 'fill',
                  query: '请根据技术交底书生成权利要求书。',
                },
              ],
            }) +
            '\n```',
        },
      ],
      input: '',
    },
  })

  render(<ChatPanel {...props} />)

  await user.click(screen.getByRole('button', { name: '生成权利要求书' }))

  const textarea = screen.getByLabelText('对话输入框') as HTMLTextAreaElement
  expect(textarea.value).toBe('请根据技术交底书生成权利要求书。')
  expect(props.onInputChange).toHaveBeenCalledWith('请根据技术交底书生成权利要求书。')
})
```

If helper names differ in the existing test file, keep the same assertions and adapt only the setup.

- [ ] **Step 2: Run ChatPanel test to verify it fails**

Run:

```cmd
npm test -- ChatPanel.test.tsx
```

Expected:

```text
FAIL ... button not found or textarea not updated
```

- [ ] **Step 3: Add handler in ChatPanel**

In `D:\OneDrive\4、董娣相关\绿洲慧写3.0\绿洲前端\src\components\ChatPanel.tsx`, inside `ChatPanelContent`, add:

```ts
    const handleOasisActionFill = useCallback(
      (query: string) => {
        handleInputChange(query)
        requestAnimationFrame(() => {
          textareaRef.current?.focus()
        })
        notifyRef.current('已填入快捷指令，请检查后发送')
      },
      [handleInputChange],
    )
```

Place it after `handleInputChange` is defined and before message rendering props are built.

- [ ] **Step 4: Pass handler to conversation pane**

Find `ChatConversationPane` props interface and component call chain in `ChatPanel.tsx`. Add prop:

```ts
  onOasisActionFill: (query: string) => void
```

Pass it from `ChatPanelContent` to `ChatConversationPane`:

```tsx
          onOasisActionFill={handleOasisActionFill}
```

Then pass it to message rendering where `LazyContentRenderer` is used:

```tsx
<LazyContentRenderer
  content={message.content}
  onOasisActionFill={onOasisActionFill}
/>
```

If `MessageItem` is an intermediate component, add the same prop to `MessageItemProps` and forward it.

- [ ] **Step 5: Run ChatPanel test**

Run:

```cmd
npm test -- ChatPanel.test.tsx
```

Expected:

```text
PASS
```

---

## Task 5: Styling and accessibility review

**Files:**

- Modify only if needed:
  - `D:\OneDrive\4、董娣相关\绿洲慧写3.0\绿洲前端\src\components\ContentRenderer\OasisActionsBlock.tsx`
  - `D:\OneDrive\4、董娣相关\绿洲慧写3.0\绿洲前端\src\components\ContentRenderer\styles.css`

- [ ] **Step 1: Check desktop visual behavior**

Run local app:

```cmd
npm run dev
```

Manual check:

- Open the workspace page.
- In an assistant message, use test content with `oasis-actions`.
- Confirm buttons appear as compact cards.
- Confirm long labels wrap instead of overflowing.
- Confirm disabled action has visible reason.

- [ ] **Step 2: Check keyboard behavior**

Manual check:

- Press Tab until the action button is focused.
- Press Enter.
- Expected: query fills input.
- For `confirm_fill`, expected: browser confirmation appears.

- [ ] **Step 3: Check mobile/narrow panel behavior**

Manual check:

- Resize panel to narrow width.
- Expected: buttons stack cleanly and do not cover message text.

- [ ] **Step 4: If CSS is needed, add minimal scoped styles**

Prefer Tailwind utility classes already in `OasisActionsBlock.tsx`. Only add CSS if layout breaks in Markdown body. If needed, add to:

`D:\OneDrive\4、董娣相关\绿洲慧写3.0\绿洲前端\src\components\ContentRenderer\styles.css`

```css
.markdown-body .oasis-actions-block button {
  font-family: inherit;
}
```

Do not add global button resets.

---

## Task 6: Full validation

**Files:**

- No source changes expected unless validation reveals failures.

- [ ] **Step 1: Run type check**

Run:

```cmd
npm run type-check
```

Expected:

```text
exit code 0
```

- [ ] **Step 2: Run lint**

Run:

```cmd
npm run lint
```

Expected:

```text
exit code 0
```

- [ ] **Step 3: Run targeted tests**

Run:

```cmd
npm test -- oasis-actions.test.ts OasisActionsBlock.test.tsx ContentRenderer ChatPanel.test.tsx
```

Expected:

```text
PASS
```

- [ ] **Step 4: Run build**

Run:

```cmd
npm run build
```

Expected:

```text
dist generated successfully
```

- [ ] **Step 5: Confirm `dist` changed only through build**

Run:

```cmd
git status --short
```

Expected:

```text
modified/new src files
modified dist files only if build artifacts are tracked in this repo
```

If `dist` is tracked and build modifies hashed assets, include those build output changes only if this project normally commits `dist`.

---

## Task 7: Chatflow handoff format

**Files:**

- Create optional documentation:
  - `D:\OneDrive\4、董娣相关\绿洲慧写3.0\绿洲前端\docs\features\oasis-actions.md`

- [ ] **Step 1: Document the protocol for workflow authors**

Create `D:\OneDrive\4、董娣相关\绿洲慧写3.0\绿洲前端\docs\features\oasis-actions.md`:

````markdown
# Oasis Actions 动作卡片协议

Chatflow 可以在回答中输出 `oasis-actions` 代码块，让前端显示为按钮。

## 示例

```oasis-actions
{
  "version": "1.0",
  "title": "下一步可以选择：",
  "description": "点击后会填入输入框，你可以检查后再发送。",
  "layout": "grid",
  "actions": [
    {
      "id": "generate_claims",
      "label": "生成权利要求书",
      "type": "fill",
      "query": "请根据技术交底书生成权利要求书。"
    },
    {
      "id": "save_attachment_as_disclosure",
      "label": "保存附件为技术交底书最终版",
      "type": "confirm_fill",
      "query": "请将本轮附件保存为技术交底书最终版。",
      "confirmText": "这会把附件保存为技术交底书最终版，是否继续？"
    }
  ]
}
```

## 支持字段

- `title`：动作卡片标题。
- `description`：说明文字。
- `layout`：`grid` 或 `row`。
- `actions`：最多 6 个按钮。
- `label`：按钮文字。
- `type`：第一版仅支持 `fill` 和 `confirm_fill`。
- `query`：点击后填入输入框的标准指令。
- `confirmText`：`confirm_fill` 的确认文案。

## 安全限制

- 不支持 HTML。
- 不执行 JavaScript。
- 不支持自动发送。
- JSON 错误时显示为普通代码块。
````

- [ ] **Step 2: Verify docs format**

Open the file and confirm:

- Example JSON is valid.
- No mention of unsupported `send` in v1.
- It clearly says first version only fills input.

---

## Manual QA Checklist

### Page or route

- 绿洲慧写工作区，右侧聊天面板。
- Focus / 工作聚焦 tab。

### Setup or prerequisite

- 本地前端能启动。
- Chat message content contains an `oasis-actions` block.

### Steps

1. Open app.
2. Enter focus chat.
3. Display assistant response containing valid `oasis-actions`.
4. Click a `fill` action.
5. Click a `confirm_fill` action and confirm.
6. Click a `confirm_fill` action and cancel.
7. Display invalid `oasis-actions` JSON.

### Expected result

- Valid block renders as button card.
- `fill` fills input.
- `confirm_fill` asks for confirmation before filling.
- Cancel does not fill.
- Invalid block renders as ordinary code block.
- Existing Markdown tables, images, Mermaid, math, and normal code blocks still render.

### Edge cases to verify

- Assistant message contains multiple `oasis-actions` blocks.
- Action label is long.
- Query is long but under 800 characters.
- Chat is loading; clicking action should still only fill input, not send.
- Mobile/narrow panel layout.

---

## Verification commands summary

Run from:

`D:\OneDrive\4、董娣相关\绿洲慧写3.0\绿洲前端`

```cmd
npm test -- oasis-actions.test.ts
npm test -- OasisActionsBlock.test.tsx
npm test -- ContentRenderer
npm test -- ChatPanel.test.tsx
npm run type-check
npm run lint
npm run build
```

---

## Risk list

- `R1`：如果自动发送在第一版加入，可能误触发保存终稿。本计划明确不做自动发送。
- `R2`：如果直接允许 HTML，会带来安全风险。本计划明确使用 JSON 协议和 React 渲染。
- `R3`：如果 `ChatPanel.tsx` 传参链条较深，容易漏传 `onOasisActionFill`。测试必须覆盖点击按钮后填入输入框。
- `R4`：如果 Markdown 代码块渲染逻辑变化，可能影响普通代码块。测试必须覆盖普通 `json` 代码块不受影响。
- `R5`：如果 Chatflow 输出 JSON 不规范，前端会退回普通代码块。因此工作流侧需要尽量用固定模板输出 JSON。

