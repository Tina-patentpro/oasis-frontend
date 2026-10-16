import { useCallback, useEffect, useMemo, useState } from 'react'

import {
  FALLBACK_CHAT_TABS,
  FALLBACK_CONTENT_PAGES,
  FALLBACK_TABS,
  FALLBACK_TOOL_NAMES,
} from '@/constants/tabs'
import type { InputSection } from '@/types/api'

import { getApiEndpoint } from './selectors'
import {
  transformCategoriesToLegacy,
  generateTabsFromData,
  generateToolNames,
} from './transformers'
import type { InputSectionsCache } from './types'
import { useCategoriesData } from './useCategoriesData'
import { useToolMetadata } from './useToolMetadata'
import { useWorkflowSteps } from './useWorkflowSteps'

export function useDynamicTabs() {
  const { isLoading, data, error, refresh } = useCategoriesData()
  const [inputSectionsCache] = useState<InputSectionsCache>({})

  const legacyData = useMemo(() => {
    if (!data) {
      return null
    }
    return transformCategoriesToLegacy(data)
  }, [data])

  const tools = useMemo(() => legacyData?.tools || [], [legacyData])
  const categories = useMemo(() => legacyData?.categories || [], [legacyData])

  const { toolIdByName, toolNameById, toolMetadataByName, resolveToolName, resolveToolId } =
    useToolMetadata(tools)

  const { workflowStepsCache, getWorkflowSteps, clearWorkflowStepsCache } = useWorkflowSteps(tools)

  useEffect(() => {
    if (!data) {
      return
    }
    setTimeout(() => {
      clearWorkflowStepsCache()
    }, 0)
  }, [clearWorkflowStepsCache, data])

  const loadToolDetails = useCallback(async (_toolId: string) => {
    // Note: Workflow steps are parsed from 'api_process' field in category details.
    // Input sections are not explicitly defined in the current API; using default schema layout.
  }, [])

  const tabs = useMemo(() => {
    if (categories.length === 0) {
      return FALLBACK_TABS
    }
    return generateTabsFromData(categories, tools, resolveToolName)
  }, [categories, resolveToolName, tools])

  const toolNames = useMemo(() => generateToolNames(tools), [tools])

  const getInputSections = useCallback((_toolId: string): InputSection[] => {
    // Note: The current API does not provide explicit UI input sections.
    // UI should render inputs based on 'input_schema' or use a flat layout.
    return []
  }, [])

  const getApiEndpointForTool = useCallback(
    (toolName: string, modelVersion: string): string | null => {
      if (!data) return null
      return getApiEndpoint(data, toolName, modelVersion)
    },
    [data],
  )

  return useMemo(
    () => ({
      tabs,
      toolNames: toolNames.length > 0 ? toolNames : FALLBACK_TOOL_NAMES,
      contentPages: FALLBACK_CONTENT_PAGES,
      chatTabs: FALLBACK_CHAT_TABS,
      workflowStepsCache,
      inputSectionsCache,
      isLoading,
      error,
      refresh,
      loadToolDetails,
      getWorkflowSteps,
      getInputSections,
      resolveToolId,
      resolveToolName,
      toolIdByName,
      getApiEndpointForTool,
      categories,
      tools,
      toolMetadataByName,
      toolNameById,
      rawData: data,
    }),
    [
      tabs,
      toolNames,
      workflowStepsCache,
      inputSectionsCache,
      isLoading,
      error,
      refresh,
      loadToolDetails,
      getWorkflowSteps,
      getInputSections,
      resolveToolId,
      resolveToolName,
      toolIdByName,
      getApiEndpointForTool,
      categories,
      tools,
      toolMetadataByName,
      toolNameById,
      data,
    ],
  )
}
