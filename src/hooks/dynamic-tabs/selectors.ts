import type { CategoriesResponse } from '@/types/api'

export function getApiEndpoint(
  data: CategoriesResponse | null,
  toolName: string,
  modelVersion: string,
): string | null {
  if (!data) {
    return null
  }

  const normalizedToolName = toolName.trim()
  const normalizedModelVersion = modelVersion.trim()

  for (const categoryName of Object.keys(data)) {
    const subCategories = data[categoryName]
    if (!subCategories) continue

    const tool = subCategories.find((sub) => sub.name.trim() === normalizedToolName)
    if (!tool || !tool.apis) continue

    const modelByName = normalizedModelVersion
      ? tool.apis.find((api) => api.aimodel === normalizedModelVersion)
      : undefined
    const modelById =
      !modelByName && normalizedModelVersion
        ? tool.apis.find((api) => api.id.toString() === normalizedModelVersion)
        : undefined
    const model = modelByName ?? modelById ?? tool.apis[0]

    if (model?.api_endpoint && model.api_endpoint.trim().length > 0) {
      return model.api_endpoint
    }
  }

  return null
}
