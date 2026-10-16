import { describe, expect, it } from '@jest/globals'

import type { Tab } from '@/types/workspace'

import { resolveNextWorkflowStep } from './generation-navigation'

const tabs: Tab[] = [
  { k: 'draft', t: '撰写', tools: ['检索', '撰写'] },
  { k: 'review', t: '审查', tools: ['审查', '定稿'] },
]

describe('resolveNextWorkflowStep', () => {
  it('does nothing when there is no generated output yet', () => {
    expect(
      resolveNextWorkflowStep({
        hasGeneratedOutput: false,
        tabs,
        currentTabKey: 'draft',
        currentToolName: '检索',
      }),
    ).toEqual({ kind: 'none' })
  })

  it('switches to the next tool in the current tab', () => {
    expect(
      resolveNextWorkflowStep({
        hasGeneratedOutput: true,
        tabs,
        currentTabKey: 'draft',
        currentToolName: '检索',
      }),
    ).toEqual({
      kind: 'switch-tool',
      toolName: '撰写',
      message: '已切换至下一个步骤',
    })
  })

  it('switches to the first tool of the next tab when current tool is the tab tail', () => {
    expect(
      resolveNextWorkflowStep({
        hasGeneratedOutput: true,
        tabs,
        currentTabKey: 'draft',
        currentToolName: '撰写',
      }),
    ).toEqual({
      kind: 'switch-tab-tool',
      tabKey: 'review',
      toolName: '审查',
      message: '已切换至下一个步骤',
    })
  })

  it('reports when the current tool is already the final workflow', () => {
    expect(
      resolveNextWorkflowStep({
        hasGeneratedOutput: true,
        tabs,
        currentTabKey: 'review',
        currentToolName: '定稿',
      }),
    ).toEqual({
      kind: 'notify',
      message: '已是最后一个工作流',
    })
  })

  it('reports when the next tab has no usable first tool', () => {
    expect(
      resolveNextWorkflowStep({
        hasGeneratedOutput: true,
        tabs: [
          { k: 'draft', t: '撰写', tools: ['撰写'] },
          { k: 'empty', t: '空', tools: [] },
        ],
        currentTabKey: 'draft',
        currentToolName: '撰写',
      }),
    ).toEqual({
      kind: 'notify',
      message: '无法切换到下一个工具',
    })
  })

  it('keeps the legacy fallback to the first tool when current tool is missing', () => {
    expect(
      resolveNextWorkflowStep({
        hasGeneratedOutput: true,
        tabs,
        currentTabKey: 'draft',
        currentToolName: '不存在',
      }),
    ).toEqual({
      kind: 'switch-tool',
      toolName: '检索',
      message: '已切换至下一个步骤',
    })
  })
})
