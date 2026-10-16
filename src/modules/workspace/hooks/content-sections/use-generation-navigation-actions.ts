import { useCallback } from 'react'

import { TABS } from '@/constants'
import type { Tab, ToolState } from '@/types/workspace'

import { resolveNextWorkflowStep } from './generation-navigation'

export function useGenerationNavigationActions({
  dynamicTabs,
  generated,
  notify,
  setTab,
  setTool,
  tab,
  tool,
}: {
  dynamicTabs: Tab[]
  generated: string
  notify: (message: string) => void
  setTab: (tab: string) => void
  setTool: (tool: ToolState) => void
  tab: string
  tool: ToolState
}) {
  return useCallback((): void => {
    const tabsSource = dynamicTabs.length > 0 ? dynamicTabs : TABS
    const nextStep = resolveNextWorkflowStep({
      hasGeneratedOutput: Boolean(generated),
      tabs: tabsSource,
      currentTabKey: tab,
      currentToolName: tool.name,
    })

    if (nextStep.kind === 'none') {
      return
    }

    if (nextStep.kind === 'notify') {
      notify(nextStep.message)
      return
    }

    if (nextStep.kind === 'switch-tab-tool') {
      setTab(nextStep.tabKey)
    }
    setTool({ ...tool, name: nextStep.toolName })

    notify(nextStep.message)
  }, [dynamicTabs, generated, notify, setTab, setTool, tab, tool])
}
