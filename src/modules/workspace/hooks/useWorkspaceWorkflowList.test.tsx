import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, jest, test } from '@jest/globals'

import { sessionService } from '@/api/services'

import { useWorkspaceWorkflowList } from './useWorkspaceWorkflowList'

jest.mock('@/api/services', () => ({
  sessionService: {
    getWorkflowList: jest.fn(),
  },
}))

afterEach(() => {
  jest.clearAllMocks()
})

describe('useWorkspaceWorkflowList', () => {
  test('loads and normalizes workflow list when fast boot is disabled', async () => {
    const getWorkflowListMock = sessionService.getWorkflowList as jest.MockedFunction<
      typeof sessionService.getWorkflowList
    >
    getWorkflowListMock.mockResolvedValue({
      total: 1,
      item: [
        {
          id: 1,
          api_name: 'demo',
          user_id: 10,
          folder_id: 20,
          created_at: '2026-05-21T00:00:00.000Z',
        },
      ],
    } as Awaited<ReturnType<typeof sessionService.getWorkflowList>>)

    const { result } = renderHook(() =>
      useWorkspaceWorkflowList({
        fastBootEnabled: false,
        downloadDialogOpen: false,
      }),
    )

    await waitFor(() => {
      expect(result.current.workflows).toHaveLength(1)
    })

    expect(getWorkflowListMock).toHaveBeenCalledWith(
      1,
      50,
      expect.objectContaining({
        signal: expect.any(AbortSignal),
      }),
    )
    expect(result.current.workflows[0]).toEqual(
      expect.objectContaining({
        id: 1,
        inputs: {},
        response: {
          data: {},
          task_id: '',
          workflow_run_id: '',
        },
      }),
    )
  })

  test('loads workflow list when the download dialog opens under fast boot', async () => {
    const getWorkflowListMock = sessionService.getWorkflowList as jest.MockedFunction<
      typeof sessionService.getWorkflowList
    >
    getWorkflowListMock.mockResolvedValue({
      total: 0,
      item: [],
    } as Awaited<ReturnType<typeof sessionService.getWorkflowList>>)

    const { rerender } = renderHook(
      ({ downloadDialogOpen }) =>
        useWorkspaceWorkflowList({
          fastBootEnabled: true,
          downloadDialogOpen,
        }),
      {
        initialProps: {
          downloadDialogOpen: false,
        },
      },
    )

    expect(getWorkflowListMock).not.toHaveBeenCalled()

    rerender({ downloadDialogOpen: true })

    await waitFor(() => {
      expect(getWorkflowListMock).toHaveBeenCalledTimes(1)
    })
  })

  test('clears workflow list after a non-abort loading failure', async () => {
    const getWorkflowListMock = sessionService.getWorkflowList as jest.MockedFunction<
      typeof sessionService.getWorkflowList
    >
    getWorkflowListMock
      .mockResolvedValueOnce({
        total: 1,
        item: [
          {
            id: 2,
            api_name: 'loaded',
            user_id: 10,
            folder_id: 20,
            created_at: '2026-05-21T00:00:00.000Z',
          },
        ],
      } as Awaited<ReturnType<typeof sessionService.getWorkflowList>>)
      .mockRejectedValueOnce(new Error('network failed'))

    const { result } = renderHook(() =>
      useWorkspaceWorkflowList({
        fastBootEnabled: true,
        downloadDialogOpen: false,
      }),
    )

    await result.current.loadWorkflows(true)

    await waitFor(() => {
      expect(result.current.workflows).toHaveLength(1)
    })

    await result.current.loadWorkflows(true)

    await waitFor(() => {
      expect(result.current.workflows).toEqual([])
    })
  })
})
