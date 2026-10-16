import { beforeEach, describe, expect, jest, test } from '@jest/globals'

jest.mock('../client', () => ({
  apiClient: {
    get: jest.fn(),
  },
}))

import { apiClient } from '../client'
import { workflowsService } from './workflows.service'

const mockGet = apiClient.get as jest.MockedFunction<typeof apiClient.get>

describe('workflowsService read-only workflow endpoints', () => {
  beforeEach(() => {
    mockGet.mockReset()
  })

  test('getWorkflows calls workflows list endpoint with filters', async () => {
    mockGet.mockResolvedValue({ success: true, data: { items: [] } })

    await workflowsService.getWorkflows({
      category: 'patent',
      keyword: '权利要求',
      page: 1,
      pageSize: 20,
    })

    expect(mockGet).toHaveBeenCalledWith(
      '/api/workflows',
      {
        category: 'patent',
        keyword: '权利要求',
        page: 1,
        pageSize: 20,
      },
      undefined,
      { signal: undefined },
    )
  })

  test('getWorkflowDetail calls workflow detail endpoint', async () => {
    mockGet.mockResolvedValue({ success: true, data: { id: 'workflow-1' } })

    await workflowsService.getWorkflowDetail('workflow-1')

    expect(mockGet).toHaveBeenCalledWith('/api/workflows/workflow-1', undefined, undefined, {
      signal: undefined,
    })
  })

  test('getWorkflowExecutionResult calls workflow execution result endpoint with flags', async () => {
    mockGet.mockResolvedValue({ success: true, data: { executionId: 'execution-1' } })

    await workflowsService.getWorkflowExecutionResult('execution-1', {
      includeInputs: true,
      includeSensitive: false,
    })

    expect(mockGet).toHaveBeenCalledWith(
      '/api/workflow-executions/execution-1',
      {
        includeInputs: true,
        includeSensitive: false,
      },
      undefined,
      { signal: undefined },
    )
  })

  test('getWorkflowExecutionProgress calls workflow execution progress endpoint', async () => {
    mockGet.mockResolvedValue({ success: true, data: { status: 'running', percent: 65 } })

    await workflowsService.getWorkflowExecutionProgress('execution-1')

    expect(mockGet).toHaveBeenCalledWith(
      '/api/workflow-executions/execution-1/progress',
      undefined,
      undefined,
      { signal: undefined },
    )
  })

  test('getWorkflowExecutions calls workflow executions endpoint with filters', async () => {
    mockGet.mockResolvedValue({ success: true, data: { items: [] } })

    await workflowsService.getWorkflowExecutions('workflow-1', {
      page: 1,
      pageSize: 20,
      projectId: 'project-1',
      status: 'completed',
      from: '2026-06-01T00:00:00.000Z',
      to: '2026-06-30T00:00:00.000Z',
      includeInputsSummary: true,
    })

    expect(mockGet).toHaveBeenCalledWith(
      '/api/workflows/workflow-1/executions',
      {
        page: 1,
        pageSize: 20,
        projectId: 'project-1',
        status: 'completed',
        from: '2026-06-01T00:00:00.000Z',
        to: '2026-06-30T00:00:00.000Z',
        includeInputsSummary: true,
      },
      undefined,
      { signal: undefined },
    )
  })

  test('getWorkflowPresets calls workflow presets endpoint with source and target filters', async () => {
    mockGet.mockResolvedValue({ success: true, data: [] })

    await workflowsService.getWorkflowPresets({
      sourceWorkflowId: 'source-1',
      targetWorkflowId: 'target-1',
    })

    expect(mockGet).toHaveBeenCalledWith(
      '/api/workflow-presets',
      {
        sourceWorkflowId: 'source-1',
        targetWorkflowId: 'target-1',
      },
      undefined,
      { signal: undefined },
    )
  })
})
