/**
 * 分页Hook
 * 提供完整的分页功能，包含数据获取、页码管理等
 */

import { useState, useCallback, useEffect, useRef } from 'react'

import type { PaginatedResponse } from '@/types/api'

interface UsePaginationOptions<T> {
  fetchFn: (page: number, pageSize: number) => Promise<PaginatedResponse<T>>
  initialPage?: number
  initialPageSize?: number
  onSuccess?: (data: PaginatedResponse<T>) => void
  onError?: (error: Error) => void
}

interface UsePaginationReturn<T> {
  data: T[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
  isLoading: boolean
  error: Error | null
  goToPage: (page: number) => Promise<void>
  nextPage: () => Promise<void>
  prevPage: () => Promise<void>
  setPageSize: (pageSize: number) => void
  refresh: () => Promise<void>
}

export function usePagination<T>({
  fetchFn,
  initialPage = 1,
  initialPageSize = 20,
  onSuccess,
  onError,
}: UsePaginationOptions<T>): UsePaginationReturn<T> {
  const [data, setData] = useState<T[]>([])
  const [page, setPage] = useState(initialPage)
  const [pageSize, setPageSize] = useState(initialPageSize)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchFnRef = useRef(fetchFn)
  const onSuccessRef = useRef(onSuccess)
  const onErrorRef = useRef(onError)
  const latestRequestIdRef = useRef(0)
  const inFlightCountRef = useRef(0)
  const mountedRef = useRef(true)

  useEffect(() => {
    fetchFnRef.current = fetchFn
  }, [fetchFn])

  useEffect(() => {
    onSuccessRef.current = onSuccess
  }, [onSuccess])

  useEffect(() => {
    onErrorRef.current = onError
  }, [onError])

  useEffect(() => {
    // React StrictMode（开发环境）会执行 setup -> cleanup -> setup。
    // 必须在 setup 显式重置为 true，否则 cleanup 后会永久为 false。
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const fetchData = useCallback(async (targetPage: number, targetPageSize: number) => {
    const requestId = latestRequestIdRef.current + 1
    latestRequestIdRef.current = requestId
    inFlightCountRef.current += 1

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetchFnRef.current(targetPage, targetPageSize)
      if (!mountedRef.current || requestId !== latestRequestIdRef.current) {
        return
      }

      setData(response.items)
      setTotal(response.pagination.total)
      setTotalPages(response.pagination.totalPages)

      onSuccessRef.current?.(response)
    } catch (err) {
      if (!mountedRef.current || requestId !== latestRequestIdRef.current) {
        return
      }
      const error = err instanceof Error ? err : new Error(String(err))
      setError(error)
      onErrorRef.current?.(error)
    } finally {
      inFlightCountRef.current = Math.max(inFlightCountRef.current - 1, 0)
      if (mountedRef.current && inFlightCountRef.current === 0) {
        setIsLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    fetchData(page, pageSize)
  }, [page, pageSize, fetchData])

  const goToPage = useCallback(
    async (targetPage: number) => {
      if (targetPage < 1 || targetPage > totalPages) return
      setPage(targetPage)
    },
    [totalPages],
  )

  const nextPage = useCallback(async () => {
    if (page < totalPages) {
      setPage((prev) => prev + 1)
    }
  }, [page, totalPages])

  const prevPage = useCallback(async () => {
    if (page > 1) {
      setPage((prev) => prev - 1)
    }
  }, [page])

  const changePageSize = useCallback((newPageSize: number) => {
    setPageSize(newPageSize)
    setPage(1)
  }, [])

  const refresh = useCallback(async () => {
    await fetchData(page, pageSize)
  }, [fetchData, page, pageSize])

  return {
    data,
    pagination: {
      page,
      pageSize,
      total,
      totalPages,
    },
    isLoading,
    error,
    goToPage,
    nextPage,
    prevPage,
    setPageSize: changePageSize,
    refresh,
  }
}
