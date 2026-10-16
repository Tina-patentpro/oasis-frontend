import type { ApiInputField } from '@/types/api'

interface ToolMetadata {
  versions?: Array<{
    id: string
    name: string
    api_process?: string
  }>
}

interface GenerationRequestFields {
  inputs: Record<string, string>
  fileFields: string[]
  multiFileFields: string[]
}

export function buildGenerationRequestFields(
  inputSchema: ApiInputField[] | undefined,
  inputSections: Record<string, unknown>,
): GenerationRequestFields {
  const inputs: Record<string, string> = {}
  const fileFields: string[] = []
  const multiFileFields: string[] = []

  inputSchema?.forEach((field) => {
    const userValue = inputSections[field.en_name]
    inputs[field.en_name] = typeof userValue === 'string' ? userValue : ''
    if (field.type === 'file' || field.type === 'file_list' || field.type === 'image') {
      fileFields.push(field.en_name)
    }
    if (field.type === 'file_list') {
      multiFileFields.push(field.en_name)
    }
  })

  return {
    inputs,
    fileFields,
    multiFileFields,
  }
}

export function resolveApiProcess(
  toolMetadataByName: Record<string, ToolMetadata>,
  toolName: string,
  toolVersion: string,
): string {
  const toolMetadata = toolMetadataByName[toolName]
  if (!toolMetadata?.versions) {
    return ''
  }

  const matchedVersion = toolMetadata.versions.find(
    (version) => version.name === toolVersion || version.id === toolVersion,
  )
  return matchedVersion?.api_process ?? ''
}

export function buildSessionTrackingTitle(combinedInput: string, toolName: string): string {
  const firstInputLine = combinedInput
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line.length > 0)

  if (firstInputLine) {
    return firstInputLine.slice(0, 30)
  }

  return toolName || '生成中'
}
