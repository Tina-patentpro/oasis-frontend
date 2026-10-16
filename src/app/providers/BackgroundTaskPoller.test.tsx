import React from 'react'
import { act, render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals'

jest.mock('@/api/services', () => ({
  aiService: {
    queryProcessStatus: jest.fn(),
  },
  sessionService: {
    getSessions: jest.fn(),
  },
}))

import { aiService, sessionService } from '@/api/services'
import { ApiError } from '@/api/errors'
import { useUIStore } from '@/stores/useUIStore'
import { useAsyncTaskStore } from '@/modules/workspace/stores'

import { BackgroundTaskPoller } from './BackgroundTaskPoller'

const POLL_INTERVAL_MS = 15_000

async function advancePollingCycle() {
  await act(async () => {
    jest.advanceTimersByTime(POLL_INTERVAL_MS)
    await Promise.resolve()
    await Promise.resolve()
  })
}

describe('BackgroundTaskPoller', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
    jest.clearAllMocks()
    useAsyncTaskStore.setState({ tasks: {}, daemonHeartbeatAt: null } as any)
    useUIStore.setState({ toast: null })
    sessionStorage.clear()
  })

  test('polls async task store when daemon heartbeat is missing', async () => {
    const queryProcessStatusMock = aiService.queryProcessStatus as jest.MockedFunction<
      typeof aiService.queryProcessStatus
    >
    const completionListener = jest.fn<(event: Event) => void>()
    queryProcessStatusMock.mockResolvedValue({
      key: 'task_background_1',
      current_step: 3,
      current_step_name: '完成',
      total_steps: 3,
      steps: ['S1', 'S2', 'S3'],
      progress_percent: 100,
      is_completed: true,
      answer_text: '最终正文',
      status: 'completed',
    } as any)

    window.addEventListener('background-task-completed', completionListener)
    render(<BackgroundTaskPoller />)

    act(() => {
      useAsyncTaskStore.getState().addAsyncTask({
        taskKey: 'task_background_1',
        apiDetailId: 1,
        apiName: '任务-task_background_1',
        progressPercent: 0,
        currentStepName: '请求排队中...',
        status: 'running',
        toolName: '异步工具A',
        folderId: 1,
      })
    })

    await advancePollingCycle()

    await waitFor(() => {
      expect(queryProcessStatusMock).toHaveBeenCalledWith(
        'task_background_1',
        expect.objectContaining({ signal: expect.anything() }),
      )
      expect(useAsyncTaskStore.getState().tasks['task_background_1']?.status).toBe('completed')
    })
    const completedTask = useAsyncTaskStore.getState().tasks['task_background_1']
    const completionEvent = completionListener.mock.calls[0]?.[0] as CustomEvent

    expect(completedTask?.progressPercent).toBe(100)
    expect(completedTask?.currentStepName).toBe('已完成')
    expect(useUIStore.getState().toast).toBe('「异步工具A」生成完成')
    expect(completionListener).toHaveBeenCalledTimes(1)
    expect(completionEvent.detail).toEqual({ folderId: 1 })
    window.removeEventListener('background-task-completed', completionListener)
  })

  test('does not poll when async task daemon heartbeat is fresh', async () => {
    const queryProcessStatusMock = aiService.queryProcessStatus as jest.MockedFunction<
      typeof aiService.queryProcessStatus
    >
    queryProcessStatusMock.mockResolvedValue({
      key: 'task_background_skip',
      current_step: 1,
      current_step_name: '处理中',
      total_steps: 3,
      steps: ['S1', 'S2', 'S3'],
      progress_percent: 10,
      is_completed: false,
      status: 'running',
    } as any)

    render(<BackgroundTaskPoller />)

    act(() => {
      useAsyncTaskStore.getState().addAsyncTask({
        taskKey: 'task_background_skip',
        apiDetailId: 1,
        apiName: '任务-task_background_skip',
        progressPercent: 0,
        currentStepName: '请求排队中...',
        status: 'running',
        toolName: '异步工具A',
        folderId: 1,
      })
      useAsyncTaskStore.setState({ daemonHeartbeatAt: Date.now() } as any)
    })

    await act(async () => {
      jest.advanceTimersByTime(5_000)
      useAsyncTaskStore.setState({ daemonHeartbeatAt: Date.now() } as any)
      jest.advanceTimersByTime(5_000)
      useAsyncTaskStore.setState({ daemonHeartbeatAt: Date.now() } as any)
      jest.advanceTimersByTime(4_000)
      useAsyncTaskStore.setState({ daemonHeartbeatAt: Date.now() } as any)
      jest.advanceTimersByTime(1_000)
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(queryProcessStatusMock).not.toHaveBeenCalled()
    expect(useAsyncTaskStore.getState().tasks['task_background_skip']?.status).toBe('running')
    expect(useUIStore.getState().toast).toBeNull()
  })

  test('marks non-transient backend error as failed instead of leaving task running', async () => {
    const queryProcessStatusMock = aiService.queryProcessStatus as jest.MockedFunction<
      typeof aiService.queryProcessStatus
    >
    queryProcessStatusMock.mockRejectedValue(
      new ApiError('服务内部错误', 'INTERNAL_SERVER_ERROR', 500),
    )

    render(<BackgroundTaskPoller />)

    act(() => {
      useAsyncTaskStore.getState().addAsyncTask({
        taskKey: 'task_background_500',
        apiDetailId: 1,
        apiName: '任务-task_background_500',
        progressPercent: 0,
        currentStepName: '请求排队中...',
        status: 'running',
        toolName: '异步工具A',
        folderId: 1,
      })
    })

    await advancePollingCycle()

    await waitFor(() => {
      expect(useAsyncTaskStore.getState().tasks['task_background_500']?.status).toBe('failed')
    })
    const failedTask = useAsyncTaskStore.getState().tasks['task_background_500']

    expect(failedTask?.currentStepName).toBe('执行失败')
    expect(failedTask?.error_message).toBe('服务内部错误')
    expect(useUIStore.getState().toast).toBe('「异步工具A」生成失败')
  })

  test('treats 404 after persisted progress as completed archive instead of failed', async () => {
    const queryProcessStatusMock = aiService.queryProcessStatus as jest.MockedFunction<
      typeof aiService.queryProcessStatus
    >
    queryProcessStatusMock.mockRejectedValue(new ApiError('任务不存在', 'NOT_FOUND', 404))

    render(<BackgroundTaskPoller />)

    act(() => {
      useAsyncTaskStore.setState({
        tasks: {
          task_background_404: {
            taskKey: 'task_background_404',
            apiDetailId: 1,
            apiName: '任务-task_background_404',
            folderId: 1,
            progressPercent: 40,
            currentStepName: '处理中',
            status: 'running',
            toolName: '异步工具A',
            createdAt: Date.now() - 5_000,
          },
        },
      } as any)
    })

    await advancePollingCycle()

    await waitFor(() => {
      expect(useAsyncTaskStore.getState().tasks['task_background_404']?.status).toBe('completed')
    })
    const archivedTask = useAsyncTaskStore.getState().tasks['task_background_404']

    expect(archivedTask?.progressPercent).toBe(100)
    expect(archivedTask?.currentStepName).toBe('已归档')
    expect(useUIStore.getState().toast).toBe('「异步工具A」生成完成')
  })

  test('treats a newly saved history item as completed archive when polling still returns pending 404', async () => {
    const queryProcessStatusMock = aiService.queryProcessStatus as jest.MockedFunction<
      typeof aiService.queryProcessStatus
    >
    const getSessionsMock = sessionService.getSessions as jest.MockedFunction<
      typeof sessionService.getSessions
    >
    queryProcessStatusMock.mockRejectedValue(
      new ApiError('异步结果生成中，请等待', 'NOT_FOUND', 404),
    )
    getSessionsMock.mockResolvedValue({
      items: [
        {
          id: 3693,
          userId: 33,
          title: '异步工具A-Basic',
          toolType: '异步工具A',
          modelVersion: 'Basic',
          status: 'completed',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          type: 1,
          answer_text: '生成内容：最终正文',
        },
      ],
      pagination: {
        page: 1,
        pageSize: 10,
        total: 1,
        totalPages: 1,
      },
    })

    render(<BackgroundTaskPoller />)

    act(() => {
      useAsyncTaskStore.getState().addAsyncTask({
        taskKey: 'task_background_saved_history',
        apiDetailId: 1,
        apiName: '任务-task_background_saved_history',
        progressPercent: 0,
        currentStepName: '请求排队中...',
        status: 'running',
        toolName: '异步工具A',
        folderId: 1,
      })
    })

    await advancePollingCycle()

    await waitFor(() => {
      expect(useAsyncTaskStore.getState().tasks.task_background_saved_history?.status).toBe(
        'completed',
      )
    })
    expect(getSessionsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        cacheMode: 'bypass',
        page: 1,
      }),
      expect.anything(),
    )
    expect(useUIStore.getState().toast).toBe('「异步工具A」生成完成')
  })
})
