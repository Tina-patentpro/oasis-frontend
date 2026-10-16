import { useCallback, useState } from 'react'

import type { WorkflowStep } from '@/types/api'

import type { LegacyTool, WorkflowStepsCache } from './types'

export function useWorkflowSteps(tools: LegacyTool[]) {
  const [workflowStepsCache, setWorkflowStepsCache] = useState<WorkflowStepsCache>({})

  const getWorkflowSteps = useCallback(
    (toolKey: string, modelVersion?: string): WorkflowStep[] => {
      const matchedTool = tools.find((tool) => tool.id === toolKey || tool.name === toolKey)
      const cacheKey = `${matchedTool?.id ?? toolKey}_${modelVersion ?? 'default'}`

      const cachedSteps = workflowStepsCache[cacheKey]
      if (cachedSteps) {
        return cachedSteps.map((step, index) => ({
          ...step,
          status: step.status ?? (index === 0 ? 'active' : 'pending'),
          durationSeconds: step.durationSeconds ?? 5,
        }))
      }

      if (matchedTool && modelVersion) {
        const matchedVersion = matchedTool.versions.find(
          (version) => version.name === modelVersion || version.id === modelVersion,
        )

        if (!matchedVersion?.api_process || matchedVersion.api_process.trim() === '') {
          setWorkflowStepsCache((prev) => ({ ...prev, [cacheKey]: [] }))
          return []
        }

        const processLabels = matchedVersion.api_process.split(',').map((label) => label.trim())
        if (processLabels.length > 0 && processLabels.some((label) => label.length > 0)) {
          const steps: WorkflowStep[] = processLabels
            .filter((label) => label.length > 0)
            .map((label) => ({
              label,
              status: 'pending' as const,
              durationSeconds: 5,
            }))

          if (steps.length > 0) {
            steps[0] = {
              ...steps[0],
              status: 'active' as const,
            }
          }

          setWorkflowStepsCache((prev) => ({
            ...prev,
            [cacheKey]: steps,
          }))
          return steps
        }
      }

      setWorkflowStepsCache((prev) => ({
        ...prev,
        [cacheKey]: [],
      }))
      return []
    },
    [tools, workflowStepsCache],
  )

  const clearWorkflowStepsCache = useCallback(() => {
    setWorkflowStepsCache({})
  }, [])

  return {
    workflowStepsCache,
    getWorkflowSteps,
    clearWorkflowStepsCache,
  }
}
