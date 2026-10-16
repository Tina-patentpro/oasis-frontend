import { useCallback, useMemo } from 'react'

import { TOOL_ID_TO_NAME, TOOL_NAME_TO_ID } from './constants'
import type { LegacyTool } from './types'

export function useToolMetadata(tools: LegacyTool[]) {
  const toolIdByName = useMemo(() => {
    const map = new Map<string, string>()
    tools.forEach((tool) => {
      map.set(tool.name, tool.id)
    })
    return map
  }, [tools])

  const toolNameById = useMemo(() => {
    const map = new Map<string, string>()
    tools.forEach((tool) => {
      map.set(tool.id, tool.name)
    })
    return map
  }, [tools])

  const toolMetadataByName = useMemo(() => {
    const metadata: Record<string, LegacyTool> = {}
    tools.forEach((tool) => {
      metadata[tool.name] = tool
      metadata[tool.id] = tool
    })
    return metadata
  }, [tools])

  const resolveToolName = useCallback(
    (toolKey: string) => toolNameById.get(toolKey) ?? TOOL_ID_TO_NAME.get(toolKey) ?? toolKey,
    [toolNameById],
  )

  const resolveToolId = useCallback(
    (toolKey: string) => toolIdByName.get(toolKey) ?? TOOL_NAME_TO_ID.get(toolKey) ?? toolKey,
    [toolIdByName],
  )

  return {
    toolIdByName,
    toolNameById,
    toolMetadataByName,
    resolveToolName,
    resolveToolId,
  }
}
