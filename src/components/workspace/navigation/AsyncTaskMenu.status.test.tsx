import React from 'react'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, jest, test } from '@jest/globals'

jest.mock('@/components/ui/motion', () => {
  const ReactActual = jest.requireActual('react') as typeof import('react')

  const createMotionComponent = (tag: string) => {
    const MotionComponent = ReactActual.forwardRef(function MockMotionComponent(
      { children, ...props }: any,
      ref: any,
    ) {
      return ReactActual.createElement(tag, { ...props, ref }, children)
    })
    MotionComponent.displayName = `MockMotion(${tag})`
    return MotionComponent
  }

  return {
    AnimatePresence: ({ children }: any) => <>{children}</>,
    motion: new Proxy(
      {},
      {
        get: (_target, prop: string) => createMotionComponent(prop),
      },
    ),
  }
})

jest.mock('@/components/ui', () => ({
  Tooltip: ({ children }: any) => <>{children}</>,
}))

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
import { AsyncTaskDaemon } from '@/components/workspace/AsyncTaskDaemon'
import { useAsyncTaskStore } from '@/modules/workspace/stores'
import { useUIStore } from '@/stores/useUIStore'

import { AsyncTaskMenu } from './AsyncTaskMenu'

function seedRunningTask(taskKey: string) {
  useAsyncTaskStore.getState().addAsyncTask({
    taskKey,
    apiDetailId: 1,
    apiName: `任务-${taskKey}`,
    folderId: 1,
    progressPercent: 0,
    currentStepName: '请求排队中...',
    status: 'running',
    toolName: '异步工具A',
  })
}

function renderTaskCenter() {
  return render(
    <>
      <AsyncTaskDaemon />
      <AsyncTaskMenu
        currentTheme={{ primary: '#2563eb' } as any}
        isDarkTheme={false}
        headerBtnStyle={{}}
      />
    </>,
  )
}

afterEach(() => {
  jest.clearAllMocks()
  useAsyncTaskStore.setState({ tasks: {} })
  useUIStore.setState({ toast: null })
  sessionStorage.clear()
})

