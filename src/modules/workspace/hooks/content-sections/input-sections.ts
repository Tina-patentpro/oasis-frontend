import type { ApiDetail, ApiInputField, InputSection as InputSectionDefinition } from '@/types/api'

export function isApiFieldRequired(field: ApiInputField): boolean {
  const candidates = [field.cn_name, field.en_name, field.content]
  return candidates.some(
    (value) => typeof value === 'string' && /\brequired\b|必填/i.test(value.trim()),
  )
}

export function getMissingRequiredFieldLabels(
  inputSchema: ApiInputField[] | undefined | null,
  inputSections: Record<string, string>,
): string[] {
  if (!inputSchema || !Array.isArray(inputSchema)) {
    return []
  }

  return inputSchema
    .filter((field) => isApiFieldRequired(field))
    .filter((field) => {
      const value = inputSections[field.en_name]
      return !(typeof value === 'string' && value.trim().length > 0)
    })
    .map((field) => field.cn_name || field.en_name)
}

export function convertApiFieldToInputSection(field: ApiInputField): InputSectionDefinition {
  let inputMode: InputSectionDefinition['inputMode'] = 'text'
  let supportsFileUpload = false
  let supportsImageUpload = false
  let isMultiFile = false

  switch (field.type) {
    case 'file':
      inputMode = 'file'
      supportsFileUpload = true
      isMultiFile = false
      break
    case 'file_list':
      inputMode = 'file'
      supportsFileUpload = true
      isMultiFile = true
      break
    case 'image':
      inputMode = 'image'
      supportsImageUpload = true
      break
    default:
      inputMode = 'text'
      break
  }

  return {
    key: field.en_name,
    label: field.cn_name,
    placeholder: field.content || '',
    inputMode,
    isMultiFile,
    supportsFileUpload,
    supportsImageUpload,
    required: isApiFieldRequired(field),
  }
}

export function buildDynamicInputSections(apiDetail: ApiDetail | null): InputSectionDefinition[] {
  if (!apiDetail || !apiDetail.input_schema || !Array.isArray(apiDetail.input_schema)) {
    return []
  }

  const sections: InputSectionDefinition[] = []

  try {
    apiDetail.input_schema.forEach((section, index) => {
      if (!section || typeof section !== 'object') {
        console.warn(`[useWorkspaceContentSections] Invalid section at index ${index}:`, section)
        return
      }

      if (!section.en_name) {
        console.warn(
          `[useWorkspaceContentSections] Section at index ${index} missing en_name:`,
          section,
        )
        return
      }

      sections.push(convertApiFieldToInputSection(section))
    })

    return sections
  } catch (error) {
    console.error('[useWorkspaceContentSections] Error converting input_schema:', error)
    return []
  }
}

export function buildSectionDefinitions(
  rawCmsInputSections: InputSectionDefinition[],
  cmsInputSections: InputSectionDefinition[],
): Record<string, InputSectionDefinition> {
  const source = rawCmsInputSections.length > 0 ? cmsInputSections : []
  const entries: Record<string, InputSectionDefinition> = {}
  source.forEach((section) => {
    entries[section.key] = section
  })
  return entries
}
