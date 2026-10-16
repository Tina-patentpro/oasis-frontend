import { describe, expect, it, jest } from '@jest/globals'

import type { WorkflowListItem } from '@/types/api'

jest.mock('@/api/services', () => ({
  sessionService: {
    getWorkflowList: jest.fn(),
  },
}))

import { loadWorkflowExportItems } from './loadWorkflowExportItems'

function createWorkflowItem(id: number): WorkflowListItem {
  return {
    id,
    api_name: `Workflow ${id}`,
    user_id: 1,
    inputs: {},
    response: {
      data: {} as any,
      task_id: '',
      workflow_run_id: '',
    },
    folder_id: 10,
    created_at: '2026-03-21T15:18:58',
  }
}

describe('loadWorkflowExportItems', () => {
  it('keeps loading next pages until the last page for workflow export', async () => {
    const fetchPage = jest
      .fn<
        (
          page: number,
          limit: number,
          options?: { signal?: AbortSignal },
        ) => Promise<{ total: number; item: WorkflowListItem[] }>
      >()
      .mockResolvedValueOnce({
        total: 45,
        item: Array.from({ length: 20 }, (_, index) => createWorkflowItem(index + 1)),
      })
      .mockResolvedValueOnce({
        total: 45,
        item: Array.from({ length: 20 }, (_, index) => createWorkflowItem(index + 21)),
      })
      .mockResolvedValueOnce({
        total: 45,
        item: Array.from({ length: 5 }, (_, index) => createWorkflowItem(index + 41)),
      })

    const workflows = await loadWorkflowExportItems({
      pageSize: 20,
      fetchPage,
    })

    expect(workflows).toHaveLength(45)
    expect(workflows[0]?.id).toBe(1)
    expect(workflows[44]?.id).toBe(45)
    expect(fetchPage).toHaveBeenCalledTimes(3)
    expect(fetchPage).toHaveBeenNthCalledWith(1, 1, 20, undefined)
    expect(fetchPage).toHaveBeenNthCalledWith(2, 2, 20, undefined)
    expect(fetchPage).toHaveBeenNthCalledWith(3, 3, 20, undefined)
  })
})
