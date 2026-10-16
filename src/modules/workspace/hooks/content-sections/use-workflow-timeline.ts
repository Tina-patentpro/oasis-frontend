import { useCallback, useEffect, useRef, useState } from 'react'

import type { WorkflowStep } from '@/types/api'

interface UseWorkflowTimelineParams {
  toolName: string
  toolVersion: string | null | undefined
  getWorkflowSteps: (toolName: string, modelVersion: string | null | undefined) => WorkflowStep[]
}

export function useWorkflowTimeline({
  toolName,
  toolVersion,
  getWorkflowSteps,
}: UseWorkflowTimelineParams) {
  const [workflowTimeline, setWorkflowTimeline] = useState<WorkflowStep[]>([])
  const workflowSequenceRef = useRef(0)

  const resetWorkflowTimeline = useCallback(() => {
    setWorkflowTimeline([])
  }, [])

  useEffect(() => {
    let cancelled = false
    const seq = workflowSequenceRef.current + 1
    workflowSequenceRef.current = seq

    const rawSteps = getWorkflowSteps(toolName, toolVersion)

    if (!rawSteps || rawSteps.length === 0) {
      queueMicrotask(() => {
        if (!cancelled) {
          setWorkflowTimeline([])
        }
      })
      return () => {
        cancelled = true
      }
    }

    const steps = rawSteps.map<WorkflowStep>((step) => ({
      ...step,
      status: 'pending',
      durationSeconds: step.durationSeconds ?? 5,
    }))

    Promise.resolve().then(() => {
      if (!cancelled) {
        setWorkflowTimeline(steps)
      }
    })

    return () => {
      cancelled = true
    }
  }, [getWorkflowSteps, toolName, toolVersion])

  return { workflowTimeline, resetWorkflowTimeline }
}
