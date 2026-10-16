import { describe, expect, test } from '@jest/globals'
import type { ProcessStatusResponse, WorkflowStep } from '@/types/api'

import { applyPollingStatusToWorkflowSteps } from './workflow-steps'

const baseTimeline: WorkflowStep[] = [
  { label: '输入内容整理', status: 'pending' },
  { label: '核心独立权利要求撰写', status: 'pending' },
  { label: '权利要求架构搭建', status: 'pending' },
]

function buildPollingStatus(overrides: Partial<ProcessStatusResponse>): ProcessStatusResponse {
  return {
    key: 'task-1',
    current_step: 1,
    current_step_name: '输入内容整理',
    total_steps: 3,
    steps: baseTimeline.map((item) => item.label),
    progress_percent: 10,
    is_completed: false,
    ...overrides,
  }
}

describe('applyPollingStatusToWorkflowSteps', () => {
  test('maps step status by current_step', () => {
    const status = buildPollingStatus({ current_step: 2 })
    const result = applyPollingStatusToWorkflowSteps(baseTimeline, status)

    expect(result.map((item) => item.status)).toEqual(['completed', 'active', 'pending'])
  })

  test('falls back to current_step_name matching when current_step is invalid', () => {
    const status = buildPollingStatus({
      current_step: 0,
      current_step_name: '核心独立权利要求撰写',
    })
    const result = applyPollingStatusToWorkflowSteps(baseTimeline, status)

    expect(result.map((item) => item.status)).toEqual(['completed', 'active', 'pending'])
  })

  test('marks all steps completed when is_completed is true', () => {
    const status = buildPollingStatus({ is_completed: true, current_step: 1 })
    const result = applyPollingStatusToWorkflowSteps(baseTimeline, status)

    expect(result.every((item) => item.status === 'completed')).toBe(true)
  })

  test('marks all steps completed when generation status is success and no polling data', () => {
    const result = applyPollingStatusToWorkflowSteps(baseTimeline, null, 'success')
    expect(result.every((item) => item.status === 'completed')).toBe(true)
  })

  test('prefers success status over stale polling state', () => {
    const stalePollingStatus = buildPollingStatus({
      current_step: 2,
      current_step_name: '核心独立权利要求撰写',
      is_completed: false,
    })

    const result = applyPollingStatusToWorkflowSteps(baseTimeline, stalePollingStatus, 'success')

    expect(result.every((item) => item.status === 'completed')).toBe(true)
  })

  test('keeps first step active when polling step cannot be resolved but generation is running', () => {
    const unresolvedPollingStatus = buildPollingStatus({
      current_step: 0,
      current_step_name: '生成中',
      is_completed: false,
    })

    const result = applyPollingStatusToWorkflowSteps(
      baseTimeline,
      unresolvedPollingStatus,
      'running',
    )

    expect(result.map((item) => item.status)).toEqual(['active', 'pending', 'pending'])
  })
})