describe('AsyncTaskMenu task status', () => {
  test('shows completed instead of failed when result exists with residual error signal', async () => {
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

    const toastSpy = jest.fn()
    useUIStore.setState({ showToast: toastSpy } as any)

    renderTaskCenter()

    act(() => {
      seedRunningTask('task_1')
    })

    await waitFor(() => {
      expect(useAsyncTaskStore.getState().tasks['task_1']?.status).toBe('completed')
    })

    await userEvent.click(screen.getByLabelText('异步任务'))

    expect(screen.queryByText('完成')).not.toBeNull()
    expect(screen.queryByText('失败')).toBeNull()
    expect(toastSpy).toHaveBeenCalledWith('✅ [任务-task_1] 处理完成')
  })

  test('continues polling persisted running task immediately after mount', async () => {
    const queryProcessStatusMock = aiService.queryProcessStatus as jest.MockedFunction<
      typeof aiService.queryProcessStatus
    >
    queryProcessStatusMock.mockResolvedValue({
      key: 'task_persisted',
      current_step: 3,
      current_step_name: '完成',
      total_steps: 3,
      steps: ['S1', 'S2', 'S3'],
      progress_percent: 100,
      is_completed: true,
      answer_text: '最终正文',
      status: 'completed',
    } as any)

    act(() => {
      seedRunningTask('task_persisted')
    })

    renderTaskCenter()

    await waitFor(() => {
      expect(useAsyncTaskStore.getState().tasks['task_persisted']?.status).toBe('completed')
    })
  })

  test('keeps task running with neutral step text for transient polling error', async () => {
    const queryProcessStatusMock = aiService.queryProcessStatus as jest.MockedFunction<
      typeof aiService.queryProcessStatus
    >
    queryProcessStatusMock.mockRejectedValue(
      new ApiError('服务暂时不可用', 'SERVICE_UNAVAILABLE', 503),
    )

    renderTaskCenter()

    act(() => {
      seedRunningTask('task_2')
    })

    await waitFor(() => {
      expect(useAsyncTaskStore.getState().tasks['task_2']?.status).toBe('running')
    })

    await userEvent.click(screen.getByLabelText('异步任务'))

    expect(screen.queryByText('进行中')).not.toBeNull()
    expect(screen.queryByText('等待状态确认')).not.toBeNull()
  })

  test('marks task failed for non-transient backend error instead of keeping it running', async () => {
    const queryProcessStatusMock = aiService.queryProcessStatus as jest.MockedFunction<
      typeof aiService.queryProcessStatus
    >
    queryProcessStatusMock.mockRejectedValue(
      new ApiError('服务内部错误', 'INTERNAL_SERVER_ERROR', 500),
    )

    renderTaskCenter()

    act(() => {
      seedRunningTask('task_500')
    })

    await waitFor(() => {
      expect(useAsyncTaskStore.getState().tasks['task_500']?.status).toBe('failed')
    })

    await userEvent.click(screen.getByLabelText('异步任务'))

    expect(screen.queryByText('失败')).not.toBeNull()
    expect(screen.getAllByText('服务内部错误').length).toBeGreaterThan(0)
    expect(screen.getByRole('alert')).toHaveTextContent('服务内部错误')
  })

  test('shows failed only when backend explicitly fails without result', async () => {
    const queryProcessStatusMock = aiService.queryProcessStatus as jest.MockedFunction<
      typeof aiService.queryProcessStatus
    >
    queryProcessStatusMock.mockResolvedValue({
      key: 'task_3',
      current_step: 2,
      current_step_name: '执行失败',
      total_steps: 3,
      steps: ['S1', 'S2', 'S3'],
      progress_percent: 66,
      is_completed: false,
      answer_text: '',
      file_url: '',
      error_message: '执行失败',
      status: 'failed',
    } as any)

    renderTaskCenter()

    act(() => {
      seedRunningTask('task_3')
    })

    await waitFor(() => {
      expect(useAsyncTaskStore.getState().tasks['task_3']?.status).toBe('failed')
    })

    await userEvent.click(screen.getByLabelText('异步任务'))

    expect(screen.queryByText('失败')).not.toBeNull()
    expect(screen.getAllByText('执行失败').length).toBeGreaterThan(0)
  })

  test('treats persisted progress as archive evidence when next poll returns 404', async () => {
    const queryProcessStatusMock = aiService.queryProcessStatus as jest.MockedFunction<
      typeof aiService.queryProcessStatus
    >
    queryProcessStatusMock.mockRejectedValue(new ApiError('任务不存在', 'NOT_FOUND', 404))

    const toastSpy = jest.fn()
    useUIStore.setState({ showToast: toastSpy } as any)

    renderTaskCenter()

    act(() => {
      useAsyncTaskStore.setState({
        tasks: {
          task_archived: {
            taskKey: 'task_archived',
            apiDetailId: 1,
            apiName: '任务-task_archived',
            folderId: 1,
            progressPercent: 60,
            currentStepName: '处理中',
            status: 'running',
            toolName: '异步工具A',
            createdAt: Date.now() - 5_000,
          },
        },
      })
    })

    await waitFor(() => {
      expect(useAsyncTaskStore.getState().tasks['task_archived']?.status).toBe('completed')
    })

    expect(toastSpy).toHaveBeenCalledWith('✅ [任务-task_archived] 处理完成')
  })

  test('treats a newly saved history item as archive evidence when polling still returns pending 404', async () => {
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

    const toastSpy = jest.fn()
    useUIStore.setState({ showToast: toastSpy } as any)

    renderTaskCenter()

    act(() => {
      seedRunningTask('task_saved_history')
    })

    await waitFor(() => {
      expect(useAsyncTaskStore.getState().tasks.task_saved_history?.status).toBe('completed')
    })

    expect(getSessionsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        cacheMode: 'bypass',
        page: 1,
      }),
      expect.anything(),
    )
    expect(toastSpy).toHaveBeenCalledWith('✅ [任务-task_saved_history] 处理完成')
  })

  test('clear completed keeps failed records for troubleshooting', async () => {
    renderTaskCenter()

    act(() => {
      useAsyncTaskStore.setState({
        tasks: {
          task_completed: {
            taskKey: 'task_completed',
            apiDetailId: 1,
            apiName: '已完成任务',
            folderId: 1,
            progressPercent: 100,
            currentStepName: '已完成',
            status: 'completed',
            toolName: '异步工具A',
            createdAt: Date.now() - 2_000,
          },
          task_failed: {
            taskKey: 'task_failed',
            apiDetailId: 1,
            apiName: '失败任务',
            folderId: 1,
            progressPercent: 30,
            currentStepName: '执行失败',
            status: 'failed',
            toolName: '异步工具A',
            createdAt: Date.now() - 1_000,
            error_message: '执行失败',
          },
        },
      })
    })

    await userEvent.click(screen.getByLabelText('异步任务'))
    await userEvent.click(screen.getByText('清除已完成'))
    await userEvent.click(screen.getByRole('button', { name: '确认清除' }))

    await waitFor(() => {
      expect(useAsyncTaskStore.getState().tasks['task_completed']).toBeUndefined()
    })
    expect(useAsyncTaskStore.getState().tasks['task_failed']).toBeDefined()
    expect(screen.queryByText('失败任务')).not.toBeNull()
  })
})
