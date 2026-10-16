import type { AIModel, CategoriesResponse, SubCategory } from '@/types/api'

import type { Tab, ToolMetadata, ToolVersion } from './types'

export const getVersionKey = (version: ToolVersion): string =>
  version.id || version.name || 'default'

export function transformCategoriesToTabsAndMetadata(data: CategoriesResponse | null): {
  tabs: Tab[]
  toolMetadataByName: Record<string, ToolMetadata>
} {
  if (!data) {
    return { tabs: [], toolMetadataByName: {} }
  }

  const tabs: Tab[] = []
  const toolMetadataByName: Record<string, ToolMetadata> = {}

  Object.entries(data).forEach(([categoryName, subCategories]) => {
    const normalizedSubCategories = Array.isArray(subCategories) ? subCategories : []
    if (normalizedSubCategories.length === 0) {
      return
    }

    const toolNames: string[] = []

    normalizedSubCategories.forEach((subCategory: SubCategory, subIndex) => {
      const toolName =
        typeof subCategory.name === 'string' && subCategory.name.trim().length > 0
          ? subCategory.name.trim()
          : ''
      if (!toolName) {
        return
      }
      toolNames.push(toolName)

      const apis = Array.isArray(subCategory.apis) ? subCategory.apis : []
      const versions: ToolVersion[] = apis.map((api: AIModel, apiIndex) => ({
        id:
          api.id !== undefined && api.id !== null
            ? api.id.toString()
            : `${toolName}_${subIndex + 1}_${apiIndex + 1}`,
        name:
          (typeof api.aimodel === 'string' && api.aimodel.trim().length > 0 ? api.aimodel : '') ||
          `模型${apiIndex + 1}`,
        description: typeof api.api_description === 'string' ? api.api_description : '',
      }))

      toolMetadataByName[toolName] = {
        name: toolName,
        description: subCategory.description || '',
        versions,
      }
    })

    if (toolNames.length > 0) {
      tabs.push({
        k: categoryName,
        t: categoryName,
        tools: toolNames,
      })
    }
  })

  return { tabs, toolMetadataByName }
}
