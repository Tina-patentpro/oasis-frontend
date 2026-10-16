import { useMemo } from 'react'

import type { ApiDetail } from '@/types/api'

import { getMissingRequiredFieldLabels } from './input-sections'
import { buildSessionTrackingTitle } from './generation-request'

export function useGenerationAvailability({
  activePages,
  apiDetail,
  inputSections,
  toolName,
}: {
  activePages: Array<{ key: string; label: string }>
  apiDetail: ApiDetail | null
  inputSections: Record<string, string>
  toolName: string
}) {
  const combinedInput = useMemo(
    () =>
      activePages
        .map((page) => inputSections[page.key])
        .filter((value): value is string => typeof value === 'string' && value.trim() !== '')
        .join('\n\n'),
    [activePages, inputSections],
  )

  const hasAnyInput = useMemo(
    () =>
      Object.values(inputSections).some(
        (value): value is string => typeof value === 'string' && value.trim().length > 0,
      ),
    [inputSections],
  )

  const missingRequiredFieldLabels = useMemo(() => {
    return getMissingRequiredFieldLabels(apiDetail?.input_schema, inputSections)
  }, [apiDetail?.input_schema, inputSections])

  const sessionTrackingTitle = useMemo(
    () => buildSessionTrackingTitle(combinedInput, toolName),
    [combinedInput, toolName],
  )

  const canGenerate = hasAnyInput && missingRequiredFieldLabels.length === 0

  return {
    canGenerate,
    combinedInput,
    hasAnyInput,
    missingRequiredFieldLabels,
    sessionTrackingTitle,
  }
}
