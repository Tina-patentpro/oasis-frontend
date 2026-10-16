import * as React from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals'

import type { CategoriesResponse } from '@/types/api'

const mockGetCategories = jest.fn<() => Promise<CategoriesResponse>>()

const STORAGE_KEY = 'oasis-categories-cache'
const NOW = new Date('2026-06-25T00:00:00.000Z').getTime()

function createCategories(toolName = '权利要求书'): CategoriesResponse {
  return {
    写作工具: [
      {
        id: 1,
        name: toolName,
        group: '写作工具',
        description: `${toolName} 描述`,
        file_url: '',
        workflow: '',
        sort: 1,
        is_active: true,
        apis: [],
      },
    ],
  }
}

async function loadHookModule() {
  jest.resetModules()
  jest.doMock('react', () => React)
  jest.doMock('@/api/services', () => ({
    cmsService: {
      getCategories: mockGetCategories,
    },
  }))

  return await import('./useCategoriesData')
}

beforeEach(() => {
  window.localStorage.clear()
  mockGetCategories.mockReset()
  jest.spyOn(Date, 'now').mockReturnValue(NOW)
})

afterEach(() => {
  jest.useRealTimers()
  jest.restoreAllMocks()
  jest.dontMock('react')
  jest.dontMock('@/api/services')
})

describe('useCategoriesData', () => {
  test('loads category data and persists a valid response to localStorage', async () => {
    const categories = createCategories()
    mockGetCategories.mockResolvedValueOnce(categories)
    const { useCategoriesData } = await loadHookModule()

    const { result } = renderHook(() => useCategoriesData())

    await waitFor(() => {
      expect(result.current.data).toEqual(categories)
    })

    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()
    expect(result.current.isStale).toBe(false)
    expect(mockGetCategories).toHaveBeenCalledTimes(1)

    const cached = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}') as {
      data?: CategoriesResponse
      savedAt?: number
    }
    expect(cached).toEqual({ data: categories, savedAt: NOW })
  })

  test('shares the same in-flight request across multiple hook instances', async () => {
    const categories = createCategories('说明书')
    let resolveRequest: (value: CategoriesResponse) => void = () => undefined
    const pendingRequest = new Promise<CategoriesResponse>((resolve) => {
      resolveRequest = resolve
    })
    mockGetCategories.mockReturnValueOnce(pendingRequest)
    const { useCategoriesData } = await loadHookModule()

    const first = renderHook(() => useCategoriesData())
    const second = renderHook(() => useCategoriesData())

    await waitFor(() => {
      expect(mockGetCategories).toHaveBeenCalledTimes(1)
    })

    await act(async () => {
      resolveRequest(categories)
      await pendingRequest
    })

    await waitFor(() => {
      expect(first.result.current.data).toEqual(categories)
      expect(second.result.current.data).toEqual(categories)
    })

    first.unmount()
    second.unmount()
  })

  test('reuses the in-memory cache while it is still fresh', async () => {
    const categories = createCategories('摘要生成')
    mockGetCategories.mockResolvedValueOnce(categories)
    const { useCategoriesData } = await loadHookModule()

    const first = renderHook(() => useCategoriesData())
    await waitFor(() => {
      expect(first.result.current.data).toEqual(categories)
    })
    first.unmount()

    mockGetCategories.mockClear()

    const second = renderHook(() => useCategoriesData())
    await waitFor(() => {
      expect(second.result.current.data).toEqual(categories)
    })

    expect(mockGetCategories).not.toHaveBeenCalled()
    second.unmount()
  })

  test('refresh bypasses cache and replaces data with the latest response', async () => {
    const initialCategories = createCategories('初始工具')
    const refreshedCategories = createCategories('刷新工具')
    mockGetCategories
      .mockResolvedValueOnce(initialCategories)
      .mockResolvedValueOnce(refreshedCategories)
    const { useCategoriesData } = await loadHookModule()

    const { result } = renderHook(() => useCategoriesData())
    await waitFor(() => {
      expect(result.current.data).toEqual(initialCategories)
    })

    act(() => {
      result.current.refresh()
    })

    await waitFor(() => {
      expect(result.current.data).toEqual(refreshedCategories)
    })
    expect(mockGetCategories).toHaveBeenCalledTimes(2)
  })

  test('uses a valid localStorage fallback when the network request fails', async () => {
    const staleCategories = createCategories('缓存工具')
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ data: staleCategories, savedAt: NOW - 1000 }),
    )
    mockGetCategories.mockRejectedValueOnce(new Error('network down'))
    const { useCategoriesData } = await loadHookModule()

    const { result } = renderHook(() => useCategoriesData())

    await waitFor(() => {
      expect(result.current.isStale).toBe(true)
    })

    expect(result.current.data).toEqual(staleCategories)
    expect(result.current.error?.message).toBe('network down')
    expect(result.current.isLoading).toBe(false)
  })

  test('rejects empty category payloads and schedules retry attempts', async () => {
    jest.useFakeTimers()
    mockGetCategories.mockResolvedValue({})
    const { useCategoriesData } = await loadHookModule()

    const { result, unmount } = renderHook(() => useCategoriesData())

    await waitFor(() => {
      expect(result.current.error?.message).toBe('Empty categories payload')
    })
    expect(result.current.data).toBeNull()
    expect(mockGetCategories).toHaveBeenCalledTimes(1)

    await act(async () => {
      jest.advanceTimersByTime(1200)
      await Promise.resolve()
    })

    await waitFor(() => {
      expect(mockGetCategories).toHaveBeenCalledTimes(2)
    })

    unmount()
  })
})
