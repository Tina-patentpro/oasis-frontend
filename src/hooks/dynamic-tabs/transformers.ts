import { FALLBACK_TABS, FALLBACK_TOOL_NAMES } from '@/constants/tabs'
import type { CategoriesResponse } from '@/types/api'

import type { LegacyCategory, LegacyTool, Tab, ToolVersion } from './types'

export function transformCategoriesToLegacy(categoriesResponse: CategoriesResponse): {
  tools: LegacyTool[]
  categories: LegacyCategory[]
} {
  const tools: LegacyTool[] = []
  const categories: LegacyCategory[] = []

  let categoryOrder = 1

  Object.entries(categoriesResponse).forEach(([categoryName, subCategories]) => {
    const normalizedSubCategories = Array.isArray(subCategories) ? subCategories : []
    if (normalizedSubCategories.length === 0) {
      return
    }

    const categoryId = categoryName
    const categoryToolIds: string[] = []

    const sortedSubCategories = [...normalizedSubCategories].sort((a, b) => {
      const sortA = a.sort ?? 0
      const sortB = b.sort ?? 0
      return sortB - sortA
    })

    sortedSubCategories.forEach((subCategory, subIndex) => {
      if (!subCategory || typeof subCategory !== 'object') {
        return
      }

      const toolName =
        typeof subCategory.name === 'string' && subCategory.name.trim().length > 0
          ? subCategory.name.trim()
          : ''
      if (!toolName) {
        return
      }

      const toolId =
        subCategory.id !== undefined && subCategory.id !== null
          ? `tool_${subCategory.id}`
          : `tool_${categoryId}_${subIndex + 1}`
      categoryToolIds.push(toolId)

      const apis = Array.isArray(subCategory.apis) ? subCategory.apis : []
      const versions: ToolVersion[] = apis
        .filter((api) => !!api && typeof api === 'object')
        .map((api, apiIndex) => ({
          id:
            api.id !== undefined && api.id !== null
              ? String(api.id)
              : `model_${toolId}_${apiIndex + 1}`,
          name:
            (typeof api.aimodel === 'string' && api.aimodel.trim().length > 0 ? api.aimodel : '') ||
            `模型${apiIndex + 1}`,
          description: typeof api.api_description === 'string' ? api.api_description : '',
          api_process: typeof api.api_process === 'string' ? api.api_process : '',
          apiEndpoint:
            typeof api.api_endpoint === 'string' && api.api_endpoint.trim().length > 0
              ? api.api_endpoint
              : undefined,
          is_async: api.is_async ?? 0,
        }))

      tools.push({
        id: toolId,
        name: toolName,
        category: categoryId,
        description: subCategory.description || '',
        workflow:
          typeof subCategory.workflow === 'string' && subCategory.workflow.trim().length > 0
            ? subCategory.workflow
            : undefined,
        versions,
        sortOrder: subCategory.sort || subIndex + 1,
        is_async: versions[0]?.is_async ?? 0,
      })
    })

    if (categoryToolIds.length > 0) {
      categories.push({
        id: categoryId,
        name: categoryName,
        tools: categoryToolIds,
        sortOrder: categoryOrder++,
      })
    }
  })

  return { tools, categories }
}

export function generateTabsFromData(
  categories: LegacyCategory[],
  tools: LegacyTool[],
  resolveToolName: (toolKey: string) => string,
): Tab[] {
  if (categories.length === 0) {
    return FALLBACK_TABS
  }

  const validToolIds = new Set(tools.map((tool) => tool.id))

  return categories
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map((category) => {
      const toolNames = category.tools
        .filter((toolId) => validToolIds.has(toolId))
        .map((toolId) => resolveToolName(toolId))

      return {
        k: category.id,
        t: category.name,
        tools: toolNames,
      }
    })
    .filter((tab) => tab.tools.length > 0)
}

export function generateToolNames(tools: LegacyTool[]): string[] {
  if (tools.length === 0) {
    return FALLBACK_TOOL_NAMES
  }
  return tools.map((tool) => tool.name)
}
