import type { Tab } from '@/types/workspace'

type NextWorkflowStepDecision =
  | { kind: 'none' }
  | { kind: 'notify'; message: string }
  | { kind: 'switch-tool'; toolName: string; message: string }
  | { kind: 'switch-tab-tool'; tabKey: string; toolName: string; message: string }

interface ResolveNextWorkflowStepParams {
  hasGeneratedOutput: boolean
  tabs: Tab[]
  currentTabKey: string
  currentToolName: string
}

export function resolveNextWorkflowStep({
  hasGeneratedOutput,
  tabs,
  currentTabKey,
  currentToolName,
}: ResolveNextWorkflowStepParams): NextWorkflowStepDecision {
  if (!hasGeneratedOutput) {
    return { kind: 'none' }
  }

  const currentTab = tabs.find((item) => item.k === currentTabKey)
  if (!currentTab) {
    return { kind: 'none' }
  }

  const currentToolIndex = currentTab.tools.findIndex((item) => item === currentToolName)
  if (currentToolIndex === currentTab.tools.length - 1) {
    const currentTabIndex = tabs.findIndex((item) => item.k === currentTabKey)
    if (currentTabIndex === tabs.length - 1) {
      return {
        kind: 'notify',
        message: '已是最后一个工作流',
      }
    }

    const nextTab = tabs[currentTabIndex + 1]
    if (!nextTab || !nextTab.tools[0]) {
      return {
        kind: 'notify',
        message: '无法切换到下一个工具',
      }
    }
    return {
      kind: 'switch-tab-tool',
      tabKey: nextTab.k,
      toolName: nextTab.tools[0],
      message: '已切换至下一个步骤',
    }
  }

  const nextTool = currentTab.tools[currentToolIndex + 1]
  if (!nextTool) {
    return {
      kind: 'notify',
      message: '无法切换到下一个工具',
    }
  }

  return {
    kind: 'switch-tool',
    toolName: nextTool,
    message: '已切换至下一个步骤',
  }
}
