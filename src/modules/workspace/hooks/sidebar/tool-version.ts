import type { Tab } from '@/hooks/dynamic-tabs'

type ToolVersionLike = {
  id?: string
  name?: string
}

type ToolMetaLike = {
  versions?: ToolVersionLike[]
}

export function resolveVersionForTool(
  toolName: string,
  preferred: string | undefined,
  filteredToolMetadataByName: Record<string, ToolMetaLike>,
  toolMetadataByName: Record<string, ToolMetaLike>,
  fallbackVersion: string,
): string {
  const meta = filteredToolMetadataByName[toolName] ?? toolMetadataByName[toolName]
  if (!meta?.versions?.length) {
    return preferred ?? fallbackVersion
  }
  if (preferred) {
    const matched = meta.versions.find(
      (version) => version.id === preferred || version.name === preferred,
    )
    if (matched) {
      return matched.id ?? matched.name ?? preferred
    }
  }
  const first = meta.versions[0]
  return first?.id ?? first?.name ?? preferred ?? fallbackVersion
}

export function syncWorkspaceTabAndTool(params: {
  availableTabs: Tab[]
  filteredToolMetadataByName: Record<string, ToolMetaLike>
  toolMetadataByName: Record<string, ToolMetaLike>
  tab: string
  tool: { name: string; ver: string }
  setTab: (tab: string) => void
  setTool: (tool: { name: string; ver: string }) => void
}) {
  const {
    availableTabs,
    filteredToolMetadataByName,
    toolMetadataByName,
    tab,
    tool,
    setTab,
    setTool,
  } = params

  if (!availableTabs.length) {
    return
  }

  const activeTab = availableTabs.find((item) => item.k === tab)
  const getDefaultVersion = (toolName: string): string | undefined => {
    const meta = filteredToolMetadataByName[toolName] ?? toolMetadataByName[toolName]
    const first = meta?.versions?.[0]
    return first?.id ?? first?.name
  }

  if (!activeTab) {
    const fallbackTab = availableTabs[0]
    if (!fallbackTab) {
      return
    }
    const fallbackTool = fallbackTab.tools[0]
    if (fallbackTool) {
      const nextVersion = getDefaultVersion(fallbackTool) ?? tool.ver
      setTab(fallbackTab.k)
      setTool({ ...tool, name: fallbackTool, ver: nextVersion })
    }
    return
  }

  if (!activeTab.tools.includes(tool.name)) {
    const fallbackTool = activeTab.tools[0]
    if (fallbackTool) {
      const nextVersion = getDefaultVersion(fallbackTool) ?? tool.ver
      setTool({ ...tool, name: fallbackTool, ver: nextVersion })
    }
    return
  }

  const currentMeta = filteredToolMetadataByName[tool.name] ?? toolMetadataByName[tool.name]
  if (currentMeta?.versions?.length) {
    const hasVersion = currentMeta.versions.some(
      (version) => version.id === tool.ver || version.name === tool.ver,
    )
    if (!hasVersion) {
      const firstVersion = currentMeta.versions[0]
      const nextVersion = firstVersion?.id ?? firstVersion?.name
      if (nextVersion) {
        setTool({ ...tool, ver: nextVersion })
      }
    }
  }
}
