import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals'

jest.mock('@/api/services', () => ({
  aiService: {
    queryProcessStatus: jest.fn(),
  },
}))

import { aiService } from '@/api/services'
import { ApiError } from '@/api/errors'

import { useAsyncTaskPolling } from './useAsyncTaskPolling'

describe('useAsyncTaskPolling', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.clearAllMocks()
  })

  test('completes when response contains final text and residual error signal', async () => {
    const queryProcessStatusMock = aiService.queryProcessStatus as jest.MockedFunction<
      typeof aiService.queryProcessStatus
    >
    queryProcessStatusMock.mockResolvedValue({
      key: 'task_1',
      current_step: 3,
      current_step_name: '完成',
      total_steps: 3,
      steps: ['S1', 'S2', 'S3'],
      progress_percent: 100,
      is_completed: true,
      answer_text: '最终正文',
      error_message: '后端残留告警',
      status: 'failed',
    } as any)

    const onComplete: (status: any) => void = jest.fn()
    const onError: (error: Error) => void = jest.fn()

    const { result } = renderHook(() =>
      useAsyncTaskPolling({
        pollInterval: 10,
        onComplete,
        onError,
      }),
    )

    act(() => {
      result.current.startPolling('task_1')
    })

    await waitFor(() => {
      expect(result.current.phase).toBe('completed')
    })

    expect(onComplete).toHaveBeenCalledTimes(1)
    expect(onError).not.toHaveBeenCalled()
  })

  test('completes when progress reaches 100 and downloadable file exists', async () => {
    const queryProcessStatusMock = aiService.queryProcessStatus as jest.MockedFunction<
      typeof aiService.queryProcessStatus
    >
    queryProcessStatusMock.mockResolvedValue({
      key: 'task_2',
      current_step: 3,
      current_step_name: '归档',
      total_steps: 3,
      steps: ['S1', 'S2', 'S3'],
      progress_percent: 100,
      is_completed: false,
      file_url: 'https://example.com/result.docx',
      status: 'failed',
    } as any)

    const onComplete: (status: any) => void = jest.fn()
    const onError: (error: Error) => void = jest.fn()

    const { result } = renderHook(() =>
      useAsyncTaskPolling({
        pollInterval: 10,
        onComplete,
        onError,
      }),
    )

    act(() => {
      result.current.startPolling('task_2')
    })

    await waitFor(() => {
      expect(result.current.phase).toBe('completed')
    })

    expect(onComplete).toHaveBeenCalledTimes(1)
    expect(onError).not.toHaveBeenCalled()
  })

  test('fails when response has text but no completion signal and explicit failed status', async () => {
    const queryProcessStatusMock = aiService.queryProcessStatus as jest.MockedFunction<
      typeof aiService.queryProcessStatus
    >
    queryProcessStatusMock.mockResolvedValue({
      key: 'task_3',
      current_step: 1,
      current_step_name: '处理中',
      total_steps: 3,
      steps: ['S1', 'S2', 'S3'],
      progress_percent: 33,
      is_completed: false,
      answer_text: '处理中提示',
      error_message: '执行失败',
      status: 'failed',
    } as any)

    const onComplete: (status: any) => void = jest.fn()
    const onError: (error: Error) => void = jest.fn()

    const { result } = renderHook(() =>
      useAsyncTaskPolling({
        pollInterval: 10,
        onComplete,
        onError,
      }),
    )

    act(() => {
      result.current.startPolling('task_3')
    })

    await waitFor(() => {
      expect(result.current.phase).toBe('failed')
    })

    expect(onComplete).not.toHaveBeenCalled()
    expect(onError).toHaveBeenCalledTimes(1)
  })

  test('enters timeout phase when polling never completes before max attempts', async () => {
    const queryProcessStatusMock = aiService.queryProcessStatus as jest.MockedFunction<
      typeof aiService.queryProcessStatus
    >
    queryProcessStatusMock.mockResolvedValue({
      key: 'task-1',
      current_step: 1,
      current_step_name: '处理中',
      total_steps: 3,
      steps: ['处理中'],
      progress_percent: 30,
      is_completed: false,
      status: 'running',
    } as any)
    const onError = jest.fn<(error: Error) => void>()

    const { result } = renderHook(() =>
      useAsyncTaskPolling({
        pollInterval: 10,
        maxAttempts: 2,
        onError,
      }),
    )

    act(() => {
      result.current.startPolling('task-1')
    })

    await act(async () => {
      jest.advanceTimersByTime(10)
      await Promise.resolve()
    })

    await waitFor(() => {
      expect(result.current.phase).toBe('timeout')
    })
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: '任务超时' }))
  })

  test('treats 504 as transient and keeps polling instead of failing immediately', async () => {
    const queryProcessStatusMock = aiService.queryProcessStatus as jest.MockedFunction<
      typeof aiService.queryProcessStatus
    >
    queryProcessStatusMock
      .mockRejectedValueOnce(new ApiError('请求超时', 'GATEWAY_TIMEOUT', 504))
      .mockResolvedValueOnce({
        key: 'task-2',
        current_step: 1,
        current_step_name: '处理中',
        total_steps: 3,
        steps: ['处理中'],
        progress_percent: 30,
        is_completed: false,
        status: 'running',
      } as any)

    const { result } = renderHook(() =>
      useAsyncTaskPolling({
        pollInterval: 10,
        maxAttempts: 4,
      }),
    )

    act(() => {
      result.current.startPolling('task-2')
    })

    await act(async () => {
      await Promise.resolve()
      jest.advanceTimersByTime(10)
      await Promise.resolve()
    })

    expect(queryProcessStatusMock).toHaveBeenCalledTimes(2)
    expect(result.current.phase).toBe('running')
    expect(result.current.isPolling).toBe(true)
  })
})
