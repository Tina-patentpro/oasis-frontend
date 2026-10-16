import type { ProcessStatusResponse, WorkflowStep } from '@/types/api'

import type { GenerationStatus } from './generation-state'

function normalizeStepLabel(label: string): string {
  return label.replace(/\s+/g, '').trim()
}

function resolveCurrentStepIndex(
  workflowTimeline: WorkflowStep[],
  pollingStatus: ProcessStatusResponse,
): number {
  const indexFromStepNumber = pollingStatus.current_step - 1
  if (indexFromStepNumber >= 0 && indexFromStepNumber < workflowTimeline.length) {
    return indexFromStepNumber
  }

  const currentStepName = normalizeStepLabel(pollingStatus.current_step_name ?? '')
  if (!currentStepName) {
    return -1
  }

  return workflowTimeline.findIndex((step) => {
    const normalizedLabel = normalizeStepLabel(step.label)
    return (
      normalizedLabel === currentStepName ||
      normalizedLabel.includes(currentStepName) ||
      currentStepName.includes(normalizedLabel)
    )
  })
}

export function applyPollingStatusToWorkflowSteps(
  workflowTimeline: WorkflowStep[],
  pollingStatus: ProcessStatusResponse | null,
  generationStatus: GenerationStatus = 'idle',
): WorkflowStep[] {
  if (generationStatus === 'success') {
    return workflowTimeline.map((step) => ({ ...step, status: 'completed' as const }))
  }

  if (!pollingStatus) {
    if (generationStatus === 'running') {
      return workflowTimeline.map((step, index) => ({
        ...step,
        status: index === 0 ? ('active' as const) : ('pending' as const),
      }))
    }
    return workflowTimeline
  }

  const currentIndex = resolveCurrentStepIndex(workflowTimeline, pollingStatus)
  if (currentIndex < 0) {
    if (generationStatus === 'running' || generationStatus === 'queued') {
      return workflowTimeline.map((step, index) => ({
        ...step,
        status: index === 0 ? ('active' as const) : ('pending' as const),
      }))
    }
    return workflowTimeline
  }

  return workflowTimeline.map((step, index) => {
    if (pollingStatus.is_completed) {
      return { ...step, status: 'completed' as const }
    }
    if (index < currentIndex) {
      return { ...step, status: 'completed' as const }
    }
    if (index === currentIndex) {
      return { ...step, status: 'active' as const }
    }
    return { ...step, status: 'pending' as const }
  })
}
